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
      <line x1="18" y1="6" x2="6" y1="18" />
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

/**
 * Landing page demo script (alternating assistant/user so the flow is:
 * assistant finishes -> user message types into box -> user presses Send/Enter -> assistant responds
 */
const LANDING_DEMO_SCRIPT = [
  { type: 'assistant', text: 'Hey — welcome to protocolLM.' },
  { type: 'user', text: 'What does this do?' },
  {
    type: 'assistant',
    text: 'Snap a kitchen photo and I’ll flag likely health-code violations — fast, plain language, plus what to fix.',
  },
  { type: 'user', text: 'Nice. What else?' },
  {
    type: 'assistant',
    text: 'Ask questions too — cooling, reheating, date marking, sanitizer, hand sinks, allergens… all based on Washtenaw County rules.',
  },
  { type: 'user', text: 'What kinds of violations are most common?' },
  {
    type: 'assistant',
    text: 'Temps, cross-contamination risks, dirty food-contact surfaces, sanitizer setup, missing date marks, and blocked/dirty hand sinks.',
  },
  { type: 'user', text: 'And what can violations cost me?' },
  {
    type: 'assistant',
    text: 'It varies, but it can mean re-inspections, enforcement actions, product loss, and a rough inspection report. Goal is simple: catch it early, fix it fast.',
  },
  { type: 'user', text: 'Got it. How do I try it?' },
  {
    type: 'assistant',
    text: 'Start a free 7-day trial — tap Start trial (top right) or use the button below on mobile.',
  },
]

function BrandLink({ variant = 'landing' }) {
  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark" aria-hidden="true">
          <Image src={appleIcon} alt="" width={64} height={64} priority />
        </span>
        <span className="plm-brand-text">protocolLM</span>
      </span>
    </Link>
  )
}

