// app/page.client.js
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

const MIN_MULTI_LOCATIONS = 2
const MAX_MULTI_LOCATIONS = 500
const MAX_DEVICES_PER_LOCATION = 20
const SUBSCRIPTION_STATUS_TRIALING = 'trialing'

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
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // ✅ FIX: iOS/Safari was rendering your old <line> X as a single slash sometimes.
  // Use a single <path> with round caps so it ALWAYS looks like an “X”.
  X: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 13.5c.04-.5.04-1 0-1.5l2-1.5-2-3.4-2.4 1a8.6 8.6 0 0 0-1.3-.8l-.4-2.6H10.1l-.4 2.6c-.46.2-.9.46-1.3.8l-2.4-1-2 3.4 2 1.5c-.04.5-.04 1 0 1.5l-2 1.5 2 3.4 2.4-1c.4.34.84.6 1.3.8l.4 2.6h4.8l.4-2.6c.46-.2.9-.46 1.3-.8l2.4 1 2-3.4-2-1.5Z"
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
  const size = isChat ? 116 : 147

  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark" aria-hidden="true">
          <Image src={appleIcon} alt="" width={size} height={size} priority className="plm-logo-img" />
        </span>
        {!isChat && <span className="plm-brand-text"></span>}
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
                Inspection Surface for regulated operations
              </h1>
              <div className="hero-divider" aria-hidden="true" />
              <p className="hero-support">
                Submit structured inspection requests and supporting images to receive procedural, audit-ready results.
              </p>
            </div>

            <div className="hero-cta-row">
              <div className="hero-arrow-text">Run your first inspection request</div>
              <div className="hero-arrow-icon">
                <Icons.ArrowRight />
              </div>
              <button className="btn-primary hero-cta hero-cta-trace" onClick={onShowPricing} type="button">
                Start inspection trial
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
        <LiquidGlass
          variant="main"
          className={`modal-card glass-modal landing-hero-card landing-hero-card--terms-style auth-modal ${plusJakarta.className}`}
        >
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
        </LiquidGlass>
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
        <LiquidGlass
          variant="main"
          className={`modal-card glass-modal landing-hero-card landing-hero-card--terms-style pricing-modal ${plusJakarta.className}`}
        >
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
        </LiquidGlass>
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

// Helper to parse bullet point lines from text
function parseBulletItems(text, skipLines = 1) {
  const lines = text.split('\n').filter((l) => l.trim())
  const items = []

  for (let i = skipLines; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('•') || line.startsWith('-')) {
      items.push(line.replace(/^[•-]\s*/, ''))
    }
  }
  return items
}

