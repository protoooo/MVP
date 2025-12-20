// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const STARTER_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY
const PRO_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
const ENTERPRISE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY

// eslint-disable-next-line no-unused-vars
const isAdmin = false

const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  ),
  Gear: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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

const DEMO_DOCUMENTS = [
  'Washtenaw County Enforcement Actions',
  'Washtenaw County Violation Types',
  'Washtenaw County Food Allergy Information',
  'Washtenaw County Inspection Program',
  'Food Labeling Guide',
  'Food Temperatures',
  'Internal Cooking Temperatures',
  'MI Modified Food Code',
  'MCL Act 92 of 2000',
  'Inspection Report Types',
  'Date Marking Guide',
  'Cross Contamination',
  'Cooling Foods',
  'Sanitation Standards',
  'Fat, Oil, and Grease Control',
  'New Business Information Packet',
  'Norovirus Environmental Cleaning',
  'Procedures for the Michigan Food Code',
  'Retail Food Establishments Emergency Action Plan',
  'Summary Chart for Minimum Cooking Food Temperatures',
  'USDA Safe Minimum Internal Temperature Chart',
]

const TYPEWRITER_LINES = [
  'Welcome to protocolLM.',
  'Catch violations before they cost you.',
  'Upload a photo — check compliance fast.',
  'Ask about Washtenaw County regulations.',
]

function useConsoleTypewriter(lines) {
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    let lineIndex = 0
    let charIndex = 0
    let buffer = ''
    let printed = []
    let timeoutId = null

    const rand = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
    const isPunc = (ch) => ['.', ',', '!', '?', ':', ';'].includes(ch)
    const isLongPunc = (ch) => ['.', '!', '?'].includes(ch)

    const schedule = (ms) => {
      timeoutId = setTimeout(step, ms)
    }

    const step = () => {
      if (cancelled) return

      const current = lines[lineIndex] || ''
      const ch = current[charIndex]

      if (lineIndex >= lines.length) {
        setDone(true)
        return
      }

      if (charIndex >= current.length) {
        printed = [...printed, buffer]
        buffer = ''
        charIndex = 0
        lineIndex += 1
        setOutput(printed.join('\n'))

        if (lineIndex >= lines.length) {
          setDone(true)
          return
        }

        return schedule(rand(650, 900))
      }

      buffer += ch
      charIndex += 1
      setOutput([...printed, buffer].join('\n'))

      let delay = rand(55, 95)
      if (ch === '—') delay += rand(120, 220)
      if (isPunc(ch)) delay += rand(140, 260)
      if (isLongPunc(ch)) delay += rand(180, 320)
      if (ch === ' ' && Math.random() < 0.12) delay += rand(40, 90)

      schedule(delay)
    }

    schedule(650)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lines])

  return { output, done }
}

function RotatingDocPill({ items, intervalMs = 2200 }) {
  const [idx, setIdx] = useState(0)

  const maxLen = useMemo(() => {
    if (!items?.length) return 0
    return items.reduce((m, s) => Math.max(m, (s || '').length), 0)
  }, [items])

  useEffect(() => {
    if (!items?.length) return
    const t = setInterval(() => setIdx((v) => (v + 1) % items.length), intervalMs)
    return () => clearInterval(t)
  }, [items, intervalMs])

  if (!items?.length) return null

  return (
    <div className="doc-pill-wrap" aria-hidden="true">
      <div className="doc-pill" style={{ ['--doc-pill-item-width']: `${maxLen}ch` }}>
        <span className="doc-pill-icon">
          <Icons.Sparkle />
        </span>
        <span className="doc-pill-label">Indexed</span>
        <span className="doc-pill-divider" />
        <span key={idx} className="doc-pill-item" title={items[idx]}>
          {items[idx]}
        </span>
      </div>
    </div>
  )
}