function FooterLinks() {
  return (
    <div className={`plm-footer-links ${ibmMono.className}`}>
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

function LandingDemoTerminal() {
  const [step, setStep] = useState(0)
  const [log, setLog] = useState([{ role: 'assistant', content: LANDING_DEMO_SCRIPT[0]?.text || '' }])

  const [assistantDraft, setAssistantDraft] = useState('')
  const [assistantTyping, setAssistantTyping] = useState(false)

  const [inputDraft, setInputDraft] = useState('')
  const [typingInput, setTypingInput] = useState(false)
  const [awaitingSend, setAwaitingSend] = useState(false)

  const logRef = useRef(null)
  const inputRef = useRef(null)
  const awaitingSendRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    awaitingSendRef.current = awaitingSend
  }, [awaitingSend])

  useEffect(() => {
    scrollToBottom()
  }, [log, assistantDraft, scrollToBottom])

  const typeText = useCallback(async (text, setter, opts = {}) => {
    const min = opts.min ?? 18
    const max = opts.max ?? 38
    const puncExtra = opts.puncExtra ?? [55, 130]
    const longPuncExtra = opts.longPuncExtra ?? [90, 170]
    const spaceExtraChance = opts.spaceExtraChance ?? 0.06
    const spaceExtra = opts.spaceExtra ?? [20, 60]

    const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1))
    const isPunc = (ch) => ['.', ',', '!', '?', ':', ';'].includes(ch)
    const isLong = (ch) => ['.', '!', '?'].includes(ch)

    setter('')
    let out = ''

    for (let i = 0; i < text.length; i++) {
      out += text[i]
      setter(out)

      let delay = rand(min, max)
      const ch = text[i]

      if (ch === '—') delay += rand(60, 120)
      if (isPunc(ch)) delay += rand(puncExtra[0], puncExtra[1])
      if (isLong(ch)) delay += rand(longPuncExtra[0], longPuncExtra[1])
      if (ch === ' ' && Math.random() < spaceExtraChance) delay += rand(spaceExtra[0], spaceExtra[1])

      await new Promise((r) => setTimeout(r, delay))
    }
  }, [])

  // Drive the script (no auto-send — ONLY advances when user presses Send/Enter)
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      // step 0 is already preloaded into log
      if (step === 0) {
        // after the first assistant line, tee up the first user input
        await new Promise((r) => setTimeout(r, 700))
        if (!cancelled) setStep(1)
        return
      }

      const item = LANDING_DEMO_SCRIPT[step]
      if (!item) return

      if (item.type === 'assistant') {
        setAssistantTyping(true)
        setAssistantDraft('')

        await typeText(item.text, (v) => {
          if (cancelled) return
          setAssistantDraft(v)
        })

        if (cancelled) return

        setLog((prev) => [...prev, { role: 'assistant', content: item.text }])
        setAssistantDraft('')
        setAssistantTyping(false)

        const nextType = LANDING_DEMO_SCRIPT[step + 1]?.type
        const advanceDelay = nextType === 'user' ? 1450 : 650

        await new Promise((r) => setTimeout(r, advanceDelay))
        if (cancelled) return
        setStep((s) => s + 1)
        return
      }

      if (item.type === 'user') {
        setTypingInput(true)
        setAwaitingSend(false)
        setInputDraft('')

        await new Promise((r) => setTimeout(r, 520))

        await typeText(
          item.text,
          (v) => {
            if (cancelled) return
            setInputDraft(v)
          },
          { min: 22, max: 44 }
        )

        if (cancelled) return

        setTypingInput(false)
        setAwaitingSend(true)

        // Focus the input so Enter works immediately (still read-only)
        requestAnimationFrame(() => {
          try {
            inputRef.current?.focus()
          } catch {}
        })

        return
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [step, typeText])

  const sendUserStep = useCallback(() => {
    const item = LANDING_DEMO_SCRIPT[step]
    if (!item || item.type !== 'user') return
    if (!awaitingSendRef.current) return

    const msg = inputDraft
    if (!msg) return

    setAwaitingSend(false)
    setTypingInput(false)
    setInputDraft('')

    setLog((prev) => [...prev, { role: 'user', content: msg }])

    // Advance to next step (assistant response)
    setStep((s) => s + 1)
  }, [step, inputDraft])

  // Allow Enter to send even if the field loses focus
  useEffect(() => {
    if (!awaitingSend) return

    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendUserStep()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [awaitingSend, sendUserStep])

  const isDone = step >= LANDING_DEMO_SCRIPT.length

  return (
    <div className="landing-demo">
      <div ref={logRef} className="landing-demo-log" role="log" aria-label="protocolLM demo conversation">
        {log.map((m, i) => (
          <div key={i} className={`landing-demo-row ${m.role === 'user' ? 'user' : 'assistant'}`}>
            <div className={`landing-demo-bubble ${m.role}`}>
              <span className="landing-demo-text">{m.content}</span>
            </div>
          </div>
        ))}

        {assistantTyping && (
          <div className="landing-demo-row assistant">
            <div className="landing-demo-bubble assistant">
              <span className="landing-demo-text">
                {assistantDraft}
                <span className="landing-demo-cursor">▌</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="landing-demo-input">
        <div className={`landing-demo-inputWrap ${awaitingSend ? 'ready' : ''}`}>
          <textarea
            ref={inputRef}
            className="landing-demo-textarea"
            value={inputDraft}
            readOnly
            rows={1}
            placeholder={isDone ? 'Demo finished.' : typingInput ? '' : ' '}
            onKeyDown={(e) => {
              // (Still supports Enter when focused)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendUserStep()
              }
            }}
          />
          <button
            type="button"
            className={`landing-demo-send ${awaitingSend ? 'active' : ''}`}
            onClick={sendUserStep}
            aria-label="Send"
            disabled={!awaitingSend}
          >
            <Icons.ArrowUp />
          </button>
        </div>

        <div className="landing-demo-hint" aria-live="polite">
          {isDone ? (
            <span className="landing-demo-hintText done">You’re all set — start a free 7-day trial anytime.</span>
          ) : awaitingSend ? (
            <span className="landing-demo-hintText">
              Press <b>Send</b> (or <b>Enter</b>) to continue
            </span>
          ) : assistantTyping ? (
            <span className="landing-demo-hintText subtle">…</span>
          ) : (
            <span className="landing-demo-hintText subtle"> </span>
          )}
        </div>
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${ibmMono.className} landing-root`}>
      <div className="landing-bg" />

      <header className="landing-topbar">
        <div className="plm-brand-wrap">
          <BrandLink variant="landing" />
        </div>

        {/* (Removed rotating doc pill entirely) */}
        <div className="landing-top-center" aria-hidden="true" />

        {/* ✅ Single actions area: Start trial + Sign in */}
        <nav className="landing-top-actions" aria-label="Top actions">
          <div className="landing-top-actions-desktop desktop-only">
            <button onClick={onShowPricing} className="btn-primary" type="button">
              Start trial
            </button>
          </div>

          <button onClick={onShowAuth} className="btn-nav landing-signin-btn" type="button">
            Sign in
          </button>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-terminal">
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
            </div>

            <div className="terminal-body terminal-body-demo">
              <LandingDemoTerminal />
            </div>
          </div>

          <div className="mobile-start mobile-only">
            <button className="btn-primary" onClick={onShowPricing} type="button">
              Start trial
            </button>
          </div>
        </div>
      </main>

      <FooterLinks />
    </div>
  )
}

// ✅ UPDATED: accepts selectedPriceId and passes it on signup
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
        setMessage('Security verification failed. Please try again.')
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password

        // ✅ PASS selected plan to signup
        if (mode === 'signup' && selectedPriceId) {
          body.selectedPriceId = selectedPriceId
        }

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card ${ibmMono.className}`}>
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
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="form-input"
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-input"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  const tiers = [
    {
      name: 'Starter',
      price: 49,
      priceId: STARTER_MONTHLY,
      features: [
        'Unlimited usage (questions + photos)',
        'Haiku — fast answers for daily checks',
        'Best for quick scans and on-the-line clarity',
        'Email support',
      ],
      loadingKey: 'starter',
    },
    {
      name: 'Professional',
      price: 99,
      priceId: PRO_MONTHLY,
      features: [
        'Unlimited usage (questions + photos)',
        'Sonnet — balanced, thorough responses',
        'Sharper guidance for tougher compliance calls',
        'Priority support',
      ],
      popular: true,
      loadingKey: 'pro',
    },
    {
      name: 'Enterprise',
      price: 199,
      priceId: ENTERPRISE_MONTHLY,
      features: [
        'Unlimited usage (questions + photos)',
        'Opus — advanced reasoning for best answers',
        'Ideal for multi-location playbooks and reviews',
        'Dedicated multi-location support',
      ],
      loadingKey: 'enterprise',
    },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '920px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
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
                  color: tier.popular ? 'white' : 'var(--ink-0)',
                }}
              >
                {tier.popular && (
                  <div
                    style={{
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
                      textTransform: 'uppercase',
                    }}
                  >
                    Recommended
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{tier.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '700' }}>${tier.price}</span>
                    <span style={{ fontSize: '14px', opacity: 0.7 }}>/month</span>
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
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loading === tier.loadingKey && <span className="spinner" />}
                  <span>Start 7-Day Trial</span>
                </button>

                <div
                  style={{
                    borderTop: tier.popular ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--border-subtle)',
                    paddingTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* ✅ FIX: consistent checkmark/text spacing using grid + fixed check column */}
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="pricing-feature">
                      <span className="pricing-feature-check" aria-hidden="true">
                        ✓
                      </span>
                      <span className="pricing-feature-text">{feature}</span>
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
  const [subscription, setSubscription] = useState(null)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('signin')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  // ✅ remember the selected Stripe price when user isn’t logged in
  const [selectedPriceId, setSelectedPriceId] = useState(null)

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

  // Close settings menu on outside click
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

  // Set view attribute for CSS + optional spline container hiding
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
    const splineContainer = document.getElementById('plm-spline-bg')
    if (splineContainer) {
      splineContainer.style.display = isAuthenticated ? 'none' : 'block'
    }
  }, [isAuthenticated])

  // Auto-scroll helpers
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

  // ✅ FIX (kept): show pricing when URL param is set (generic)
  useEffect(() => {
    const showPricing = searchParams?.get('showPricing')
    if (showPricing === 'true') setShowPricingModal(true)
  }, [searchParams])

  // ✅ REQUIRED FIX: Email Verification → Stripe Flow
  // Auto-open pricing modal after email verification, then clean URL
  useEffect(() => {
    const showPricing = searchParams?.get('showPricing')
    const emailVerified = searchParams?.get('emailVerified')

    if (showPricing === 'true' && emailVerified === 'true') {
      setShowPricingModal(true)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/')
      }
    }
  }, [searchParams])

  // ✅ UPDATED: handleCheckout validates priceId and stores selected plan when not signed in
  const handleCheckout = useCallback(
    async (priceId, planName) => {
      try {
        if (!priceId) {
          alert('Invalid price selected.')
          return
        }

        // ✅ Verify priceId is valid (prevents wrong plan in Stripe)
        const validPrices = [STARTER_MONTHLY, PRO_MONTHLY, ENTERPRISE_MONTHLY].filter(Boolean)
        if (validPrices.length > 0 && !validPrices.includes(priceId)) {
          console.error('Invalid price ID:', priceId)
          alert('Invalid plan selected. Please try again.')
          return
        }

        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          // ✅ STORE selected plan before showing auth
          console.log('💾 Storing selected plan:', String(priceId).substring(0, 15) + '***')
          setSelectedPriceId(priceId)
          setShowPricingModal(false)
          setAuthInitialMode('signup')
          setShowAuthModal(true)
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
    },
    [supabase, captchaLoaded, executeRecaptcha]
  )

  // ✅ CRITICAL: Main authentication and subscription check
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

      // ✅ CRITICAL: Check if email is verified + terms accepted
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

      // ✅ CRITICAL: Check for active subscription
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

      // ✅ IMPORTANT: don’t pop pricing if we’re about to auto-checkout
      const checkoutParam = searchParams?.get('checkout')
      const showPricingParam = searchParams?.get('showPricing')

      // ✅ If no subscription record at all, show pricing immediately (unless we have checkout/showPricing flow)
      if (!subData) {
        if (!checkoutParam && showPricingParam !== 'true') {
          console.log('💳 No subscription found - showing pricing modal')
          setShowPricingModal(true)
          setHasActiveSubscription(false)
        } else {
          // keep pricing closed so checkout/pricing flows control the UI
          setShowPricingModal(false)
          setHasActiveSubscription(false)
        }
      }

      // ✅ Check if trial expired (force pricing) - but still avoid interrupting checkout flow
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

  // ✅ FIXED: Auto-checkout after email verification / auth callback
  useEffect(() => {
    const checkoutPlan = searchParams?.get('checkout')
    if (!checkoutPlan) return
    if (isLoading) return

    // ✅ FIXED: Check for NO subscription (not just false)
    if (checkoutPlan && isAuthenticated && !hasActiveSubscription && !subscription) {
      console.log('🛒 Auto-checkout triggered:', checkoutPlan.substring(0, 15) + '***')
      handleCheckout(checkoutPlan, 'auto')

      // Clean URL after triggering
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
    if ((!input.trim() && !selectedImage) || isSending) return

    const question = input.trim()
    const image = selectedImage

    setSendMode(image ? 'vision' : 'text')
    setSendKey((k) => k + 1)

    const newUserMessage = { role: 'user', content: question, image }
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

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMessage],
          image,
          chatId: activeChatId,
        }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          setShowPricingModal(true)
          throw new Error('Subscription required for additional questions.')
        }
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Rate limit exceeded.')
        }
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Service temporarily unavailable.')
        }
        throw new Error(`Server error (${res.status})`)
      }

      const data = await res.json()
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.message || 'No response.' }
        return updated
      })
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${error.message}` }
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

  if (isLoading) {
    return (
      <div className={`loading-screen ${ibmMono.className}`}>
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={64} height={64} priority />
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
          --bg-0: #09090b;
          --bg-1: #0c0c0e;
          --bg-2: #131316;
          --bg-3: #1a1a1f;

          --ink-0: #fafafa;
          --ink-1: #a0a0a8;
          --ink-2: #636369;
          --ink-3: #3f3f46;

          --accent: #3b82f6;
          --accent-hover: #2563eb;
          --accent-dim: rgba(59, 130, 246, 0.1);

          --border-subtle: rgba(255, 255, 255, 0.05);
          --border-default: rgba(255, 255, 255, 0.08);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-full: 9999px;
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
          background: var(--bg-0);
          background-color: var(--bg-0);
          color: var(--ink-0);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          overscroll-behavior-y: none;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: var(--bg-0);
          z-index: -1;
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
          width: 64px;
          height: 64px;
        }

        .loading-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .loading-bar {
          width: 100px;
          height: 2px;
          background: var(--bg-3);
          border-radius: var(--radius-full);
          overflow: hidden;
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

        /* App */
        .app-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
        }

        /* Brand */
        .plm-brand {
          color: var(--ink-0);
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
          gap: 14px;
        }

        .plm-brand-mark {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }

        .plm-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .plm-brand-text {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .desktop-only {
          display: flex;
        }
        .mobile-only {
          display: none;
        }

        /* Landing */
        .landing-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
          overflow: hidden;
        }

        .landing-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59, 130, 246, 0.06), transparent 70%);
          pointer-events: none;
        }

        .landing-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          padding: max(20px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) 20px
            max(24px, env(safe-area-inset-left));
          z-index: 10;
        }

        .landing-top-center {
          justify-self: center;
        }

        .landing-top-actions {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .landing-top-actions-desktop {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-nav {
          height: 36px;
          padding: 0 14px;
          background: transparent;
          color: var(--ink-1);
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.15s ease;
          font-family: inherit;
        }

        .btn-nav:hover {
          color: var(--ink-0);
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
        .btn-primary.block {
          width: 100%;
        }

        /* Hero */
        .landing-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 140px 24px 100px;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          max-width: 700px;
          width: 100%;
        }

        .hero-terminal {
          width: 100%;
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 14px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border-subtle);
        }

        .mobile-start {
          width: 100%;
          display: none;
        }

        .mobile-start .btn-primary {
          width: 100%;
          justify-content: center;
        }

        .terminal-dot {
          width: 10px;
          height: 10px;
          border-radius: var(--radius-full);
        }

        .terminal-dot.red {
          background: #ff5f57;
        }
        .terminal-dot.yellow {
          background: #febc2e;
        }
        .terminal-dot.green {
          background: #28c840;
        }

        .terminal-body {
          padding: 20px;
        }

        .terminal-body-demo {
          padding: 18px;
        }

        /* Landing demo (prevents cut-off by using a scroll log with auto-scroll) */
        .landing-demo {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .landing-demo-log {
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
          max-height: 300px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .landing-demo-row {
          display: flex;
          width: 100%;
          margin: 8px 0;
        }

        .landing-demo-row.assistant {
          justify-content: flex-start;
        }
        .landing-demo-row.user {
          justify-content: flex-end;
        }

        .landing-demo-bubble {
          max-width: 92%;
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-2);
        }

        .landing-demo-bubble.user {
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.22);
        }

        .landing-demo-text {
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-1);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .landing-demo-bubble.user .landing-demo-text {
          color: var(--ink-0);
        }

        .landing-demo-cursor {
          color: var(--accent);
          margin-left: 1px;
          animation: demo-blink 1s steps(2) infinite;
        }

        @keyframes demo-blink {
          0%,
          50% {
            opacity: 1;
          }
          50.01%,
          100% {
            opacity: 0;
          }
        }

        .landing-demo-input {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .landing-demo-inputWrap {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 10px;
          transition: border-color 0.15s ease;
        }

        .landing-demo-inputWrap.ready {
  border-color: var(--border-subtle);
  box-shadow: none;
}


        .landing-demo-textarea {
          flex: 1;
          min-height: 38px;
          max-height: 92px;
          resize: none;
          border: none;
          background: transparent;
          color: var(--ink-0);
          font-size: 13px;
          line-height: 1.35;
          padding: 6px 6px;
          font-family: inherit;
          outline: none;
        }

        .landing-demo-textarea::placeholder {
          color: var(--ink-3);
        }

        .landing-demo-send {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--ink-2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: not-allowed;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          flex-shrink: 0;
        }

        .landing-demo-send.active {
          background: var(--accent);
          border-color: rgba(59, 130, 246, 0.85);
          color: #fff;
          cursor: pointer;
        }

        .landing-demo-send:disabled {
          opacity: 1;
        }

        .landing-demo-hint {
          min-height: 18px;
          padding: 0 2px;
        }

        .landing-demo-hintText {
          font-size: 11px;
          color: var(--ink-2);
          letter-spacing: 0.02em;
        }

        .landing-demo-hintText.subtle {
          color: var(--ink-3);
        }

        .landing-demo-hintText.done {
          color: rgba(34, 197, 94, 0.85);
        }

        /* Footer links */
        .plm-footer-links {
          position: absolute;
          bottom: max(20px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }

        .plm-footer-link {
          color: var(--ink-2);
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: color 0.15s ease;
        }

        .plm-footer-link:hover {
          color: var(--ink-0);
        }
        .plm-footer-sep {
          color: var(--ink-3);
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fade-in 0.15s ease;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          width: 100%;
          max-width: 360px;
          animation: modal-up 0.2s ease;
        }

        @keyframes modal-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-card {
          position: relative;
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 28px;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-2);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: color 0.15s ease;
        }

        .modal-close:hover {
          color: var(--ink-0);
        }

        .modal-header {
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--ink-0);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ✅ Email/Password label text to white */
        .form-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--ink-0);
        }

        .form-input {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--ink-0);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s ease;
        }

        .form-input::placeholder {
          color: var(--ink-3);
        }
        .form-input:focus {
          border-color: var(--accent);
        }

        .form-input-wrap {
          position: relative;
        }

        .form-toggle-vis {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--ink-2);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
        }

        .form-toggle-vis:hover {
          color: var(--ink-0);
        }

        .btn-submit {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
          margin-top: 8px;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-message {
          padding: 10px 12px;
          background: var(--bg-2);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--ink-1);
          text-align: center;
          margin-top: 16px;
        }

        .modal-message.ok {
          color: #22c55e;
        }
        .modal-message.err {
          color: #ef4444;
        }

        .modal-footer {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        /* ✅ Forgot password / Create account => white */
        .modal-link {
          background: none;
          border: none;
          font-size: 13px;
          color: var(--ink-0);
          cursor: pointer;
          font-family: inherit;
          opacity: 0.92;
        }

        .modal-link:hover {
          opacity: 1;
        }

        /* ✅ Turnstile/Recaptcha line -> one line (shrink only enough) */
        .modal-card .recaptcha-badge,
        .modal-card .turnstile-badge,
        .modal-card .captcha-badge,
        .modal-card [data-turnstile-badge],
        .modal-card [data-recaptcha-badge] {
          font-size: 10px !important;
          white-space: nowrap !important;
          line-height: 1.2 !important;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        /* ✅ Pricing feature rows (FIX spacing between ✓ and text) */
        .pricing-feature {
          display: grid;
          grid-template-columns: 16px 1fr;
          column-gap: 10px;
          align-items: start;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.92;
        }

        .pricing-feature-check {
          width: 16px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          line-height: 1;
          margin-top: 2px;
          font-size: 14px;
        }

        .pricing-feature-text {
          display: block;
          min-width: 0;
        }

        /* Chat */
        .chat-root {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: var(--bg-0);
          height: 100dvh;
          overflow: hidden;
        }

        @supports (-webkit-touch-callout: none) {
          .chat-root {
            height: -webkit-fill-available;
          }
        }

        .chat-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          padding-left: max(24px, env(safe-area-inset-left));
          padding-right: max(24px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* ✅ Settings gear dropdown */
        .chat-settings-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .chat-settings-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--ink-1);
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .chat-settings-btn:hover {
          color: var(--ink-0);
          background: rgba(255, 255, 255, 0.04);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: var(--bg-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
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
          color: var(--ink-0);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .chat-settings-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .chat-settings-sep {
          height: 1px;
          background: var(--border-subtle);
          margin: 6px 2px;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 24px 32px;
          background: var(--bg-0);
        }

        .chat-messages.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-empty-state {
          text-align: center;
          max-width: 400px;
        }

        /* ✅ Slightly smaller so "regulations." doesn't get stranded */
        .chat-empty-text {
          font-size: 14px;
          color: var(--ink-2);
          line-height: 1.6;
          margin: 0;
        }

        .chat-history {
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-top: 16px;
          padding-bottom: 6px;
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
          max-width: 75%;
          font-size: 15px;
          line-height: 1.7;
          display: block;
        }

        .chat-bubble-user {
          color: var(--ink-0);
        }
        .chat-bubble-assistant {
          color: var(--ink-1);
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

        .chat-content {
          display: block;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .chat-thinking {
          display: block;
          color: var(--ink-2);
          font-style: italic;
        }

        .chat-input-area {
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-0);
        }

        .chat-input-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 16px 24px 24px;
          padding-bottom: max(24px, env(safe-area-inset-bottom));
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-2);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--ink-1);
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
          color: var(--ink-2);
          cursor: pointer;
        }

        .chat-attachment-remove:hover {
          color: var(--ink-0);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        /* ✅ Camera button: blue border */
        .chat-camera-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .chat-camera-btn:hover {
          border-color: var(--accent-hover);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: border-color 0.15s ease;
          min-width: 0;
        }

        .chat-input-wrapper:focus-within {
          border-color: var(--accent);
        }

        .chat-textarea {
          flex: 1;
          min-height: 44px;
          max-height: 160px;
          padding: 12px 14px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .chat-textarea::placeholder {
          color: var(--ink-3);
        }
        .chat-textarea:focus {
          outline: none;
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

          .terminal-body-demo {
            padding: 14px;
          }

          .landing-demo-log {
            max-height: 260px;
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

          .mobile-start {
            display: flex;
          }
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 24px 20px;
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authInitialMode}
        selectedPriceId={selectedPriceId}
      />

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
                // ✅ If user just wants to sign in, clear any stored selected plan
                setSelectedPriceId(null)
                setAuthInitialMode('signin')
                setShowAuthModal(true)
              }}
            />
          ) : (
            <div className={`${ibmMono.className} chat-root`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />
                <nav className="chat-top-actions" aria-label="Chat actions">
                  {/* ✅ Trial/Pro badge (before gear) */}
                  {session && subscription && (
                    <div
                      style={{
                        marginRight: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        background:
                          subscription.status === 'trialing' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        color: subscription.status === 'trialing' ? '#3b82f6' : '#22c55e',
                        border: `1px solid ${
                          subscription.status === 'trialing' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                        }`,
                      }}
                    >
                      {subscription.status === 'trialing' ? 'Trial' : 'Pro'}
                    </div>
                  )}

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
                        <button
                          type="button"
                          className="chat-settings-item"
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
                          {hasActiveSubscription ? 'Manage Billing' : 'Start Trial'}
                        </button>

                        <div className="chat-settings-sep" />

                        <button
                          type="button"
                          className="chat-settings-item"
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
                </nav>
              </header>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`chat-messages ${messages.length === 0 ? 'empty' : ''}`}
              >
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <p className="chat-empty-text">
                      Upload a photo or ask a question about Washtenaw County food safety regulations.
                    </p>
                  </div>
                ) : (
                  <div className="chat-history">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`chat-message ${
                          msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'
                        }`}
                      >
                        <div
                          className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
                        >
                          {msg.image && (
                            <div className="chat-bubble-image">
                              <img src={msg.image} alt="Uploaded" />
                            </div>
                          )}

                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="chat-thinking">Analyzing…</div>
                          ) : (
                            <div className="chat-content">{msg.content}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="chat-input-area">
                <div className="chat-input-inner">
                  <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                  {selectedImage && (
                    <div className="chat-attachment">
                      <span className="chat-attachment-icon">
                        <Icons.Camera />
                      </span>
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="chat-attachment-remove"
                        aria-label="Remove"
                        type="button"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="chat-input-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="chat-camera-btn"
                      aria-label="Upload photo"
                      type="button"
                    >
                      <Icons.Camera />
                    </button>

                    <div className="chat-input-wrapper">
                      <textarea
                        ref={textAreaRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value)
                          if (textAreaRef.current) {
                            textAreaRef.current.style.height = 'auto'
                            textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 160)}px`
                          }
                        }}
                        placeholder="Ask a question…"
                        rows={1}
                        className="chat-textarea"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className="chat-send-btn"
                        aria-label="Send"
                      >
                        {isSending ? <div className="chat-send-spinner" /> : <Icons.ArrowUp />}
                      </button>
                    </div>
                  </div>

                  <p className="chat-disclaimer">
                    protocolLM may make mistakes. Verify critical decisions with official regulations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