function parseInspectionResponse(content) {
  const text = safeTrim(content)
  if (!text) {
    return { status: 'Clarification required', findings: [], clarifications: [], raw: '' }
  }

  const normalized = text.toUpperCase()
  let status = 'Violations observed'
  if (normalized.includes('NO VIOLATIONS')) status = 'No violations observed'
  if (normalized.includes('NEED INFO') || normalized.includes('CLARIFICATION')) status = 'Clarification required'

  const findings = []
  const clarifications = []

  if (status === 'Clarification required') {
    const questions = parseBulletItems(text, 1)
    if (questions.length) {
      questions.forEach((q) => clarifications.push(q))
    } else {
      const questionLines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l)
      questionLines.forEach((line) => {
        if (line.endsWith('?') || line.toLowerCase().includes('clarify')) clarifications.push(line)
      })
    }
  } else if (/^VIOLATIONS:/i.test(text)) {
    const items = parseBulletItems(text, 1)
    items.forEach((item) => {
      const fixMatch = item.match(/^(.+?)\.\s*FIX:\s*(.+)$/i)
      findings.push({
        violation: fixMatch ? fixMatch[1].trim() : item,
        area: '',
        observation: fixMatch ? fixMatch[1].trim() : item,
        action: fixMatch ? fixMatch[2].trim() : '',
      })
    })
  } else {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    lines.forEach((line) => {
      const violationMatch = line.match(/(?:Violation|Issue)\s*[:\-]\s*(.+)/i)
      const areaMatch = line.match(/(?:Area|Location)\s*[:\-]\s*(.+)/i)
      const actionMatch = line.match(/(?:Action|Fix|Required action)\s*[:\-]\s*(.+)/i)
      if (violationMatch || actionMatch || areaMatch) {
        findings.push({
          violation: violationMatch ? violationMatch[1] : areaMatch ? 'Area noted' : 'Observation',
          area: areaMatch ? areaMatch[1] : '',
          observation: violationMatch ? violationMatch[1] : line,
          action: actionMatch ? actionMatch[1] : '',
        })
      } else {
        findings.push({
          violation: status === 'Violations observed' ? 'Review required' : 'Inspection note',
          area: '',
          observation: line,
          action: '',
        })
      }
    })
  }

  if (!findings.length && status === 'Violations observed') {
    findings.push({
      violation: 'Review required',
      area: '',
      observation: text,
      action: '',
    })
  }

  return { status, findings, clarifications, raw: text }
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
  const [deviceUsageRemaining, setDeviceUsageRemaining] = useState(null)
  const [deviceUsageBlocked, setDeviceUsageBlocked] = useState(false)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const [sendKey, setSendKey] = useState(0)
  const [sendMode, setSendMode] = useState('text')

  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)

  const isAuthenticated = !!session
  const hasPaidAccess = isAuthenticated && (hasActiveSubscription || subscription?.status === SUBSCRIPTION_STATUS_TRIALING)

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
    document.documentElement.dataset.view = hasPaidAccess ? 'inspection' : 'landing'
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

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s.user.id)
          .maybeSingle()

        if (profileError) {
          console.error('❌ Profile check error:', profileError)
          setSubscription(null)
          setHasActiveSubscription(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        if (!profile) {
          setSubscription(null)
          setHasActiveSubscription(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        const accepted = !!(profile.accepted_terms && profile.accepted_privacy)
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
        router.replace('/accept-terms')
        return
      }

      let active = false
      let subData = null

      try {
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

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      loadSessionAndSub(newSession)
    })

    return () => {
      isMounted = false
      data.subscription?.unsubscribe()
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
      setShowSettingsMenu(false)
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Sign out error', e)
    } finally {
      setMessages([])
      setCurrentChatId(null)
      router.replace('/')
    }
  }

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
      rawQuestion || (image ? 'Inspect the provided image for compliance violations and required actions.' : '')

    if (!question && !image) return

    setSendMode(image ? 'vision' : 'text')
    setSendKey((k) => k + 1)

    const newUserMessage = { role: 'user', content: question, image }
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
        updated[updated.length - 1] = { role: 'assistant', content: String(msg) }
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
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
    } catch (error) {
      console.error('Image compression error', error)
      alert('Failed to process image.')
    }
  }

  const completedAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && safeTrim(m.content))
  const activeAssistant =
    isSending && messages[messages.length - 1]?.role === 'assistant' ? messages[messages.length - 1] : completedAssistant
  const latestRequest = [...messages].reverse().find((m) => m.role === 'user')
  const parsedResponse = parseInspectionResponse(activeAssistant?.content || '')
  const hasResults = !!safeTrim(activeAssistant?.content || '')

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
          color-scheme: dark;

          --bg-0: rgba(5, 7, 13, 0.72);
          --bg-1: rgba(7, 10, 18, 0.78);
          --bg-2: rgba(9, 13, 22, 0.82);
          --bg-3: rgba(255, 255, 255, 0.1);

          --ink-0: #f6f9ff;
          --ink-1: rgba(240, 244, 255, 0.86);
          --ink-2: rgba(214, 222, 240, 0.76);
          --ink-3: rgba(178, 190, 215, 0.6);

          --accent: #5fa8ff;
          --accent-hover: #7bc2ff;
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
          --chat-dock-room: 120px;

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
          background: rgba(5, 7, 13, 0.52);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
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
          max-width: 560px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* ✅ Modal cards: FORCE light frosted glass + fix “blurry” text on iOS (compositing) */
        .glass-modal.modal-card {
          width: 100%;
          position: relative;
          border-radius: 18px;
          padding: 22px;

          background: linear-gradient(140deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75)) !important;
          border: 1px solid var(--glass-border) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.46), 0 30px 90px rgba(10, 18, 35, 0.26) !important;

          /* reduce nested blur strength a touch (helps iOS crispness) */
          backdrop-filter: blur(10px) saturate(125%) !important;
          -webkit-backdrop-filter: blur(10px) saturate(125%) !important;

          color: var(--glass-ink) !important;
          color-scheme: light !important;
          overflow: hidden;

          /* ✅ anti-blur / rasterization fixes */
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          filter: none !important;
          -webkit-filter: none !important;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ✅ Auth + Pricing cards: brighten glass to match landing hero clarity */
        .glass-modal.modal-card.auth-modal,
        .glass-modal.modal-card.pricing-modal {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.48)) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 32px 95px rgba(10, 18, 35, 0.3) !important;
          backdrop-filter: blur(18px) saturate(145%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(145%) !important;
        }

        .glass-modal.modal-card::before {
          display: none; /* ✅ Remove gradient overlay that causes blurry text */
        }

        .glass-modal.modal-card > * {
          position: relative;
          z-index: 1;
        }

        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.14);
          background: rgba(255, 255, 255, 0.78);
          color: rgba(15, 23, 42, 0.92);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.55);
          transition: background 0.15s ease;
        }

        .modal-close svg {
          display: block;
          pointer-events: none;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.95);
        }

        .modal-header {
          padding-right: 42px;
          margin-bottom: 12px;
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 850;
          letter-spacing: -0.02em;
          color: rgba(15, 23, 42, 0.92);
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
          height: 44px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.14);
          background: rgba(255, 255, 255, 0.74);
          color: rgba(15, 23, 42, 0.92);
          font-size: 14px;
          font-weight: 650;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
        }

        .form-input:focus {
          outline: none;
          border-color: rgba(15, 23, 42, 0.28);
          box-shadow: 0 0 0 3px rgba(95, 168, 255, 0.18);
          background: rgba(255, 255, 255, 0.9);
        }

        .form-toggle-vis {
          position: absolute;
          right: 10px;
          height: 30px;
          padding: 0 10px;
          border-radius: 9999px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.75);
          color: rgba(15, 23, 42, 0.82);
          cursor: pointer;
          font-weight: 800;
          font-size: 12px;
          transition: background 0.15s ease;
        }

        .form-toggle-vis:hover {
          background: rgba(255, 255, 255, 0.95);
        }

        /* ✅ Match landing/chat CTA vibe (blue accent) */
        .btn-submit {
          height: 44px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: linear-gradient(180deg, rgba(95, 168, 255, 0.98), rgba(95, 168, 255, 0.78));
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 16px 44px rgba(95, 168, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          transition: transform 0.12s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px rgba(95, 168, 255, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.4);
          filter: saturate(1.03);
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
        }

        .modal-link {
          background: transparent;
          border: none;
          color: rgba(15, 23, 42, 0.74);
          font-weight: 850;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s ease;
        }
        .modal-link:hover {
          color: rgba(15, 23, 42, 0.92);
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
          color: rgba(15, 23, 42, 0.92);
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
          color: rgba(15, 23, 42, 0.92);
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
          border: 1px solid rgba(15, 23, 42, 0.14);
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
          border: 1px solid rgba(15, 23, 42, 0.14);
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
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.9);
          color: rgba(15, 23, 42, 0.92);
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
          color: rgba(15, 23, 42, 0.92);
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
          gap: 12px;
        }

        .plm-brand-mark {
          width: 140px;
          height: 140px;
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
          font-size: 18px;
          font-weight: 650;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: visible;

          /* ✅ FIX: prevents clipping of descenders (bottom of "p") */
          padding-left: 2px;
          padding-bottom: 8px;
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
          gap: 12px;
        }

        .landing-topbar .plm-brand-mark {
          width: 69px;
          height: 69px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 4px;
        }

        /* ✅ UPDATED LOGO TRANSFORM (desktop) - 5% larger */
        .landing-topbar .plm-logo-img {
          transform: translateY(2px) scale(1.18);
          transform-origin: center;
        }

        .landing-topbar .plm-brand-text {
          line-height: 1.4;
          position: relative;
          top: 0px;
          font-size: 17.5px;
          padding-bottom: 7px;
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
          border: 1px solid rgba(15, 23, 42, 0.14);
          color: rgba(15, 23, 42, 0.92);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.66));
          backdrop-filter: blur(10px) saturate(125%);
          -webkit-backdrop-filter: blur(10px) saturate(125%);
          box-shadow: 0 14px 36px rgba(5, 7, 13, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.55);
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
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.66));
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
          color: rgba(15, 23, 42, 0.92);
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

        /* Footer */
        .plm-footer-links {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 16px 16px calc(env(safe-area-inset-bottom) + 12px);
          flex-wrap: wrap;
          position: relative;
          bottom: auto;
          z-index: var(--footer-links-z);
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

        /* Inspection layout */
        .inspection-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: calc(env(safe-area-inset-top) + 18px) clamp(16px, 3vw, 32px)
            calc(env(safe-area-inset-bottom) + 16px);
        }

        .inspection-topbar {
          position: sticky;
          top: env(safe-area-inset-top);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 6px 0;
          z-index: 10;
        }

        .inspection-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .inspection-settings {
          position: relative;
        }

        .inspection-settings-btn {
          width: 42px;
          height: 42px;
        }

        .inspection-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 16px 48px rgba(5, 7, 13, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          animation: dropdown-in 0.15s ease;
          z-index: 50;
        }

        .inspection-settings-item {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: #1f2937;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .inspection-settings-item:hover {
          background: rgba(15, 23, 42, 0.08);
        }

        .inspection-settings-sep {
          height: 1px;
          background: rgba(15, 23, 42, 0.12);
          margin: 6px 2px;
        }

        .inspection-shell {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .panel {
          position: relative;
          border-radius: 16px;
          padding: 20px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75)) !important;
          border: 1px solid rgba(255, 255, 255, 0.6) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 24px 72px rgba(5, 7, 13, 0.18) !important;
          color: #0b1220 !important;
          color-scheme: light;
          min-height: 0;
        }

        .panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .panel-title {
          margin: 2px 0 4px 0;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0b1220;
        }

        .panel-support {
          margin: 0;
          font-size: 14px;
          color: rgba(11, 18, 32, 0.78);
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 11px;
          font-weight: 800;
          color: rgba(11, 18, 32, 0.64);
          margin: 0;
        }

        .panel-meta {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .panel-meta.right {
          justify-content: flex-end;
          flex: 1;
        }

        .panel-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 9999px;
          border: 1px solid rgba(11, 18, 32, 0.08);
          font-size: 12px;
          font-weight: 750;
          color: rgba(11, 18, 32, 0.78);
          background: rgba(255, 255, 255, 0.7);
        }

        .panel-pill.danger {
          border-color: rgba(239, 68, 68, 0.3);
          color: #b91c1c;
          background: rgba(239, 68, 68, 0.1);
        }

        .tool-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .upload-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px dashed rgba(11, 18, 32, 0.2);
          background: rgba(255, 255, 255, 0.82);
          cursor: pointer;
          font-weight: 750;
          font-size: 13px;
          color: #0b1220;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .upload-btn:hover {
          border-color: rgba(95, 168, 255, 0.6);
          box-shadow: 0 10px 28px rgba(5, 7, 13, 0.12);
        }

        .upload-btn svg {
          width: 18px;
          height: 18px;
        }

        .file-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 9999px;
          background: rgba(95, 168, 255, 0.12);
          border: 1px solid rgba(95, 168, 255, 0.25);
          color: #0b1220;
          font-weight: 700;
        }

        .chip-close {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          border: 1px solid rgba(11, 18, 32, 0.12);
          background: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .field-label {
          font-size: 12px;
          font-weight: 800;
          color: rgba(11, 18, 32, 0.7);
          margin: 2px 0 -2px;
        }

        .text-field {
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(11, 18, 32, 0.12);
          border-radius: 12px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
          overflow: hidden;
        }

        .text-area {
          width: 100%;
          border: none;
          background: transparent;
          padding: 12px 14px;
          color: #0b1220;
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          min-height: 72px;
          font-family: inherit;
        }

        .text-area:focus {
          outline: none;
        }

        .tool-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .primary-btn {
          height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          border: 1px solid rgba(95, 168, 255, 0.3);
          background: linear-gradient(180deg, rgba(95, 168, 255, 0.98), rgba(95, 168, 255, 0.78));
          color: #fff;
          font-weight: 850;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 16px 44px rgba(95, 168, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          transition: transform 0.12s ease, box-shadow 0.15s ease;
        }

        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px rgba(95, 168, 255, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .helper-text {
          margin: 0;
          font-size: 12px;
          font-weight: 650;
          color: rgba(11, 18, 32, 0.6);
        }

        .results-panel {
          min-height: 420px;
        }

        .status-heading {
          margin: 2px 0 0 0;
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -0.02em;
          color: #0b1220;
        }

        .request-summary {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 360px;
        }

        .summary-label {
          font-size: 12px;
          font-weight: 800;
          color: rgba(11, 18, 32, 0.6);
        }

        .summary-value {
          font-size: 13px;
          font-weight: 750;
          color: rgba(11, 18, 32, 0.9);
          line-height: 1.5;
          word-break: break-word;
        }

        .inline-image {
          margin-top: 10px;
        }

        .image-frame {
          margin-top: 6px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(11, 18, 32, 0.12);
          background: rgba(255, 255, 255, 0.8);
        }

        .image-frame img {
          width: 100%;
          height: auto;
          display: block;
        }

        .results-empty {
          margin-top: 12px;
          border: 1px dashed rgba(11, 18, 32, 0.16);
          border-radius: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.7);
        }

        .empty-title {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 800;
          color: #0b1220;
        }

        .empty-text {
          margin: 0;
          color: rgba(11, 18, 32, 0.7);
          font-weight: 650;
          font-size: 13px;
        }

        .findings-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .clarification-block,
        .clear-block {
          border: 1px solid rgba(11, 18, 32, 0.12);
          border-radius: 12px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.82);
        }

        .clarification-title,
        .clear-title {
          font-size: 14px;
          font-weight: 850;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .clear-text {
          margin: 0;
          color: rgba(11, 18, 32, 0.72);
          font-weight: 650;
        }

        .clarification-list {
          margin: 0;
          padding-left: 16px;
          display: grid;
          gap: 6px;
          color: rgba(11, 18, 32, 0.8);
          font-weight: 650;
        }

        .findings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 12px;
        }

        .finding-card {
          border: 1px solid rgba(11, 18, 32, 0.12);
          border-radius: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.78);
          display: grid;
          gap: 8px;
        }

        .finding-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .finding-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(11, 18, 32, 0.6);
        }

        .finding-value {
          margin: 0;
          color: rgba(11, 18, 32, 0.9);
          font-weight: 750;
          line-height: 1.4;
        }

        .panel-disclaimer {
          margin: 12px 0 0;
          font-size: 12px;
          font-weight: 650;
          color: rgba(11, 18, 32, 0.6);
        }

        /* Responsive */
        @media (max-width: 768px) {
          :root {
            --landing-topbar-h: 68px;
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
            width: 32px;
            height: 32px;
            align-self: center;
          }

          .hero-cta {
            height: 44px;
            font-size: 13px;
            padding: 0 16px;
            width: 100%;
            max-width: 360px;
            margin: 0 auto;
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

          .inspection-shell {
            grid-template-columns: 1fr;
          }

          .panel {
            padding: 18px;
          }

          .panel-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .request-summary {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          :root {
            --landing-topbar-h: 64px;
          }

          .plm-brand-mark {
            width: 116px;
            height: 116px;
          }

          .plm-brand-text {
            font-size: 15.5px;
            padding-bottom: 6px;
          }

          .plm-brand.chat .plm-brand-mark {
            width: 101px;
            height: 101px;
          }

          .landing-topbar .plm-brand-mark {
            width: 61px;
            height: 61px;
            margin-right: 4px;
          }

          /* ✅ UPDATED LOGO TRANSFORM (smallest mobile) - 5% larger */
          .landing-topbar .plm-logo-img {
            transform: translateY(1px) scale(1.13);
            transform-origin: center;
          }

          .plm-icon-btn {
            width: 40px;
            height: 40px;
            border-radius: 12px;
          }

          .hero-cta-row {
            gap: 8px;
          }

          .hero-arrow-text {
            font-size: 12.5px;
          }

          .inspection-root {
            padding: calc(env(safe-area-inset-top) + 14px) 14px calc(env(safe-area-inset-bottom) + 14px);
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
          <main className={`${plusJakarta.className} inspection-root`}>
            <header className="inspection-topbar">
              <BrandLink variant="chat" />
              <nav className="inspection-actions" aria-label="Tool actions">
                {isAuthenticated && (
                  <div className="inspection-settings" ref={settingsRef}>
                    <button
                      type="button"
                      className="plm-icon-btn inspection-settings-btn"
                      onClick={() => setShowSettingsMenu((v) => !v)}
                      aria-expanded={showSettingsMenu}
                      aria-label="Account"
                    >
                      <Icons.Gear />
                    </button>
                    {showSettingsMenu && (
                      <div className="inspection-settings-menu" role="menu" aria-label="Account menu">
                        <button
                          type="button"
                          className="inspection-settings-item"
                          role="menuitem"
                          onClick={() => {
                            setShowSettingsMenu(false)
                            if (hasActiveSubscription) {
                              handleManageBilling()
                            } else {
                              setShowPricingModal(true)
                            }
                          }}
                        >
                          {hasActiveSubscription ? 'Manage billing' : 'Start trial'}
                        </button>
                        <div className="inspection-settings-sep" />
                        <button
                          type="button"
                          className="inspection-settings-item"
                          role="menuitem"
                          onClick={() => {
                            setShowSettingsMenu(false)
                            handleSignOut()
                          }}
                        >
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </header>

            <div className="inspection-shell">
              <LiquidGlass variant="main" className="panel tool-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Tool panel</p>
                    <h2 className="panel-title">Inspection request</h2>
                    <p className="panel-support">Upload image for analysis and specify the inspection request.</p>
                  </div>
                  <div className="panel-meta">
                    {deviceUsageBlocked ? (
                      <span className="panel-pill danger">Free usage exhausted</span>
                    ) : (
                      <span className="panel-pill neutral">
                        {deviceUsageRemaining != null
                          ? `${deviceUsageRemaining} free runs remaining`
                          : 'Device license required for unlimited runs'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="tool-controls">
                  <div className="upload-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="upload-btn"
                      type="button"
                      aria-label="Upload image for analysis"
                    >
                      <Icons.Camera />
                      <span>Upload image for analysis</span>
                    </button>
                    {selectedImage && (
                      <div className="file-chip">
                        <span>Image attached</span>
                        <button
                          onClick={() => setSelectedImage(null)}
                          type="button"
                          aria-label="Remove image"
                          className="chip-close"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                  </div>

                  <label className="field-label" htmlFor="inspection-input">
                    Request
                  </label>
                  <div className="text-field">
                    <textarea
                      id="inspection-input"
                      ref={textAreaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        if (textAreaRef.current) {
                          textAreaRef.current.style.height = 'auto'
                          textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 200)}px`
                        }
                      }}
                      placeholder="Enter inspection request"
                      rows={3}
                      className="text-area"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend(e)
                        }
                      }}
                    />
                  </div>

                  <div className="tool-actions">
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={(!safeTrim(input) && !selectedImage) || isSending}
                      className="primary-btn"
                    >
                      {isSending ? 'Analyzing…' : 'Run analysis'}
                    </button>
                    <p className="helper-text">Provide area, observation, and required action to reduce rework.</p>
                  </div>
                </div>
              </LiquidGlass>

              <LiquidGlass variant="main" className="panel results-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Results</p>
                    {hasResults ? (
                      <h2 className="status-heading">{parsedResponse.status}</h2>
                    ) : (
                      <h2 className="status-heading">Awaiting inspection request</h2>
                    )}
                  </div>
                  <div className="panel-meta right">
                    {latestRequest?.content && (
                      <div className="request-summary">
                        <span className="summary-label">Latest request</span>
                        <span className="summary-value">{latestRequest.content}</span>
                      </div>
                    )}
                  </div>
                </div>

                <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                {latestRequest?.image && (
                  <div className="inline-image">
                    <p className="field-label">Submitted image</p>
                    <div className="image-frame">
                      <img src={latestRequest.image} alt="Uploaded inspection context" />
                    </div>
                  </div>
                )}

                {!hasResults && (
                  <div className="results-empty">
                    <p className="empty-title">No inspection run yet.</p>
                    <p className="empty-text">Submit an inspection request to generate structured results.</p>
                  </div>
                )}

                {hasResults && (
                  <div className="findings-stack">
                    {parsedResponse.status === 'Clarification required' && (
                      <div className="clarification-block">
                        <div className="clarification-title">Clarification requested</div>
                        <ul className="clarification-list">
                          {(parsedResponse.clarifications.length ? parsedResponse.clarifications : [parsedResponse.raw]).map(
                            (item, idx) => (
                              <li key={idx}>{item}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {parsedResponse.status === 'No violations observed' && (
                      <div className="clear-block">
                        <div className="clear-title">No violations observed</div>
                        <p className="clear-text">Inspection completed with no noted violations.</p>
                      </div>
                    )}

                    {parsedResponse.findings.length > 0 && (
                      <div className="findings-grid" role="list">
                        {parsedResponse.findings.map((finding, idx) => (
                          <div className="finding-card" key={idx} role="listitem">
                            <div className="finding-row">
                              <span className="finding-label">Violation</span>
                              <p className="finding-value">{finding.violation || 'Not specified'}</p>
                            </div>
                            <div className="finding-row">
                              <span className="finding-label">Area</span>
                              <p className="finding-value">{finding.area || 'Not specified'}</p>
                            </div>
                            <div className="finding-row">
                              <span className="finding-label">Observation</span>
                              <p className="finding-value">{finding.observation || 'Not provided'}</p>
                            </div>
                            <div className="finding-row">
                              <span className="finding-label">Required action</span>
                              <p className="finding-value">{finding.action || 'Not provided'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="panel-disclaimer">
                  Results are procedural outputs. Confirm corrective actions with applicable regulations before execution.
                </p>
              </LiquidGlass>
            </div>
            <FooterLinks />
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