function BrandLink({ variant = 'landing' }) {
  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark">
          <Image src="/plm-mark.svg" alt="protocolLM mark" width={72} height={72} priority />
        </span>
        <span className="plm-brand-text">
          protocol<span>LM</span>
        </span>
      </span>
    </Link>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const { output, done } = useConsoleTypewriter(TYPEWRITER_LINES)

  return (
    <div className="landing">
      <div className="landing-grid">
        <div className="landing-left">
          <div className="landing-topbar">
            <BrandLink />

            <div className="landing-top-center desktop-only">
              <div className="badge badge-dark">Washtenaw County</div>
              <div className="badge badge-outline">ProtocolLM v1.0</div>
              <div className="badge badge-outline">AI-assisted</div>
            </div>

            <div className="landing-top-right">
              <div className="landing-top-links desktop-only">
                <button className="landing-link" onClick={onShowPricing}>
                  Pricing
                </button>
                <Link href="mailto:support@protocollm.org" className="landing-link">
                  Support
                </Link>
                <Link href="https://cal.com/protocollm/demo" className="landing-link">
                  Demo
                </Link>
              </div>

              <button className="landing-signin-btn" onClick={onShowAuth} type="button">
                Sign in
              </button>
            </div>
          </div>

          <div className="landing-hero">
            <div className="typewriter">
              <div className="typewriter-output">{output}</div>
              {!done && <div className="typewriter-cursor" aria-hidden="true" />}
            </div>

            <p className="landing-subtitle">
              Upload a photo or ask a question. We map it to Washtenaw County health code rules to keep restaurants
              inspection-ready.
            </p>

            <div className="landing-actions">
              <button className="btn-primary" onClick={onShowPricing} type="button">
                Start free trial
              </button>
              <button className="btn-secondary" onClick={onShowAuth} type="button">
                Sign in
              </button>
            </div>

            <div className="landing-grid-cards">
              <div className="landing-card">
                <h3>Photo scanner</h3>
                <p>Spot potential violations from a kitchen photo.</p>
                <div className="badge-row">
                  <span className="badge badge-outline">Cross contamination</span>
                  <span className="badge badge-outline">Cooling</span>
                  <span className="badge badge-outline">Handwashing</span>
                </div>
              </div>
              <div className="landing-card">
                <h3>Regulation Q&A</h3>
                <p>Ask any Washtenaw County compliance question.</p>
                <div className="badge-row">
                  <span className="badge badge-outline">MI Food Code</span>
                  <span className="badge badge-outline">Inspection</span>
                  <span className="badge badge-outline">Violations</span>
                </div>
              </div>
              <div className="landing-card">
                <h3>Stay audit-ready</h3>
                <p>We highlight issues before inspectors do.</p>
                <div className="badge-row">
                  <span className="badge badge-outline">Pre-inspection</span>
                  <span className="badge badge-outline">Corrections</span>
                  <span className="badge badge-outline">Training</span>
                </div>
              </div>
            </div>

            <div className="docs-demo">
              <RotatingDocPill items={DEMO_DOCUMENTS} />
            </div>
          </div>
        </div>

        <div className="landing-right">
          <div className="terminal">
            <div className="terminal-top">
              <div className="terminal-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="terminal-title">plm@washtenaw:~</span>
            </div>

            <div className="terminal-body">
              <pre className="terminal-output">{`> upload walk-in.jpg
Scanning...
Potential issues:
- Unlabeled container on lower shelf (Cross Contamination)
- Food stored directly on floor (Storage)
- Ice scoop handle touching ice (Equipment Hygiene)

> ask "Reheating time and temp?"
Answer: Heat to 165F for 15 sec within 2 hours. (MI Food Code, p. 130)

> ask "How to store raw chicken?"
Answer: Keep raw poultry below ready-to-eat food, sealed, labeled. (Cross Contamination)
`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')
  const [name, setName] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setMessage('')
      setMessageKind('info')
      setEmail('')
      setPassword('')
      setName('')
      setMode(initialMode)
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  const modalTitle =
    mode === 'signin' ? 'Sign in to ProtocolLM' : mode === 'signup' ? 'Create your account' : 'Reset your password'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setMessage('Please enter your name.')
          setMessageKind('error')
          return
        }

        const { error } = await createClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
            data: { full_name: name },
          },
        })

        if (error) throw error

        setMessage('Check your email to verify your account and start your trial.')
        setMessageKind('success')
      } else if (mode === 'signin') {
        const { error } = await createClient().auth.signInWithPassword({ email, password })
        if (error) throw error

        setMessage('Sign-in successful. Redirecting...')
        setMessageKind('success')
        onClose()
      } else if (mode === 'reset') {
        const { error } = await createClient().auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
        })
        if (error) throw error

        setMessage('Check your email for the password reset link.')
        setMessageKind('success')
      }
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'Something went wrong. Please try again.')
      setMessageKind('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`modal-overlay ${isLoaded ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card">
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <h2 className="modal-title">{modalTitle}</h2>
          <p className="modal-subtitle">
            Secure access to your restaurant&apos;s compliance workspace. We verify all accounts for safety.
          </p>

          <form className="modal-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Pat Taylor"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete={mode === 'reset' ? 'email' : 'username'}
                required
              />
            </div>

            {mode !== 'reset' && (
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                />
              </div>
            )}

            {mode === 'signin' && (
              <div className="form-row">
                <label className="checkbox">
                  <input type="checkbox" defaultChecked disabled />
                  <span>Remember me</span>
                </label>
              </div>
            )}

            {mode === 'reset' && (
              <div className="form-note">
                Enter your email and we&apos;ll send you a secure link to reset your password.
              </div>
            )}

            <div className="form-group">
              <div className="divider">
                <span>Security</span>
              </div>
              <ul className="security-list">
                <li>Verified business email required</li>
                <li>Multi-factor checks on new devices</li>
                <li>Encrypted at rest and in transit</li>
              </ul>
            </div>

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

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  const tiers = [
    {
      name: 'Starter',
      price: 49,
      priceId: STARTER_MONTHLY,
      model: 'Haiku',
      speed: 'Fast',
      features: [
        'Unlimited text questions',
        'Unlimited photo scans',
        'Same regulation database',
        'Email support'
      ],
      description: 'Fast - perfect for daily checks',
      loadingKey: 'starter'
    },
    {
      name: 'Professional',
      price: 99,
      priceId: PRO_MONTHLY,
      model: 'Sonnet',
      speed: 'Balanced',
      features: [
        'Unlimited text questions',
        'Unlimited photo scans',
        'Advanced reasoning',
        'Priority support'
      ],
      description: 'Most accurate for compliance',
      popular: true,
      loadingKey: 'pro'
    },
    {
      name: 'Enterprise',
      price: 199,
      priceId: ENTERPRISE_MONTHLY,
      model: 'Opus',
      speed: 'Deep Knowledge',
      features: [
        'Unlimited text questions',
        'Unlimited photo scans',
        'Deep compliance LLM responses',
        'Dedicated multi-location support'
      ],
      description: 'For restaurant groups',
      loadingKey: 'enterprise'
    }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '920px' }} onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card pricing-modal ${ibmMono.className}`} style={{ padding: '32px' }}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--ink-0)' }}>
              Choose Your Plan
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
              7-day free trial • Cancel anytime • Unlimited usage on all plans
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {tiers.map((tier) => (
              <div
                key={tier.name}
                style={{
                  background: tier.popular ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'var(--bg-2)',
                  border: tier.popular ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  position: 'relative',
                  color: tier.popular ? 'white' : 'var(--ink-0)'
                }}
              >
                {tier.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}>
                    Recommended
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                    {tier.name}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '12px' }}>
                    Claude {tier.model} LLM • {tier.speed}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '700' }}>${tier.price}</span>
                    <span style={{ fontSize: '14px', opacity: 0.7 }}>/month</span>
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: '1.4' }}>
                    {tier.description}
                  </div>
                </div>

                <button
                  onClick={() => onCheckout(tier.priceId, tier.loadingKey)}
                  disabled={!!loading}
                  style={{
                    width: '100%',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: tier.popular ? 'white' : 'var(--accent)',
                    color: tier.popular ? 'var(--bg-1)' : 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    marginBottom: '16px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {loading === tier.loadingKey && <span className="spinner" />}
                  <span>Start 7-Day Trial</span>
                </button>

                <div style={{ borderTop: tier.popular ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  {tier.features.map((feature, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '13px', 
                      marginBottom: '8px',
                      opacity: 0.9
                    }}>
                      <span style={{ fontSize: '16px' }}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '24px', textAlign: 'center' }}>
            All plans: Unlimited usage • Same Washtenaw County database • 7-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
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

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('signin')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const [sendKey, setSendKey] = useState(0)
  const [sendMode, setSendMode] = useState('text')

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)

  const shouldAutoScrollRef = useRef(true)

  const isAuthenticated = !!session

  // ✅ Chat settings menu (gear dropdown)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsRef = useRef(null)

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
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
    const splineContainer = document.getElementById('plm-spline-bg')
    if (splineContainer) {
      splineContainer.style.display = isAuthenticated ? 'none' : 'block'
    }
  }, [isAuthenticated])

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const onResize = () => scrollToBottom()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [scrollToBottom])

  const loadSessionAndSub = useCallback(
    async (activeSession) => {
      setIsLoading(true)

      try {
        if (activeSession) {
          setSession(activeSession)

          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('status, cancel_at_period_end, current_period_end, price_id')
            .eq('user_id', activeSession.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (subError) throw subError

          const hasActive = subData && ['active', 'trialing'].includes(subData.status)
          setHasActiveSubscription(hasActive)
        } else {
          setSession(null)
          setHasActiveSubscription(false)
        }
      } catch (e) {
        console.error('Subscription check failed', e)
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    let isMounted = true

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
  }, [supabase, searchParams, router, loadSessionAndSub])

  const handleCheckout = async (priceId, planName) => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setShowPricingModal(false)
        setAuthInitialMode('signup')
        setShowAuthModal(true)
        return
      }
      if (!priceId) {
        alert('Invalid price selected.')
        return
      }

      if (!captchaLoaded) {
        alert('Security verification is still loading. Please try again in a moment.')
        return
      }

      setCheckoutLoading(planName)

      const captchaToken = await executeRecaptcha('checkout')
      if (!captchaToken || captchaToken === 'turnstile_unavailable') {
        throw new Error('Security verification failed. Please refresh and try again.')
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ priceId, captchaToken }),
        credentials: 'include',
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Checkout failed')

      if (payload.url) window.location.href = payload.url
      else throw new Error('No checkout URL returned')
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
    } finally {
      setCheckoutLoading(null)
    }
  }

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
      alert('Unable to open billing portal. Please try again.')
    } finally {
      if (loadingToast) document.body.removeChild(loadingToast)
    }
  }

  const handleUpload = useCallback(
    async (file) => {
      if (!file) return

      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        alert('Please upload an image file (jpg, png, webp).')
        return
      }

      try {
        setSendMode('image')
        setIsSending(true)
        const compressed = await compressImage(file)
        setSelectedImage(compressed)
      } catch (error) {
        console.error('Image compression failed:', error)
        alert('Unable to process that image. Please try another.')
      } finally {
        setIsSending(false)
        setSendMode('text')
      }
    },
    []
  )

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      const file = event.dataTransfer.files?.[0]
      if (file) handleUpload(file)
    },
    [handleUpload]
  )

  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0]
      if (file) handleUpload(file)
    },
    [handleUpload]
  )

  const handleSend = useCallback(
    async (e) => {
      e?.preventDefault()
      if (!input.trim() && !selectedImage) return

      setIsSending(true)
      const currentMessages = [...messages]
      const newUserMessage = {
        role: 'user',
        content: selectedImage
          ? [
              { type: 'text', text: input || 'Please analyze this image.' },
              {
                type: 'image',
                source: { type: 'base64', media_type: selectedImage.type, data: selectedImage.data },
              },
            ]
          : input,
      }

      setMessages((prev) => [...prev, newUserMessage])
      setInput('')
      setSelectedImage(null)
      setSendKey((k) => k + 1)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...currentMessages, newUserMessage],
            county: 'washtenaw',
            image: selectedImage?.data ? `data:${selectedImage.type};base64,${selectedImage.data}` : null,
          }),
        })

        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || 'Failed to send')

        setMessages((prev) => [...prev, { role: 'assistant', content: payload.reply }])
      } catch (error) {
        console.error('Send failed:', error)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Error: ' + (error.message || 'Unable to process request.') },
        ])
      } finally {
        setIsSending(false)
      }
    },
    [input, messages, selectedImage]
  )

  const handleNewChat = useCallback(() => {
    setCurrentChatId(Date.now().toString())
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setSendKey((k) => k + 1)
  }, [])

  const handlePaste = useCallback(
    (e) => {
      const file = Array.from(e.clipboardData.files || []).find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        handleUpload(file)
      }
    },
    [handleUpload]
  )

  useEffect(() => {
    const el = textAreaRef.current
    if (!el) return
    el.addEventListener('paste', handlePaste)
    return () => el.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  useEffect(() => {
    const el = textAreaRef.current
    if (!el) return
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    const onPaste = (e) => {
      if (!isAuthenticated) return
      const file = Array.from(e.clipboardData.files || []).find((f) => f.type.startsWith('image/'))
      if (file) handleUpload(file)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleUpload, isAuthenticated])

  const handleCopyDocId = useCallback((docTitle) => {
    navigator.clipboard.writeText(docTitle || '')
  }, [])

  useEffect(() => {
    const showPricing = searchParams.get('pricing')
    if (showPricing === 'true') setShowPricingModal(true)
  }, [searchParams])

  const landingCTA = (
    <div className="landing-cta">
      <div>
        <h3>Stay ahead of inspectors.</h3>
        <p>Scan photos, ask questions, and catch violations before they cost you.</p>
      </div>
      <button className="btn-primary" onClick={() => setShowPricingModal(true)} type="button">
        Start trial
      </button>
    </div>
  )

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'

    return (
      <div key={index} className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
        {isAssistant && <div className="assistant-header">ProtocolLM</div>}
        {Array.isArray(message.content) ? (
          message.content.map((part, idx) => {
            if (typeof part === 'string') {
              return <p key={idx}>{part}</p>
            }
            if (part.type === 'text') {
              return <p key={idx}>{part.text}</p>
            }
            if (part.type === 'image') {
              return (
                <div key={idx} className="chat-image">
                  <img src={`data:${part.source.media_type};base64,${part.source.data}`} alt="Uploaded" />
                </div>
              )
            }
            return null
          })
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    )
  }

  return (
    <>
      <SmartProgress loading={isLoading} stage={loadingStage} />
      <div className="app-root" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        <div id="plm-spline-bg" />
        {!isAuthenticated && landingCTA}

        <style jsx global>{`
          :root {
            --bg-1: #0f172a;
            --bg-2: #111827;
            --bg-3: #0b1220;
            --ink-0: #e2e8f0;
            --ink-1: #cbd5e1;
            --ink-2: #94a3b8;
            --ink-3: #64748b;
            --border-default: #1f2937;
            --border-subtle: #1e293b;
            --accent: #38bdf8;
            --accent-2: #7c3aed;
            --radius-sm: 10px;
            --radius-md: 14px;
            --radius-lg: 18px;
            --radius-full: 9999px;
            --shadow-1: 0 10px 40px rgba(0, 0, 0, 0.35);
            --shadow-2: 0 20px 80px rgba(0, 0, 0, 0.4);
            --shadow-3: 0 30px 120px rgba(0, 0, 0, 0.45);
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.05), transparent 25%),
              radial-gradient(circle at 90% 10%, rgba(236, 72, 153, 0.05), transparent 25%),
              radial-gradient(circle at 50% 80%, rgba(56, 189, 248, 0.08), transparent 30%),
              #0b1220;
            color: var(--ink-0);
            font-family: ${inter.style.fontFamily}, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
              sans-serif;
            min-height: 100vh;
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          .app-root {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            position: relative;
          }

          #plm-spline-bg {
            position: fixed;
            inset: 0;
            background: radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.08), transparent 25%),
              radial-gradient(circle at 80% 0%, rgba(126, 34, 206, 0.08), transparent 25%),
              radial-gradient(circle at 50% 70%, rgba(14, 165, 233, 0.06), transparent 30%);
            opacity: 0.9;
            pointer-events: none;
            z-index: 0;
          }

          .landing {
            position: relative;
            z-index: 1;
            padding: 32px 32px 120px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }

          .landing-grid {
            display: grid;
            grid-template-columns: 1.05fr 0.95fr;
            gap: 32px;
          }

          .landing-left {
            display: flex;
            flex-direction: column;
            gap: 28px;
          }

          .landing-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }

          .plm-brand {
            display: inline-flex;
            align-items: center;
            color: var(--ink-0);
            text-decoration: none;
            font-weight: 700;
            letter-spacing: -0.01em;
          }

          .plm-brand-inner {
            display: inline-flex;
            align-items: center;
            gap: 12px;
          }

          .plm-brand-mark {
            width: 68px;
            height: 68px;
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(124, 58, 237, 0.15));
            display: inline-flex;
            align-items: center;
            justifyContent: center;
            box-shadow: var(--shadow-1);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .plm-brand-text {
            font-size: 20px;
            color: var(--ink-0);
          }

          .plm-brand-text span {
            color: var(--accent);
          }

          .landing-top-center {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 10px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.01em;
          }

          .badge-dark {
            background: rgba(255, 255, 255, 0.04);
            color: var(--ink-0);
          }

          .badge-outline {
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--ink-2);
            background: rgba(255, 255, 255, 0.02);
          }

          .landing-top-right {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .landing-top-links {
            display: inline-flex;
            align-items: center;
            gap: 12px;
          }

          .landing-link {
            background: transparent;
            border: none;
            color: var(--ink-1);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            padding: 8px 10px;
          }

          .landing-link:hover {
            color: var(--ink-0);
          }

          .landing-signin-btn {
            background: rgba(255, 255, 255, 0.08);
            color: var(--ink-0);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--radius-full);
            padding: 10px 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .landing-signin-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
          }

          .landing-hero {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 24px;
            padding: 32px;
            box-shadow: var(--shadow-2);
            position: relative;
            overflow: hidden;
          }

          .typewriter {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 16px 18px;
            font-family: ${ibmMono.style.fontFamily}, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono',
              'Courier New', monospace;
            font-size: 16px;
            color: var(--ink-0);
            min-height: 84px;
            position: relative;
          }

          .typewriter-output {
            white-space: pre-line;
          }

          .typewriter-cursor {
            width: 10px;
            height: 1.2em;
            background: var(--accent);
            display: inline-block;
            animation: blink 1s steps(2, start) infinite;
            margin-left: 4px;
          }

          @keyframes blink {
            to {
              visibility: hidden;
            }
          }

          .landing-subtitle {
            color: var(--ink-2);
            font-size: 15px;
            line-height: 1.6;
            margin: 16px 0 24px;
          }

          .landing-actions {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .btn-primary,
          .btn-secondary {
            border-radius: var(--radius-md);
            padding: 12px 16px;
            font-weight: 700;
            font-size: 14px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-primary {
            background: linear-gradient(135deg, #38bdf8, #7c3aed);
            color: white;
            box-shadow: var(--shadow-2);
          }

          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-3);
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.06);
            color: var(--ink-0);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .landing-grid-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            margin: 22px 0;
          }

          .landing-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 16px;
            box-shadow: var(--shadow-1);
          }

          .landing-card h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: var(--ink-0);
          }

          .landing-card p {
            margin: 0 0 10px 0;
            color: var(--ink-2);
            font-size: 14px;
          }

          .badge-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .docs-demo {
            margin-top: 18px;
          }

          .landing-right {
            position: relative;
            z-index: 1;
          }

          .terminal {
            background: #0b1220;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            box-shadow: var(--shadow-3);
            overflow: hidden;
            height: 100%;
          }

          .terminal-top {
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(255, 255, 255, 0.02);
          }

          .terminal-dots {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
          }

          .dot.red {
            background: #ef4444;
          }

          .dot.yellow {
            background: #f59e0b;
          }

          .dot.green {
            background: #22c55e;
          }

          .terminal-title {
            font-size: 13px;
            color: var(--ink-2);
          }

          .terminal-body {
            padding: 16px;
            font-family: ${ibmMono.style.fontFamily}, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono',
              'Courier New', monospace;
            color: var(--ink-1);
            background: radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.04), transparent 35%),
              radial-gradient(circle at 70% 50%, rgba(124, 58, 237, 0.04), transparent 35%),
              #0f172a;
            min-height: 480px;
          }

          .terminal-output {
            margin: 0;
            white-space: pre-line;
            font-size: 14px;
            line-height: 1.6;
          }

          .landing-cta {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(124, 58, 237, 0.12));
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 16px 18px;
            box-shadow: var(--shadow-2);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10;
            color: var(--ink-0);
          }

          .landing-cta h3 {
            margin: 0 0 4px 0;
            font-size: 15px;
          }

          .landing-cta p {
            margin: 0;
            font-size: 13px;
            color: var(--ink-2);
          }

          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
          }

          .modal-overlay.open {
            opacity: 1;
            visibility: visible;
          }

          .modal-container {
            max-width: 440px;
            width: 100%;
          }

          .modal-card {
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 28px;
            box-shadow: var(--shadow-3);
            position: relative;
          }

          .modal-close {
            position: absolute;
            top: 14px;
            right: 14px;
            background: rgba(255, 255, 255, 0.06);
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            color: var(--ink-0);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-close:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .modal-title {
            margin: 0 0 6px 0;
            color: var(--ink-0);
            font-size: 20px;
          }

          .modal-subtitle {
            margin: 0 0 16px 0;
            color: var(--ink-2);
            font-size: 14px;
          }

          .modal-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .form-group label {
            font-weight: 600;
            color: var(--ink-1);
            font-size: 13px;
          }

          .form-group input {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 10px 12px;
            color: var(--ink-0);
            font-size: 14px;
          }

          .form-group input:focus {
            outline: 2px solid var(--accent);
            outline-offset: 1px;
          }

          .form-note {
            font-size: 12px;
            color: var(--ink-2);
            margin-top: -4px;
          }

          .form-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .checkbox {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--ink-2);
            font-size: 13px;
          }

          .divider {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--ink-2);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .divider::before,
          .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.08);
          }

          .security-list {
            margin: 0;
            padding-left: 16px;
            color: var(--ink-2);
            font-size: 13px;
            line-height: 1.5;
          }

          .btn-submit {
            background: linear-gradient(135deg, #38bdf8, #7c3aed);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 14px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: var(--shadow-2);
          }

          .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-3);
          }

          .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .modal-message {
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
          }

          .modal-message.info {
            background: rgba(255, 255, 255, 0.05);
            color: var(--ink-1);
          }

          .modal-message.success {
            background: rgba(16, 185, 129, 0.16);
            color: #bbf7d0;
          }

          .modal-message.error {
            background: rgba(248, 113, 113, 0.16);
            color: #fecdd3;
          }

          .modal-footer {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }

          .modal-link {
            background: none;
            border: none;
            color: var(--accent);
            cursor: pointer;
            font-weight: 700;
            padding: 0;
          }

          .pricing-modal {
            text-align: center;
          }

          .pricing-modal-price {
            display: inline-flex;
            align-items: baseline;
            gap: 4px;
            font-size: 52px;
            font-weight: 800;
            color: var(--ink-0);
            margin: 10px 0 18px;
          }

          .price-currency {
            font-size: 24px;
            color: var(--ink-2);
          }

          .price-period {
            font-size: 16px;
            color: var(--ink-2);
          }

          .pricing-modal-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
          }

          .btn-pricing-primary,
          .btn-pricing-secondary {
            width: 100%;
            height: 48px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            border: none;
          }

          .btn-pricing-primary {
            background: linear-gradient(135deg, #38bdf8, #7c3aed);
            color: white;
          }

          .btn-pricing-secondary {
            background: rgba(255, 255, 255, 0.04);
            color: var(--ink-0);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .pricing-modal-terms {
            color: var(--ink-2);
            font-size: 12px;
            margin-top: 12px;
          }

          .save-badge {
            background: rgba(16, 185, 129, 0.16);
            color: #bbf7d0;
            padding: 4px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 700;
            margin-left: 8px;
          }

          .chat-root {
            position: relative;
            z-index: 1;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.08), transparent 25%),
              radial-gradient(circle at 80% 0%, rgba(124, 58, 237, 0.08), transparent 25%),
              #0b1220;
          }

          .chat-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            position: sticky;
            top: 0;
            z-index: 5;
            background: rgba(11, 18, 32, 0.9);
            backdrop-filter: blur(12px);
          }

          .chat-top-actions {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .btn-billing {
            background: rgba(255, 255, 255, 0.06);
            color: var(--ink-0);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--radius-md);
            padding: 10px 12px;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-billing:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .chat-settings-wrap {
            position: relative;
          }

          .chat-settings-btn {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.04);
            color: var(--ink-0);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .chat-settings-btn:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .chat-settings-menu {
            position: absolute;
            right: 0;
            top: 48px;
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            box-shadow: var(--shadow-2);
            padding: 6px;
            min-width: 160px;
            z-index: 10;
          }

          .chat-settings-item {
            width: 100%;
            background: none;
            border: none;
            color: var(--ink-0);
            text-align: left;
            padding: 10px 12px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          }

          .chat-settings-item:hover {
            background: rgba(255, 255, 255, 0.06);
          }

          .chat-container {
            display: grid;
            grid-template-columns: 1fr 320px;
            min-height: calc(100vh - 80px);
          }

          .chat-main {
            display: flex;
            flex-direction: column;
            min-height: 0;
            border-right: 1px solid rgba(255, 255, 255, 0.06);
          }

          .chat-sidebar {
            padding: 16px 18px 18px;
            min-height: 0;
            overflow-y: auto;
            background: rgba(255, 255, 255, 0.02);
          }

          .chat-messages {
            flex: 1;
            padding: 0 24px 24px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .chat-bubble {
            max-width: 82%;
            padding: 12px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
          }

          .chat-bubble.user {
            margin-left: auto;
            background: rgba(56, 189, 248, 0.15);
            border: 1px solid rgba(56, 189, 248, 0.25);
            color: #e0f2fe;
            border-bottom-right-radius: 4px;
          }

          .chat-bubble.assistant {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--ink-1);
            border-bottom-left-radius: 4px;
            box-shadow: var(--shadow-1);
          }

          .assistant-header {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--ink-3);
            margin-bottom: 6px;
            font-weight: 700;
          }

          .chat-input {
            padding: 12px 16px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(11, 18, 32, 0.94);
            position: sticky;
            bottom: 0;
            z-index: 2;
          }

          .chat-input-inner {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 12px 14px;
            display: flex;
            gap: 10px;
            align-items: flex-end;
          }

          .chat-textarea {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--ink-0);
            font-size: 14px;
            resize: none;
            min-height: 38px;
            max-height: 140px;
            line-height: 1.5;
            padding: 6px 0;
            font-family: ${inter.style.fontFamily}, system-ui, -apple-system, 'Segoe UI', sans-serif;
          }

          .chat-textarea:focus {
            outline: none;
          }

          .chat-upload-label {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            border: 1px dashed rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.04);
            color: var(--ink-2);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.15s ease;
          }

          .chat-upload-label:hover {
            border-color: var(--accent);
            color: var(--accent);
          }

          .chat-upload-input {
            display: none;
          }

          .chat-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .chat-image-preview {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.2);
            padding: 6px 8px;
            border-radius: 10px;
            color: #e0f2fe;
          }

          .chat-image-preview img {
            width: 36px;
            height: 36px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .chat-send-btn {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--ink-2);
            cursor: pointer;
            flex-shrink: 0;
            transition: color 0.15s ease;
          }

          .chat-send-btn:hover:not(:disabled) {
            color: var(--accent);
          }
          .chat-send-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          .chat-send-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--border-subtle);
            border-top-color: var(--accent);
            border-radius: var(--radius-full);
            animation: spin 0.6s linear infinite;
          }

          .chat-disclaimer {
            text-align: center;
            font-size: 11px;
            color: var(--ink-3);
            margin-top: 14px;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .landing-topbar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 16px
                max(16px, env(safe-area-inset-left));
              gap: 14px;
            }

            .landing-top-center {
              display: none;
            }

            .desktop-only {
              display: none !important;
            }
            .mobile-only {
              display: flex;
            }

            .landing-hero {
              padding: 120px 20px 120px;
            }
            .terminal-output {
              font-size: 13px;
            }

            .plm-brand-mark {
              width: 60px;
              height: 60px;
            }
            .plm-brand-text {
              font-size: 18px;
            }

            /* ✅ Sign-in as small white text on mobile */
            .landing-signin-btn {
              height: auto !important;
              padding: 0 !important;
              margin-right: 6px;
              transform: translateY(-1px);
              color: var(--ink-0) !important;
              font-size: 12px !important;
              font-weight: 600 !important;
              letter-spacing: 0.04em !important;
              line-height: 1 !important;
            }

            .chat-topbar {
              padding: 12px 16px;
              padding-left: max(16px, env(safe-area-inset-left));
              padding-right: max(16px, env(safe-area-inset-right));
              padding-top: max(12px, env(safe-area-inset-top));
            }

            .chat-messages {
              padding: 0 16px calc(24px + env(safe-area-inset-bottom));
            }

            .chat-input-inner {
              padding: 12px 16px 18px;
              padding-bottom: max(18px, env(safe-area-inset-bottom));
            }

            .chat-bubble {
              max-width: 85%;
            }

            /* ✅ Tiny extra shrink on mobile empty prompt for cleaner wrap */
            .chat-empty-text {
              font-size: 13px;
            }
          }

          @media (max-width: 480px) {
            .modal-card {
              padding: 24px 20px;
            }
            .price-value {
              font-size: 48px;
            }

            .plm-brand-mark {
              width: 55px;
              height: 55px;
            }
            .plm-brand-text {
              font-size: 17px;
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

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onCheckout={handleCheckout}
          loading={checkoutLoading}
        />

        <div className="app-container">
          <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {!isAuthenticated ? (
              <LandingPage
                onShowPricing={() => setShowPricingModal(true)}
                onShowAuth={() => {
                  setAuthInitialMode('signin')
                  setShowAuthModal(true)
                }}
              />
            ) : (
              <div className={`${ibmMono.className} chat-root`}>
                <header className="chat-topbar">
                  <BrandLink variant="chat" />
                  <nav className="chat-top-actions" aria-label="Chat actions">
                    <div className="chat-settings-wrap" ref={settingsRef}>
                      <button
                        type="button"
                        className="chat-settings-btn"
                        onClick={() => setShowSettingsMenu((v) => !v)}
                        aria-expanded={showSettingsMenu}
                        aria-label="Settings"
                      >
                        <Icons.Gear />
                      </button>

                      {showSettingsMenu && (
                        <div className="chat-settings-menu" role="menu" aria-label="Settings menu">
                          {hasActiveSubscription && (
                            <button
                              type="button"
                              className="chat-settings-item"
                              role="menuitem"
                              onClick={() => {
                                setShowSettingsMenu(false)
                                handleManageBilling()
                              }}
                            >
                              Billing
                            </button>
                          )}

                          <button
                            type="button"
                            className="chat-settings-item"
                            role="menuitem"
                            onClick={() => {
                              handleNewChat()
                              setShowSettingsMenu(false)
                            }}
                          >
                            New chat
                          </button>
                        </div>
                      )}
                    </div>
                    {hasActiveSubscription && (
                      <button className="btn-billing desktop-only" onClick={handleManageBilling} type="button">
                        Manage billing
                      </button>
                    )}
                  </nav>
                </header>

                <div className="chat-container">
                  <div className="chat-main">
                    <div className="chat-messages" ref={scrollRef}>
                      {messages.length === 0 && (
                        <div className="chat-bubble assistant" style={{ alignSelf: 'center', marginTop: '32px' }}>
                          <div className="assistant-header">ProtocolLM</div>
                          <p className="chat-empty-text" style={{ margin: 0 }}>
                            Ask about Washtenaw County health codes or drop a kitchen photo to scan for issues.
                          </p>
                        </div>
                      )}
                      {messages.map((msg, idx) => renderMessage(msg, idx))}
                      {isSending && (
                        <div className="chat-bubble assistant">
                          <div className="assistant-header">ProtocolLM</div>
                          <p>Analyzing...</p>
                        </div>
                      )}
                    </div>

                    <form className="chat-input" onSubmit={handleSend}>
                      <div className="chat-input-inner">
                        <label className="chat-upload-label" htmlFor="file-upload">
                          <Icons.Camera />
                          <input
                            id="file-upload"
                            className="chat-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>

                        <textarea
                          key={sendKey}
                          ref={textAreaRef}
                          className="chat-textarea"
                          placeholder="Ask about Washtenaw County regulations or paste an image..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          rows={1}
                        />

                        <div className="chat-actions">
                          {selectedImage && (
                            <div className="chat-image-preview">
                              <img src={`data:${selectedImage.type};base64,${selectedImage.data}`} alt="Selected" />
                              <button type="button" onClick={() => setSelectedImage(null)} className="modal-close">
                                <Icons.X />
                              </button>
                            </div>
                          )}

                          <button className="chat-send-btn" type="submit" disabled={isSending}>
                            {isSending ? <span className="chat-send-spinner" /> : <Icons.ArrowUp />}
                          </button>
                        </div>
                      </div>

                      <div className="chat-disclaimer">Not legal advice. For enforcement, contact your inspector.</div>
                    </form>
                  </div>

                  <aside className="chat-sidebar" aria-label="Context sidebar">
                    <div className="sidebar-card">
                      <div className="sidebar-card-header">
                        <div>
                          <div className="sidebar-card-title">Compliance memory</div>
                          <div className="sidebar-card-subtitle">Saved from your previous chats</div>
                        </div>
                        <span className="badge badge-outline">Secure</span>
                      </div>

                      <div className="sidebar-memory">
                        {userMemory ? (
                          userMemory.map((item, idx) => (
                            <div key={idx} className="memory-item">
                              <div className="memory-title">{item.prompt}</div>
                              <div className="memory-response">{item.response}</div>
                            </div>
                          ))
                        ) : (
                          <div className="memory-empty">
                            <p>Ask a question to start building your restaurant&apos;s compliance memory.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sidebar-card">
                      <div className="sidebar-card-header">
                        <div>
                          <div className="sidebar-card-title">Document sources</div>
                          <div className="sidebar-card-subtitle">Washtenaw County health code</div>
                        </div>
                        <span className="badge badge-outline">20 docs</span>
                      </div>

                      <div className="doc-list">
                        {DEMO_DOCUMENTS.map((doc) => (
                          <button
                            key={doc}
                            className="doc-pill-btn"
                            type="button"
                            onClick={() => handleCopyDocId(doc)}
                            title="Copy document title"
                          >
                            <span className="doc-pill-dot" />
                            <span className="doc-pill-text">{doc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sidebar-card">
                      <div className="sidebar-card-header">
                        <div>
                          <div className="sidebar-card-title">Need a demo?</div>
                          <div className="sidebar-card-subtitle">Schedule a walkthrough</div>
                        </div>
                        <span className="badge badge-outline">15 min</span>
                      </div>

                      <div className="sidebar-cta">
                        <p>See how ProtocolLM fits your restaurant&apos;s compliance process.</p>
                        <Link href="https://cal.com/protocollm/demo" className="btn-secondary" style={{ width: '100%' }}>
                          Book a demo
                        </Link>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
