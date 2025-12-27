// app/page.client.js
'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
// ⛔️ IMPORTANT: we intentionally DO NOT use the imported PricingModal
// because it’s rendering “in flow” on iOS/Safari due to containing-block issues.
// import PricingModal from '@/components/PricingModal'
import LiquidGlass from '@/components/ui/LiquidGlass'
import RadialMenu from '@/components/RadialMenu'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

const MIN_MULTI_LOCATIONS = 2
const MAX_MULTI_LOCATIONS = 500
const MAX_DEVICES_PER_LOCATION = 20
const SUBSCRIPTION_STATUS_TRIALING = 'trialing'
const HISTORY_KEY_BASE = 'plm_chat_history_v1'
const POLICY_VERSION = '1'

const getPolicyStorageKey = (userId) => `plm_policy_v${POLICY_VERSION}_${userId}`
const hasCachedPolicyAcceptance = (userId) => {
  if (typeof window === 'undefined' || !userId) return false
  try {
    return localStorage.getItem(getPolicyStorageKey(userId)) === 'true'
  } catch {
    return false
  }
}
const cachePolicyAcceptance = (userId) => {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(getPolicyStorageKey(userId), 'true')
  } catch {}
}
const clearPolicyAcceptance = (userId) => {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.removeItem(getPolicyStorageKey(userId))
  } catch {}
}

// ✅ Panel UI constants
const MAX_TEXTAREA_HEIGHT = 120
const FILE_PICKER_DELAY_MS = 100 // Small delay to allow panel transition before opening file picker

// eslint-disable-next-line no-unused-vars
const isAdmin = false

const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

function calculatePricing(locationCount, devicesPerLocation) {
  const tier = locationCount >= 20 ? 'enterprise' : locationCount >= 5 ? 'multi' : 'single'
  const pricePerLocation = tier === 'enterprise' ? 35 : tier === 'multi' ? 40 : 50
  const devicePrice = tier === 'single' ? 20 : 15
  const totalDevices = locationCount * devicesPerLocation
  const additionalDevices = Math.max(0, totalDevices - locationCount)
  const baseTotal = pricePerLocation * locationCount
  const deviceTotal = devicePrice * additionalDevices

  return {
    tier,
    pricePerLocation,
    devicePrice,
    baseTotal,
    deviceTotal,
    total: baseTotal + deviceTotal,
    additionalDevices,
    totalDevices,
  }
}

const Icons = {
  Camera: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path
        d="M5.5 7H9l1.3-2.3c.2-.4.6-.7 1-.7h2.4c.4 0 .8.3 1 .7L16 7h3.5A2.5 2.5 0 0 1 22 9.5v8A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-8A2.5 2.5 0 0 1 4.5 7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Send: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
      <path d="M12 19V6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 11.5 12 6l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // ✅ FIX: iOS/Safari was rendering your old <line> X as a single slash sometimes.
  // Use a single <path> with round caps so it ALWAYS looks like an “X”.
  X: () => (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),

  Sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  ),
  Gear: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path
        d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m19.2 9.5-.8-2 1.4-1.4-2.8-2.8-1.4 1.4-2-.8-1-.2-1 .2-2 .8-1.4-1.4-2.8 2.8 1.4 1.4-.8 2-.2 1 .2 1 .8 2-1.4 1.4 2.8 2.8 1.4-1.4 2 .8 1 .2 1-.2 2-.8 1.4 1.4 2.8-2.8-1.4-1.4.8-2 .2-1-.2-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

/**
 * ✅ Portal helper:
 * iOS Safari + “glass”/filters/transforms can cause fixed-position modals to render like normal flow elements.
 * Rendering to document.body avoids that containing-block bug.
 */
function Portal({ children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

function BrandLink({ variant = 'landing' }) {
  const isChat = variant === 'chat'
  const size = isChat ? 116 : 162

  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark" aria-hidden="true">
          <Image src={appleIcon} alt="" width={size} height={size} priority className="plm-logo-img" />
        </span>
        {!isChat && <span className="plm-brand-text">protocolLM</span>}
      </span>
    </Link>
  )
}

function FooterLinks() {
  return (
    <div className={`plm-footer-links ${plusJakarta.className}`}>
      <Link className="plm-footer-link" href="/terms">
        Terms
      </Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/privacy">
        Privacy
      </Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/contact">
        Contact
      </Link>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${plusJakarta.className} landing-root`}>
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <div className="plm-brand-wrap">
            <BrandLink variant="landing" />
          </div>

          <nav className="landing-top-actions" aria-label="Top actions">
            <button onClick={onShowAuth} className="btn-nav landing-signin-btn" type="button">
              Sign in
            </button>
          </nav>
        </div>
      </header>

      <main className="landing-hero">
        <LiquidGlass variant="main" className="landing-hero-card landing-hero-card--terms-style">
          <div className="hero-content">
            <div className="hero-headings">
              <h1 className={`hero-title ${plusJakarta.className}`}>
                CATCH VIOLATIONS,
                <span className="hero-break">
                  <br />
                </span>{' '}
                <span className="hero-nowrap">NOT&nbsp;FINES.</span>
              </h1>
              <div className="hero-divider" aria-hidden="true" />
              <p className="hero-support">
                Take pictures within your food establishment to catch violations and prepare for inspections.
              </p>
            </div>

            <div className="hero-cta-row">
              <div className="hero-arrow-text">Get started in minutes</div>
              <div className="hero-arrow-icon">
                <Icons.ArrowRight />
              </div>
              <button className="btn-primary hero-cta hero-cta-trace" onClick={onShowPricing} type="button">
                Start free trial
              </button>
            </div>
          </div>
        </LiquidGlass>
      </main>

      <FooterLinks />
    </div>
  )
}

/* ✅ AuthModal now uses LiquidGlass so it matches landing + chat glass */
function AuthModal({ isOpen, onClose, initialMode = 'signin', selectedPriceId = null }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setMessage('')
      setMessageKind('info')
    }
  }, [isOpen, initialMode])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')
    setMessageKind('info')

    try {
      const captchaToken = await executeRecaptcha(mode)
      if (!captchaToken || captchaToken === 'turnstile_unavailable') {
        setMessageKind('err')
        setMessage('Security verification failed. Please ensure Cloudflare Turnstile is allowed, then try again.')
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password
        if (mode === 'signup' && selectedPriceId) body.selectedPriceId = selectedPriceId
        endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessageKind('err')
        setMessage(data.error || 'Authentication failed.')
        return
      }

      if (mode === 'reset') {
        setMessageKind('ok')
        setMessage('Check your email for reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else if (mode === 'signup') {
        trackEvent(AnalyticsEvents.TRIAL_STARTED, { plan: 'unlimited', trial_days: 14 })
        setMessageKind('ok')
        setMessage('Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else {
        setMessageKind('ok')
        setMessage('Signed in. Redirecting…')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 450)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessageKind('err')
      setMessage('Unexpected issue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card auth-surface ${plusJakarta.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="modal-header">
            <h2 className="modal-title">
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="form-input-wrap">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="form-input"
                  autoComplete="username"
                  inputMode="email"
                  autoFocus
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-input"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="form-toggle-vis">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !isLoaded} className="btn-submit">
              {loading && <span className="spinner" />}
              <span>{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send link'}</span>
            </button>
          </form>

          {message && <div className={`modal-message ${messageKind}`}>{message}</div>}

          <div className="modal-footer">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className="modal-link">
                  Forgot password?
                </button>
                <button type="button" onClick={() => setMode('signup')} className="modal-link">
                  Create an account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                ← Back to sign in
              </button>
            )}
          </div>

          <RecaptchaBadge />
        </div>
      </div>
    </div>
  )
}

/**
 * Simplified pricing modal: $25 per device / month
 */
function PricingModalLocal({ isOpen, onClose, onCheckout, loading }) {
  const [quantity, setQuantity] = useState(1)

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pricing">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card pricing-modal-flat ${plusJakarta.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="pricing-top">
            <div className="pricing-pill">
              <span className="pricing-pill-dot" aria-hidden="true" />
              <span>14-day free trial</span>
            </div>
            <h2 className="modal-title pricing-title">Device licenses</h2>
            <p className="pricing-sub">Unlimited questions + photo scans. $25 per device per month.</p>
          </div>

          <div className="pricing-content">
            <div className="pricing-card-head">
              <div className="pricing-plan">
                <span className="pricing-plan-name">Device License</span>
                <span className="pricing-plan-badge">Monthly</span>
              </div>
              <div className="pricing-price">
                <span className="pricing-price-amount">$25</span>
                <span className="pricing-price-term">/ device / month</span>
              </div>
            </div>

            <ul className="pricing-list">
              <li>
                <span className="pricing-check" aria-hidden="true">
                  ✓
                </span>
                Unlimited questions and photo scans
              </li>
              <li>
                <span className="pricing-check" aria-hidden="true">
                  ✓
                </span>
                Michigan knowledge base
              </li>
              <li>
                <span className="pricing-check" aria-hidden="true">
                  ✓
                </span>
                Cohere-powered privacy + security
              </li>
              <li>
                <span className="pricing-check" aria-hidden="true">
                  ✓
                </span>
                One registered device per license
              </li>
            </ul>

            <div className="pricing-actions">
              <div className="multi-location-selector">
                <label className="multi-location-label">Number of devices:</label>
                <div className="multi-location-input-row">
                  <button
                    type="button"
                    className="multi-location-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                    className="multi-location-input"
                  />
                  <button
                    type="button"
                    className="multi-location-btn"
                    onClick={() => setQuantity(Math.min(500, quantity + 1))}
                  >
                    +
                  </button>
                </div>
                <div className="multi-location-total">Total: ${25 * quantity}/month</div>
              </div>

              <button
                type="button"
                className="pricing-primary"
                disabled={!!loading}
                onClick={() => onCheckout({ quantity })}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Starting…
                  </>
                ) : (
                  <>
                    Start ({quantity} device{quantity > 1 ? 's' : ''}) <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>

            <p className="pricing-fineprint">
              By starting your trial, you agree to our{' '}
              <Link href="/terms" className="pricing-link">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="pricing-link">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * ✅ API-compat helpers (matches stricter /api/chat route expectations)
 * - Don’t send extra keys inside each message (route may validate schema)
 * - Provide a default prompt if user only uploads an image
 * - Support BOTH JSON and streaming responses (SSE/plain text)
 * -------------------------------------------------------------------------- */

function safeTrim(s) {
  return String(s || '').trim()
}

/**
 * Formats assistant response content with styled components
 * - "NO VIOLATIONS ✓" -> green bold
 * - "VIOLATIONS:" -> red bold header with bullet points
 * - "NEED INFO:" -> amber header with questions
 */

function normalizeAssistantText(content) {
  const text = safeTrim(content)
  if (!text) return ''

  let normalized = text.replace(/<br\s*\/?>/gi, '\n')
  normalized = normalized.replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '')
  normalized = normalized.replace(/<\/?span[^>]*>/gi, '')
  normalized = normalized.replace(/<\/?(strong|em|b|i)[^>]*>/gi, '')
  normalized = normalized.replace(/&nbsp;/gi, ' ')
  return normalized.trim()
}

function extractCitationIds(text) {
  const ids = new Set()
  const matches = text.match(/\[(\d+)\]/g) || []
  matches.forEach((m) => {
    const num = Number(m.replace(/\D/g, ''))
    if (num) ids.add(num)
  })
  return Array.from(ids)
}

function buildCitationLookup(citations) {
  const lookup = {}
  ;(Array.isArray(citations) ? citations : []).forEach((c) => {
    const id = Number(c?.id)
    if (!id) return
    lookup[id] = {
      id,
      source: safeTrim(c?.source || 'Policy'),
      page: safeTrim(c?.page || 'N/A'),
      snippet: safeTrim(c?.snippet || ''),
      county: safeTrim(c?.county || ''),
    }
  })
  return lookup
}

function CitationChip({ citation, id }) {
  const [open, setOpen] = useState(false)
  if (!citation) return null

  const label = `Source ${id}`
  return (
    <div className="citation-chip">
      <button
        type="button"
        className="citation-pill"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${label}: ${citation.source}`}
        aria-expanded={open}
      >
        [{id}]
      </button>
      {open && (
        <div className="citation-popover" role="dialog" aria-label={`${label} details`}>
          <div className="citation-popover-header">
            <span className="citation-popover-source">{citation.source}</span>
            {citation.page ? <span className="citation-popover-page">p.{citation.page}</span> : null}
          </div>
          {citation.county && <div className="citation-popover-county">County: {citation.county}</div>}
          {citation.snippet ? <p className="citation-popover-text">{citation.snippet}</p> : null}
        </div>
      )}
    </div>
  )
}

