// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

const ibmPlex = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// eslint-disable-next-line no-unused-vars
const isAdmin = false

// ASCII Art Components
const ASCII = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight:  '╝',
  horizontal: '═',
  vertical:  '║',
  teeRight: '╠',
  teeLeft: '╣',
  cross: '╬',
  teeDown: '╦',
  teeUp: '╩',
  lightHorizontal: '─',
  lightVertical: '│',
  bullet: '►',
  square: '■',
  emptySquare: '□',
  dot: '•',
  cursor: '█',
  prompt: '>',
  check: '✓',
  cross_mark: '✗',
}

// Terminal Cursor Component
function BlinkingCursor({ className = '' }) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    const interval = setInterval(() => setVisible(v => !v), 530)
    return () => clearInterval(interval)
  }, [])
  
  return <span className={`terminal-cursor ${className}`} style={{ opacity: visible ? 1 : 0 }}>{ASCII.cursor}</span>
}

// Typewriter Effect Component
function Typewriter({ text, speed = 50, delay = 0, onComplete, showCursor = true }) {
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [started, setStarted] = useState(false)
  
  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(startTimer)
  }, [delay])
  
  useEffect(() => {
    if (! started) return
    
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1))
        i++
      } else {
        setIsComplete(true)
        clearInterval(interval)
        onComplete?. ()
      }
    }, speed)
    
    return () => clearInterval(interval)
  }, [text, speed, started, onComplete])
  
  return (
    <span>
      {displayText}
      {showCursor && ! isComplete && <BlinkingCursor />}
    </span>
  )
}

// System Boot Sequence
function BootSequence({ onComplete }) {
  const [lines, setLines] = useState([])
  const [currentLine, setCurrentLine] = useState(0)
  
  const bootMessages = useMemo(() => [
    { text:  'PROTOCOL_LM SYSTEM v2.4.1', delay: 100 },
    { text: 'INITIALIZING KERNEL...', delay: 200 },
    { text: 'LOADING COMPLIANCE DATABASE...', delay: 300 },
    { text: 'WASHTENAW COUNTY RECORDS:  47,291 ENTRIES', delay: 150 },
    { text: 'ESTABLISHING SECURE CONNECTION...', delay: 250 },
    { text: 'SYSTEM STATUS: ■ ONLINE', delay: 100 },
    { text: '═══════════════════════════════════════════', delay: 50 },
    { text: 'READY. ', delay: 100 },
  ], [])
  
  useEffect(() => {
    if (currentLine >= bootMessages.length) {
      setTimeout(onComplete, 500)
      return
    }
    
    const timer = setTimeout(() => {
      setLines(prev => [...prev, bootMessages[currentLine]. text])
      setCurrentLine(prev => prev + 1)
    }, bootMessages[currentLine].delay)
    
    return () => clearTimeout(timer)
  }, [currentLine, bootMessages, onComplete])
  
  return (
    <div className="boot-sequence">
      <div className="boot-content">
        {lines.map((line, i) => (
          <div key={i} className="boot-line">
            <span className="boot-prompt">{ASCII.prompt}</span> {line}
          </div>
        ))}
        {currentLine < bootMessages. length && <BlinkingCursor />}
      </div>
    </div>
  )
}

// Terminal Box Component
function TerminalBox({ title, children, className = '' }) {
  return (
    <div className={`terminal-box ${className}`}>
      <div className="terminal-box-top">
        {ASCII.topLeft}{'═'.repeat(2)}[ {title} ]{'═'.repeat(Math.max(0, 40 - (title?. length || 0)))}{ASCII.topRight}
      </div>
      <div className="terminal-box-content">
        {children}
      </div>
      <div className="terminal-box-bottom">
        {ASCII. bottomLeft}{'═'.repeat(46)}{ASCII.bottomRight}
      </div>
    </div>
  )
}

// Terminal Button Component
function TerminalButton({ children, onClick, disabled, loading, variant = 'primary', className = '', type = 'button' }) {
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled || loading}
      className={`terminal-btn terminal-btn-${variant} ${className}`}
    >
      [{loading ?  'PROCESSING...' : children}]
    </button>
  )
}

// Database Table Row
function TableRow({ cols, isHeader = false }) {
  return (
    <div className={`table-row ${isHeader ? 'table-header' :  ''}`}>
      {ASCII.vertical}
      {cols.map((col, i) => (
        <span key={i} className="table-cell">
          {col}
          {ASCII.vertical}
        </span>
      ))}
    </div>
  )
}

// Status Indicator
function StatusIndicator({ status = 'online', label }) {
  const symbol = status === 'online' ? ASCII.square : ASCII.emptySquare
  return (
    <span className={`status-indicator status-${status}`}>
      {symbol} {label}
    </span>
  )
}

function useInViewOnce({ threshold = 0.1, rootMargin = '0px 0px -50px 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries? .[0]
        if (e?. isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    obs.observe(el)
    return () => {
      try {
        obs. disconnect()
      } catch {}
    }
  }, [inView, threshold, rootMargin])

  return [ref, inView]
}

