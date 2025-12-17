// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// ✅ SECURITY FIX: Removed client-side admin check
// Admin features now only accessible via /admin routes with server-side validation
// eslint-disable-next-line no-unused-vars
const isAdmin = false

const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  LogOut: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Spark: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
      <path d="M5 14l.8 2.6L8.5 17l-2.7.9L5 20l-.8-2.1L1.5 17l2.7-.4L5 14z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

/* -----------------------------
   Framer-like reveals + countup
------------------------------ */

function useInViewOnce({ threshold = 0.18, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries?.[0]
        if (e?.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    obs.observe(el)
    return () => {
      try {
        obs.disconnect()
      } catch {}
    }
  }, [inView, threshold, rootMargin])

  return [ref, inView]
}

function Reveal({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInViewOnce()
  return (
    <div ref={ref} className={`rv ${inView ? 'is-inview' : ''} ${className}`} style={{ '--d': `${delay}ms` }}>
      {children}
    </div>
  )
}

function CountUp({ value, prefix = '', suffix = '', duration = 900, className = '' }) {
  const [ref, inView] = useInViewOnce({ threshold: 0.35 })
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const from = 0
    const to = Number(value || 0)

    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const next = Math.round(from + (to - from) * eased)
      setN(next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  )
}

/**
 * ✅ Smooth progress bar (never goes backwards / no stutter)
 * - Holds at ~94–96% while waiting
 * - Jumps to 100% when request completes, then fades out
 */
function SmartProgress({ active, mode = 'text', requestKey = 0 }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('Starting…')

  const refs = useRef({ pct: 0, timer: null, startedAt: 0, hideTimer: null })

  const cfg = useMemo(() => {
    return mode === 'vision' ? { baseCap: 88, finalCap: 94, k: 0.03 } : { baseCap: 90, finalCap: 96, k: 0.04 }
  }, [mode])

  useEffect(() => {
    if (refs.current.hideTimer) {
      clearTimeout(refs.current.hideTimer)
      refs.current.hideTimer = null
    }

    if (active) {
      setVisible(true)
      setProgress(0)
      setPhase(mode === 'vision' ? 'Uploading image…' : 'Sending…')

      refs.current.pct = 0
      refs.current.startedAt = Date.now()

      if (refs.current.timer) clearInterval(refs.current.timer)

      refs.current.timer = setInterval(() => {
        const elapsed = (Date.now() - refs.current.startedAt) / 1000

        const cap = elapsed < 1.5 ? cfg.baseCap - 8 : elapsed < 4 ? cfg.baseCap : cfg.finalCap
        const next = refs.current.pct + (cap - refs.current.pct) * cfg.k
        refs.current.pct = Math.max(refs.current.pct, next)

        const pctInt = Math.min(99, Math.floor(refs.current.pct))
        setProgress(pctInt)

        const p = pctInt
        if (p < 15) setPhase(mode === 'vision' ? 'Analyzing image…' : 'Reading question…')
        else if (p < 45) setPhase('Searching Washtenaw excerpts…')
        else if (p < 70) setPhase('Cross-checking requirements…')
        else if (p < 90) setPhase('Building the best answer…')
        else setPhase('Finalizing…')
      }, 120)

      return () => {
        if (refs.current.timer) clearInterval(refs.current.timer)
        refs.current.timer = null
      }
    }

    if (!active && visible) {
      if (refs.current.timer) clearInterval(refs.current.timer)
      refs.current.timer = null

      setProgress(100)
      setPhase('Done')

      refs.current.hideTimer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 350)

      return () => {
        if (refs.current.hideTimer) clearTimeout(refs.current.hideTimer)
        refs.current.hideTimer = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestKey, cfg, mode, visible])

  if (!visible) return null

  return (
    <div className="w-full px-1 pb-2">
      <div className={`flex items-center justify-between text-[11px] text-white/60 mb-2 ${inter.className}`}>
        <span className="truncate">{phase}</span>
        <span className="tabular-nums">{progress}%</span>
      </div>

      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-white/60" style={{ width: `${progress}%`, transition: 'width 160ms linear', willChange: 'width' }} />
      </div>
    </div>
  )
}

function FAQItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="ui-faqitem">
      <button type="button" onClick={onToggle} className="ui-faqbtn" aria-expanded={isOpen}>
        <span className={`ui-faqq ${inter.className}`}>{q}</span>
        <span className={`ui-faqchev ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          <Icons.ChevronDown />
        </span>
      </button>
      <div className={`ui-faqpanel ${isOpen ? 'is-open' : ''}`} role="region">
        <div className={`ui-faqa ${inter.className}`}>{a}</div>
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const [openFaq, setOpenFaq] = useState(null)

  const pricing = useMemo(() => ({ monthly: 200, annual: 2000 }), [])

  const complianceCostCards = useMemo(
    () => [
      {
        title: 'Monetary fines',
        range: '$200–$2,500+ per violation',
        detail: 'In some situations, daily penalties can apply while a violation remains unresolved.',
        right: 'One serious issue can outweigh months of software.',
      },
      {
        title: 'Mandatory re-inspections',
        range: '$150–$350+ per re-inspection',
        detail: 'A failed inspection can trigger multiple paid follow-ups until issues are corrected.',
        right: 'A single failure can compound quickly.',
      },
      {
        title: 'Labor and remediation',
        range: 'Hundreds to thousands',
        detail: 'Deep cleaning, rework, pest control, repairs, and operational disruption add up fast.',
        right: 'Prevention is cheaper than recovery.',
      },
      {
        title: 'Revenue loss from closure',
        range: 'Tens of thousands',
        detail: 'Full or partial shutdown can wipe out revenue while payroll and fixed costs continue.',
        right: 'This is the catastrophic outcome to avoid.',
      },
      {
        title: 'Reputation damage',
        range: 'Hard to quantify',
        detail: 'Lost repeat customers and long-term brand impact can linger well after reopening.',
        right: 'Protect the public record and the brand.',
      },
    ],
    []
  )

  const faqs = useMemo(
    () => [
      {
        q: 'Is this only for Washtenaw County?',
        a: 'Yes. The database and guidance are built specifically around Washtenaw County enforcement patterns and the codes your inspector expects.',
      },
      {
        q: 'What should my team upload for photo checks?',
        a: 'Walk-ins, prep tables, hot/cold holding, dish area, labels, storage order, and any “does this look right?” moments mid-shift.',
      },
      {
        q: 'How should we use the document side?',
        a: 'Ask short, operational questions. You’ll get answers grounded in local enforcement actions plus the relevant food-code sources.',
      },
      {
        q: 'Is usage limited?',
        a: 'No. The plan is unlimited for text questions and photo checks for your licensed location.',
      },
      {
        q: 'Will it replace training or a manager?',
        a: 'No. It’s a fast second set of eyes and a reference console—meant to help you verify and fix issues earlier.',
      },
      {
        q: 'How often should my team use it?',
        a: 'Teams usually run checks before inspection windows, after onboarding new staff, and whenever something looks off during a shift.',
      },
    ],
    []
  )

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-10">
      <div className="max-w-6xl w-full">
        <div className="ui-shell lp-shell">
          {/* HERO */}
          <section className="ui-hero lp-hero">
            <Reveal>
              <div className={`lp-eyebrow ${inter.className}`}>Washtenaw County food safety copilot</div>

              <h1 className={`ui-title lp-title ${outfit.className}`}>Catch violations before the inspector</h1>

              <p className={`ui-subtitle lp-subtitle ${inter.className}`}>
                Photo checks and regulation search designed for how Washtenaw County inspections actually happen.
              </p>

              <p className={`ui-body lp-body ${inter.className}`}>
                Snap a photo of any station, get likely issues and fixes fast, and keep a searchable reference for your team. Built for operators who
                want cleaner passes and fewer surprises.
              </p>

              <div className="ui-cta-row lp-cta">
                <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                  <span className="ui-btn-inner">Start trial</span>
                </button>

                <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                  <span className="ui-btn-inner">Sign in</span>
                </button>
              </div>

              <div className="lp-metricrow">
                <div className="fx-card fx-card-strong">
                  <div className={`fx-kicker ${inter.className}`}>Site license</div>
                  <div className={`fx-number ${outfit.className}`}>
                    <CountUp value={pricing.monthly} prefix="$" className="tabular-nums" />
                    <span className="fx-unit">/month</span>
                  </div>
                  <div className={`fx-sub ${inter.className}`}>Unlimited usage for one location.</div>
                </div>

                <div className="fx-card">
                  <div className={`fx-kicker ${inter.className}`}>Annual option</div>
                  <div className={`fx-number ${outfit.className}`}>
                    <CountUp value={pricing.annual} prefix="$" className="tabular-nums" />
                    <span className="fx-unit">/year</span>
                  </div>
                  <div className={`fx-sub ${inter.className}`}>Equivalent to $166.67/month.</div>
                </div>

                <div className="fx-card">
                  <div className={`fx-kicker ${inter.className}`}>Designed for speed</div>
                  <div className={`fx-number fx-number-sm ${outfit.className}`}>Photo checks</div>
                  <div className={`fx-sub ${inter.className}`}>Fast, operational feedback without hunting through PDFs.</div>
                </div>
              </div>
            </Reveal>
          </section>

          <div className="ui-section-divider" />

          {/* FEATURES */}
          <section className="ui-section lp-section">
            <Reveal delay={60}>
              <div className="lp-sectionhead">
                <h2 className={`ui-h2 lp-h2 ${outfit.className}`}>Built for real kitchen moments</h2>
                <p className={`ui-p lp-p ${inter.className}`}>
                  Not a generic chatbot. Purpose-built flows for photo checks, quick answers, and consistent compliance habits.
                </p>
              </div>

              <div className="fx-grid">
                <div className="fx-card fx-card-hover">
                  <div className="fx-cardtop">
                    <span className="fx-icon" aria-hidden="true">
                      <Icons.Camera />
                    </span>
                    <div className={`fx-title ${inter.className}`}>Photo analysis</div>
                  </div>
                  <div className={`fx-copy ${inter.className}`}>
                    Upload walk-ins, prep, dish, storage, labels, and holding temps. Get likely issues and the “why” in plain language.
                  </div>
                </div>

                <div className="fx-card fx-card-hover">
                  <div className="fx-cardtop">
                    <span className="fx-icon" aria-hidden="true">
                      <Icons.Lock />
                    </span>
                    <div className={`fx-title ${inter.className}`}>Washtenaw-backed answers</div>
                  </div>
                  <div className={`fx-copy ${inter.className}`}>
                    Search local enforcement patterns plus Michigan Modified Food Code and FDA guidance—organized for operators, not lawyers.
                  </div>
                </div>

                <div className="fx-card fx-card-hover">
                  <div className="fx-cardtop">
                    <span className="fx-icon" aria-hidden="true">
                      <Icons.Shield />
                    </span>
                    <div className={`fx-title ${inter.className}`}>Pre-inspection routine</div>
                  </div>
                  <div className={`fx-copy ${inter.className}`}>
                    Run quick checks before inspection windows, during onboarding, or whenever something feels off. Build consistency without extra meetings.
                  </div>
                </div>
              </div>

              <div className={`lp-footnote ${inter.className}`}>
                Uses Anthropic and Cohere APIs for language and retrieval. Not affiliated with or endorsed by Anthropic or Cohere.
              </div>
            </Reveal>
          </section>

          <div className="ui-section-divider" />

          {/* COST OF NON-COMPLIANCE */}
          <section className="ui-section lp-section">
            <Reveal delay={40}>
              <div className="lp-sectionhead">
                <h2 className={`ui-h2 lp-h2 ${outfit.className}`}>Cost of non-compliance</h2>
                <p className={`ui-p lp-p ${inter.className}`}>
                  These ranges are common examples used in industry discussions. Actual outcomes vary by jurisdiction and situation.
                </p>
              </div>

              <div className="lp-costgrid">
                {complianceCostCards.map((c, i) => (
                  <div key={i} className="fx-card fx-card-hover">
                    <div className={`lp-costtitle ${inter.className}`}>{c.title}</div>
                    <div className={`lp-costrange ${outfit.className}`}>{c.range}</div>
                    <div className={`lp-costdetail ${inter.className}`}>{c.detail}</div>
                    <div className="lp-costdivider" />
                    <div className={`lp-costright ${inter.className}`}>{c.right}</div>
                  </div>
                ))}
              </div>

              <div className={`lp-legal ${inter.className}`}>
                Illustrative ranges only. protocolLM provides compliance assistance, not legal advice.
              </div>
            </Reveal>
          </section>

          <div className="ui-section-divider" />

          {/* PRICING STRIP */}
          <section className="ui-section lp-section">
            <Reveal delay={30}>
              <div className="lp-pricing">
                <div>
                  <div className={`ui-tag ${inter.className}`}>Single location license</div>
                  <h2 className={`ui-h2 lp-h2 ${outfit.className}`}>One plan. Unlimited usage.</h2>
                  <p className={`ui-p lp-p ${inter.className}`}>
                    Unlimited photo checks and questions for your licensed location. Built for daily use by managers and line staff.
                  </p>

                  <div className="lp-bench">
                    <div className={`lp-benchlabel ${inter.className}`}>Typical compliance SaaS benchmarks</div>
                    <div className={`lp-benchrow ${inter.className}`}>
                      <span>Basic: $79–$149/month</span>
                      <span>Standard: $199–$399/month</span>
                      <span>Enterprise: $499+/month</span>
                    </div>
                  </div>
                </div>

                <div className="fx-card fx-card-strong lp-pricingcard">
                  <div className="lp-priceTop">
                    <div className={`lp-priceName ${inter.className}`}>protocolLM</div>
                    <div className={`lp-priceMain ${outfit.className}`}>
                      <CountUp value={pricing.monthly} prefix="$" className="tabular-nums" />
                      <span className="lp-priceUnit">/month</span>
                    </div>
                    <div className={`lp-priceSub ${inter.className}`}>Or ${pricing.annual.toLocaleString()}/year.</div>
                  </div>

                  <div className="lp-features">
                    <div className={`lp-feature ${inter.className}`}>Unlimited photo checks</div>
                    <div className={`lp-feature ${inter.className}`}>Unlimited text questions</div>
                    <div className={`lp-feature ${inter.className}`}>Washtenaw-focused guidance</div>
                    <div className={`lp-feature ${inter.className}`}>Owner / GM friendly</div>
                  </div>

                  <div className="lp-pricingcta">
                    <button onClick={onShowPricing} className="ui-btn ui-btn-primary w-full">
                      <span className="ui-btn-inner">Start trial</span>
                    </button>
                    <button onClick={onShowAuth} className="ui-btn ui-btn-secondary w-full">
                      <span className="ui-btn-inner">Sign in</span>
                    </button>
                  </div>

                  <div className={`lp-smallprint ${inter.className}`}>One site license per restaurant. Cancel anytime.</div>
                </div>
              </div>
            </Reveal>
          </section>

          <div className="ui-section-divider" />

          {/* FAQ */}
          <section className="ui-section lp-section">
            <Reveal delay={20}>
              <h2 className={`ui-h2 lp-h2 ${outfit.className}`}>FAQ</h2>
              <div className="ui-faq">
                {faqs.map((f, i) => (
                  <FAQItem key={i} q={f.q} a={f.a} isOpen={openFaq === i} onToggle={() => setOpenFaq((v) => (v === i ? null : i))} />
                ))}
              </div>
            </Reveal>
          </section>

          <div className="ui-section-divider" />

          {/* FINAL CTA */}
          <section className="ui-final lp-final">
            <Reveal>
              <div className="ui-finalinner">
                <div>
                  <h3 className={`ui-h2 ${outfit.className}`}>Start your 7-day trial</h3>
                  <p className={`ui-p ${inter.className}`}>Set up takes minutes. Give your team a faster way to verify issues and fix them early.</p>
                </div>

                <div className="ui-cta-row">
                  <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                    <span className="ui-btn-inner">Start trial</span>
                  </button>
                  <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                    <span className="ui-btn-inner">Sign in</span>
                  </button>
                </div>
              </div>
            </Reveal>
          </section>

          <div className={`ui-footerline ${inter.className}`}>
            <span>One site license per restaurant · 7-day trial · Cancel anytime</span>
          </div>
        </div>

        <footer className={`pt-8 text-[13px] text-white/80 ${inter.className}`}>
          <div className="flex flex-wrap gap-5 justify-center">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>

          <div className="mt-4 text-center text-[11px] text-white/45">
            Uses Anthropic and Cohere APIs. Not affiliated with or endorsed by Anthropic or Cohere.
          </div>
        </footer>
      </div>
    </div>
  )
}

// ✅ REPLACED AuthModal (fixed turnstile_unavailable handling)
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
        setMessage('Security verification failed. Please try again.')
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password
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
    <div className="fixed inset-0 z-[999] ui-backdrop flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md ui-modal ui-modal-anim p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className={`text-lg font-semibold text-white tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs text-white/55 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button onClick={onClose} className="ui-icon-btn" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/55 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className={`ui-input ${inter.className}`}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-white/55 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`ui-input pr-16 ${inter.className}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/55 hover:text-white text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="ui-btn ui-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="ui-btn-inner">
              {loading && <span className="ui-spinner" aria-hidden="true" />}
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </span>
          </button>
        </form>

        {message && (
          <div className={`mt-4 ui-toast ${messageKind === 'err' ? 'ui-toast-err' : messageKind === 'ok' ? 'ui-toast-ok' : ''}`}>
            <span className="ui-toasticon" aria-hidden="true">
              {messageKind === 'err' ? <Icons.X /> : messageKind === 'ok' ? <Icons.Check /> : <Icons.Spark />}
            </span>
            <span className={`ui-toasttext ${inter.className}`}>{message}</span>
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/55">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full text-white/55 hover:text-white">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full text-white/55 hover:text-white">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/55 hover:text-white">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/55 hover:text-white">
              Back to sign in
            </button>
          )}
        </div>

        <RecaptchaBadge />
      </div>
    </div>
  )
}

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[900] ui-backdrop flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-xl ui-modal ui-modal-anim p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="ui-icon-btn absolute right-5 top-5" aria-label="Close pricing">
          <Icons.X />
        </button>

        <div className="mb-5">
          <div className={`ui-tag ${inter.className}`}>Single site license</div>
          <h3 className={`text-2xl font-semibold text-white mb-2 tracking-tight ${outfit.className}`}>protocolLM Access</h3>
          <p className={`text-sm text-white/55 ${inter.className}`}>
            Unlimited photo checks and document search—built specifically for Washtenaw County operators.
          </p>
        </div>

        <div className="ui-pricewrap p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-semibold text-white tracking-tight ${outfit.className}`}>$200</span>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">/ month</span>
              </div>
              <p className={`text-xs text-white/55 mt-2 ${inter.className}`}>Unlimited usage. Includes photo checks and questions.</p>
            </div>

            <div className={`ui-badge ${inter.className}`}>
              <Icons.Shield />
              Premium
            </div>
          </div>

          <div className="ui-divider my-5" />

          <div className="space-y-3">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading}
              className="ui-btn ui-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="ui-btn-inner">
                {loading === 'monthly' && <span className="ui-spinner" aria-hidden="true" />}
                Start trial
              </span>
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading}
              className="ui-btn ui-btn-secondary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="ui-btn-inner">
                {loading === 'annual' && <span className="ui-spinner" aria-hidden="true" />}
                Annual · $2,000/yr
              </span>
            </button>

            <p className={`text-[12px] text-white/80 text-center ${inter.className}`}>
              One site license per restaurant · 7-day trial · Cancel anytime
              <br />
              <span className="text-white/60">Uses Anthropic and Cohere APIs. Not affiliated with or endorsed by Anthropic or Cohere.</span>
            </p>
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

  const { isLoaded: captchaLoaded, executeRecaptcha } = useRecaptcha()

  const [isLoading, setIsLoading] = useState(true)
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

  // ✅ NEW: Hide Spline background on chat mode (landing keeps it)
  useEffect(() => {
    if (typeof document === 'undefined') return

    document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'

    // belt + suspenders: hide the container directly
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
    const showPricing = searchParams?.get('showPricing')
    if (showPricing === 'true') setShowPricingModal(true)
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    async function loadSessionAndSub(s) {
      if (!isMounted) return
      setSession(s)

      if (!s) {
        setHasActiveSubscription(false)
        setShowPricingModal(false)
        setIsLoading(false)
        return
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s.user.id)
          .maybeSingle()

        if (!profile) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        const accepted = !!(profile?.accepted_terms && profile?.accepted_privacy)
        if (!accepted) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        if (profileError) {
          console.error('❌ Profile check error:', profileError)
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('❌ Policy check exception:', e)
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
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sub && sub.current_period_end) {
          const end = new Date(sub.current_period_end)
          if (end > new Date()) active = true
        }
      } catch (e) {
        console.error('Subscription check error', e)
      }

      if (!isMounted) return
      setHasActiveSubscription(active)
      setIsLoading(false)
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        await loadSessionAndSub(data.session || null)
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
    function handleClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false)
    }
    function handleKey(event) {
      if (event.key === 'Escape') setShowUserMenu(false)
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
    setShowUserMenu(false)

    let loadingToast = null
    try {
      loadingToast = document.createElement('div')
      loadingToast.textContent = 'Opening billing portal...'
      loadingToast.className = 'fixed top-4 right-4 bg-black text-white px-4 py-2 rounded-lg'
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
    if ((!input.trim() && !selectedImage) || isSending) return

    const question = input.trim()
    const image = selectedImage

    setSendMode(image ? 'vision' : 'text')
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
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="ui-spinner-lg" aria-label="Loading" />
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        html,
        body {
          height: 100%;
          width: 100%;
          background: transparent !important;
        }

        /* ✅ Let AmexBackground from layout.js show through */
        body {
          overflow: hidden;
          background: transparent !important;
          color: rgba(255, 255, 255, 0.94);
        }

        /* ✅ NEW: subtle veil so the 3D/Amex background is visible behind the whole app */
        .ui-appveil {
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.58) 0%, rgba(0, 0, 0, 0.76) 100%);
        }

        :root {
          scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
          scrollbar-width: thin;
        }
        ::-webkit-scrollbar {
          width: 9px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        /* 3. ✅ REPLACED .ui-header */
        .ui-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(5, 6, 8, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .ui-logo {
          display: inline-flex;
          align-items: baseline;
          gap: 0;
          user-select: none;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .ui-logo-protocol {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: rgba(255, 255, 255, 0.92);
          line-height: 1;
        }
        .ui-logo-lm {
          font-size: 17px;
          font-weight: 950;
          letter-spacing: -0.04em;
          color: rgba(255, 255, 255, 0.92);
          line-height: 1;
        }
        @media (min-width: 640px) {
          .ui-logo-protocol,
          .ui-logo-lm {
            font-size: 18px;
          }
        }

        /* 1. ✅ REPLACED .ui-shell */
        .ui-shell {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.7);
          position: relative;
        }

        .ui-shell::before {
          content: '';
          position: absolute;
          inset: -1px;
          pointer-events: none;
          background: radial-gradient(700px 240px at 20% 0%, rgba(255, 255, 255, 0.06), transparent 60%);
          opacity: 0.8;
        }

        .ui-hero {
          padding: 32px;
          position: relative;
          z-index: 1;
        }

        .ui-title {
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.05;
          letter-spacing: -0.05em;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.96);
        }

        .ui-subtitle {
          font-size: 16px;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 10px;
          max-width: 70ch;
        }

        .ui-body {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.55);
          max-width: 78ch;
        }

        .ui-cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .ui-section-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
        }

        .ui-section {
          padding: 28px 32px;
          position: relative;
          z-index: 1;
        }

        .ui-final {
          padding: 28px 32px 26px;
          position: relative;
          z-index: 1;
        }

        .ui-finalinner {
          display: flex;
          gap: 18px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .ui-h2 {
          font-size: 20px;
          letter-spacing: -0.02em;
          color: rgba(255, 255, 255, 0.94);
          margin-bottom: 8px;
        }

        .ui-p {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.55);
          max-width: 72ch;
        }

        /* 4. ✅ REPLACED .ui-stepcard */
        .ui-stepcard {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 12px;
        }

        /* 5. ✅ REPLACED .ui-faq */
        .ui-faq {
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          overflow: hidden;
        }

        .ui-faqitem {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ui-faqitem:first-child {
          border-top: none;
        }

        .ui-faqbtn {
          width: 100%;
          text-align: left;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: transparent;
          color: rgba(255, 255, 255, 0.92);
          outline: none;
        }

        .ui-faqbtn:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .ui-faqq {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
        }

        .ui-faqchev {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.7);
          transition: transform 140ms ease;
          flex-shrink: 0;
        }
        .ui-faqchev.is-open {
          transform: rotate(180deg);
        }

        .ui-faqpanel {
          max-height: 0px;
          overflow: hidden;
          transition: max-height 180ms ease;
        }
        .ui-faqpanel.is-open {
          max-height: 260px;
        }

        .ui-faqa {
          padding: 0 12px 12px;
          font-size: 12px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.55);
        }

        .ui-footerline {
          padding: 14px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
        }

        .ui-btn {
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease,
            opacity 120ms ease;
          user-select: none;
        }

        .ui-btn-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .ui-btn:hover {
          transform: scale(1.02);
        }
        .ui-btn:active {
          transform: scale(1.01);
        }

        .ui-btn-primary {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }
        .ui-btn-primary:hover {
          box-shadow: 0 26px 80px rgba(0, 0, 0, 0.58);
        }

        .ui-btn-secondary {
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .ui-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .ui-btn:focus-visible,
        .ui-icon-btn:focus-visible,
        .ui-faqbtn:focus-visible,
        .ui-input:focus-visible,
        .ui-menuitem:focus-visible,
        .ui-avatar-btn:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.22);
          outline-offset: 2px;
        }

        .ui-icon-btn {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.82);
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
        }
        .ui-icon-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.95);
          transform: scale(1.02);
        }

        .ui-backdrop {
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .ui-modal {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.75);
        }

        .ui-modal-anim {
          animation: uiPop 180ms ease-out both;
          transform-origin: 50% 40%;
        }
        @keyframes uiPop {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .ui-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.94);
          outline: none;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
        }
        .ui-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .ui-input:focus {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
        }

        .ui-toast {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
        }
        .ui-toast-ok {
          border-color: rgba(34, 197, 94, 0.35);
        }
        .ui-toast-err {
          border-color: rgba(239, 68, 68, 0.35);
        }
        .ui-toasticon {
          margin-top: 1px;
          color: rgba(255, 255, 255, 0.75);
        }
        .ui-toasttext {
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.7);
        }

        .ui-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          width: fit-content;
        }

        .ui-pricewrap {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
        }

        .ui-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 700;
        }

        .ui-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
        }

        /* Chat bubble cleanup */
        .ui-bubble {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          color: rgba(255, 255, 255, 0.94);
        }

        .ui-bubble-user {
          border: none !important;
          background: transparent !important;
          color: rgba(255, 255, 255, 0.94) !important;
          padding: 0 !important;
          border-radius: 0 !important;
          font-weight: 600;
        }

        .ui-chatimgwrap {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .ui-chatimg {
          display: block;
          width: 100%;
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          max-height: 280px;
          object-fit: contain;
        }

        .ui-thinking {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .ui-emptywrap {
          border: none !important;
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.45);
          max-width: 520px;
          width: 100%;
        }

        .ui-attachpill {
          border: none !important;
          background: rgba(255, 255, 255, 0.04) !important;
          border-radius: 14px;
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.75);
        }

        .ui-spinner {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.18);
          border-top-color: rgba(0, 0, 0, 0.65);
          animation: spin 700ms linear infinite;
        }
        .ui-spinner-lg {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.16);
          border-top-color: rgba(255, 255, 255, 0.75);
          animation: spin 700ms linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* -----------------------------
           Landing: Framer-esque reveals
        ------------------------------ */
        .rv {
          opacity: 0;
          transform: translateY(14px);
          filter: blur(8px);
          transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 700ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform, filter;
        }
        .rv.is-inview {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }

        .lp-eyebrow {
          display: inline-flex;
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .lp-metricrow {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 860px) {
          .lp-metricrow {
            grid-template-columns: 1.2fr 1fr 1fr;
          }
        }

        .fx-card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(14px) saturate(180%);
          -webkit-backdrop-filter: blur(14px) saturate(180%);
          padding: 14px;
          position: relative;
          overflow: hidden;
        }
        .fx-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          pointer-events: none;
          background: radial-gradient(600px 180px at 10% 0%, rgba(255, 255, 255, 0.06), transparent 60%);
          opacity: 0.8;
        }
        .fx-card-strong {
          background: rgba(255, 255, 255, 0.03);
        }
        .fx-card-hover {
          transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease, background 180ms ease;
        }
        .fx-card-hover:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.03);
        }

        .fx-kicker {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 8px;
        }

        .fx-number {
          font-size: 34px;
          letter-spacing: -0.04em;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.05;
        }
        .fx-number-sm {
          font-size: 18px;
          letter-spacing: -0.02em;
        }
        .fx-unit {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          margin-left: 8px;
        }
        .fx-sub {
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.5;
          max-width: 60ch;
        }

        .fx-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        @media (min-width: 980px) {
          .fx-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        .fx-cardtop {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }
        .fx-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.7);
          flex-shrink: 0;
        }
        .fx-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.92);
        }
        .fx-copy {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.55);
          position: relative;
          z-index: 1;
        }

        .lp-footnote {
          margin-top: 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
        }

        .lp-costgrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        @media (min-width: 980px) {
          .lp-costgrid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .lp-costtitle {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
          position: relative;
          z-index: 1;
        }
        .lp-costrange {
          font-size: 20px;
          letter-spacing: -0.03em;
          color: rgba(255, 255, 255, 0.94);
          margin-top: 6px;
          position: relative;
          z-index: 1;
        }
        .lp-costdetail {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.55);
          position: relative;
          z-index: 1;
        }
        .lp-costdivider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 10px 0;
          position: relative;
          z-index: 1;
        }
        .lp-costright {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          position: relative;
          z-index: 1;
        }
        .lp-legal {
          margin-top: 10px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
        }

        .lp-pricing {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          align-items: start;
        }
        @media (min-width: 980px) {
          .lp-pricing {
            grid-template-columns: 1.2fr 0.8fr;
          }
        }

        .lp-bench {
          margin-top: 12px;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
        }
        .lp-benchlabel {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 8px;
        }
        .lp-benchrow {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
        }

        .lp-pricingcard {
          padding: 16px;
        }
        .lp-priceName {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.65);
        }
        .lp-priceMain {
          margin-top: 6px;
          font-size: 42px;
          letter-spacing: -0.05em;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.05;
        }
        .lp-priceUnit {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          margin-left: 10px;
        }
        .lp-priceSub {
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
        }
        .lp-features {
          margin-top: 12px;
          display: grid;
          gap: 8px;
        }
        .lp-feature {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          padding: 10px 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
        }
        .lp-pricingcta {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }
        .lp-smallprint {
          margin-top: 10px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          text-align: center;
        }

        /* =========================
           PREMIUM USER MENU STYLES
           ========================= */
        .ui-usermenu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 280px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.98));
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06) inset,
            0 20px 80px rgba(0, 0, 0, 0.7);
          overflow: hidden;
          animation: uiMenuSlide 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top right;
          z-index: 1000;
        }

        @keyframes uiMenuSlide {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .ui-usermenu::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 18px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.08));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.6;
        }

        .ui-menuheader {
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent);
        }

        .ui-useremail {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 4px;
          letter-spacing: -0.01em;
          word-break: break-word;
        }

        .ui-userstatus {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
        }

        .ui-menudivider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 8px 0;
        }

        .ui-menuitem {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          text-align: left;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .ui-menuitem::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.3));
          transform: translateX(-3px);
          transition: transform 140ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ui-menuitem:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.98);
          transform: translateX(2px);
        }

        .ui-menuitem:hover::before {
          transform: translateX(0);
        }

        .ui-menuitem:active {
          transform: translateX(2px) scale(0.99);
        }

        .ui-menuitem-icon {
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: opacity 140ms ease;
        }

        .ui-menuitem:hover .ui-menuitem-icon {
          opacity: 1;
        }

        .ui-menuitem-logout {
          color: rgba(239, 68, 68, 0.85);
        }

        .ui-menuitem-logout:hover {
          background: rgba(239, 68, 68, 0.08);
          color: rgba(239, 68, 68, 0.95);
        }

        .ui-menuitem-logout::before {
          background: linear-gradient(180deg, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.5));
        }

        .ui-menufooter {
          padding: 12px 18px 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.3);
        }

        .ui-menuhelp {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          letter-spacing: 0.04em;
        }

        .ui-avatar-btn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
          color: rgba(255, 255, 255, 0.9);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
          position: relative;
          overflow: hidden;
          user-select: none;
        }

        .ui-avatar-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
          opacity: 0;
          transition: opacity 140ms ease;
        }

        .ui-avatar-btn:hover {
          transform: scale(1.04);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
        }

        .ui-avatar-btn:hover::before {
          opacity: 1;
        }

        .ui-avatar-btn:active {
          transform: scale(1.02);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="h-[100dvh] min-h-0 flex flex-col ui-appveil">
        <header className="sticky top-0 z-40 flex-shrink-0 ui-header">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`ui-logo ${outfit.className}`}>
                  <span className="ui-logo-protocol">protocol</span>
                  <span className="ui-logo-lm">LM</span>
                </div>

                <div className="hidden md:flex flex-col leading-tight">
                  <span className={`text-[12px] text-white/80 ${inter.className}`}>Washtenaw Compliance Database</span>
                  <span className={`text-[12px] text-white/55 ${inter.className}`}>Additional Counties Coming 2026</span>
                </div>

                {hasActiveSubscription && <span className={`hidden lg:inline-flex text-[11px] text-white/45 ${inter.className}`}>Active · site license</span>}
              </div>

              {!isAuthenticated && (
                <div className={`absolute left-1/2 -translate-x-1/2 hidden md:block text-[12px] text-white/65 ${inter.className}`}>
                  Made in Washtenaw County for Washtenaw County.
                </div>
              )}

              <div className="flex items-center gap-2">
                {!isAuthenticated ? (
                  <button
                    onClick={() => {
                      setAuthInitialMode('signin')
                      setShowAuthModal(true)
                    }}
                    className="ui-btn ui-btn-secondary"
                  >
                    <span className="ui-btn-inner">Sign in</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleNewChat} className="ui-btn ui-btn-secondary hidden sm:inline-flex items-center gap-2">
                      <Icons.Plus />
                      <span className="ui-btn-inner" style={{ gap: 8 }}>
                        New chat
                      </span>
                    </button>

                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu((v) => !v)}
                        className="ui-avatar-btn"
                        aria-label="User menu"
                        title={session?.user?.email || 'User'}
                      >
                        <span>{session?.user?.email?.[0]?.toUpperCase() || 'U'}</span>
                      </button>

                      {showUserMenu && (
                        <div className="ui-usermenu">
                          <div className="ui-menuheader">
                            <div className={`ui-useremail ${inter.className}`}>{session?.user?.email || 'Signed in'}</div>
                            <div className={`ui-userstatus ${inter.className}`}>{hasActiveSubscription ? '● Active Premium' : 'Free Account'}</div>
                          </div>

                          <div>
                            {hasActiveSubscription ? (
                              <button onClick={handleManageBilling} className={`ui-menuitem ${inter.className}`}>
                                <span className="ui-menuitem-icon">
                                  <Icons.Settings />
                                </span>
                                <span>Manage Billing</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setShowPricingModal(true)
                                  setShowUserMenu(false)
                                }}
                                className={`ui-menuitem ${inter.className}`}
                              >
                                <span className="ui-menuitem-icon">
                                  <Icons.Settings />
                                </span>
                                <span>Start Trial</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                window.open('/privacy', '_blank')
                                setShowUserMenu(false)
                              }}
                              className={`ui-menuitem ${inter.className}`}
                            >
                              <span className="ui-menuitem-icon">
                                <Icons.Shield />
                              </span>
                              <span>Privacy & Security</span>
                            </button>

                            <div className="ui-menudivider" />

                            <button
                              onClick={() => {
                                setShowUserMenu(false)
                                handleSignOut()
                              }}
                              className={`ui-menuitem ui-menuitem-logout ${inter.className}`}
                            >
                              <span className="ui-menuitem-icon">
                                <Icons.LogOut />
                              </span>
                              <span>Sign Out</span>
                            </button>
                          </div>

                          <div className="ui-menufooter">
                            <div className={`ui-menuhelp ${inter.className}`}>Press ESC to close</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isAuthenticated && (
              <div className={`md:hidden pt-2 text-center text-[12px] text-white/65 ${inter.className}`}>
                Made in Washtenaw County for Washtenaw County.
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col">
          {!isAuthenticated ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <LandingPage
                onShowPricing={() => setShowPricingModal(true)}
                onShowAuth={() => {
                  setAuthInitialMode('signin')
                  setShowAuthModal(true)
                }}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto"
                style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable', paddingBottom: '2px' }}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center px-4">
                    <div className="ui-emptywrap text-left">
                      <div className="ui-emptyicon" aria-hidden="true">
                        <Icons.Shield />
                      </div>
                      <div className={`ui-emptytitle ${inter.className}`}>Upload a photo or ask a question.</div>
                      <div className={`ui-emptytext ${inter.className}`}>
                        Use photo checks to spot likely issues fast—or search the Washtenaw-backed database when you need a clear answer.
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-btn ui-btn-secondary">
                          <span className="ui-btn-inner">
                            <Icons.Camera />
                            Attach photo
                          </span>
                        </button>

                        <button type="button" onClick={() => textAreaRef.current?.focus()} className="ui-btn ui-btn-secondary">
                          <span className="ui-btn-inner">Ask a question</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-3">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] ui-bubble ${msg.role === 'user' ? 'ui-bubble-user' : ''}`}>
                          {msg.image && (
                            <div className="ui-chatimgwrap">
                              <img src={msg.image} alt="Uploaded" className="ui-chatimg" />
                            </div>
                          )}

                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className={`ui-thinking ${inter.className} text-[12px] text-white/55`}>Working…</div>
                          ) : (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 ui-header border-t border-white/10">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 ui-attachpill text-[12px]">
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="ui-icon-btn !w-10 !h-10"
                        aria-label="Remove image"
                        title="Remove"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />

                    <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-icon-btn" aria-label="Attach image">
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                      <textarea
                        ref={textAreaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className={`ui-input flex-1 max-h-32 min-h-[44px] resize-none ${inter.className}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                      />

                      <button
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className={`ui-icon-btn ${(!input.trim() && !selectedImage) || isSending ? 'opacity-40 cursor-not-allowed' : ''}`}
                        aria-label="Send"
                      >
                        {isSending ? <div className="ui-spinner-lg" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[11px] text-center text-white/40 ${inter.className}`}>
                    protocolLM may make mistakes. Confirm critical decisions with official regulations and your local health department.
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

/**
 * ✅ NOTE (globals.css):
 * Add these there (NOT in page.js):
 *
 * .ui-emptyicon { ... }
 * .ui-emptytitle { ... }
 * .ui-emptytext { ... }
 */