// Helper to parse bullet point lines from text
function parseBulletItems(text, skipLines = 1) {
  const lines = text.split('\n').filter(l => l.trim())
  const items = []
  
  for (let i = skipLines; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('•') || line.startsWith('-')) {
      items.push(line.replace(/^[•\-]\s*/, ''))
    }
  }
  return items
}

function formatAssistantContent(content, citations = []) {
  const text = normalizeAssistantText(content)
  if (!text) return null
  const citationLookup = buildCitationLookup(citations)
  const renderCitations = (ids) => {
    if (!ids?.length) return null
    return (
      <div className="chat-citations" aria-label="Supporting evidence">
        {ids.map((id) => (
          <CitationChip key={id} id={id} citation={citationLookup[id]} />
        ))}
      </div>
    )
  }

  // Check for "NO VIOLATIONS" pattern
  if (/^NO VIOLATIONS/i.test(text)) {
    return (
      <div className="chat-analysis-summary positive">
        <span className="chat-summary-icon" aria-hidden="true">
          ✓
        </span>
        <div>
          <div className="chat-summary-title">No violations detected</div>
          <div className="chat-summary-detail">Keep up the safe practices.</div>
        </div>
      </div>
    )
  }

  // Check for "VIOLATIONS:" pattern
  if (/^VIOLATIONS:/i.test(text)) {
    const items = parseBulletItems(text, 1)
    const violations = items.map(item => {
      const citations = extractCitationIds(item)
      const cleanItem = item.replace(/\s*\[\d+\]/g, '').trim()
      // Try to split by "FIX:"
      const fixMatch = cleanItem.match(/^(.+?)\.\s*FIX:\s*(.+)$/i)
      if (fixMatch) {
        return {
          issue: fixMatch[1].trim(),
          fix: fixMatch[2].trim(),
          citations,
        }
      } else {
        return { issue: cleanItem, fix: null, citations }
      }
    })
    
    return (
      <div className="chat-analysis-section">
        <div className="chat-analysis-subtitle">Violations</div>
        <ul className="chat-violations-list">
          {violations.map((v, idx) => (
            <li key={idx} className="chat-violation-row">
              <span className="chat-violation-icon" aria-hidden="true">
                ⚠️
              </span>
              <div className="chat-violation-content">
                <div className="chat-violation-title">{v.issue}</div>
                {v.fix && <div className="chat-violation-fix">Fix: {v.fix}</div>}
                {renderCitations(v.citations)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  
  // Check for "NEED INFO:" pattern
  if (/^NEED INFO:/i.test(text)) {
    const questions = parseBulletItems(text, 1)
    
    return (
      <div className="chat-analysis-section">
        <div className="chat-analysis-subtitle">Need more info</div>
        <ul className="chat-violations-list">
          {questions.map((q, idx) => (
            <li key={idx} className="chat-violation-row">
              <span className="chat-violation-icon" aria-hidden="true">
                ?
              </span>
              <div className="chat-violation-content">{q}</div>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  
  // Default: return as plain text
  const ids = extractCitationIds(text)
  const clean = text.replace(/\s*\[\d+\]/g, '').trim()
  return (
    <div className="chat-analysis-text">
      <div className="chat-content">{clean}</div>
      {renderCitations(ids)}
    </div>
  )
}

function normalizeOutgoingMessages(msgs) {
  // Keep only { role, content } for API safety
  return (Array.isArray(msgs) ? msgs : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: String(m.content || ''),
    }))
}

async function readAsJsonSafe(res) {
  const text = await res.text().catch(() => '')
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    // Some routes return plain text but still 200
    return { _rawText: text }
  }
}

async function streamToAssistantText(res, onDelta) {
  const reader = res.body?.getReader()
  if (!reader) return ''

  const decoder = new TextDecoder('utf-8')
  let full = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (!chunk) continue

    full += chunk

    // Handle SSE `data:` lines OR raw text streaming
    // If it looks like SSE, extract data payloads; otherwise treat as raw text.
    if (chunk.includes('\n') && full.includes('data:')) {
      // parse only new lines, but simplest: parse entire full each time for deltas
      // (safe enough for typical small responses)
      const lines = full.split('\n')
      let assembled = ''
      for (const line of lines) {
        const l = line.trim()
        if (!l.startsWith('data:')) continue
        const payload = l.slice(5).trim()
        if (!payload) continue
        if (payload === '[DONE]') continue
        // try JSON payload first (common pattern)
        try {
          const obj = JSON.parse(payload)
          const delta =
            obj?.delta ||
            obj?.text ||
            obj?.message ||
            obj?.content ||
            (typeof obj === 'string' ? obj : '')
          if (delta) assembled += String(delta)
        } catch {
          assembled += payload
        }
      }
      if (assembled) onDelta(assembled)
    } else {
      onDelta(full)
    }
  }

  return full
}

export default function Page() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const { isLoaded: captchaLoaded, executeRecaptcha } = useRecaptcha()

  const [isLoading, setIsLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState('auth')
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscription, setSubscription] = useState(null)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('signin')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const [selectedPriceId, setSelectedPriceId] = useState(null)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const [inputMode, setInputMode] = useState('photo') // 'photo' | 'chat'
  const [sendKey, setSendKey] = useState(0)
  const [sendMode, setSendMode] = useState('text')
  const [chatHistory, setChatHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  
  // ✅ Panel state: null = show radial menu, 'text' | 'image' | 'history' | 'settings'
  const [activePanel, setActivePanel] = useState(null)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)

  const isAuthenticated = !!session
  const hasPaidAccess = isAuthenticated && (hasActiveSubscription || subscription?.status === SUBSCRIPTION_STATUS_TRIALING)
  const historyStorageKey = useMemo(() => `${HISTORY_KEY_BASE}-${session?.user?.id || 'guest'}`, [session?.user?.id])

  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsRef = useRef(null)

  // ✅ if you later add a Cancel button, this lets you abort streaming
  const abortRef = useRef(null)

  useEffect(() => {
    const onDown = (e) => {
      if (!settingsRef.current) return
      if (!settingsRef.current.contains(e.target)) setShowSettingsMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth >= 1100) {
      setShowHistory(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(historyStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setChatHistory(parsed)
      } else {
        setChatHistory([])
      }
    } catch (err) {
      console.warn('History load failed', err)
    } finally {
      setHistoryReady(true)
    }
  }, [historyStorageKey])

  useEffect(() => {
    if (!historyReady) return
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(chatHistory))
    } catch (err) {
      console.warn('History persist failed', err)
    }
  }, [chatHistory, historyReady, historyStorageKey])

  useEffect(() => {
    const handleOpenAuthModal = (event) => {
      const { mode } = event.detail || {}
      console.log('Opening auth modal, mode:', mode)
      setAuthInitialMode(mode || 'signin')
      setShowAuthModal(true)
    }

    window.addEventListener('openAuthModal', handleOpenAuthModal)

    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = hasPaidAccess ? 'chat' : 'landing'
    const splineContainer = document.getElementById('plm-spline-bg')
    if (splineContainer) {
      splineContainer.style.display = hasPaidAccess ? 'block' : 'none'
    }
  }, [hasPaidAccess])

  // ✅ Prevent background scroll when a modal is open (also helps iOS)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const open = showAuthModal || showPricingModal
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [showAuthModal, showPricingModal])

  // ✅ Tool-first UI: Always lock the page scroll so the tool input is reachable
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!hasPaidAccess) {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      return
    }
    const prev = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    // Lock scroll when the chat interface is available
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      document.documentElement.style.overflow = prevHtml
    }
  }, [hasPaidAccess])

  useEffect(() => {
    if (inputMode === 'chat') {
      setSelectedImage(null)
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto'
        textAreaRef.current.focus()
      }
      return
    }

    setInput('')
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto'
    }
  }, [inputMode])

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 120
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldAutoScrollRef.current = distanceFromBottom < threshold
  }

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom('auto'))
  }, [scrollToBottom])

  useEffect(() => {
    if (shouldAutoScrollRef.current) requestAnimationFrame(() => scrollToBottom('auto'))
  }, [messages, scrollToBottom])

  useEffect(() => {
    const showPricing = searchParams?.get('showPricing')
    const emailVerified = searchParams?.get('emailVerified')

    if (showPricing === 'true' && isAuthenticated) {
      if (hasActiveSubscription || subscription) {
        setShowPricingModal(false)

        if (emailVerified === 'true' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/')
        }
        return
      }

      if (!hasActiveSubscription && !subscription) {
        setShowPricingModal(true)

        if (emailVerified === 'true' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/')
        }
      }
    }
  }, [searchParams, isAuthenticated, hasActiveSubscription, subscription])

  const handleCheckout = useCallback(
    async ({ quantity = 1 }) => {
      try {
        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          setShowPricingModal(false)
          setAuthInitialMode('signup')
          setShowAuthModal(true)
          return
        }

        if (!data.session.user.email_confirmed_at) {
          alert('Please verify your email before starting a trial. Check your inbox.')
          setShowPricingModal(false)
          router.push('/verify-email')
          return
        }

        if (!captchaLoaded) {
          alert('Security verification is still loading. Please try again in a moment.')
          return
        }

        setCheckoutLoading('checkout')

        const captchaToken = await executeRecaptcha('checkout')
        if (!captchaToken || captchaToken === 'turnstile_unavailable') {
          throw new Error('Security verification failed. Please refresh and try again.')
        }

        const res = await fetch('/api/billing/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ quantity, captchaToken }),
          credentials: 'include',
        })

        const payload = await res.json().catch(() => ({}))

        if (!res.ok) {
          if (payload.code === 'EMAIL_NOT_VERIFIED') {
            alert('Please verify your email before starting a trial.')
            router.push('/verify-email')
            return
          }

          if (payload.code === 'ALREADY_SUBSCRIBED') {
            alert('You already have an active subscription.')
            setShowPricingModal(false)
            return
          }

          throw new Error(payload.error || 'Checkout failed')
        }

        if (payload.requiresContact) {
          alert('Contact support for enterprise.')
          return
        }

        if (payload.url) {
          window.location.href = payload.url
        } else {
          throw new Error('No checkout URL returned')
        }
      } catch (error) {
        console.error('Checkout error:', error)
        alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
      } finally {
        setCheckoutLoading(null)
      }
    },
    [supabase, captchaLoaded, executeRecaptcha, router]
  )

  useEffect(() => {
    let isMounted = true
    let unsubscribe = null

    async function loadSessionAndSub(s) {
      if (!isMounted) return
      setSession(s)

      if (!s) {
        setSubscription(null)
        setHasActiveSubscription(false)
        setShowPricingModal(false)

        setIsLoading(false)
        return
      }

      try {
        if (!s.user.email_confirmed_at) {
          console.log('❌ Email not verified - redirecting to verify page')
          setSubscription(null)
          setHasActiveSubscription(false)

          setIsLoading(false)
          router.replace('/verify-email')
          return
        }

        const cachedPolicyAccepted = hasCachedPolicyAcceptance(s.user.id)
        let profile = null
        let profileError = null

        // ✅ Only fetch profile if not cached (avoids unnecessary DB call)
        if (!cachedPolicyAccepted) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('accepted_terms, accepted_privacy')
            .eq('id', s.user.id)
            .maybeSingle()
          profile = data
          profileError = error
          if (!profileError && profile?.accepted_terms && profile?.accepted_privacy) {
            cachePolicyAcceptance(s.user.id)
          }
        }

        const accepted = !!(profile?.accepted_terms && profile?.accepted_privacy) || cachedPolicyAccepted

        if (profileError && !accepted) {
          console.error('❌ Profile check error:', profileError)
          setSubscription(null)
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        if (!accepted) {
          setSubscription(null)
          setHasActiveSubscription(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('❌ Policy check exception:', e)
        setSubscription(null)
        setHasActiveSubscription(false)

        setIsLoading(false)
        if (!hasCachedPolicyAcceptance(s?.user?.id)) {
          router.replace('/accept-terms')
          return
        }
      }

      let active = false
      let subData = null

      try {
        // ✅ Use single() instead of maybeSingle() when we expect exactly one result
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status,current_period_end,trial_end,price_id,plan')
          .eq('user_id', s.user.id)
          .in('status', ['active', 'trialing'])
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle()

        subData = sub || null

        const now = new Date()
        const endDate =
          sub?.current_period_end ? new Date(sub.current_period_end) : sub?.trial_end ? new Date(sub.trial_end) : null

        if (endDate && endDate > now) active = true
      } catch (e) {
        console.error('Subscription check error', e)
      }

      if (!isMounted) return
      setSubscription(subData)
      setHasActiveSubscription(active)

      const checkoutParam = searchParams?.get('checkout')
      const showPricingParam = searchParams?.get('showPricing')

      if (s?.user) {
        console.log('🔐 Auth state:', {
          userId: String(s.user.id || '').substring(0, 8) + '***',
          emailVerified: !!s.user.email_confirmed_at,
          hasSubscription: !!subData,
          subscriptionStatus: subData?.status,
          trialEnd: subData?.trial_end ? new Date(subData.trial_end).toISOString() : null,
        })
      }

      if (!subData && !checkoutParam && showPricingParam !== 'true') {
        console.log('💳 No subscription found - showing pricing modal')
        setShowPricingModal(true)
        setHasActiveSubscription(false)
      }

      if (subData?.status === 'trialing' && subData?.trial_end) {
        const trialEnd = new Date(subData.trial_end)
        const now = new Date()

        if (trialEnd < now) {
          console.log('❌ Trial expired - showing pricing')
          if (!checkoutParam) setShowPricingModal(true)
          setHasActiveSubscription(false)
        } else {
          const hoursLeft = (trialEnd - now) / (1000 * 60 * 60)
          if (hoursLeft < 24 && hoursLeft > 0) {
            console.log(`⚠️ Trial ends in ${Math.round(hoursLeft)} hours`)
          }
        }
      }

      setIsLoading(false)
    }

    async function init() {
      try {
        setLoadingStage('auth')
        const { data } = await supabase.auth.getSession()
        setLoadingStage('subscription')
        await loadSessionAndSub(data.session || null)
        setLoadingStage('ready')
      } catch (e) {
        console.error('Auth init error', e)
        if (isMounted) setIsLoading(false)
      }
    }

    init()

    // ✅ Set up auth listener and store unsubscribe function
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      loadSessionAndSub(newSession)
    })
    unsubscribe = data.subscription?.unsubscribe

    return () => {
      isMounted = false
      // ✅ Properly unsubscribe from auth listener
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [supabase, searchParams, router])

  useEffect(() => {
    const checkoutPlan = searchParams?.get('checkout')
    if (!checkoutPlan) return
    if (isLoading) return

    if (checkoutPlan && isAuthenticated && !hasActiveSubscription && !subscription) {
      console.log('🛒 Auto-checkout triggered:', checkoutPlan.substring(0, 15) + '***')
      handleCheckout({ priceId: checkoutPlan, planName: 'auto' })

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/')
      }
    }
  }, [searchParams, isAuthenticated, hasActiveSubscription, subscription, handleCheckout, isLoading])

  const handleManageBilling = async () => {
    let loadingToast = null
    try {
      loadingToast = document.createElement('div')
      loadingToast.textContent = 'Opening billing portal...'
      loadingToast.className = 'fixed top-4 right-4 bg-black text-white px-4 py-2 rounded-lg z-[9999]'
      document.body.appendChild(loadingToast)

      const { data } = await supabase.auth.getSession()
      const accessToken = data?.session?.access_token

      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload.error || 'Failed to open billing portal')
        return
      }
      if (payload.url) window.location.href = payload.url
      else alert('No billing portal URL returned')
    } catch (error) {
      console.error('Billing portal error:', error)
      alert('Failed to open billing portal')
    } finally {
      try {
        if (loadingToast) document.body.removeChild(loadingToast)
      } catch {}
    }
  }

  const handleShowSignIn = () => {
    setSelectedPriceId(null)
    setAuthInitialMode('signin')
    setShowAuthModal(true)
  }

  const handleSignOut = async () => {
    try {
      // Close any open panels and menus immediately
      setActivePanel(null)
      setShowSettingsMenu(false)
      
      // Clear policy acceptance
      if (session?.user?.id) clearPolicyAcceptance(session.user.id)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear local state
      setMessages([])
      setCurrentChatId(null)
      setSession(null)
      setHasActiveSubscription(false)
      setSubscription(null)
      
    } catch (e) {
      console.error('Sign out error', e)
    } finally {
      // Force redirect to home
      router.replace('/')
    }
  }

  const handleNewChat = useCallback(() => {
    setCurrentChatId(null)
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setSelectedPriceId(null)
    setActivePanel(null)
  }, [])

  const handleLoadHistory = useCallback(
    (entry) => {
      if (!entry) return
      setCurrentChatId(entry.id === 'local' ? null : entry.id)
      setMessages(
        (entry.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          citations: Array.isArray(m.citations) ? m.citations : [],
          hasImage: m.hasImage,
          image: m.hasImage ? null : undefined,
        }))
      )
      setInput('')
      setSelectedImage(null)
      // Switch to the appropriate panel based on if it has an image
      const hasImageInConvo = (entry.messages || []).some(m => m.hasImage)
      setActivePanel(hasImageInConvo ? 'image' : 'text')
    },
    []
  )

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (isSending) return

    if (!isAuthenticated) {
      setSelectedPriceId(null)
      setAuthInitialMode('signup')
      setShowAuthModal(true)
      return
    }

    const rawQuestion = safeTrim(input)
    const image = selectedImage || null

    // ✅ If user uploads an image only, give the API a sane default prompt
    const question =
      rawQuestion || (image ? 'Analyze this photo for any visible food safety violations.' : '')

    if (!question && !image) return

    setSendMode(image ? 'vision' : 'text')
    setSendKey((k) => k + 1)

    const newUserMessage = { role: 'user', content: question, image, hasImage: !!image }
    trackEvent(image ? AnalyticsEvents.PHOTO_SCAN : AnalyticsEvents.TEXT_QUESTION, {
      mode: image ? 'vision' : 'text',
    })

    const baseMessages = messages
    const outgoingLocalMessages = [...baseMessages, newUserMessage]

    // UI optimistically adds assistant placeholder
    setMessages((prev) => [...prev, newUserMessage, { role: 'assistant', content: '' }])

    setInput('')
    setSelectedImage(null)

    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto'
    }

    setIsSending(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
    shouldAutoScrollRef.current = true

    let activeChatId = currentChatId

    // ✅ abort any prior streaming (if any)
    try {
      abortRef.current?.abort?.()
    } catch {}
    abortRef.current = new AbortController()

    try {
      if (session && !activeChatId) {
        const { data: created } = await supabase
          .from('chats')
          .insert({
            user_id: session.user.id,
            title: (question || 'New chat').slice(0, 40),
          })
          .select()
          .single()

        if (created) {
          activeChatId = created.id
          setCurrentChatId(created.id)
        }
      }

      // ✅ Match /api/chat: send only role/content inside messages
      const apiMessages = normalizeOutgoingMessages(outgoingLocalMessages)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: apiMessages,
          image, // keep separate so vision routes can accept it
          chatId: activeChatId,
        }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          const data = await readAsJsonSafe(res)
          // Check if it's a free usage exhaustion
          if (data.code === 'FREE_USAGE_EXHAUSTED') {
            setDeviceUsageRemaining(0)
            setDeviceUsageBlocked(true)
          }
          setShowPricingModal(true)
          throw new Error(data.error || 'Subscription required for additional questions.')
        }
        if (res.status === 429) {
          const data = await readAsJsonSafe(res)
          throw new Error(data.error || data.message || 'Rate limit exceeded.')
        }
        if (res.status === 503) {
          const data = await readAsJsonSafe(res)
          throw new Error(data.error || data.message || 'Service temporarily unavailable.')
        }
        const data = await readAsJsonSafe(res)
        throw new Error(data.error || data.message || `Server error (${res.status})`)
      }

      const ct = (res.headers.get('content-type') || '').toLowerCase()

      // ✅ Streaming support (SSE or text streaming)
      if ((ct.includes('text/event-stream') || ct.includes('text/plain')) && res.body) {
        let last = ''
        await streamToAssistantText(res, (accumulated) => {
          last = accumulated
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: accumulated }
            return updated
          })
        })

        // If the stream ended but we didn’t get anything, show a fallback
        if (!safeTrim(last)) {
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: 'No response.' }
            return updated
          })
        }
        if (safeTrim(last).toUpperCase().includes('VIOLATIONS:')) {
          trackEvent(AnalyticsEvents.VIOLATION_FOUND)
        }
        return
      }

      // ✅ JSON response support (current route)
      const data = await res.json().catch(() => ({}))
      const citations = Array.isArray(data?.citations) ? data.citations : []

      // Common shapes: { message }, { text }, { output }, { response }
      const msg =
        data?.message ||
        data?.text ||
        data?.output ||
        data?.response ||
        (typeof data === 'string' ? data : '') ||
        'No response.'

      // If route returns chatId, keep in sync
      if (data?.chatId && !currentChatId) {
        setCurrentChatId(data.chatId)
      }

      if (safeTrim(msg).toUpperCase().includes('VIOLATIONS:')) {
        trackEvent(AnalyticsEvents.VIOLATION_FOUND)
      }

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: String(msg), citations }
        return updated
      })
    } catch (error) {
      console.error('Chat error:', error)

      const msg = String(error?.message || '')
      if (msg.toLowerCase().includes('trial has ended') || msg.toLowerCase().includes('subscription') || msg.toLowerCase().includes('free usage')) {
        setShowPricingModal(true)
      }

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${msg || 'Unknown error'}` }
        return updated
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      if (inputMode !== 'photo') setInputMode('photo')
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
    } catch (error) {
      console.error('Image compression error', error)
      alert('Failed to process image.')
    }
  }

  const buildReportText = useCallback((message, includeAllMessages = false) => {
    // ✅ Support exporting entire conversation or single message
    const messagesToExport = includeAllMessages ? messages : [message]
    
    if (!messagesToExport.length) return ''
    
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    })
    
    let report = `FOOD SAFETY ANALYSIS REPORT\nGenerated: ${timestamp}\n\n`
    report += `${'='.repeat(60)}\n\n`
    
    messagesToExport.forEach((msg, idx) => {
      if (msg.role === 'user') {
        const content = safeTrim(msg.content || '')
        if (content) {
          report += `QUESTION ${idx + 1}:\n${content}\n\n`
        }
        if (msg.hasImage || msg.image) {
          report += `[Image was analyzed]\n\n`
        }
      } else if (msg.role === 'assistant') {
        const normalized = normalizeAssistantText(msg.content || '')
        if (normalized) {
          report += `ANALYSIS ${idx + 1}:\n${normalized}\n\n`
          
          // Add citations
          if (Array.isArray(msg.citations) && msg.citations.length > 0) {
            report += `SOURCES:\n`
            msg.citations.forEach((c) => {
              const source = safeTrim(c?.source)
              const page = safeTrim(c?.page)
              const county = safeTrim(c?.county)
              const snippet = safeTrim(c?.snippet)
              const label = [source, page ? `p.${page}` : null].filter(Boolean).join(' ')
              const extras = [county ? `County: ${county}` : null, snippet].filter(Boolean).join(' — ')
              const line = [label, extras].filter(Boolean).join(' | ')
              if (line) report += `  • ${line}\n`
            })
            report += `\n`
          }
        }
      }
      report += `${'-'.repeat(60)}\n\n`
    })
    
    report += `\nEND OF REPORT\n`
    report += `\nThis report was generated by protocolLM - Food Safety Compliance Assistant\n`
    
    return report
  }, [messages])

  const handleDownloadReport = useCallback(
    (message, exportAll = false) => {
      const text = buildReportText(message, exportAll)
      if (!text) return

      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = exportAll 
        ? `protocolLM-full-report-${timestamp}.txt`
        : `protocolLM-analysis-${timestamp}.txt`

      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 1500)
    },
    [buildReportText]
  )

  const handleShareResults = useCallback(
    async (message, shareAll = false) => {
      const text = buildReportText(message, shareAll)
      if (!text || typeof navigator === 'undefined') return

      try {
        if (navigator.share) {
          await navigator.share({ title: 'Food Safety Analysis', text })
          return
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          alert('Analysis copied to clipboard.')
          return
        }
        alert('Sharing is not supported on this device.')
      } catch (error) {
        console.error('Share failed', error)
        alert('Unable to share results right now.')
      }
    },
    [buildReportText]
  )

  useEffect(() => {
    if (!historyReady) return
    if (!hasPaidAccess) return
    if (!messages.length) return

    const entryId = currentChatId || 'local'
    const firstUserMessage = messages.find((m) => m.role === 'user' && safeTrim(m.content))
    const previewSource = [...messages].reverse().find((m) => safeTrim(m.content))

    const title =
      safeTrim(firstUserMessage?.content) ||
      (messages.find((m) => m.hasImage || m.image) ? 'Photo analysis' : 'Chat session')
    const preview = safeTrim(previewSource?.content || '')

    const trimmedMessages = messages.map((m) => ({
      role: m.role,
      content: safeTrim(m.content || ''),
      hasImage: Boolean(m.image || m.hasImage),
      citations: Array.isArray(m.citations) ? m.citations : [],
    }))

    setChatHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== entryId)
      return [
        { id: entryId, title: title || 'Chat', preview, updatedAt: Date.now(), messages: trimmedMessages },
        ...filtered,
      ].slice(0, 25)
    })
  }, [messages, currentChatId, hasPaidAccess, historyReady])

  if (isLoading) {
    return (
      <div className={`loading-screen ${plusJakarta.className}`}>
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={69} height={69} priority />
          </div>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          color-scheme: light;

          --bg-0: rgba(5, 7, 13, 0.72);
          --bg-1: rgba(7, 10, 18, 0.78);
          --bg-2: rgba(9, 13, 22, 0.82);
          --bg-3: rgba(255, 255, 255, 0.1);

          --ink-0: #f6f9ff;
          --ink-1: rgba(240, 244, 255, 0.86);
          --ink-2: rgba(214, 222, 240, 0.76);
          --ink-3: rgba(178, 190, 215, 0.6);

          --accent: #2383e2;
          --accent-hover: #1a73d2;
          --accent-dim: rgba(95, 168, 255, 0.2);
          --footer-links-z: 15;

          --border-subtle: rgba(255, 255, 255, 0.18);
          --border-default: rgba(255, 255, 255, 0.32);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-full: 9999px;

          --landing-topbar-h: 74px;

          /* ✅ Chat dock sizing + safe room (prevents needing to scroll page to “reach” the dock) */
          --chat-dock-room: 96px;

          /* ✅ Light “Apple frosted glass” tokens for modals + composer */
          --glass-ink: #0b1324;
          --glass-ink-70: rgba(11, 19, 36, 0.7);
          --glass-ink-55: rgba(11, 19, 36, 0.55);
          --glass-bg: rgba(255, 255, 255, 0.56);
          --glass-bg-strong: rgba(255, 255, 255, 0.68);
          --glass-border: rgba(255, 255, 255, 0.55);
          --glass-shadow: 0 26px 80px rgba(10, 18, 35, 0.22);
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body {
          height: 100%;
          margin: 0;
          background: transparent;
          background-color: transparent;
          color: var(--ink-0);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;

          /* ✅ prevents iOS “soft” text scaling / odd rasterization in overlays */
          -webkit-text-size-adjust: 100%;
          text-rendering: optimizeLegibility;
          -moz-osx-font-smoothing: grayscale;
          overscroll-behavior-y: none;
        }

        @supports (-webkit-touch-callout: none) {
          html {
            height: -webkit-fill-available;
          }
          body {
            min-height: -webkit-fill-available;
          }
        }

        a,
        button,
        input,
        textarea {
          -webkit-tap-highlight-color: transparent;
        }
        :focus {
          outline: none;
        }

        ::selection {
          background: var(--accent-dim);
          color: var(--ink-0);
        }

        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-full);
        }

        /* Loading */
        .loading-screen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-0);
          z-index: 9999;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }

        .loading-logo {
          width: 69px;
          height: 69px;
        }

        .loading-bar {
          width: 160px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
        }

        .loading-bar-fill {
          height: 100%;
          width: 30%;
          background: var(--accent);
          animation: loading-slide 1s ease-in-out infinite;
        }

        @keyframes loading-slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        /* ✅ Modal base */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background: rgba(0, 0, 0, 0.32);
          animation: modal-fade 0.14s ease;
        }

        @keyframes modal-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          width: 100%;
          max-width: 540px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* ✅ Matte auth surface */
        .auth-surface {
          width: 100%;
          position: relative;
          border-radius: 16px;
          padding: 22px;
          background: #f9f9f7;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.08);
          color: var(--ink);
          overflow: hidden;
        }

        /* ✅ Pricing modal - matches auth-surface (NO liquid glass) */
        .pricing-modal-flat {
          width: 100%;
          max-width: 520px;
          position: relative;
          border-radius: 16px;
          padding: 28px;
          background: #f9f9f7;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.08);
          color: var(--ink);
          overflow: hidden;
        }

        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #ffffff;
          color: var(--ink);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .modal-close svg {
          display: block;
          pointer-events: none;
        }

        .modal-close:hover {
          background: #f5f5f4;
          border-color: rgba(0, 0, 0, 0.12);
        }

        .modal-header {
          padding-right: 42px;
          margin-bottom: 12px;
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 840;
          letter-spacing: -0.02em;
          color: var(--ink);
        }

        /* Auth form styling (light glass) */
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 750;
          color: rgba(15, 23, 42, 0.7);
        }

        .form-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-input {
          width: 100%;
          height: 46px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #ffffff;
          color: var(--ink);
          font-size: 14px;
          font-weight: 650;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: rgba(0, 0, 0, 0.16);
          box-shadow: 0 0 0 3px rgba(52, 120, 235, 0.16);
          background: #ffffff;
        }

        .form-toggle-vis {
          position: absolute;
          right: 10px;
          height: 30px;
          padding: 0 10px;
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #f4f4f3;
          color: rgba(15, 23, 42, 0.82);
          cursor: pointer;
          font-weight: 800;
          font-size: 12px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .form-toggle-vis:hover {
          background: #ecebea;
          border-color: rgba(0, 0, 0, 0.12);
        }

        /* ✅ Match landing/chat CTA vibe (blue accent) */
        .btn-submit {
          height: 46px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #2f7be5;
          color: #fff;
          font-weight: 820;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 26px rgba(47, 123, 229, 0.2);
          transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(47, 123, 229, 0.24);
          border-color: rgba(0, 0, 0, 0.12);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(0px);
        }

        .btn-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.45);
          border-top-color: #fff;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-message {
          margin-top: 10px;
          font-size: 13px;
          font-weight: 750;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.65);
          color: rgba(15, 23, 42, 0.86);
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
        }
        .modal-message.ok {
          border-color: rgba(34, 197, 94, 0.35);
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }
        .modal-message.err {
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }

        .modal-footer {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          text-align: center;
        }

        .modal-link {
          background: transparent;
          border: none;
          color: rgba(15, 23, 42, 0.74);
          font-weight: 850;
          font-size: 12px;
          cursor: pointer;
          padding: 0 2px;
          transition: color 0.15s ease;
        }
        .modal-link:hover {
          color: var(--ink);
        }

        /* Pricing */
        .pricing-modal {
          padding: 24px;
        }

        .pricing-top {
          padding-right: 42px;
        }

        .pricing-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 9999px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.58);
          color: rgba(15, 23, 42, 0.78);
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 10px;
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
        }

        .pricing-pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: rgba(95, 168, 255, 0.95);
          box-shadow: 0 0 0 6px rgba(95, 168, 255, 0.12);
        }

        .pricing-title {
          margin-bottom: 6px;
        }

        .pricing-sub {
          margin: 0 0 12px 0;
          color: rgba(30, 41, 59, 0.72);
          font-size: 13.5px;
          line-height: 1.6;
          font-weight: 650;
        }

        .pricing-content {
          margin-top: 12px;
        }

        .pricing-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .pricing-plan {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pricing-plan-name {
          font-size: 14px;
          font-weight: 900;
          color: var(--ink);
          letter-spacing: -0.01em;
        }

        .pricing-plan-badge {
          display: inline-flex;
          width: fit-content;
          padding: 5px 9px;
          border-radius: 9999px;
          border: 1px solid rgba(95, 168, 255, 0.22);
          background: rgba(95, 168, 255, 0.12);
          color: rgba(15, 23, 42, 0.82);
          font-size: 11px;
          font-weight: 900;
        }

        .pricing-price {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .pricing-price-amount {
          font-size: 22px;
          font-weight: 950;
          color: var(--ink);
          letter-spacing: -0.03em;
        }

        .pricing-price-term {
          font-size: 12px;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.62);
        }

        .pricing-list {
          list-style: none;
          padding: 0;
          margin: 10px 0 14px 0;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .pricing-list li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(15, 23, 42, 0.82);
          font-weight: 750;
        }

        .pricing-check {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(95, 168, 255, 0.14);
          border: 1px solid rgba(95, 168, 255, 0.22);
          color: rgba(15, 23, 42, 0.88);
          font-weight: 950;
        }

        .pricing-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }

        /* ✅ Match landing/chat CTA vibe (blue accent) */
        .pricing-primary {
          height: 46px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: linear-gradient(180deg, rgba(95, 168, 255, 0.98), rgba(95, 168, 255, 0.78));
          color: #fff;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 16px 44px rgba(95, 168, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          transition: transform 0.12s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }

        .pricing-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px rgba(95, 168, 255, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.4);
          filter: saturate(1.03);
        }

        .pricing-primary:active:not(:disabled) {
          transform: translateY(0px);
        }

        .pricing-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .pricing-secondary {
          height: 42px;
          border-radius: 9999px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.64);
          color: rgba(15, 23, 42, 0.86);
          font-weight: 900;
          cursor: pointer;
          transition: background 0.15s ease;
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
        }

        .pricing-secondary:hover {
          background: rgba(255, 255, 255, 0.86);
        }

        .pricing-fineprint {
          margin: 12px 2px 0;
          font-size: 11.5px;
          line-height: 1.5;
          color: rgba(15, 23, 42, 0.62);
          font-weight: 800;
          text-align: center;
        }

        .pricing-link {
          color: rgba(15, 23, 42, 0.78);
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
        }

        /* Multi-location selector */
        .multi-location-selector {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .multi-location-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.82);
          margin-bottom: 10px;
        }

        .multi-location-input-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .multi-location-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.8);
          color: rgba(15, 23, 42, 0.86);
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }

        .multi-location-btn:hover {
          background: rgba(255, 255, 255, 1);
        }

        .multi-location-input {
          width: 80px;
          height: 40px;
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.9);
          color: var(--ink);
        }

        .multi-location-input:focus {
          outline: none;
          border-color: rgba(95, 168, 255, 0.5);
          box-shadow: 0 0 0 3px rgba(95, 168, 255, 0.15);
        }

        .multi-location-total {
          text-align: center;
          font-size: 16px;
          font-weight: 800;
          color: var(--ink);
        }

        /* App */
        .app-container {
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: transparent;
          overflow: hidden; /* ✅ critical: prevents page scroll behind the chat */
        }

        /* Brand */
        .plm-brand {
          color: #0b1220;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .plm-brand:hover {
          opacity: 0.7;
        }

        .plm-brand-inner {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .plm-brand-mark {
          width: 148px;
          height: 148px;
          flex-shrink: 0;
        }

        .plm-logo-img,
        .plm-brand-mark img {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
          display: block;
        }

        .plm-brand-wrap {
          min-width: 0;
        }

        .plm-brand-text {
          font-size: 18.5px;
          font-weight: 750;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: visible;
          padding-left: 2px;
          padding-bottom: 7px;
          line-height: 1.4;
        }

        .plm-brand.chat .plm-brand-inner {
          gap: 0;
        }
        .plm-brand.chat .plm-brand-mark {
          width: 116px;
          height: 116px;
        }

        .landing-topbar .plm-brand-inner {
          align-items: center;
          gap: 10px;
        }

        .landing-topbar .plm-brand-mark {
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 4px;
        }

        /* ✅ UPDATED LOGO TRANSFORM (desktop) - 10% larger than before */
        .landing-topbar .plm-logo-img {
          transform: translateY(2px) scale(1.30);
          transform-origin: center;
        }

        .landing-topbar .plm-brand-text {
          line-height: 1.5;
          position: relative;
          top: 1px;
          font-size: 18px;
          padding-bottom: 0;
          display: flex;
          align-items: center;
        }

        /* Shared icon button styling */
        .plm-icon-btn {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          cursor: pointer;
          border: 1px solid var(--border);
          color: var(--ink);
          background: var(--surface);
          backdrop-filter: blur(10px) saturate(125%);
          -webkit-backdrop-filter: blur(10px) saturate(125%);
          box-shadow: var(--shadow-sm);
          transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease,
            color 0.15s ease;
          user-select: none;
        }

        .plm-icon-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(15, 23, 42, 0.2);
          box-shadow: 0 16px 42px rgba(5, 7, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .plm-icon-btn:active {
          transform: translateY(0px);
        }

        .plm-icon-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .plm-icon-btn.primary {
          color: #fff;
          border-color: rgba(255, 255, 255, 0.28);
          background: linear-gradient(180deg, rgba(95, 168, 255, 0.98), rgba(95, 168, 255, 0.78));
          box-shadow: 0 16px 44px rgba(95, 168, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .plm-icon-btn.primary:hover {
          box-shadow: 0 18px 48px rgba(95, 168, 255, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        /* Landing */
        .landing-root {
          position: relative;
          padding-top: calc(env(safe-area-inset-top) + var(--landing-topbar-h) + 18px);
          padding-bottom: calc(env(safe-area-inset-bottom) + 72px); /* ✅ room for fixed footer */
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: transparent;
          overflow: hidden;
          isolation: isolate;
        }

        .landing-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 30;
          height: calc(env(safe-area-inset-top) + var(--landing-topbar-h));
          padding: env(safe-area-inset-top) max(18px, env(safe-area-inset-right) + 10px) 0
            max(18px, env(safe-area-inset-left) + 10px);
          display: flex;
          align-items: stretch;
          background: var(--surface);
          backdrop-filter: blur(12px) saturate(125%);
          -webkit-backdrop-filter: blur(12px) saturate(125%);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
        }

        .landing-topbar-inner {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          height: var(--landing-topbar-h);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: none;
          padding: 0;
        }

        .landing-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 100%;
        }

        .btn-nav {
          height: 34px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.9);
          color: #0b1220;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
          align-self: center;
        }

        .start-trial-btn {
          background: var(--accent);
          color: #fff;
          border-color: rgba(95, 168, 255, 0.3);
          box-shadow: 0 12px 30px rgba(95, 168, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          font-weight: 800;
        }

        .start-trial-btn:hover {
          background: var(--accent-hover);
          box-shadow: 0 14px 34px rgba(95, 168, 255, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .btn-nav:hover {
          color: #05070d;
          background: #fff;
          border-color: rgba(15, 23, 42, 0.18);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
        }

        .landing-signin-btn {
          color: #0b1220 !important;
          font-weight: 700 !important;
        }

        .btn-primary {
          height: 36px;
          padding: 0 16px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }

        .btn-primary:hover {
          background: var(--accent-hover);
        }

        .landing-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 34px 24px calc(env(safe-area-inset-bottom) + 28px);
          min-height: 0;
        }

        @media (min-width: 1024px) {
          .landing-hero {
            align-items: flex-end;
            padding: clamp(32px, 8vh, 72px) 32px clamp(46px, 11vh, 108px);
          }
        }

        .landing-hero-card {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
        }

        /* ✅ Override LiquidGlass with light Apple-style glass effect
         * Reduced opacity to show kitchen background clearly through the card
         * Maintains text readability while achieving true see-through glass aesthetic
         * Note: Using !important to override LiquidGlass component styles without modifying
         * the shared component itself (minimal change approach) */
        .landing-hero-card.landing-hero-card--terms-style {
          position: relative;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.034)) !important;
          border: none !important;
          border-radius: 8px !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38) !important;
          padding: 40px 48px;
        }

        /* ✅ Subtle gradient border matching ProtocolLM brand colors (blue, gray, orange, muted green)
         * Uses pseudo-element with mask technique for Safari/iOS compatibility
         * Preserves border-radius and maintains glass-like transparency */
        .landing-hero-card.landing-hero-card--terms-style::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 8px;
          padding: 1.5px;
          background: linear-gradient(
            135deg,
            rgba(95, 168, 255, 0.45) 0%,
            rgba(148, 163, 184, 0.35) 25%,
            rgba(251, 146, 60, 0.38) 55%,
            rgba(134, 179, 148, 0.32) 80%,
            rgba(95, 168, 255, 0.45) 100%
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 0;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          max-width: 720px;
          width: 100%;
          text-align: center;
        }

        .hero-headings {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .hero-title {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 800;
          color: var(--ink);
          letter-spacing: -0.03em;
          margin: 0;
        }

        .hero-break {
          display: none;
        }

        .hero-nowrap {
          white-space: nowrap;
        }

        .hero-support {
          margin: 0;
          font-size: 16px;
          line-height: 1.65;
          color: #0f172a;
          max-width: 52ch;
        }

        .hero-divider {
          width: 68px;
          height: 3px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #38bdf8, #3b82f6, #f97316);
          box-shadow: 0 10px 26px rgba(5, 7, 13, 0.12);
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          flex-direction: row;
          margin-top: 14px;
          padding-top: 6px;
        }

        .hero-arrow-text {
          white-space: nowrap;
          color: rgba(15, 23, 42, 0.82);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .hero-arrow-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          color: rgba(15, 23, 42, 0.72);
          border-radius: 9999px;
          border: 1px solid rgba(15, 23, 42, 0.18);
          background: rgba(255, 255, 255, 0.22);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 10px 26px rgba(5, 7, 13, 0.18);
          animation: arrow-pulse-alt 1.6s ease-in-out infinite;
        }

        @keyframes arrow-pulse-alt {
          0%,
          100% {
            transform: translateX(0);
            opacity: 0.65;
          }
          50% {
            transform: translateX(3px);
            opacity: 1;
          }
        }

        .hero-arrow-icon svg {
          width: 16px;
          height: 16px;
          stroke-width: 2.4;
        }

        .hero-cta {
          position: relative;
          padding: 0 18px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          border-radius: var(--radius-full);
          overflow: visible;
          box-shadow: 0 12px 30px rgba(95, 168, 255, 0.24);
          transition: transform 0.12s ease;
          white-space: nowrap;
        }

        .hero-cta-trace {
          position: relative;
        }

        .hero-cta-trace::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: var(--radius-full);
          padding: 1px;
          background: conic-gradient(
            from var(--trace-angle, 0deg),
            transparent 0deg,
            transparent 30deg,
            rgba(255, 255, 255, 0.4) 60deg,
            rgba(255, 255, 255, 0.15) 90deg,
            transparent 120deg,
            transparent 360deg
          );
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          pointer-events: none;
        }

        .hero-cta-trace::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: var(--radius-full);
          background: radial-gradient(circle at 30% 30%, rgba(95, 168, 255, 0.25), transparent 40%);
          opacity: 0.4;
          filter: blur(12px);
          pointer-events: none;
        }

        .hero-cta:hover {
          transform: translateY(-1px);
        }

        .hero-cta:active {
          transform: translateY(0);
        }

        @media (min-width: 1024px) {
          .hero-support {
            white-space: nowrap;
            max-width: none;
          }
        }

        /* ✅ Footer links pinned below chat bar */
        .plm-footer-links {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 10px 16px calc(env(safe-area-inset-bottom) + 12px);
          flex-wrap: wrap;
          pointer-events: auto;
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: var(--footer-links-z);
        }

        .chat-root .plm-footer-links {
          position: static;
          bottom: auto;
          margin-top: 4px;
          padding: 8px 12px calc(env(safe-area-inset-bottom) + 4px);
          align-self: center;
        }

        .plm-footer-link {
          color: rgba(15, 23, 42, 0.6);
          text-decoration: none;
          font-size: 11px;
          font-weight: 650;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: color 0.15s ease;
        }

        .plm-footer-link:hover {
          color: rgba(15, 23, 42, 0.82);
        }
        .plm-footer-sep {
          color: rgba(15, 23, 42, 0.45);
        }

        /* ✅ Chat: full-viewport, no page scroll, dock fixed to bottom */
        .chat-root {
          position: fixed; /* ✅ key fix: makes the whole chat a viewport app */
          inset: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: transparent;
        }

        @supports (-webkit-touch-callout: none) {
          .chat-root {
            height: -webkit-fill-available;
          }
        }

        .chat-topbar {
          --chat-topbar-pad: max(20px, env(safe-area-inset-top) + 18px);
          --chat-topbar-side: max(
            calc(var(--chat-topbar-pad) + 8px),
            env(safe-area-inset-left) + 22px,
            env(safe-area-inset-right) + 22px
          );
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          width: 100%;
          padding: var(--chat-topbar-pad) var(--chat-topbar-side) 0 var(--chat-topbar-side);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: transparent;
        }

        .chat-top-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .chat-top-title {
          margin: 0;
          font-size: 15px;
          font-weight: 850;
          letter-spacing: -0.01em;
          color: rgba(15, 23, 42, 0.9);
        }

        .chat-top-sub {
          margin: 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.62);
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-right: 0;
          padding: 0 8px; /* keep equal breathing room left/right of the gear */
        }

        .chat-history-toggle {
          height: 34px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.82);
          color: rgba(15, 23, 42, 0.82);
          font-weight: 780;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(5, 7, 13, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.55);
          transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .chat-history-toggle:hover {
          transform: translateY(-1px);
          border-color: rgba(15, 23, 42, 0.15);
          box-shadow: 0 16px 34px rgba(5, 7, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.62);
        }

        .chat-settings-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: 0 16px 48px rgba(5, 7, 13, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          animation: dropdown-in 0.15s ease;
          z-index: 50;
        }

        .chat-settings-item {
          width: 100%;
          text-align: left;
          padding: 10px 10px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .chat-settings-item:hover {
          background: rgba(15, 23, 42, 0.08);
        }

        .chat-settings-sep {
          height: 1px;
          background: rgba(15, 23, 42, 0.12);
          margin: 6px 2px;
        }

        .chat-shell {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          padding: calc(max(130px, env(safe-area-inset-top) + 115px)) 18px
            calc(env(safe-area-inset-bottom) + var(--chat-dock-room) + 28px);
          background: transparent;
        }

        .chat-shell.history-open {
          grid-template-columns: 1fr;
        }

        @media (min-width: 1100px) {
          .chat-shell.history-open {
            grid-template-columns: minmax(260px, 320px) 1fr;
          }
        }

        .chat-history-panel {
          display: none;
          min-height: 0;
        }

        .chat-history-panel.open {
          display: block;
        }

        @media (min-width: 1100px) {
          .chat-history-panel {
            display: block;
          }
        }

        .chat-main-area {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chat-messages {
          position: relative;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chat-messages.empty {
          align-items: center;
          justify-content: center;
        }

        .chat-messages:not(.empty) {
          justify-content: flex-end;
        }

        .chat-empty-text {
          font-size: 15px;
          color: rgba(15, 23, 42, 0.86);
          line-height: 1.6;
          margin: 0;
          text-align: center;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.28);
          padding: 12px 8px 12px 14px;
          border-radius: 14px;
          backdrop-filter: blur(16px) saturate(120%);
          -webkit-backdrop-filter: blur(16px) saturate(120%);
        }

        /* Radial menu wrapper for centered positioning */
        .radial-menu-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 300px;
        }

        .hero-overlay-block {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 6px;
        }

        .hero-overlay-glass {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          max-width: 560px;
          width: 100%;
          color: var(--ink);
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.32);
          box-shadow: 0 18px 48px rgba(5, 7, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(16px) saturate(125%);
          -webkit-backdrop-filter: blur(16px) saturate(125%);
          border-radius: 20px;
          padding: 16px 18px;
        }

        .hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: rgba(15, 23, 42, 0.85);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: -0.01em;
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
          box-shadow: 0 10px 26px rgba(5, 7, 13, 0.14);
        }

        .hero-overlay-title {
          margin: 0;
          font-size: clamp(28px, 5vw, 44px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: rgba(15, 23, 42, 0.95);
          text-align: left;
        }

        .hero-underline {
          height: 3px;
          width: 64px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #38bdf8, #6366f1, #a855f7);
        }

        .hero-overlay-text {
          margin: 0;
          font-size: 16px;
          line-height: 1.7;
          color: rgba(30, 41, 59, 0.78);
          max-width: 46ch;
        }

        .hero-cta-inline {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hero-cta-note {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: rgba(239, 68, 68, 0.9);
        }

        @media (min-width: 768px) {
          .hero-overlay-block {
            justify-content: flex-start;
            padding-left: 10px;
          }
        }

        @media (max-width: 767px) {
          .hero-overlay-glass {
            text-align: center;
            align-items: center;
          }

          .hero-overlay-title {
            text-align: center;
          }

          .hero-overlay-text {
            text-align: center;
          }
        }

        .chat-history-shell {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .chat-history-surface {
          border-radius: 18px !important;
          padding: 18px 16px !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58), 0 18px 48px rgba(5, 7, 13, 0.16) !important;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .chat-history-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .chat-history-title {
          font-size: 15px;
          font-weight: 800;
          color: rgba(15, 23, 42, 0.88);
          margin: 0;
        }

        .chat-history-sub {
          margin: 2px 0 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.65);
        }

        .chat-history-new {
          height: 34px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.78);
          color: rgba(15, 23, 42, 0.9);
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 12px 32px rgba(5, 7, 13, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          transition: transform 0.12s ease, box-shadow 0.15s ease;
        }

        .chat-history-new:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 40px rgba(5, 7, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.64);
        }

        .chat-history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .chat-history-item {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.06);
          background: rgba(255, 255, 255, 0.75);
          color: rgba(15, 23, 42, 0.9);
          cursor: pointer;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 6px;
          box-shadow: 0 10px 28px rgba(5, 7, 13, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.45);
          transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .chat-history-item:hover {
          transform: translateY(-1px);
          border-color: rgba(15, 23, 42, 0.12);
          box-shadow: 0 14px 36px rgba(5, 7, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .chat-history-item-title {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--ink);
        }

        .chat-history-item-preview {
          margin: 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.65);
          grid-column: 1 / -1;
        }

        .chat-history-empty {
          font-size: 12px;
          color: rgba(15, 23, 42, 0.65);
          margin: 0;
        }

        .chat-history-pill {
          font-size: 11px;
          font-weight: 800;
          color: rgba(15, 23, 42, 0.7);
          background: rgba(95, 168, 255, 0.15);
          border: 1px solid rgba(95, 168, 255, 0.3);
          padding: 4px 8px;
          border-radius: 999px;
        }

        /* ✅ Frosted glass card for chat conversation - fixed height, scrollable content */
        .chat-history-card {
          max-width: 960px; /* Align with widened chat input */
          margin: 0 auto;
          width: 100%;
          flex: 1;
          min-height: 0; /* Important for flex child to allow shrinking */
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 28px;
        }

        .chat-history {
          max-width: 100%;
          margin: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-top: 8px;
          padding-bottom: 8px;
        }

        .chat-message {
          display: flex;
          width: 100%;
          align-items: flex-start;
        }
        .chat-message-user {
          justify-content: flex-end;
        }
        .chat-message-assistant {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 70%;
          font-size: 15px;
          line-height: 1.7;
          display: block;
        }

        .chat-bubble-user {
          color: var(--ink-0);
        }
        .chat-bubble-assistant {
          color: rgba(15, 23, 42, 0.86);
        }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 12px;
          display: inline-block;
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 280px;
          object-fit: contain;
        }

        .chat-upload-preview.placeholder img {
          display: none;
        }

        .chat-upload-ghost {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(15, 23, 42, 0.1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(15, 23, 42, 0.65);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .chat-content {
          display: block;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* ✅ Response styling - No violations (green) */
        .chat-no-violations {
          color: #16a34a;
          font-weight: 700;
          font-size: 16px;
        }

        /* ✅ Response styling - Violations header (red) */
        .chat-violations-header {
          color: #dc2626;
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 8px;
        }

        /* ✅ Response styling - Violation item */
        .chat-violation-item {
          margin-bottom: 12px;
          padding-left: 12px;
          border-left: 3px solid #dc2626;
        }

        .chat-violation-type {
          color: #dc2626;
          font-weight: 700;
        }

        .chat-violation-fix {
          color: rgba(15, 23, 42, 0.86);
        }

        /* ✅ Response styling - Need info (amber) */
        .chat-need-info-header {
          color: #d97706;
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 8px;
        }

        .chat-citations {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .citation-chip {
          position: relative;
        }

        .citation-pill {
          border: 1px solid rgba(15, 23, 42, 0.18);
          background: rgba(95, 168, 255, 0.12);
          color: rgba(15, 23, 42, 0.82);
          border-radius: 999px;
          font-weight: 700;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          box-shadow: 0 10px 24px rgba(5, 7, 13, 0.08);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .citation-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 32px rgba(5, 7, 13, 0.12);
        }

        .citation-popover {
          position: absolute;
          z-index: 40;
          top: calc(100% + 8px);
          left: 0;
          min-width: 240px;
          max-width: 320px;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 18px 44px rgba(5, 7, 13, 0.22);
          color: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .citation-popover-header {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 6px;
          font-weight: 700;
        }

        .citation-popover-source {
          color: var(--ink);
        }

        .citation-popover-page {
          color: rgba(15, 23, 42, 0.7);
          font-size: 12px;
        }

        .citation-popover-county {
          font-size: 12px;
          color: rgba(15, 23, 42, 0.7);
          margin: 4px 0;
        }

        .citation-popover-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(15, 23, 42, 0.86);
        }

        .chat-thinking {
          display: block;
          color: rgba(15, 23, 42, 0.7);
          font-style: italic;
        }

        /* ✅ Dock is fixed to viewport bottom (not sticky inside scroll) */
        .chat-input-area {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 25;
          background: transparent;
          pointer-events: none; /* allows clicks only inside inner */
        }

        .chat-input-inner {
          pointer-events: auto;
          max-width: 980px;
          width: 100%;
          margin: 0 auto;
          padding: 8px 18px;
          padding-bottom: calc(env(safe-area-inset-bottom) + 10px);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ✅ FIX: DO NOT override LiquidGlass with transparent/none (this was causing the “matte white” bar) */
        .chat-dock {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px 14px;
          color-scheme: light; /* helps iOS inputs render correctly */
        }

        .chat-dock-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chat-dock-title {
          margin: 0;
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-weight: 820;
          color: rgba(15, 23, 42, 0.7);
        }

        .chat-dock-sub {
          margin: 2px 0 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.58);
        }

        .chat-mode-toggle {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 8px;
        }

        .chat-mode-btn {
          position: relative;
          border-radius: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.18);
          color: rgba(15, 23, 42, 0.85);
          font-weight: 750;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38), 0 12px 30px rgba(5, 7, 13, 0.12);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, transform 0.12s ease,
            color 0.15s ease;
        }

        .chat-mode-btn::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 16px;
          border: 1px solid transparent;
          box-shadow: 0 0 0 0 rgba(95, 168, 255, 0.14);
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
          pointer-events: none;
        }

        .chat-mode-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(5, 7, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .chat-mode-btn.active {
          background: linear-gradient(180deg, rgba(95, 168, 255, 0.14), rgba(95, 168, 255, 0.06));
          border-color: rgba(95, 168, 255, 0.45);
          box-shadow: 0 18px 44px rgba(95, 168, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.5);
          color: var(--ink);
        }

        .chat-mode-btn.active::after {
          border-color: rgba(95, 168, 255, 0.5);
          box-shadow: 0 0 0 4px rgba(95, 168, 255, 0.16);
        }

        .chat-mode-label {
          font-size: 14px;
          letter-spacing: -0.01em;
        }

        .chat-mode-sub {
          font-size: 12px;
          color: rgba(15, 23, 42, 0.7);
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin: 4px 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.86);
        }

        .chat-attachment-icon {
          color: var(--accent);
          display: flex;
        }

        .chat-attachment-remove {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(15, 23, 42, 0.72);
          cursor: pointer;
        }

        .chat-attachment-remove:hover {
          color: rgba(15, 23, 42, 0.9);
        }

        .chat-input-row {
          display: flex;
          align-items: stretch;
          gap: 12px;
          width: 100%;
        }

        .chat-input-row.photo-mode {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.28);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 16px 44px rgba(5, 7, 13, 0.12);
          justify-content: flex-start;
        }

        .chat-input-row.chat-mode {
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 16px 44px rgba(5, 7, 13, 0.12);
        }

        .chat-photo-hint {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          color: rgba(15, 23, 42, 0.9);
        }

        .chat-photo-title {
          font-weight: 780;
          font-size: 14px;
          letter-spacing: -0.01em;
        }

        .chat-photo-sub {
          margin: 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.7);
        }

        /* ✅ Input wrapper: keep it frosted, but less “flat white” */
        .chat-input-wrapper {
          flex: 1 1 100%;
          width: 100%;
          display: flex;
          align-items: flex-end;
          border-radius: var(--radius-md);
          min-width: 0;
          min-height: 48px;
          padding-right: 6px;

          background: rgba(255, 255, 255, 0.46);
          border: 1px solid var(--border);
          box-shadow: 0 16px 44px rgba(5, 7, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(14px) saturate(130%);
          -webkit-backdrop-filter: blur(14px) saturate(130%);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .chat-input-wrapper:focus-within {
          border-color: rgba(15, 23, 42, 0.26);
          box-shadow: 0 0 0 3px rgba(95, 168, 255, 0.16), 0 18px 48px rgba(5, 7, 13, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.56);
        }

        .chat-textarea {
          flex: 1;
          min-height: 44px;
          max-height: 160px;
          padding: 12px 8px 12px 14px;
          background: transparent;
          border: none;
          color: rgba(15, 23, 42, 0.96);
          font-size: 16px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .chat-textarea::placeholder {
          color: rgba(15, 23, 42, 0.7);
        }
        .chat-textarea:focus {
          outline: none;
        }

        /* ✅ Send button inside input wrapper */
        .chat-send-btn {
          flex-shrink: 0;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          margin: 0;
          align-self: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 11px;
          color: rgba(15, 23, 42, 0.72);
          margin-top: 8px;
        }

        .chat-disclaimer .inline-link {
          background: none;
          border: none;
          padding: 0;
          color: rgba(95, 168, 255, 0.95);
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .chat-disclaimer .inline-link:hover {
          color: rgba(95, 168, 255, 1);
        }

        /* ✅ Tool-First UI Styles */
        .tool-first-ui .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tool-first-ui .chat-messages {
          background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.04), transparent 35%),
            radial-gradient(circle at 80% 0%, rgba(95, 168, 255, 0.06), transparent 42%);
        }

        .tool-first-ui .chat-history-card {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 20px 60px rgba(5, 7, 13, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.28);
          padding: 18px;
          border-radius: 18px;
        }

        .tool-first-ui .chat-history {
          gap: 22px;
        }

        .tool-first-ui .chat-message {
          flex-direction: column;
          gap: 12px;
        }

        .tool-first-ui .chat-message-user {
          justify-content: flex-start;
        }

        .tool-first-ui .chat-input-row {
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .tool-first-ui .chat-camera-btn {
          width: 52px;
          height: 52px;
          margin-right: 2px;
          border-radius: 16px;
        }

        .tool-first-ui .chat-input-wrapper {
          flex: 1 1 100%;
          min-height: 48px;
          max-width: none;
        }

        .tool-first-ui .chat-textarea {
          font-size: 14px;
          padding: 10px 12px;
        }

        .tool-first-ui .chat-send-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .chat-analyze-btn {
          height: 46px;
          padding: 0 18px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.34);
          background: linear-gradient(180deg, rgba(95, 168, 255, 0.95), rgba(95, 168, 255, 0.78));
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 14px 40px rgba(95, 168, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }

        .chat-analyze-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px rgba(95, 168, 255, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.45);
        }

        .chat-analyze-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .chat-analysis-result {
          width: 100%;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 14px;
          padding: 16px;
          color: var(--ink);
          box-shadow: 0 20px 50px rgba(5, 7, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.26);
        }

        .chat-analysis-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .chat-analysis-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .chat-analysis-subtitle {
          margin: 0;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.82);
          font-weight: 700;
        }

        .chat-analysis-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 9999px;
          background: rgba(95, 168, 255, 0.18);
          color: rgba(15, 23, 42, 0.82);
          font-weight: 800;
          font-size: 11px;
          border: 1px solid rgba(95, 168, 255, 0.35);
        }

        .chat-analysis-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chat-analysis-summary {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(22, 163, 74, 0.12);
        }

        .chat-analysis-summary.positive {
          border-color: rgba(34, 197, 94, 0.35);
        }

        .chat-summary-icon {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(34, 197, 94, 0.16);
          color: #16a34a;
          font-weight: 800;
          font-size: 18px;
        }

        .chat-summary-title {
          font-weight: 800;
          font-size: 15px;
          margin-bottom: 2px;
        }

        .chat-summary-detail {
          margin: 0;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.78);
        }

        .chat-analysis-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 0 4px 0;
        }

        .chat-violations-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-violation-row {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: flex-start;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chat-violations-list .chat-violation-row:last-child {
          border-bottom: none;
        }

        .chat-violation-icon {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(239, 68, 68, 0.14);
          color: #ef4444;
          font-size: 14px;
          font-weight: 800;
        }

        .chat-violation-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chat-violation-title {
          font-weight: 800;
          color: rgba(15, 23, 42, 0.9);
        }

        .chat-violation-fix {
          color: rgba(15, 23, 42, 0.86);
        }

        .chat-analysis-text .chat-content {
          font-weight: 700;
          color: rgba(15, 23, 42, 0.9);
        }

        .chat-analysis-actions {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .chat-action-btn {
          height: 38px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          color: rgba(15, 23, 42, 0.9);
          font-weight: 750;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          box-shadow: 0 12px 30px rgba(5, 7, 13, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .chat-action-btn.secondary {
          background: rgba(95, 168, 255, 0.14);
          border-color: rgba(95, 168, 255, 0.3);
          color: rgba(15, 23, 42, 0.9);
        }

        .chat-action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 38px rgba(5, 7, 13, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .chat-upload-preview {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .chat-upload-preview img {
          display: block;
          width: 100%;
          max-height: 320px;
          object-fit: contain;
          background: #f8fafc;
        }

        .chat-upload-label {
          display: block;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.78);
          background: rgba(255, 255, 255, 0.9);
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        .chat-user-note {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(15, 23, 42, 0.9);
          box-shadow: 0 12px 34px rgba(5, 7, 13, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .chat-user-note-title {
          margin: 0 0 6px 0;
          font-weight: 800;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.82);
          letter-spacing: -0.01em;
        }

        .chat-user-note-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(15, 23, 42, 0.82);
        }

        /* Free usage counter */
        .free-usage-counter {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 9999px;
          border: 1px solid rgba(95, 168, 255, 0.22);
          background: rgba(95, 168, 255, 0.12);
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
        }

        .free-usage-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: rgba(95, 168, 255, 0.95);
        }

        .free-usage-text {
          font-size: 11px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.82);
        }

        /* Tool welcome card (for anonymous users) */
        .tool-welcome-card {
          max-width: 640px;
          margin: 0 auto;
          padding: 32px 28px;
        }

        .tool-welcome-content {
          text-align: center;
        }

        .tool-welcome-title {
          font-size: clamp(22px, 4vw, 32px);
          font-weight: 800;
          color: var(--ink);
          letter-spacing: -0.02em;
          margin: 0 0 12px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tool-welcome-line1,
        .tool-welcome-line2 {
          display: block;
        }

        /* On desktop, show on one line */
        @media (min-width: 769px) {
          .tool-welcome-title {
            flex-direction: row;
            justify-content: center;
            gap: 0.3em;
          }
        }

        .tool-welcome-text {
          font-size: 15px;
          line-height: 1.65;
          color: rgba(15, 23, 42, 0.82);
          margin: 0 0 20px 0;
        }

        .tool-usage-available {
          margin-top: 16px;
        }

        .tool-usage-text {
          font-size: 13px;
          font-weight: 700;
          color: #1d4ed8;
          margin: 0;
        }

        .tool-usage-blocked {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .tool-usage-blocked-text {
          font-size: 12px;
          font-weight: 600;
          color: rgba(239, 68, 68, 0.9);
          margin: 0;
        }

        .tool-cta {
          height: 44px;
          padding: 0 20px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: linear-gradient(180deg, rgba(95, 168, 255, 0.98), rgba(95, 168, 255, 0.78));
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 16px 44px rgba(95, 168, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          transition: transform 0.12s ease, box-shadow 0.15s ease;
        }

        .tool-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px rgba(95, 168, 255, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        /* Responsive */
        @media (max-width: 768px) {
          :root {
            --landing-topbar-h: 68px;
            --chat-dock-room: 150px; /* a touch more room on mobile */
          }

          .hero-break {
            display: inline;
          }

          .hero-cta-row {
            gap: 10px;
            margin-top: 12px;
            padding-top: 6px;
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }

          .hero-arrow-text {
            font-size: 13px;
            text-align: center;
            width: 100%;
          }

          .hero-arrow-icon {
            display: none;
          }

          .hero-cta {
            height: 44px;
            font-size: 13px;
            padding: 0 16px;
            width: 100%;
            max-width: 360px;
            margin: 0 auto;
          }

          .chat-topbar {
            --chat-topbar-pad: max(18px, env(safe-area-inset-top) + 16px);
            --chat-topbar-side: max(
              calc(var(--chat-topbar-pad) + 8px),
              env(safe-area-inset-left) + 20px,
              env(safe-area-inset-right) + 20px
            );
            padding: var(--chat-topbar-pad) var(--chat-topbar-side) 0 var(--chat-topbar-side);
          }

          .chat-messages {
            padding: calc(max(120px, env(safe-area-inset-top) + 105px)) 16px
              calc(env(safe-area-inset-bottom) + var(--chat-dock-room) + 28px);
          }

          .chat-input-inner {
            padding: 10px 16px;
            padding-bottom: calc(env(safe-area-inset-bottom) + 14px);
          }

          .chat-dock {
            padding: 12px 12px;
            gap: 10px;
          }

          .plm-icon-btn {
            width: 42px;
            height: 42px;
            border-radius: 13px;
          }

          .chat-send-btn {
            width: 36px;
            height: 36px;
            border-radius: 9px;
          }

          .chat-bubble {
            max-width: 80%;
          }

          .chat-empty-text {
            font-size: 13px;
          }

          .chat-mode-toggle {
            grid-template-columns: 1fr;
          }

          .chat-input-row.photo-mode {
            flex-direction: column;
            align-items: stretch;
          }

          .landing-topbar {
            padding: env(safe-area-inset-top) max(14px, env(safe-area-inset-right) + 8px) 0
              max(14px, env(safe-area-inset-left) + 8px);
          }

          .landing-hero {
            padding: 0 20px calc(env(safe-area-inset-bottom) + 24px);
          }

          .landing-hero-card.landing-hero-card--terms-style {
            padding: 28px 24px;
          }

          .plm-brand-mark {
            width: 134px;
            height: 134px;
          }

          .plm-brand.chat .plm-brand-mark {
            width: 107px;
            height: 107px;
          }

          .landing-topbar .plm-brand-mark {
            width: 72px;
            height: 72px;
            margin-right: 4px;
          }

          /* ✅ UPDATED LOGO TRANSFORM (mobile) - 10% larger than before */
          .landing-topbar .plm-logo-img {
            transform: translateY(2px) scale(1.28);
            transform-origin: center;
          }

          .plm-brand-text {
            font-size: 16.5px;
            max-width: 220px;
            padding-bottom: 0;
          }

          .landing-signin-btn {
            height: 32px !important;
            padding: 0 12px !important;
            margin-right: 0;
            font-size: 12px !important;
            font-weight: 650 !important;
            letter-spacing: 0.02em !important;
            line-height: 1 !important;
          }
        }

        @media (max-width: 480px) {
          :root {
            --landing-topbar-h: 64px;
            --chat-dock-room: 210px;
          }

          .plm-brand-mark {
            width: 124px;
            height: 124px;
          }

          .plm-brand-text {
            font-size: 15.5px;
            padding-bottom: 0;
          }

          .plm-brand.chat .plm-brand-mark {
            width: 101px;
            height: 101px;
          }

          .landing-topbar .plm-brand-mark {
            width: 67px;
            height: 67px;
            margin-right: 4px;
          }

          /* ✅ UPDATED LOGO TRANSFORM (smallest mobile) - 10% larger than before */
          .landing-topbar .plm-logo-img {
            transform: translateY(1px) scale(1.24);
            transform-origin: center;
          }

          .chat-input-inner {
            padding: 10px 16px;
          }

          .chat-dock {
            padding: 12px 10px;
          }

          .plm-icon-btn {
            width: 40px;
            height: 40px;
            border-radius: 12px;
          }

          .chat-textarea {
            font-size: 15px;
            padding: 10px 12px;
          }

          .hero-cta-row {
            gap: 8px;
          }

          .hero-arrow-text {
            font-size: 12.5px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* ✅ Panel Centered UI - New Radial Menu Based Design */
        .panel-centered-ui {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* ✅ Fullscreen centered radial menu */
        .radial-menu-fullscreen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        /* ✅ Panel overlay (for all panels) - mobile-first */
        .panel-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          z-index: 100;
          background: rgba(26, 26, 26, 0.08);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          animation: panel-fade-in 0.2s ease;
        }

        @keyframes panel-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .panel-container {
          width: 100%;
          max-width: 540px;
          max-height: calc(100vh - 24px - env(safe-area-inset-bottom, 0px));
          max-height: calc(100dvh - 24px - env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          animation: panel-slide-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @media (min-width: 768px) {
          .panel-overlay {
            padding: 20px;
          }

          .panel-container {
            max-height: calc(100vh - 40px - env(safe-area-inset-bottom, 0px));
            max-height: calc(100dvh - 40px - env(safe-area-inset-bottom, 0px));
          }
        }

        @keyframes panel-slide-up {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.96); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }

        /* ✅ Glass panel card (mobile-first) */
        .panel-card {
          position: relative;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 32px);
          max-height: calc(100dvh - 32px);
          overflow: hidden;
          padding: 20px 20px 16px !important; /* ✅ Increased bottom padding from 10px to 16px for better visual balance */
          background: var(--surface);
          border: 1px solid var(--border-strong);
          box-shadow: var(--shadow-md);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .panel-card.text-panel,
        .panel-card.image-panel {
          min-height: 350px;
          height: auto;
        }

        .panel-card.history-panel,
        .panel-card.settings-panel {
          min-height: 280px;
        }

        /* Larger screens get taller panels */
        @media (min-width: 768px) {
          .panel-card {
            max-height: calc(100vh - 40px);
            max-height: calc(100dvh - 40px);
            padding: 24px 24px 12px !important;
          }

          .panel-card.text-panel,
          .panel-card.image-panel {
            min-height: 420px;
          }

          .panel-card.history-panel,
          .panel-card.settings-panel {
            min-height: 320px;
          }
        }

        /* ✅ Close button (mobile-first with good touch target) */
        .panel-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: rgba(15, 23, 42, 0.8);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .panel-close-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }

        .panel-close-btn:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.35);
        }

        @media (min-width: 768px) {
          .panel-close-btn {
            top: 16px;
            right: 16px;
            width: 36px;
            height: 36px;
          }
        }

        /* ✅ Panel header */
        .panel-header {
          padding: 0 0 16px 0;
          border-bottom: 1px solid var(--border-strong);
          margin-bottom: 16px;
        }

        .panel-title {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 800;
          color: rgba(15, 23, 42, 0.95);
          letter-spacing: -0.02em;
        }

        .panel-subtitle {
          margin: 0;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.6);
        }

        /* ✅ Panel body */
        .panel-body {
          flex: 1;
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 12px;
          overflow: hidden;
          min-height: 0;
          align-items: stretch;
        }

        /* ✅ Messages area */
        .panel-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-right: 8px;
          min-height: 120px;
        }

        .panel-empty-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
        }

        .panel-empty-state p {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.5);
        }

        .panel-message {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .panel-message.assistant .panel-response {
          padding: 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(15, 23, 42, 0.9);
        }

        .panel-message.user .panel-question {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(95, 168, 255, 0.12);
          border: 1px solid rgba(95, 168, 255, 0.25);
        }

        .panel-question-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgba(15, 23, 42, 0.5);
          margin-bottom: 4px;
        }

        .panel-question-text {
          margin: 0;
          font-size: 14px;
          color: rgba(15, 23, 42, 0.85);
          line-height: 1.5;
        }

        .panel-thinking {
          color: rgba(15, 23, 42, 0.6);
          font-style: italic;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* ✅ Input area */
        .panel-input-area {
          flex-shrink: 0;
          border-top: 1px solid var(--border);
          padding-top: 12px;
          margin-top: auto;
        }

        .panel-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .panel-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          padding: 4px;
          box-shadow: var(--shadow-sm);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          transition: all 0.15s ease;
        }

        .panel-input-wrapper:focus-within {
          border-color: rgba(95, 168, 255, 0.4);
          box-shadow: 0 0 0 3px rgba(95, 168, 255, 0.12), 0 8px 24px rgba(5, 7, 13, 0.1);
        }

        .panel-textarea {
          flex: 1;
          min-height: 40px;
          max-height: 100px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: rgba(15, 23, 42, 0.95);
          font-size: 15px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
        }

        .panel-textarea::placeholder {
          color: rgba(15, 23, 42, 0.5);
        }

        .panel-textarea:focus {
          outline: none;
        }

        .panel-send-btn,
        .panel-camera-btn {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 1px solid var(--border-strong);
          background: var(--accent);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
          transition: all 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .panel-send-btn:hover:not(:disabled),
        .panel-camera-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(95, 168, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .panel-send-btn:active:not(:disabled),
        .panel-camera-btn:active:not(:disabled) {
          transform: scale(0.9);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
        }

        .panel-send-btn:disabled,
        .panel-camera-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .panel-camera-btn {
          background: var(--clay);
          border-color: var(--border-strong);
          color: rgba(15, 23, 42, 0.85);
          box-shadow: var(--shadow-sm);
        }

        .panel-camera-btn:hover:not(:disabled) {
          background: #e8e8e6;
          box-shadow: var(--shadow-md);
        }

        .panel-camera-btn:active:not(:disabled) {
          background: #e0e0de;
        }

        @media (min-width: 768px) {
          .panel-send-btn,
          .panel-camera-btn {
            width: 44px;
            height: 44px;
            border-radius: 12px;
          }
        }

        .panel-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* ✅ Image panel specific */
        .panel-image-preview {
          position: relative;
          width: 100%;
          max-height: 200px;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .panel-image-preview img {
          display: block;
          width: 100%;
          height: 100%;
          max-height: 200px;
          object-fit: contain;
        }

        .panel-image-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .panel-image-remove:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.1);
        }

        .panel-user-image {
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .panel-user-image img {
          display: block;
          width: 100%;
          max-height: 150px;
          object-fit: contain;
        }

        /* ✅ History panel specific */
        .panel-history-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 350px;
        }

        .panel-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .panel-history-item:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        .panel-history-content {
          flex: 1;
          min-width: 0;
        }

        .panel-history-title {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .panel-history-preview {
          margin: 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .panel-history-date {
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.5);
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
        }

        .panel-history-empty {
          text-align: center;
          padding: 40px 20px;
        }

        .panel-history-empty p {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.7);
        }

        .panel-history-empty-sub {
          margin-top: 8px !important;
          font-size: 13px !important;
          font-weight: 400 !important;
          color: rgba(15, 23, 42, 0.5) !important;
        }

        /* ✅ Settings panel specific */
        .panel-settings-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .panel-settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.15s ease;
          color: rgba(15, 23, 42, 0.85);
        }

        .panel-settings-item:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateX(2px);
        }

        .panel-settings-item.danger {
          border-color: rgba(239, 68, 68, 0.2);
        }

        .panel-settings-item.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .panel-settings-item.danger .panel-settings-label {
          color: #ef4444;
        }

        .panel-settings-label {
          font-size: 15px;
          font-weight: 600;
        }

        .panel-settings-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 0;
        }

        .panel-settings-info {
          margin-top: 24px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          text-align: center;
        }

        .panel-settings-email {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.8);
        }

        .panel-settings-status {
          margin: 0;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.5);
        }

        /* ✅ Mobile-first responsive - defaults are already mobile-friendly */
        /* Larger screens get more padding */
        @media (min-width: 601px) {
          .panel-overlay {
            padding: 20px;
          }
        }
      `}</style>

      {/* ✅ Render modals via Portal so they always overlay correctly */}
      <Portal>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authInitialMode}
          selectedPriceId={selectedPriceId}
        />
      </Portal>

      <Portal>
        <PricingModalLocal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onCheckout={handleCheckout}
          loading={checkoutLoading}
        />
      </Portal>

      <div className="app-container">
        {hasPaidAccess ? (
          <main className={`${plusJakarta.className} panel-centered-ui`}>
            {/* Hidden file input for image upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />

            {/* ✅ Centered Radial Menu (shown when no panel is active) */}
            {activePanel === null && (
              <div className="radial-menu-fullscreen">
                <RadialMenu
                  logoSrc={appleIcon}
                  onChat={() => setActivePanel('text')}
                  onImage={() => {
                    setActivePanel('image')
                    setTimeout(() => fileInputRef.current?.click(), FILE_PICKER_DELAY_MS)
                  }}
                  onPdfExport={() => {
                    // ✅ Export full conversation if messages exist
                    if (messages.length > 0) {
                      handleDownloadReport(null, true) // Export all messages
                    } else {
                      alert('No conversation to export yet. Start a chat or scan an image first.')
                    }
                  }}
                  onSettings={() => setActivePanel('settings')}
                  onChatHistory={() => setActivePanel('history')}
                />
              </div>
            )}

            {/* ✅ Text Chat Panel */}
            {activePanel === 'text' && (
              <div className="panel-overlay">
                <div className="panel-container">
                  <LiquidGlass variant="main" className="panel-card text-panel">
                    <button
                      type="button"
                      className="panel-close-btn"
                      onClick={() => {
                        setActivePanel(null)
                        setMessages([])
                        setInput('')
                      }}
                      aria-label="Close panel"
                    >
                      <Icons.X />
                    </button>

                    <div className="panel-header">
                      <h2 className="panel-title">Ask a Question</h2>
                      <p className="panel-subtitle">Michigan food safety regulations</p>
                    </div>

                    <div className="panel-body">
                      {/* Messages display - always rendered for flex layout */}
                      <div className="panel-messages" ref={scrollRef} onScroll={handleScroll}>
                        {messages.length > 0 ? (
                          messages.map((msg, idx) => {
                            const isAssistant = msg.role === 'assistant'
                            const isPending = isAssistant && msg.content === '' && isSending && idx === messages.length - 1

                            return (
                              <div key={idx} className={`panel-message ${isAssistant ? 'assistant' : 'user'}`}>
                                {isAssistant ? (
                                  <div className="panel-response">
                                    {isPending ? (
                                      <span className="panel-thinking">Thinking…</span>
                                    ) : (
                                      formatAssistantContent(msg.content, msg.citations)
                                    )}
                                  </div>
                                ) : (
                                  <div className="panel-question">
                                    <span className="panel-question-label">You asked:</span>
                                    <p className="panel-question-text">{msg.content}</p>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="panel-empty-state">
                            <p>Your conversation will appear here.</p>
                          </div>
                        )}
                      </div>

                      {/* Input area */}
                      <div className="panel-input-area">
                        <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />
                        <div className="panel-input-row">
                          <div className="panel-input-wrapper">
                            <textarea
                              ref={textAreaRef}
                              value={input}
                              onChange={(e) => {
                                setInput(e.target.value)
                                if (textAreaRef.current) {
                                  textAreaRef.current.style.height = 'auto'
                                  textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
                                }
                              }}
                              placeholder="Ask about food safety..."
                              rows={1}
                              className="panel-textarea"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSend(e)
                                }
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSend}
                            disabled={!safeTrim(input) || isSending}
                            className="panel-send-btn"
                            aria-label="Send message"
                          >
                            {isSending ? <span className="panel-spinner" /> : <Icons.Send />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </LiquidGlass>
                </div>
              </div>
            )}

            {/* ✅ Image Analysis Panel */}
            {activePanel === 'image' && (
              <div className="panel-overlay">
                <div className="panel-container">
                  <LiquidGlass variant="main" className="panel-card image-panel">
                    <button
                      type="button"
                      className="panel-close-btn"
                      onClick={() => {
                        setActivePanel(null)
                        setMessages([])
                        setInput('')
                        setSelectedImage(null)
                      }}
                      aria-label="Close panel"
                    >
                      <Icons.X />
                    </button>

                    <div className="panel-header">
                      <h2 className="panel-title">Image Analysis</h2>
                      <p className="panel-subtitle">Scan photos for food safety violations</p>
                    </div>

                    <div className="panel-body">
                      {/* Messages display - always rendered for flex layout */}
                      <div className="panel-messages" ref={scrollRef} onScroll={handleScroll}>
                        {/* Image preview at top of messages area */}
                        {selectedImage && (
                          <div className="panel-image-preview">
                            <img src={selectedImage} alt="Selected for analysis" />
                            <button
                              type="button"
                              className="panel-image-remove"
                              onClick={() => setSelectedImage(null)}
                              aria-label="Remove image"
                            >
                              <Icons.X />
                            </button>
                          </div>
                        )}
                        
                        {messages.length > 0 ? (
                          messages.map((msg, idx) => {
                            const isAssistant = msg.role === 'assistant'
                            const isPending = isAssistant && msg.content === '' && isSending && idx === messages.length - 1
                            const hasImage = Boolean(msg.image) || msg.hasImage

                            return (
                              <div key={idx} className={`panel-message ${isAssistant ? 'assistant' : 'user'}`}>
                                {!isAssistant && hasImage && msg.image && (
                                  <div className="panel-user-image">
                                    <img src={msg.image} alt="Uploaded" />
                                  </div>
                                )}
                                {isAssistant ? (
                                  <div className="panel-response">
                                    {isPending ? (
                                      <span className="panel-thinking">Analyzing image…</span>
                                    ) : (
                                      formatAssistantContent(msg.content, msg.citations)
                                    )}
                                  </div>
                                ) : msg.content && (
                                  <div className="panel-question">
                                    <span className="panel-question-label">Your question:</span>
                                    <p className="panel-question-text">{msg.content}</p>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        ) : !selectedImage && (
                          <div className="panel-empty-state">
                            <p>Upload a photo to scan for violations.</p>
                          </div>
                        )}
                      </div>

                      {/* Input area */}
                      <div className="panel-input-area">
                        <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />
                        <div className="panel-input-row">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="panel-camera-btn"
                            aria-label="Upload photo"
                            disabled={isSending}
                          >
                            <Icons.Camera />
                          </button>
                          <div className="panel-input-wrapper">
                            <textarea
                              ref={textAreaRef}
                              value={input}
                              onChange={(e) => {
                                setInput(e.target.value)
                                if (textAreaRef.current) {
                                  textAreaRef.current.style.height = 'auto'
                                  textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
                                }
                              }}
                              placeholder={selectedImage ? "Ask about this image..." : "Upload a photo..."}
                              rows={1}
                              className="panel-textarea"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSend(e)
                                }
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSend}
                            disabled={(!safeTrim(input) && !selectedImage) || isSending}
                            className="panel-send-btn"
                            aria-label="Analyze"
                          >
                            {isSending ? <span className="panel-spinner" /> : <Icons.Send />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </LiquidGlass>
                </div>
              </div>
            )}

            {/* ✅ Chat History Panel */}
            {activePanel === 'history' && (
              <div className="panel-overlay">
                <div className="panel-container">
                  <LiquidGlass variant="main" className="panel-card history-panel">
                    <button
                      type="button"
                      className="panel-close-btn"
                      onClick={() => setActivePanel(null)}
                      aria-label="Close panel"
                    >
                      <Icons.X />
                    </button>

                    <div className="panel-header">
                      <h2 className="panel-title">Chat History</h2>
                      <p className="panel-subtitle">Your previous conversations</p>
                    </div>

                    <div className="panel-body">
                      <div className="panel-history-list">
                        {chatHistory.length > 0 ? (
                          chatHistory.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="panel-history-item"
                              onClick={() => handleLoadHistory(item)}
                            >
                              <div className="panel-history-content">
                                <p className="panel-history-title">{item.title || 'Chat'}</p>
                                <p className="panel-history-preview">
                                  {item.preview || 'Resume this conversation'}
                                </p>
                              </div>
                              <span className="panel-history-date">
                                {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="panel-history-empty">
                            <p>No conversations yet</p>
                            <p className="panel-history-empty-sub">Start a chat or scan an image to see your history here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </LiquidGlass>
                </div>
              </div>
            )}

            {/* ✅ Settings Panel */}
            {activePanel === 'settings' && (
              <div className="panel-overlay">
                <div className="panel-container">
                  <LiquidGlass variant="main" className="panel-card settings-panel">
                    <button
                      type="button"
                      className="panel-close-btn"
                      onClick={() => setActivePanel(null)}
                      aria-label="Close panel"
                    >
                      <Icons.X />
                    </button>

                    <div className="panel-header">
                      <h2 className="panel-title">Settings</h2>
                      <p className="panel-subtitle">Manage your account</p>
                    </div>

                    <div className="panel-body">
                      <div className="panel-settings-list">
                        <button
                          type="button"
                          className="panel-settings-item"
                          onClick={() => {
                            setActivePanel(null)
                            if (hasActiveSubscription) {
                              handleManageBilling()
                            } else {
                              setShowPricingModal(true)
                            }
                          }}
                        >
                          <span className="panel-settings-label">
                            {hasActiveSubscription ? 'Manage Billing' : 'Start Trial'}
                          </span>
                          <Icons.ArrowRight />
                        </button>

                        <div className="panel-settings-divider" />

                        <button
                          type="button"
                          className="panel-settings-item danger"
                          onClick={handleSignOut}
                        >
                          <span className="panel-settings-label">Log Out</span>
                          <Icons.ArrowRight />
                        </button>
                      </div>

                      <div className="panel-settings-info">
                        <p className="panel-settings-email">{session?.user?.email}</p>
                      </div>
                    </div>
                  </LiquidGlass>
                </div>
              </div>
            )}
          </main>
        ) : (
          <LandingPage
            onShowPricing={() => {
              setSelectedPriceId(null)
              setShowPricingModal(true)
            }}
            onShowAuth={handleShowSignIn}
          />
        )}
      </div>
    </>
  )
}