function CountUp({ value, prefix = '', suffix = '', duration = 2000, className = '', animate = true, padLength = 0 }) {
  const [ref, inView] = useInViewOnce({ threshold: 0.3 })
  const [n, setN] = useState(animate ? 0 :  value)

  useEffect(() => {
    if (! animate) {
      setN(value)
      return
    }
    if (! inView) return
    let raf = 0
    const start = performance.now()
    const from = 0
    const to = Number(value || 0)

    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      const next = Math.round(from + (to - from) * eased)
      setN(next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration, animate])

  const displayValue = padLength > 0 ? String(n).padStart(padLength, '0') : n.toLocaleString()

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

function SmartProgress({ active, mode = 'text', requestKey = 0 }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('INITIALIZING.. .')

  const refs = useRef({ pct: 0, timer: null, startedAt: 0, hideTimer: null })

  const cfg = useMemo(() => {
    return mode === 'vision' ? { baseCap: 88, finalCap: 94, k: 0.03 } : { baseCap: 90, finalCap:  96, k: 0.04 }
  }, [mode])

  useEffect(() => {
    if (refs.current.hideTimer) {
      clearTimeout(refs.current.hideTimer)
      refs.current.hideTimer = null
    }

    if (active) {
      setVisible(true)
      setProgress(0)
      setPhase(mode === 'vision' ?  'UPLOADING_IMAGE.. .' : 'SENDING_QUERY...')

      refs.current.pct = 0
      refs.current.startedAt = Date.now()

      if (refs.current.timer) clearInterval(refs.current. timer)

      refs.current.timer = setInterval(() => {
        const elapsed = (Date.now() - refs.current.startedAt) / 1000

        const cap = elapsed < 1.5 ? cfg. baseCap - 8 : elapsed < 4 ? cfg.baseCap :  cfg.finalCap
        const next = refs.current.pct + (cap - refs.current.pct) * cfg.k
        refs.current. pct = Math.max(refs.current.pct, next)

        const pctInt = Math.min(99, Math.floor(refs.current. pct))
        setProgress(pctInt)

        const p = pctInt
        if (p < 15) setPhase(mode === 'vision' ? 'ANALYZING_IMAGE.. .' : 'PARSING_QUERY...')
        else if (p < 45) setPhase('SEARCHING_DATABASE...')
        else if (p < 70) setPhase('CROSS_REFERENCING.. .')
        else if (p < 90) setPhase('COMPILING_RESPONSE...')
        else setPhase('FINALIZING...')
      }, 120)

      return () => {
        if (refs.current.timer) clearInterval(refs.current.timer)
        refs.current.timer = null
      }
    }

    if (! active && visible) {
      if (refs.current. timer) clearInterval(refs.current.timer)
      refs.current.timer = null

      setProgress(100)
      setPhase('COMPLETE')

      refs.current. hideTimer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 350)

      return () => {
        if (refs.current. hideTimer) clearTimeout(refs.current. hideTimer)
        refs.current.hideTimer = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestKey, cfg, mode, visible])

  if (!visible) return null

  const barWidth = 30
  const filled = Math.floor((progress / 100) * barWidth)
  const empty = barWidth - filled

  return (
    <div className="smart-progress">
      <div className="progress-line">
        <span className="progress-label">{phase}</span>
        <span className="progress-bar">
          [{'█'.repeat(filled)}{'░'.repeat(empty)}] {String(progress).padStart(3, ' ')}%
        </span>
      </div>
    </div>
  )
}

function FAQItem({ q, a, isOpen, onToggle, index }) {
  return (
    <div className={`faq-item ${isOpen ? 'is-open' : ''}`}>
      <button type="button" onClick={onToggle} className="faq-trigger" aria-expanded={isOpen}>
        <span className="faq-prompt">{isOpen ? 'v' : '>'}</span>
        <span className="faq-question">{q}</span>
      </button>
      {isOpen && (
        <div className="faq-content">
          <div className="faq-answer">
            {ASCII.vertical} {a}
          </div>
        </div>
      )}
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const [openFaq, setOpenFaq] = useState(null)
  const [heroComplete, setHeroComplete] = useState(false)

  const faqs = useMemo(
    () => [
      {
        q: 'QUERY:  IS_THIS_ONLY_FOR_WASHTENAW_COUNTY? ',
        a:  'AFFIRMATIVE. Database contains Washtenaw County enforcement patterns and inspector requirements exclusively.',
      },
      {
        q: 'QUERY: WHAT_SHOULD_TEAM_UPLOAD?',
        a: 'Walk-ins, prep tables, hot/cold holding, dish area, labels, storage order, verification checkpoints.',
      },
      {
        q: 'QUERY: HOW_TO_USE_DOCUMENT_SEARCH?',
        a: 'Submit short operational queries.  System returns local enforcement data with food-code citations.',
      },
      {
        q: 'QUERY: IS_USAGE_LIMITED? ',
        a:  'NEGATIVE.  Unlimited text queries and photo analysis per licensed location.',
      },
      {
        q: 'QUERY: DOES_THIS_REPLACE_TRAINING? ',
        a:  'NEGATIVE.  System functions as verification console and reference tool only.',
      },
      {
        q:  'QUERY:  RECOMMENDED_USAGE_FREQUENCY?',
        a: 'Pre-inspection, post-onboarding, and during shift anomaly detection.',
      },
    ],
    []
  )

  const features = useMemo(
    () => [
      {
        id: 'VIS_001',
        name: 'VISUAL_COMPLIANCE_ANALYSIS',
        status: 'ACTIVE',
        desc: 'Upload kitchen station images for instant violation detection.',
      },
      {
        id:  'DOC_002',
        name:  'LOCAL_REGULATION_DATABASE',
        status:  'ACTIVE',
        desc: 'Washtenaw County + Michigan Food Code cross-reference system.',
      },
      {
        id: 'RTG_003',
        name: 'REALTIME_GUIDANCE_ENGINE',
        status:  'ACTIVE',
        desc: 'Plain-language fixes for line staff and shift managers.',
      },
    ],
    []
  )

  const systemStats = useMemo(
    () => [
      { label: 'UPTIME', value: '99.9', suffix: '%', isText: true },
      { label: 'TRIAL_PERIOD', value: 7, suffix: '_DAYS', padLength: 2 },
      { label:  'PHOTO_LIMIT', value: 'UNLIMITED', isText: true },
      { label: 'RESPONSE_TIME', value:  '<3_SEC', isText: true },
    ],
    []
  )

  const riskMetrics = useMemo(
    () => [
      { label: 'AVG_VIOLATION_FINE', value: 500, prefix: '$', padLength: 6 },
      { label: 'ILLNESS_COST_PER_INCIDENT', value: 75000, prefix: '$', padLength: 8 },
      { label: 'CLOSURE_REVENUE_LOSS', value: 10000, prefix: '$', padLength: 7 },
      { label: 'REPEAT_VIOLATION_RATE', value: 38, suffix: '%', padLength: 3 },
    ],
    []
  )

  return (
    <div className="landing-wrapper">
      {/* Scanline Overlay */}
      <div className="scanlines" />
      <div className="vignette" />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-header">
            ╔═══════════════════════════════════════════════════════════════════╗
          </div>
          
          <div className="hero-content">
            <div className="hero-title">
              <Typewriter 
                text="CATCH VIOLATIONS BEFORE THE INSPECTOR DOES" 
                speed={40}
                onComplete={() => setHeroComplete(true)}
              />
            </div>
            
            {heroComplete && (
              <>
                <div className="hero-divider">
                  ═══════════════════════════════════════════════════════════════════
                </div>
                
                <div className="hero-description">
                  <span className="prompt-symbol">{ASCII.prompt}</span> Upload kitchen photos for instant AI analysis.
                  <br />
                  <span className="prompt-symbol">{ASCII.prompt}</span> Built for Washtenaw County food code requirements.
                  <br />
                  <span className="prompt-symbol">{ASCII.prompt}</span> Identify violations before they become citations.
                </div>

                <div className="hero-actions">
                  <TerminalButton onClick={onShowPricing} variant="primary">
                    START_7DAY_TRIAL
                  </TerminalButton>
                  <TerminalButton onClick={onShowAuth} variant="secondary">
                    SIGN_IN
                  </TerminalButton>
                </div>
              </>
            )}
          </div>
          
          <div className="hero-footer">
            ╚═══════════════════════════════════════════════════════════════════╝
          </div>
        </div>
      </section>

      {/* System Status Panel */}
      <section className="stats-section">
        <TerminalBox title="SYSTEM_STATUS">
          <div className="stats-grid">
            {systemStats.map((stat, i) => (
              <div key={i} className="stat-item">
                <span className="stat-label">{stat.label}:</span>
                <span className="stat-value">
                  {stat.isText ? (
                    stat.value + (stat.suffix || '')
                  ) : (
                    <CountUp 
                      value={stat.value} 
                      prefix={stat.prefix || ''} 
                      suffix={stat.suffix || ''}
                      padLength={stat.padLength}
                    />
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="stats-status">
            <StatusIndicator status="online" label="ALL_SYSTEMS_OPERATIONAL" />
          </div>
        </TerminalBox>
      </section>

      {/* Features as Database Table */}
      <section className="features-section">
        <TerminalBox title="MODULE_REGISTRY">
          <div className="db-table">
            <div className="table-header-row">
              ╔════════════╦═══════════════════════════════╦════════╦═══════════════════════════════════════════════╗
            </div>
            <TableRow cols={[' MODULE_ID ', '          MODULE_NAME          ', ' STATUS ', '                  DESCRIPTION                  ']} isHeader />
            <div className="table-divider">
              ╠════════════╬═══════════════════════════════╬════════╬═══════════════════════════════════════════════╣
            </div>
            {features.map((feature, i) => (
              <TableRow 
                key={i}
                cols={[
                  ` ${feature.id}    `,
                  ` ${feature.name. padEnd(29)} `,
                  ` ${feature.status} `,
                  ` ${feature.desc. padEnd(45)} `
                ]} 
              />
            ))}
            <div className="table-footer-row">
              ╚════════════╩═══════════════════════════════╩════════╩═══════════════════════════════════════════════╝
            </div>
          </div>
          <div className="table-meta">
            {ASCII.prompt} QUERY COMPLETE: {features.length} RECORDS FOUND
          </div>
        </TerminalBox>
      </section>

      {/* Risk Metrics */}
      <section className="risk-section">
        <TerminalBox title="COMPLIANCE_RISK_ANALYSIS">
          <div className="risk-header">
            {ASCII.prompt} WARNING: NON-COMPLIANCE FINANCIAL IMPACT ASSESSMENT
          </div>
          <div className="risk-grid">
            {riskMetrics.map((risk, i) => (
              <div key={i} className="risk-item">
                <span className="risk-label">{risk.label}</span>
                <span className="risk-value">
                  <CountUp 
                    value={risk. value} 
                    prefix={risk. prefix || ''} 
                    suffix={risk.suffix || ''}
                    padLength={risk.padLength}
                    duration={2500}
                  />
                </span>
              </div>
            ))}
          </div>
          <div className="risk-sources">
            {ASCII.lightHorizontal. repeat(60)}
            <br />
            SOURCE: FDA_MODEL_FOOD_CODE_2022, CDC_FOODBORNE_ILLNESS_REPORT_2024
          </div>
        </TerminalBox>
      </section>

      {/* Pricing Terminal */}
      <section className="pricing-section">
        <TerminalBox title="PRICING_CONFIGURATION">
          <div className="pricing-output">
            <div className="pricing-line">{ASCII.prompt} cat /etc/protocol_lm/pricing.conf</div>
            <div className="pricing-content">
              <br />
              # ═══════════════════════════════════════
              <br />
              # PROTOCOL_LM SITE LICENSE
              <br />
              # ═══════════════════════════════════════
              <br /><br />
              LICENSE_TYPE=&quot;SITE&quot;
              <br />
              MONTHLY_RATE=$0100. 00/mo
              <br />
              ANNUAL_RATE=$1000.00/yr  # SAVE $0200.00
              <br /><br />
              # INCLUDED FEATURES:
              <br />
              PHOTO_CHECKS=UNLIMITED
              <br />
              TEXT_QUERIES=UNLIMITED
              <br />
              TEAM_ACCESS=FULL
              <br />
              REGION=&quot;WASHTENAW_COUNTY&quot;
              <br />
              TRIAL_PERIOD=7_DAYS
              <br />
              CANCELLATION=&quot;ANYTIME&quot;
              <br /><br />
              # END OF CONFIG
            </div>
            <br />
            <div className="pricing-actions">
              <TerminalButton onClick={onShowPricing} variant="primary">
                EXECUTE_TRIAL_INIT
              </TerminalButton>
            </div>
            <div className="pricing-note">
              {ASCII.prompt} NO_CREDIT_CARD_REQUIRED_FOR_TRIAL
            </div>
          </div>
        </TerminalBox>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <TerminalBox title="FAQ_DATABASE">
          <div className="faq-header">
            {ASCII.prompt} SELECT * FROM frequently_asked_questions;
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <FAQItem
                key={i}
                q={f.q}
                a={f.a}
                index={i}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq((v) => (v === i ? null : i))}
              />
            ))}
          </div>
          <div className="faq-footer">
            {ASCII.prompt} {faqs.length} RECORDS RETURNED
          </div>
        </TerminalBox>
      </section>

      {/* Final CTA Section */}
      <section className="cta-section">
        <div className="cta-border-top">
          ╔═══════════════════════════════════════════════════════════════════╗
        </div>
        <div className="cta-content">
          <div className="cta-title">
            {ASCII.prompt} READY TO INITIALIZE COMPLIANCE SYSTEM? 
          </div>
          <div className="cta-description">
            {ASCII.vertical} Setup time: &lt;2 minutes
            <br />
            {ASCII.vertical} Provide verification tools for your entire team
            <br />
            {ASCII. vertical} Catch issues before inspection day
          </div>
          <div className="cta-actions">
            <TerminalButton onClick={onShowPricing} variant="primary">
              INIT_FREE_TRIAL
            </TerminalButton>
            <TerminalButton onClick={onShowAuth} variant="secondary">
              ACCESS_DASHBOARD
            </TerminalButton>
          </div>
        </div>
        <div className="cta-border-bottom">
          ╚═══════════════════════════════════════════════════════════════════╝
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-divider">
          ════════════════════════════════════════════════════════════════════
        </div>
        <div className="footer-links">
          <Link href="/terms" className="footer-link">[TERMS]</Link>
          <Link href="/privacy" className="footer-link">[PRIVACY]</Link>
          <Link href="/contact" className="footer-link">[CONTACT]</Link>
        </div>
        <div className="footer-api">
          POWERED_BY:  ANTHROPIC_CLAUDE, COHERE_API
        </div>
        <div className="footer-copyright">
          (C) 2025 PROTOCOL_LM {ASCII.dot} WASHTENAW_COUNTY_EDITION
        </div>
      </footer>
    </div>
  )
}

function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
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
        setMessage('ERROR:  SECURITY_VERIFICATION_FAILED')
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password
        endpoint = mode === 'signup' ? '/api/auth/signup' :  '/api/auth/signin'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res. json().catch(() => ({}))

      if (! res.ok) {
        setMessageKind('err')
        setMessage(`ERROR: ${(data. error || 'AUTH_FAILED').toUpperCase().replace(/ /g, '_')}`)
        return
      }

      if (mode === 'reset') {
        setMessageKind('ok')
        setMessage('SUCCESS: CHECK_EMAIL_FOR_RESET_LINK')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else if (mode === 'signup') {
        setMessageKind('ok')
        setMessage('SUCCESS:  ACCOUNT_CREATED_VERIFY_EMAIL')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else {
        setMessageKind('ok')
        setMessage('SUCCESS:  AUTHENTICATED_REDIRECTING.. .')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 450)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessageKind('err')
      setMessage('ERROR: UNEXPECTED_SYSTEM_FAULT')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card">
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            [X]
          </button>

          <div className="modal-header">
            ╔═══════════════════════════════════════╗
            <div className="modal-title">
              {ASCII.vertical} {mode === 'signin' && 'USER_AUTHENTICATION'}
              {mode === 'signup' && 'NEW_USER_REGISTRATION'}
              {mode === 'reset' && 'PASSWORD_RECOVERY'}
            </div>
            ╚═══════════════════════════════════════╝
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-field">
              <label className="form-label">{ASCII.prompt} EMAIL_ADDRESS: </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e. target.value)}
                placeholder="user@domain.com"
                required
                className="form-input"
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="form-field">
                <label className="form-label">{ASCII.prompt} PASSWORD:</label>
                <div className="form-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e. target.value)}
                    placeholder="••••••••••••"
                    required
                    className="form-input"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="form-toggle"
                  >
                    [{showPassword ? 'HIDE' : 'SHOW'}]
                  </button>
                </div>
              </div>
            )}

            <TerminalButton
              type="submit"
              disabled={loading || !isLoaded}
              loading={loading}
              variant="primary"
            >
              {mode === 'signin' ? 'AUTHENTICATE' : mode === 'signup' ? 'CREATE_ACCOUNT' : 'SEND_RESET_LINK'}
            </TerminalButton>
          </form>

          {message && (
            <div className={`modal-alert ${messageKind}`}>
              {messageKind === 'err' ? `${ASCII.cross_mark} ` : `${ASCII.check} `}
              {message}
            </div>
          )}

          <div className="modal-footer">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className="modal-link">
                  [{ASCII.prompt} FORGOT_PASSWORD?]
                </button>
                <button type="button" onClick={() => setMode('signup')} className="modal-link">
                  [{ASCII.prompt} CREATE_NEW_ACCOUNT]
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                [{ASCII.prompt} EXISTING_USER_SIGN_IN]
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                [{ASCII. prompt} BACK_TO_SIGN_IN]
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper modal-wrapper-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card">
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            [X]
          </button>

          <div className="modal-header">
            ╔═══════════════════════════════════════════════╗
            <div className="modal-title">
              {ASCII.vertical} LICENSE_ACQUISITION_TERMINAL
            </div>
            ╚═══════════════════════════════════════════════╝
          </div>

          <div className="pricing-modal-content">
            <div className="pricing-display">
              <span className="pricing-label">MONTHLY_RATE: </span>
              <span className="pricing-amount">$0100.00</span>
            </div>

            <div className="pricing-features">
              {ASCII.prompt} INCLUDED_MODULES:
              <br />
              {ASCII.vertical} {ASCII.check} UNLIMITED_PHOTO_CHECKS
              <br />
              {ASCII.vertical} {ASCII.check} UNLIMITED_TEXT_QUERIES
              <br />
              {ASCII.vertical} {ASCII.check} WASHTENAW_COUNTY_DATA
              <br />
              {ASCII.vertical} {ASCII.check} FULL_TEAM_ACCESS
            </div>

            <div className="pricing-modal-actions">
              <TerminalButton
                onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
                disabled={!! loading}
                loading={loading === 'monthly'}
                variant="primary"
              >
                INIT_7DAY_TRIAL
              </TerminalButton>

              <TerminalButton
                onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                disabled={!!loading}
                loading={loading === 'annual'}
                variant="secondary"
              >
                ANNUAL_$1000/YR_[SAVE_$200]
              </TerminalButton>
            </div>

            <div className="pricing-modal-note">
              {ASCII.prompt} 7_DAY_TRIAL {ASCII.dot} CANCEL_ANYTIME {ASCII.dot} 1_LICENSE_PER_LOCATION
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const { isLoaded:  captchaLoaded, executeRecaptcha } = useRecaptcha()

  const [isLoading, setIsLoading] = useState(true)
  const [showBootSequence, setShowBootSequence] = useState(true)
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

  const [showUserMenu, setShowUserMenu] = useState(false)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const userMenuRef = useRef(null)
  const textAreaRef = useRef(null)

  const shouldAutoScrollRef = useRef(true)

  const isAuthenticated = !!session

  useEffect(() => {
    if (typeof document === 'undefined') return
    document. documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
    const splineContainer = document.getElementById('plm-spline-bg')
    if (splineContainer) {
      splineContainer.style.display = isAuthenticated ? 'none' : 'block'
    }
  }, [isAuthenticated])

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollRef.current
    if (! el) return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (shouldAutoScrollRef.current) requestAnimationFrame(() => scrollToBottom('auto'))
  }, [messages, scrollToBottom])

  useEffect(() => {
    const showPricing = searchParams?. get('showPricing')
    if (showPricing === 'true') setShowPricingModal(true)
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    async function loadSessionAndSub(s) {
      if (! isMounted) return
      setSession(s)

      if (! s) {
        setHasActiveSubscription(false)
        setShowPricingModal(false)
        setIsLoading(false)
        return
      }

      try {
        const { data: profile, error:  profileError } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s. user. id)
          .maybeSingle()

        if (! profile) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        const accepted = ! !(profile?. accepted_terms && profile?.accepted_privacy)
        if (!accepted) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        if (profileError) {
          console.error('Profile check error:', profileError)
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('Policy check exception:', e)
        setHasActiveSubscription(false)
        setIsLoading(false)
        router.replace('/accept-terms')
        return
      }

      let active = false
      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status,current_period_end')
          .eq('user_id', s.user.id)
          .in('status', ['active', 'trialing'])
          .order('current_period_end', { ascending:  false })
          .limit(1)
          .maybeSingle()

        if (sub && sub.current_period_end) {
          const end = new Date(sub.current_period_end)
          if (end > new Date()) active = true
        }
      } catch (e) {
        console.error('Subscription check error', e)
      }

      if (! isMounted) return
      setHasActiveSubscription(active)
      setIsLoading(false)
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        await loadSessionAndSub(data. session || null)
      } catch (e) {
        console.error('Auth init error', e)
        if (isMounted) setIsLoading(false)
      }
    }

    init()

    const { data } = supabase.auth. onAuthStateChange((_event, newSession) => {
      loadSessionAndSub(newSession)
    })

    return () => {
      isMounted = false
      data. subscription?.unsubscribe()
    }
  }, [supabase, searchParams, router])

  useEffect(() => {
    function handleClick(event) {
      if (userMenuRef.current && ! userMenuRef.current.contains(event. target)) setShowUserMenu(false)
    }
    function handleKey(event) {
      if (event. key === 'Escape') setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const handleCheckout = async (priceId, planName) => {
    try {
      const { data } = await supabase.auth.getSession()
      if (! data.session) {
        setShowPricingModal(false)
        setAuthInitialMode('signup')
        setShowAuthModal(true)
        return
      }
      if (! priceId) {
        alert('ERROR: INVALID_PRICE_SELECTED')
        return
      }

      if (! captchaLoaded) {
        alert('ERROR: SECURITY_MODULE_LOADING')
        return
      }

      setCheckoutLoading(planName)

      const captchaToken = await executeRecaptcha('checkout')
      if (!captchaToken || captchaToken === 'turnstile_unavailable') {
        throw new Error('SECURITY_VERIFICATION_FAILED')
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body:  JSON.stringify({ priceId, captchaToken }),
        credentials: 'include',
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload. error || 'CHECKOUT_FAILED')

      if (payload.url) window.location.href = payload.url
      else throw new Error('NO_CHECKOUT_URL_RETURNED')
    } catch (error) {
      console. error('Checkout error:', error)
      alert('ERROR: ' + (error.message || 'UNKNOWN_ERROR'))
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setShowUserMenu(false)

    let loadingToast = null
    try {
      loadingToast = document.createElement('div')
      loadingToast. textContent = 'LOADING_BILLING_PORTAL.. .'
      loadingToast.className = 'terminal-toast'
      document.body.appendChild(loadingToast)

      const { data } = await supabase.auth.getSession()
      const accessToken = data?. session?.access_token

      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          .. .(accessToken ?  { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      })

      const payload = await res.json().catch(() => ({}))
      if (!res. ok) {
        alert('ERROR: ' + (payload.error || 'BILLING_PORTAL_FAILED'))
        return
      }
      if (payload.url) window.location.href = payload.url
      else alert('ERROR: NO_PORTAL_URL_RETURNED')
    } catch (error) {
      console.error('Billing portal error:', error)
      alert('ERROR:  BILLING_PORTAL_FAILED')
    } finally {
      try {
        if (loadingToast) document.body.removeChild(loadingToast)
      } catch {}
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Sign out error', e)
    } finally {
      setMessages([])
      setCurrentChatId(null)
      router.replace('/')
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setCurrentChatId(null)
    shouldAutoScrollRef.current = true
    requestAnimationFrame(() => scrollToBottom('auto'))
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((! input.trim() && !selectedImage) || isSending) return

    const question = input.trim()
    const image = selectedImage

    setSendMode(image ?  'vision' : 'text')
    setSendKey((k) => k + 1)

    const newUserMessage = { role: 'user', content: question, image }
    setMessages((prev) => [...prev, newUserMessage, { role: 'assistant', content: '' }])
    setInput('')
    setSelectedImage(null)
    setIsSending(true)
    if (fileInputRef.current) fileInputRef.current.value = ''

    shouldAutoScrollRef.current = true

    let activeChatId = currentChatId

    try {
      if (session && ! activeChatId) {
        const { data:  created } = await supabase
          .from('chats')
          .insert({
            user_id: session.user. id,
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
        method:  'POST',
        headers: { 'Content-Type':  'application/json' },
        body: JSON.stringify({
          messages: [... messages, newUserMessage],
          image,
          chatId: activeChatId,
        }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          setShowPricingModal(true)
          throw new Error('SUBSCRIPTION_REQUIRED')
        }
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data. error || 'RATE_LIMIT_EXCEEDED')
        }
        if (res.status === 503) {
          const data = await res. json().catch(() => ({}))
          throw new Error(data.error || 'SERVICE_UNAVAILABLE')
        }
        throw new Error(`SERVER_ERROR_${res.status}`)
      }

      const data = await res.json()
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.message || 'NO_RESPONSE' }
        return updated
      })
    } catch (error) {
      console. error('Chat error:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role:  'assistant', content: `ERROR: ${error.message}` }
        return updated
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files? .[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
    } catch (error) {
      console.error('Image compression error', error)
      alert('ERROR: IMAGE_PROCESSING_FAILED')
    }
  }

  const handleBootComplete = useCallback(() => {
    setShowBootSequence(false)
  }, [])

  if (isLoading) {
    return (
      <>
        <style jsx global>{terminalStyles}</style>
        <div className={`loading-screen ${ibmPlex.className}`}>
          <div className="loading-content">
            <div className="loading-text">INITIALIZING_SYSTEM...</div>
            <BlinkingCursor />
          </div>
        </div>
      </>
    )
  }

  if (showBootSequence && !isAuthenticated) {
    return (
      <>
        <style jsx global>{terminalStyles}</style>
        <div className={`boot-screen ${ibmPlex.className}`}>
          <BootSequence onComplete={handleBootComplete} />
        </div>
      </>
    )
  }

  return (
    <>
      <style jsx global>{terminalStyles}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className={`app-container ${ibmPlex.className}`}>
        {/* Header */}
        <header className="app-header">
          <div className="header-inner">
            <div className="header-left">
              <div className="logo">
                <span className="logo-text">PROTOCOL_LM</span>
                <span className="logo-version">v2.4.1</span>
              </div>

              <div className="header-divider">{ASCII.vertical}</div>

              <div className="header-meta">
                <span className="header-region">WASHTENAW_COUNTY</span>
              </div>
            </div>

            <div className="header-right">
              {hasActiveSubscription && (
                <StatusIndicator status="online" label="LICENSE_ACTIVE" />
              )}

              {!isAuthenticated ?  (
                <TerminalButton
                  onClick={() => {
                    setAuthInitialMode('signin')
                    setShowAuthModal(true)
                  }}
                  variant="secondary"
                >
                  SIGN_IN
                </TerminalButton>
              ) : (
                <div className="user-menu-wrapper" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="avatar-btn"
                    aria-label="User menu"
                  >
                    [{session?.user?.email? .[0]?.toUpperCase() || 'U'}]
                  </button>

                  {showUserMenu && (
                    <div className="user-menu">
                      <div className="user-menu-header">
                        ╔═══════════════════════════════════╗
                        <div className="user-menu-email">
                          {ASCII.vertical} {session?.user?.email || 'USER'}
                        </div>
                        <div className="user-menu-status">
                          {ASCII.vertical} {hasActiveSubscription ? '■ PREMIUM_ACTIVE' : '□ FREE_ACCOUNT'}
                        </div>
                        ╚═══════════════════════════════════╝
                      </div>

                      {hasActiveSubscription ?  (
                        <button onClick={handleManageBilling} className="user-menu-item">
                          [{ASCII.prompt} MANAGE_BILLING]
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className="user-menu-item"
                        >
                          [{ASCII.prompt} START_TRIAL]
                        </button>
                      )}

                      <button
                        onClick={() => {
                          window.open('/privacy', '_blank')
                          setShowUserMenu(false)
                        }}
                        className="user-menu-item"
                      >
                        [{ASCII.prompt} PRIVACY_SECURITY]
                      </button>

                      <div className="user-menu-divider">
                        {ASCII.lightHorizontal. repeat(35)}
                      </div>

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          handleSignOut()
                        }}
                        className="user-menu-item user-menu-item-danger"
                      >
                        [{ASCII.prompt} SIGN_OUT]
                      </button>

                      <div className="user-menu-footer">
                        PRESS_ESC_TO_CLOSE
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {! isAuthenticated ?  (
            <LandingPage
              onShowPricing={() => setShowPricingModal(true)}
              onShowAuth={() => {
                setAuthInitialMode('signin')
                setShowAuthModal(true)
              }}
            />
          ) : (
            <div className="chat-container">
              <div ref={scrollRef} onScroll={handleScroll} className="chat-messages">
                {messages.length === 0 ?  (
                  <div className="chat-empty">
                    <TerminalBox title="COMMAND_INTERFACE">
                      <div className="chat-empty-content">
                        <div className="chat-empty-title">
                          {ASCII.prompt} AWAITING_INPUT... 
                        </div>
                        <div className="chat-empty-text">
                          {ASCII.vertical} Upload photo for compliance analysis
                          <br />
                          {ASCII.vertical} Or submit text query to search database
                        </div>
                        <div className="chat-empty-actions">
                          <TerminalButton
                            onClick={() => fileInputRef.current?. click()}
                            variant="secondary"
                          >
                            ATTACH_PHOTO
                          </TerminalButton>
                          <TerminalButton
                            onClick={() => textAreaRef.current?. focus()}
                            variant="secondary"
                          >
                            ENTER_QUERY
                          </TerminalButton>
                        </div>
                      </div>
                    </TerminalBox>
                  </div>
                ) : (
                  <div className="chat-history">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`chat-message ${msg. role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
                      >
                        <div className="chat-message-header">
                          {msg.role === 'user' ? `${ASCII.prompt} USER_INPUT: ` : `${ASCII.prompt} SYSTEM_RESPONSE:`}
                        </div>
                        <div className="chat-bubble">
                          {msg.image && (
                            <div className="chat-bubble-image">
                              [IMAGE_ATTACHED]
                              <img src={msg.image} alt="Uploaded" />
                            </div>
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ?  (
                            <span className="chat-thinking">PROCESSING...  <BlinkingCursor /></span>
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
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
                      {ASCII.square} IMAGE_ATTACHED
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="attachment-remove"
                        aria-label="Remove"
                      >
                        [X]
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

                    <TerminalButton
                      onClick={() => fileInputRef.current?. click()}
                      variant="secondary"
                    >
                      IMG
                    </TerminalButton>

                    <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: 8 }}>
                      <div className="input-wrapper">
                        <span className="input-prompt">{ASCII.prompt}</span>
                        <textarea
                          ref={textAreaRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="ENTER_QUERY..."
                          rows={1}
                          className="chat-textarea"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSend(e)
                            }
                          }}
                        />
                      </div>

                      <TerminalButton
                        type="submit"
                        disabled={(! input.trim() && !selectedImage) || isSending}
                        variant="primary"
                      >
                        {isSending ? '.. .' : 'SEND'}
                      </TerminalButton>
                    </form>
                  </div>

                  <div className="chat-disclaimer">
                    {ASCII.lightHorizontal.repeat(50)}
                    <br />
                    WARNING:  VERIFY_CRITICAL_DECISIONS_WITH_OFFICIAL_REGULATIONS
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

// Terminal Styles
const terminalStyles = `
  /* ═══════════════════════════════════════════════════════════════
     IBM TERMINAL AESTHETIC - PROTOCOL_LM
     90s Database/Terminal Design System
     ═══════════════════════════════════════════════════════════════ */

  : root {
    --color-bg: #000000;
    --color-surface: #0a0a0a;
    --color-border: #0530AD;
    --color-text: #00FF00;
    --color-text-dim: #00aa00;
    --color-text-bright: #33ff33;
    --color-primary: #0530AD;
    --color-primary-hover: #0842d4;
    --color-accent: #00FF00;
    --color-error: #ff3333;
    --color-warning: #ffaa00;
    --color-success: #00ff00;
    --font-mono: 'IBM Plex Mono', 'Courier New', monospace;
    --scanline-opacity: 0.03;
  }

  *, *:: before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    height: 100%;
    background: var(--color-bg);
  }

  body {
    min-height: 100%;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.6;
    overflow-x: hidden;
  }

  :: selection {
    background: var(--color-primary);
    color: var(--color-text);
  }

  /* ─── Scanlines & CRT Effects ─── */
  .scanlines {
    position:  fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15) 0px,
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    animation: flicker 0.15s infinite;
  }

  . vignette {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index:  9998;
    background:  radial-gradient(
      ellipse at center,
      transparent 0%,
      transparent 60%,
      rgba(0, 0, 0, 0.4) 100%
    );
  }

  @keyframes flicker {
    0% { opacity: 0.97; }
    50% { opacity: 1; }
    100% { opacity: 0.98; }
  }

  /* ─── Loading & Boot Screens ─── */
  .loading-screen,
  .boot-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    z-index: 10000;
  }

  .loading-content {
    text-align: center;
  }

  .loading-text {
    color: var(--color-text);
    margin-bottom: 8px;
  }

  .boot-sequence {
    width: 100%;
    max-width:  600px;
    padding: 24px;
  }

  .boot-content {
    border:  2px solid var(--color-primary);
    padding: 24px;
    background: var(--color-bg);
  }

  .boot-line {
    margin-bottom: 4px;
    color: var(--color-text);
  }

  .boot-prompt {
    color: var(--color-primary);
  }

  .terminal-cursor {
    color: var(--color-text);
    animation: none;
  }

  /* ─── App Container ─── */
  .app-container {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    position: relative;
    background: var(--color-bg);
  }

  /* ─── Header ─── */
  .app-header {
    position: sticky;
    top:  0;
    z-index: 100;
    background:  var(--color-bg);
    border-bottom: 2px solid var(--color-primary);
  }

  .header-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding:  12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items:  center;
    gap: 16px;
  }

  .logo {
    display: flex;
    align-items: baseline;
    gap:  8px;
  }

  . logo-text {
    font-size:  18px;
    font-weight: 700;
    color:  var(--color-text);
    letter-spacing: 0.05em;
  }

  .logo-version {
    font-size: 12px;
    color: var(--color-text-dim);
  }

  .header-divider {
    color: var(--color-primary);
  }

  . header-meta {
    color: var(--color-text-dim);
    font-size: 12px;
  }

  . header-region {
    color:  var(--color-text-dim);
  }

  . header-right {
    display:  flex;
    align-items: center;
    gap: 16px;
  }

  /* ─── Status Indicator ─── */
  .status-indicator {
    font-size: 12px;
    padding: 4px 12px;
    border:  1px solid var(--color-primary);
  }

  .status-online {
    color: var(--color-success);
  }

  .status-offline {
    color: var(--color-text-dim);
  }

  /* ─── Terminal Buttons ─── */
  .terminal-btn {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    padding:  8px 16px;
    border: 2px solid var(--color-primary);
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
    transition: none;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .terminal-btn:hover: not(:disabled) {
    background: var(--color-primary);
    color: var(--color-bg);
  }

  .terminal-btn:focus {
    outline:  none;
    border-color: var(--color-text);
    box-shadow: 0 0 0 2px var(--color-primary);
  }

  .terminal-btn:disabled {
    opacity: 0.5;
    cursor:  not-allowed;
  }

  . terminal-btn-primary {
    background:  var(--color-primary);
    color: var(--color-text);
  }

  .terminal-btn-primary:hover: not(:disabled) {
    background: var(--color-text);
    color: var(--color-bg);
    border-color: var(--color-text);
  }

  .terminal-btn-secondary {
    background: transparent;
  }

  /* ─── Terminal Box ─── */
  .terminal-box {
    font-family: var(--font-mono);
    margin:  24px auto;
    max-width: 900px;
    width: 100%;
  }

  .terminal-box-top,
  .terminal-box-bottom {
    color: var(--color-primary);
    white-space: pre;
    overflow:  hidden;
    font-size: 14px;
  }

  .terminal-box-content {
    border-left: 2px solid var(--color-primary);
    border-right: 2px solid var(--color-primary);
    padding: 16px 20px;
    background: var(--color-bg);
  }

  /* ─── Database Table ─── */
  .db-table {
    font-size: 12px;
    overflow-x: auto;
  }

  .table-header-row,
  .table-divider,
  .table-footer-row {
    color: var(--color-primary);
    white-space: pre;
  }

  .table-row {
    display:  flex;
    color: var(--color-text);
    white-space: pre;
  }

  .table-header {
    color: var(--color-text-bright);
    font-weight: 700;
  }

  .table-cell {
    display: inline;
  }

  .table-meta {
    margin-top: 16px;
    color: var(--color-text-dim);
    font-size: 12px;
  }

  /* ─── Landing Wrapper ─── */
  .landing-wrapper {
    flex: 1;
    position: relative;
    padding: 0 24px;
  }

  /* ─── Hero Section ─── */
  .hero-section {
    padding: 60px 0;
    text-align: center;
  }

  .hero-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .hero-header,
  .hero-footer {
    color: var(--color-primary);
    font-size: 14px;
    white-space: pre;
    overflow: hidden;
  }

  .hero-content {
    padding:  32px 24px;
    border-left: 2px solid var(--color-primary);
    border-right: 2px solid var(--color-primary);
  }

  . hero-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 24px;
    letter-spacing: 0.02em;
  }

  @media (min-width: 768px) {
    .hero-title {
      font-size: 32px;
    }
  }

  .hero-divider {
    color: var(--color-primary);
    margin-bottom: 24px;
    font-size: 12px;
    overflow: hidden;
  }

  .hero-description {
    text-align: left;
    color: var(--color-text);
    margin-bottom: 32px;
    line-height: 2;
  }

  . prompt-symbol {
    color: var(--color-primary);
    margin-right: 8px;
  }

  . hero-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* ─── Stats Section ─── */
  .stats-section {
    padding: 24px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  @media (min-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .stat-item {
    display:  flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    color: var(--color-text-dim);
    font-size: 11px;
  }

  .stat-value {
    color: var(--color-text);
    font-size: 16px;
    font-weight: 700;
  }

  . stats-status {
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid var(--color-primary);
  }

  /* ─── Features Section ─── */
  .features-section {
    padding: 24px;
  }

  /* ─── Risk Section ─── */
  .risk-section {
    padding:  24px;
  }

  . risk-header {
    color:  var(--color-warning);
    margin-bottom: 20px;
  }

  .risk-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 20px;
  }

  @media (min-width: 768px) {
    .risk-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .risk-item {
    text-align: center;
    padding: 16px;
    border: 1px solid var(--color-primary);
  }

  .risk-label {
    display: block;
    font-size: 10px;
    color: var(--color-text-dim);
    margin-bottom: 8px;
  }

  .risk-value {
    font-size: 20px;
    font-weight: 700;
    color:  var(--color-text);
  }

  .risk-sources {
    font-size: 10px;
    color: var(--color-text-dim);
    text-align: center;
  }

  /* ─── Pricing Section ─── */
  .pricing-section {
    padding: 24px;
  }

  .pricing-output {
    font-size: 13px;
  }

  .pricing-line {
    color: var(--color-text-dim);
    margin-bottom: 8px;
  }

  .pricing-content {
    color: var(--color-text);
    padding-left: 16px;
    line-height: 1.8;
  }

  .pricing-actions {
    margin:  24px 0 16px;
    text-align: center;
  }

  .pricing-note {
    color:  var(--color-text-dim);
    font-size:  12px;
    text-align: center;
  }

  /* ─── FAQ Section ─── */
  .faq-section {
    padding: 24px;
  }

  .faq-header {
    color:  var(--color-text-dim);
    margin-bottom: 16px;
    font-size: 12px;
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .faq-item {
    border: 1px solid transparent;
  }

  .faq-item. is-open {
    border-color: var(--color-primary);
  }

  . faq-trigger {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    background: none;
    border:  none;
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-mono);
    font-size: 13px;
  }

  .faq-trigger:hover {
    background: rgba(5, 48, 173, 0.2);
  }

  .faq-prompt {
    color:  var(--color-primary);
    flex-shrink: 0;
  }

  .faq-question {
    color:  var(--color-text);
  }

  .faq-content {
    padding:  0 12px 12px 28px;
  }

  .faq-answer {
    color: var(--color-text-dim);
    font-size: 13px;
    line-height: 1.6;
  }

  .faq-footer {
    color:  var(--color-text-dim);
    font-size:  12px;
    margin-top: 16px;
  }

  /* ─── CTA Section ─── */
  .cta-section {
    padding: 48px 0;
    text-align: center;
  }

  .cta-border-top,
  .cta-border-bottom {
    color: var(--color-primary);
    font-size: 14px;
    white-space: pre;
    overflow: hidden;
  }

  .cta-content {
    padding:  32px 24px;
    border-left: 2px solid var(--color-primary);
    border-right:  2px solid var(--color-primary);
    max-width: 800px;
    margin: 0 auto;
  }

  .cta-title {
    font-size: 18px;
    font-weight: 700;
    color:  var(--color-text);
    margin-bottom: 16px;
  }

  .cta-description {
    text-align: left;
    color: var(--color-text-dim);
    margin-bottom: 24px;
    line-height: 2;
    display: inline-block;
  }

  .cta-actions {
    display:  flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* ─── Footer ─── */
  .landing-footer {
    padding: 32px 24px;
    text-align: center;
  }

  .footer-divider {
    color: var(--color-primary);
    margin-bottom: 24px;
    font-size: 12px;
    overflow: hidden;
  }

  . footer-links {
    display:  flex;
    gap: 24px;
    justify-content: center;
    margin-bottom: 16px;
  }

  .footer-link {
    color:  var(--color-text);
    text-decoration: none;
    font-size: 12px;
  }

  .footer-link:hover {
    color: var(--color-primary);
    background: var(--color-text);
    padding: 2px 4px;
  }

  .footer-api {
    color:  var(--color-text-dim);
    font-size:  11px;
    margin-bottom: 8px;
  }

  .footer-copyright {
    color:  var(--color-text-dim);
    font-size:  11px;
  }

  /* ─── Modals ─── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items:  center;
    justify-content: center;
    padding: 24px;
  }

  .modal-wrapper {
    width: 100%;
    max-width: 440px;
  }

  .modal-wrapper-lg {
    max-width: 520px;
  }

  .modal-card {
    position: relative;
    background: var(--color-bg);
    border: 2px solid var(--color-primary);
    padding: 24px;
  }

  .modal-close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border:  none;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 14px;
    cursor: pointer;
  }

  . modal-close-btn:hover {
    background: var(--color-primary);
    color: var(--color-bg);
  }

  .modal-header {
    text-align: center;
    margin-bottom: 24px;
    color: var(--color-primary);
    font-size: 14px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .modal-title {
    color: var(--color-text);
    padding: 8px 0;
  }

  .modal-form {
    display:  flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-field {
    display:  flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    color: var(--color-text-dim);
    font-size: 12px;
  }

  .form-input {
    width: 100%;
    padding: 12px;
    background: var(--color-bg);
    border: 1px solid var(--color-primary);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 14px;
  }

  .form-input:: placeholder {
    color: var(--color-text-dim);
  }

  .form-input: focus {
    outline: none;
    border-color: var(--color-text);
    box-shadow: 0 0 0 2px var(--color-primary);
  }

  .form-input-group {
    position: relative;
    display: flex;
  }

  .form-input-group . form-input {
    flex: 1;
    padding-right: 80px;
  }

  .form-toggle {
    position:  absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border:  none;
    color: var(--color-text-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
  }

  .form-toggle:hover {
    color: var(--color-text);
  }

  .modal-alert {
    margin-top: 16px;
    padding: 12px;
    border: 1px solid var(--color-primary);
    font-size: 12px;
  }

  .modal-alert. ok {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .modal-alert.err {
    border-color: var(--color-error);
    color: var(--color-error);
  }

  .modal-footer {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .modal-link {
    background: none;
    border:  none;
    color:  var(--color-text-dim);
    font-family: var(--font-mono);
    font-size: 12px;
    cursor: pointer;
  }

  .modal-link:hover {
    color: var(--color-text);
  }

  /* ─── Pricing Modal ─── */
  .pricing-modal-content {
    text-align: center;
  }

  .pricing-display {
    margin-bottom: 20px;
  }

  .pricing-label {
    color:  var(--color-text-dim);
  }

  .pricing-amount {
    font-size: 32px;
    font-weight: 700;
    color:  var(--color-text);
  }

  .pricing-features {
    text-align: left;
    margin-bottom: 24px;
    padding:  16px;
    border: 1px solid var(--color-primary);
    line-height: 2;
  }

  .pricing-modal-actions {
    display:  flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .pricing-modal-note {
    color:  var(--color-text-dim);
    font-size:  11px;
  }

  /* ─── User Menu ─── */
  .user-menu-wrapper {
    position:  relative;
  }

  .avatar-btn {
    background: none;
    border:  2px solid var(--color-primary);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size:  14px;
    padding: 6px 12px;
    cursor: pointer;
  }

  .avatar-btn:hover {
    background: var(--color-primary);
    color: var(--color-bg);
  }

  .user-menu {
    position:  absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 300px;
    background: var(--color-bg);
    border: 2px solid var(--color-primary);
    z-index: 1000;
  }

  .user-menu-header {
    padding: 12px;
    font-size: 12px;
    color: var(--color-primary);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .user-menu-email,
  .user-menu-status {
    color: var(--color-text);
    padding: 4px 0;
  }

  .user-menu-item {
    width: 100%;
    display: block;
    padding:  12px;
    background: none;
    border:  none;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
  }

  .user-menu-item: hover {
    background: var(--color-primary);
    color: var(--color-bg);
  }

  .user-menu-divider {
    color: var(--color-primary);
    padding: 4px 12px;
    font-size: 12px;
  }

  .user-menu-item-danger: hover {
    background: var(--color-error);
  }

  .user-menu-footer {
    padding:  8px 12px;
    font-size: 10px;
    color: var(--color-text-dim);
    text-align: center;
    border-top: 1px solid var(--color-primary);
  }

  /* ─── Chat Interface ─── */
  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-bg);
  }

  .chat-messages {
    flex:  1;
    min-height: 0;
    overflow-y: auto;
    padding: 24px;
  }

  .chat-messages: :-webkit-scrollbar {
    width: 8px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: var(--color-bg);
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: var(--color-primary);
  }

  .chat-empty {
    height: 100%;
    display:  flex;
    align-items: center;
    justify-content: center;
  }

  .chat-empty-content {
    text-align: center;
  }

  .chat-empty-title {
    font-size: 16px;
    color: var(--color-text);
    margin-bottom: 16px;
  }

  .chat-empty-text {
    color: var(--color-text-dim);
    margin-bottom: 24px;
    text-align: left;
    display: inline-block;
    line-height: 2;
  }

  .chat-empty-actions {
    display:  flex;
    gap: 16px;
    justify-content: center;
  }

  .chat-history {
    max-width: 800px;
    margin:  0 auto;
    width: 100%;
  }

  . chat-message {
    margin-bottom: 24px;
  }

  .chat-message-header {
    font-size: 12px;
    color: var(--color-text-dim);
    margin-bottom: 8px;
  }

  .chat-message-user . chat-message-header {
    color: var(--color-primary);
  }

  .chat-bubble {
    padding: 16px;
    border:  1px solid var(--color-primary);
    color: var(--color-text);
    font-size: 14px;
    line-height: 1.7;
  }

  .chat-message-user .chat-bubble {
    background: rgba(5, 48, 173, 0.1);
  }

  .chat-bubble-image {
    margin-bottom: 12px;
    color: var(--color-text-dim);
    font-size: 12px;
  }

  .chat-bubble-image img {
    display: block;
    max-width: 100%;
    max-height: 300px;
    margin-top: 8px;
    border:  1px solid var(--color-primary);
  }

  .chat-thinking {
    color: var(--color-text-dim);
  }

  /* ─── Chat Input Area ─── */
  .chat-input-area {
    flex-shrink: 0;
    background: var(--color-bg);
    border-top: 2px solid var(--color-primary);
  }

  .chat-input-inner {
    max-width: 800px;
    margin: 0 auto;
    padding:  16px 24px;
  }

  .smart-progress {
    margin-bottom: 12px;
  }

  .progress-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }

  .progress-label {
    color:  var(--color-text-dim);
  }

  .progress-bar {
    color: var(--color-text);
    font-family: var(--font-mono);
  }

  .chat-attachment {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: rgba(5, 48, 173, 0.2);
    border: 1px solid var(--color-primary);
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--color-text);
  }

  .attachment-remove {
    background:  none;
    border:  none;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 12px;
    cursor:  pointer;
  }

  .attachment-remove:hover {
    color: var(--color-error);
  }

  . chat-input-row {
    display:  flex;
    gap: 8px;
    align-items: flex-end;
  }

  .input-wrapper {
    flex:  1;
    display: flex;
    align-items:  center;
    border:  1px solid var(--color-primary);
    background: var(--color-bg);
  }

  .input-prompt {
    padding: 12px;
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .chat-textarea {
    flex: 1;
    min-height: 44px;
    max-height: 160px;
    padding: 12px 12px 12px 0;
    background: transparent;
    border:  none;
    color:  var(--color-text);
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.5;
    resize:  none;
    outline: none;
  }

  .chat-textarea:: placeholder {
    color: var(--color-text-dim);
  }

  .chat-disclaimer {
    margin-top: 12px;
    text-align: center;
    font-size: 11px;
    color: var(--color-text-dim);
  }

  /* ─── Terminal Toast ─── */
  .terminal-toast {
    position: fixed;
    top: 16px;
    right: 16px;
    padding: 12px 16px;
    background: var(--color-bg);
    border:  2px solid var(--color-primary);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 12px;
    z-index: 9999;
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    .header-inner {
      padding: 12px 16px;
    }

    .header-meta {
      display: none;
    }

    .header-divider {
      display: none;
    }

    .landing-wrapper {
      padding: 0 16px;
    }

    .hero-section {
      padding: 40px 0;
    }

    .hero-title {
      font-size: 18px;
    }

    .hero-header,
    .hero-footer,
    .cta-border-top,
    .cta-border-bottom {
      font-size: 10px;
    }

    .terminal-box-top,
    .terminal-box-bottom {
      font-size: 10px;
    }

    .db-table {
      font-size: 9px;
    }

    .chat-input-inner {
      padding:  12px 16px;
    }
  }

  /* ─── Reduced Motion ─── */
  @media (prefers-reduced-motion: reduce) {
    . scanlines {
      animation:  none;
    }

    * {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
