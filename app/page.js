'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

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
}

function LandingPage({ onShowPricing, onShowAuth, shellRef, landingRootRef }) {
  useEffect(() => {
    const root = landingRootRef?.current
    if (!root) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return

    const items = Array.from(root.querySelectorAll('[data-reveal]'))
    if (!items.length) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('ui-reveal-in')
        })
      },
      { threshold: 0.14, root: root, rootMargin: '0px 0px -10% 0px' }
    )

    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [landingRootRef])

  return (
    <div className="min-h-[calc(100dvh-72px)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-10 pb-10">
        <div className="max-w-6xl w-full">
          {/* HERO SHELL */}
          <div ref={shellRef} className="ui-shell ui-shell-parallax ui-blackcard">
            {/* platinum shimmer stripe */}
            <div className="ui-metal-stripe" aria-hidden="true" />

            <div className="ui-hero">
              <div className="ui-kickers">
                <span className={`ui-kicker ${inter.className}`}>
                  <Icons.Shield /> Inspection-grade
                </span>
                <span className={`ui-kicker-muted ${inter.className}`}>Built for Washtenaw County operators · enterprise posture</span>
              </div>

              <h1 className={`ui-title ${outfit.className}`}>Compliance that feels like a console.</h1>

              <p className={`ui-subtitle ${inter.className}`}>
                A premium compliance workspace for restaurants that take inspections seriously. Grounded answers, photo risk scans,
                and quick action checklists — without digging through manuals.
              </p>

              <div className="ui-cta-row">
                <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                  Start trial
                </button>
                <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                  Sign in
                </button>
              </div>

              <div className={`ui-trust ${inter.className}`}>
                <span className="ui-trust-item">
                  <Icons.Lock /> Secure by design
                </span>
                <span className="ui-dot" />
                <span className="ui-trust-item">
                  <Icons.Spark /> Built for audits
                </span>
                <span className="ui-dot" />
                <span className="ui-trust-item">
                  <Icons.Shield /> Operator-ready
                </span>
              </div>
            </div>

            {/* SPEC STRIP */}
            <div className="ui-specstrip">
              <div className={`ui-specpill ${inter.className}`}>Photo scan</div>
              <div className={`ui-specpill ${inter.className}`}>Rulebook-backed answers</div>
              <div className={`ui-specpill ${inter.className}`}>Close/Open checklist</div>
              <div className={`ui-specpill ${inter.className}`}>One site license</div>
            </div>
          </div>

          {/* SECTION: CAPABILITIES */}
          <section className="mt-10">
            <div className="ui-sectionhead" data-reveal>
              <div className={`ui-sectionkicker ${inter.className}`}>Capabilities</div>
              <h2 className={`ui-sectiontitle ${outfit.className}`}>Everything you need, nothing you don’t.</h2>
              <p className={`ui-sectionsub ${inter.className}`}>
                The point is speed and certainty — a calm, premium workflow that gets you inspection-ready.
              </p>
            </div>

            <div className="ui-tilegrid mt-6">
              <div className="ui-tile" data-reveal>
                <div className="ui-tileicon">
                  <Icons.Camera />
                </div>
                <div className={`ui-titletxt ${inter.className}`}>Photo risk scan</div>
                <div className={`ui-bodytxt ${inter.className}`}>
                  Upload a walk-in or line photo. Get a tight list of likely issues to verify — fast.
                </div>
              </div>

              <div className="ui-tile" data-reveal>
                <div className="ui-tileicon">
                  <Icons.Spark />
                </div>
                <div className={`ui-titletxt ${inter.className}`}>Grounded answers</div>
                <div className={`ui-bodytxt ${inter.className}`}>
                  Ask normal questions like “How should we store raw poultry?” and get rulebook-backed guidance.
                </div>
              </div>

              <div className="ui-tile" data-reveal>
                <div className="ui-tileicon">
                  <Icons.Check />
                </div>
                <div className={`ui-titletxt ${inter.className}`}>Action checklist</div>
                <div className={`ui-bodytxt ${inter.className}`}>
                  Convert concerns into a short close/open list your lead can run — today.
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: HOW IT WORKS */}
          <section className="mt-12">
            <div className="ui-sectionhead" data-reveal>
              <div className={`ui-sectionkicker ${inter.className}`}>How it works</div>
              <h2 className={`ui-sectiontitle ${outfit.className}`}>A premium flow your team can repeat.</h2>
              <p className={`ui-sectionsub ${inter.className}`}>
                No training manuals. No “AI vibes.” Just a clean sequence: scan, verify, fix, log.
              </p>
            </div>

            <div className="ui-steps mt-6">
              <div className="ui-step" data-reveal>
                <div className={`ui-stepnum ${outfit.className}`}>01</div>
                <div>
                  <div className={`ui-steptitle ${inter.className}`}>Capture</div>
                  <div className={`ui-stepbody ${inter.className}`}>Snap a photo or ask a direct question in plain language.</div>
                </div>
              </div>

              <div className="ui-step" data-reveal>
                <div className={`ui-stepnum ${outfit.className}`}>02</div>
                <div>
                  <div className={`ui-steptitle ${inter.className}`}>Cross-check</div>
                  <div className={`ui-stepbody ${inter.className}`}>Get likely issues + what to verify — grounded in local guidance.</div>
                </div>
              </div>

              <div className="ui-step" data-reveal>
                <div className={`ui-stepnum ${outfit.className}`}>03</div>
                <div>
                  <div className={`ui-steptitle ${inter.className}`}>Correct</div>
                  <div className={`ui-stepbody ${inter.className}`}>Turn findings into a short list your manager can execute.</div>
                </div>
              </div>

              <div className="ui-step" data-reveal>
                <div className={`ui-stepnum ${outfit.className}`}>04</div>
                <div>
                  <div className={`ui-steptitle ${inter.className}`}>Repeat</div>
                  <div className={`ui-stepbody ${inter.className}`}>Use it daily or weekly — the workflow stays calm and consistent.</div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: TRUST / BLACK CARD BAND */}
          <section className="mt-12">
            <div className="ui-band" data-reveal>
              <div className="ui-bandleft">
                <div className={`ui-bandkicker ${inter.className}`}>Premium posture</div>
                <div className={`ui-bandtitle ${outfit.className}`}>Built to feel like a black card product.</div>
                <div className={`ui-bandbody ${inter.className}`}>
                  Quiet visuals. Clear outputs. A console that feels expensive — because compliance is expensive when it goes wrong.
                </div>
              </div>

              <div className="ui-bandright">
                <div className="ui-mini">
                  <div className={`ui-minih ${inter.className}`}>Includes</div>
                  <ul className={`ui-minilist ${inter.className}`}>
                    <li>
                      <Icons.Check /> Text + photo checks
                    </li>
                    <li>
                      <Icons.Check /> One site license per restaurant
                    </li>
                    <li>
                      <Icons.Check /> 7-day trial · cancel anytime
                    </li>
                    <li>
                      <Icons.Check /> Fast, grounded responses
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: FAQ */}
          <section className="mt-12">
            <div className="ui-sectionhead" data-reveal>
              <div className={`ui-sectionkicker ${inter.className}`}>FAQ</div>
              <h2 className={`ui-sectiontitle ${outfit.className}`}>Short answers. No fluff.</h2>
            </div>

            <div className="ui-faq mt-6">
              <details className="ui-faqitem" data-reveal>
                <summary className={`ui-faqsum ${inter.className}`}>Is this made for Washtenaw specifically?</summary>
                <div className={`ui-faqbody ${inter.className}`}>
                  Yes — it’s built around the reality of local inspections and how operators actually work day to day.
                </div>
              </details>

              <details className="ui-faqitem" data-reveal>
                <summary className={`ui-faqsum ${inter.className}`}>Do I need it every day?</summary>
                <div className={`ui-faqbody ${inter.className}`}>
                  Some teams use it daily, others run it weekly. It’s designed to stay valuable even with light usage.
                </div>
              </details>

              <details className="ui-faqitem" data-reveal>
                <summary className={`ui-faqsum ${inter.className}`}>How should my team use photo scans?</summary>
                <div className={`ui-faqbody ${inter.className}`}>
                  Treat them like a “risk scan.” You verify in the moment, then execute the checklist output.
                </div>
              </details>
            </div>
          </section>

          {/* FINAL CTA CARD */}
          <section className="mt-12 mb-6">
            <div className="ui-final" data-reveal>
              <div>
                <div className={`ui-sectionkicker ${inter.className}`}>Ready</div>
                <h3 className={`ui-finaltitle ${outfit.className}`}>Make inspections boring again.</h3>
                <p className={`ui-finalsub ${inter.className}`}>
                  Start the trial, run a scan in your walk-in, and keep the checklist on a manager clipboard.
                </p>
              </div>
              <div className="ui-finalcta">
                <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                  Start trial
                </button>
                <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                  Sign in
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer pinned to bottom when content is short */}
      <footer className="mt-auto pb-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="ui-footline" />
          <div className="pt-6 text-xs text-white/45">
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/terms" className="hover:text-white/70">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white/70">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-white/70">
                Contact
              </Link>
            </div>
            <p className={`mt-3 text-center text-[11px] text-white/35 ${inter.className}`}>
              protocolLM may make mistakes. Confirm critical decisions with official regulations and your local health department.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')

    try {
      const captchaToken = await executeRecaptcha(mode)
      if (!captchaToken) {
        setMessage('Error: Security verification failed. Please try again.')
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
        setMessage(`Error: ${data.error || 'Authentication failed'}`)
        return
      }

      if (mode === 'reset') {
        setMessage('✓ Check your email for password reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else if (mode === 'signup') {
        setMessage('✓ Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else {
        setMessage('✓ Signed in. Redirecting…')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 600)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('Error: Unexpected issue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md ui-modal p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className={`text-lg font-semibold text-white tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs text-white/60 ${inter.className}`}>
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
            <label className="block text-xs font-semibold text-white/70 mb-2">Email</label>
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
              <label className="block text-xs font-semibold text-white/70 mb-2">Password</label>
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !isLoaded} className="ui-btn ui-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-xs rounded-lg px-3 py-2 ui-toast ${message.startsWith('Error') ? 'ui-toast-err' : 'ui-toast-ok'}`}>
            {message}
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/70">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full text-white/70 hover:text-white">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full text-white/70 hover:text-white">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/70 hover:text-white">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/70 hover:text-white">
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
    <div className="fixed inset-0 z-[900] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-xl ui-modal p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="ui-icon-btn absolute right-6 top-6" aria-label="Close pricing">
          <Icons.X />
        </button>

        <div className="mb-6">
          <div className={`ui-tag ${inter.className}`}>Enterprise • Single site license</div>
          <h3 className={`text-2xl font-semibold text-white mb-2 tracking-tight ${outfit.className}`}>protocolLM Access</h3>
          <p className={`text-sm text-white/65 ${inter.className}`}>
            For operators who want inspection-grade confidence. Includes full chat + photo scanning.
          </p>
        </div>

        <div className="ui-pricewrap p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-semibold text-white tracking-tight ${outfit.className}`}>$200</span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">/ month</span>
              </div>
              <p className={`text-xs text-white/62 mt-2 ${inter.className}`}>
                Includes roughly <span className="font-semibold text-white">2,600 monthly checks</span>. Text questions count as one check; photo analyses count as two.
              </p>
            </div>

            <div className={`ui-badge ${inter.className}`}>
              <Icons.Shield />
              Premium tier
            </div>
          </div>

          <div className="ui-divider my-5" />

          <ul className="text-xs text-white/75 space-y-2">
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Text + photo compliance checks</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Grounded in Michigan Food Code &amp; Washtenaw guidance</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>One restaurant site license</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>7-day free trial · cancel anytime</span>
            </li>
          </ul>

          <div className="space-y-3 pt-5">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className="ui-btn ui-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'monthly' ? 'Processing…' : 'Start $200/mo trial'}
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="ui-btn ui-btn-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'annual' ? 'Processing…' : 'Annual · save 15%'}
            </button>

            <p className={`text-[11px] text-white/50 text-center ${inter.className}`}>
              Not for hobbyists. Built for real operators who want inspection-ready workflows.
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

  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const [showUserMenu, setShowUserMenu] = useState(false)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const userMenuRef = useRef(null)

  // Landing scroll + shell parallax
  const landingWrapRef = useRef(null)
  const landingRootRef = useRef(null)
  const shellParallaxRef = useRef(null)
  const parallaxRafRef = useRef(null)

  const shouldAutoScrollRef = useRef(true)

  const scrollToBottom = (behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 120
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldAutoScrollRef.current = distanceFromBottom < threshold
  }

  const applyShellParallax = (scrollTop) => {
    const shell = shellParallaxRef.current
    if (!shell) return
    const max = 18
    const ty = Math.min(max, Math.max(0, scrollTop * 0.06))
    shell.style.setProperty('--ui-shell-parallax', `${ty.toFixed(2)}px`)
  }

  const handleLandingScroll = () => {
    const y = landingWrapRef.current?.scrollTop || 0
    if (parallaxRafRef.current) cancelAnimationFrame(parallaxRafRef.current)
    parallaxRafRef.current = requestAnimationFrame(() => applyShellParallax(y))
  }

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom('auto'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => scrollToBottom('auto'))
    }
  }, [messages])

  useEffect(() => {
    applyShellParallax(0)
    return () => {
      if (parallaxRafRef.current) cancelAnimationFrame(parallaxRafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      let active = false
      try {
        if (s.user.email === ADMIN_EMAIL) {
          active = true
        } else {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status,current_period_end')
            .eq('user_id', s.user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()

          if (sub && sub.current_period_end) {
            const end = new Date(sub.current_period_end)
            if (end > new Date()) active = true
          }
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
        console.error('Auth init error:', e)
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
  }, [supabase, searchParams])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('ui-enterprise-bg')
    return () => document.body.classList.remove('ui-enterprise-bg')
  }, [])

  useEffect(() => {
    function handleClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCheckout = async (priceId, planName) => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setShowPricingModal(false)
        setShowAuthModal(true)
        return
      }
      if (!priceId) {
        alert('Invalid price selected.')
        return
      }

      setCheckoutLoading(planName)

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Checkout failed')
      }

      const payload = await res.json()
      if (payload.url) window.location.href = payload.url
      else throw new Error('No checkout URL returned')
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
      setCheckoutLoading(null)
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
          .insert({ user_id: session.user.id, title: (question || 'New chat').slice(0, 40) })
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
        body: JSON.stringify({ messages: [...messages, newUserMessage], image, chatId: activeChatId }),
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
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </div>
    )
  }

  const isAuthenticated = !!session

  return (
    <>
      <style jsx global>{`
        html,
        body {
          height: 100%;
          width: 100%;
        }

        body.ui-enterprise-bg {
          overflow: hidden;
          background: #050608;
          color: rgba(255, 255, 255, 0.92);
        }

        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: -14%;
          pointer-events: none;
          background:
            radial-gradient(900px 520px at 50% 0%, rgba(255, 255, 255, 0.14), transparent 62%),
            radial-gradient(980px 560px at 18% 12%, rgba(0, 255, 200, 0.085), transparent 64%),
            radial-gradient(980px 560px at 86% 12%, rgba(120, 90, 255, 0.085), transparent 64%),
            radial-gradient(900px 560px at 50% 110%, rgba(255, 255, 255, 0.05), transparent 65%),
            repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 10px);
          opacity: 1;
          filter: saturate(1.1) contrast(1.05);
          transform: translate3d(0, 0, 0) scale(1);
          animation: ui-bg-float 18s ease-in-out infinite alternate;
          mask-image: radial-gradient(circle at 50% 18%, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0));
        }

        @keyframes ui-bg-float {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(0, -22px, 0) scale(1.02);
          }
        }

        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 25%, transparent 0%, rgba(0, 0, 0, 0.68) 72%);
          opacity: 0.92;
        }

        .ui-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(6, 7, 9, 0.78);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
        }

        .ui-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
        }

        .ui-shell {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          transform: translate3d(0, var(--ui-shell-parallax, 0px), 0);
          will-change: transform;
        }

        .ui-blackcard {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.09), transparent 52%),
            radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.06), transparent 55%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03));
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.74);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
        }

        .ui-blackcard::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05) 42%, rgba(255, 255, 255, 0.03));
          opacity: 0.75;
          mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
          -webkit-mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
          padding: 1px;
          mask-composite: exclude;
          -webkit-mask-composite: xor;
        }

        .ui-blackcard::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          opacity: 0.22;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        /* Black-card “metal” stripe (subtle shimmer) */
        .ui-metal-stripe {
          position: absolute;
          left: 18px;
          right: 18px;
          top: 14px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04),
            rgba(255, 255, 255, 0.14),
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.12),
            rgba(255, 255, 255, 0.04)
          );
          opacity: 0.7;
          overflow: hidden;
          pointer-events: none;
          filter: saturate(1.1);
          z-index: 2;
        }

        .ui-metal-stripe::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0) 35%,
            rgba(255, 255, 255, 0.85) 50%,
            rgba(255, 255, 255, 0) 65%,
            transparent 100%
          );
          transform: translateX(-70%);
          animation: ui-stripe-shimmer 5.2s ease-in-out infinite;
          opacity: 0.55;
          mix-blend-mode: screen;
        }

        @keyframes ui-stripe-shimmer {
          0% {
            transform: translateX(-70%);
          }
          45% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        .ui-hero {
          padding: 28px 22px 18px;
          position: relative;
          z-index: 3;
        }

        .ui-kickers {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }

        .ui-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .ui-kicker-muted {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .ui-title {
          font-size: clamp(30px, 4vw, 56px);
          line-height: 1.02;
          letter-spacing: -0.05em;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }

        .ui-subtitle {
          font-size: 14px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.74);
          max-width: 76ch;
        }

        .ui-cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .ui-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }

        .ui-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
        }

        .ui-dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
        }

        .ui-specstrip {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 14px 18px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 3;
        }

        .ui-specpill {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.78);
        }

        .ui-sectionhead {
          max-width: 70ch;
        }

        .ui-sectionkicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.75);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
          width: fit-content;
        }

        .ui-sectiontitle {
          margin-top: 10px;
          font-size: 28px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: rgba(255, 255, 255, 0.96);
        }

        .ui-sectionsub {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.68);
        }

        .ui-tilegrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 920px) {
          .ui-tilegrid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }

        .ui-tile {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          padding: 16px;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
        }

        .ui-tileicon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.9);
        }

        .ui-titletxt {
          margin-top: 12px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.9);
        }

        .ui-bodytxt {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.68);
        }

        .ui-steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .ui-step {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          padding: 14px 16px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
        }

        .ui-stepnum {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.92);
          letter-spacing: 0.08em;
          font-size: 12px;
        }

        .ui-steptitle {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.9);
        }

        .ui-stepbody {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.68);
        }

        .ui-band {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            radial-gradient(circle at 10% 0%, rgba(255, 255, 255, 0.12), transparent 52%),
            radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.08), transparent 55%),
            rgba(255, 255, 255, 0.04);
          padding: 18px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
        }

        @media (min-width: 920px) {
          .ui-band {
            grid-template-columns: 1.25fr 0.75fr;
            align-items: center;
          }
        }

        .ui-bandkicker {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
          font-weight: 800;
        }

        .ui-bandtitle {
          margin-top: 10px;
          font-size: 26px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: rgba(255, 255, 255, 0.96);
        }

        .ui-bandbody {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.7);
          max-width: 65ch;
        }

        .ui-mini {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          padding: 14px 14px;
        }

        .ui-minih {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
          font-weight: 800;
        }

        .ui-minilist {
          margin-top: 10px;
          display: grid;
          gap: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.76);
        }

        .ui-minilist li {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ui-faq {
          display: grid;
          gap: 10px;
        }

        .ui-faqitem {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          padding: 14px 16px;
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
        }

        .ui-faqsum {
          cursor: pointer;
          list-style: none;
          font-size: 12px;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.88);
          font-weight: 700;
        }

        .ui-faqsum::-webkit-details-marker {
          display: none;
        }

        .ui-faqbody {
          margin-top: 10px;
          font-size: 12px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.68);
        }

        .ui-final {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          padding: 18px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
        }

        @media (min-width: 920px) {
          .ui-final {
            grid-template-columns: 1.4fr 0.6fr;
            align-items: center;
          }
        }

        .ui-finaltitle {
          margin-top: 8px;
          font-size: 24px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: rgba(255, 255, 255, 0.96);
        }

        .ui-finalsub {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.7);
          max-width: 65ch;
        }

        .ui-finalcta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        @media (min-width: 920px) {
          .ui-finalcta {
            justify-content: flex-end;
          }
        }

        .ui-footline {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
        }

        .ui-btn {
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
          user-select: none;
        }
        .ui-btn:active {
          transform: translateY(1px);
        }

        .ui-btn-primary {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }
        .ui-btn-primary:hover {
          box-shadow: 0 26px 80px rgba(0, 0, 0, 0.58);
        }

        .ui-btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .ui-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .ui-icon-btn {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.9);
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
        }
        .ui-icon-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.22);
          color: rgba(255, 255, 255, 0.98);
        }

        .ui-modal {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(6, 7, 9, 0.9);
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
        }

        .ui-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.96);
          outline: none;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
        }
        .ui-input::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }
        .ui-input:focus {
          border-color: rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.055);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.06);
        }

        .ui-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.82);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          width: fit-content;
        }

        .ui-pricewrap {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
        }
        .ui-pricewrap::before {
          content: '';
          position: absolute;
          inset: -40% -30%;
          background:
            radial-gradient(circle at 25% 20%, rgba(255, 255, 255, 0.12), transparent 48%),
            radial-gradient(circle at 80% 20%, rgba(0, 255, 200, 0.08), transparent 58%),
            radial-gradient(circle at 60% 80%, rgba(120, 90, 255, 0.08), transparent 58%);
          pointer-events: none;
        }

        .ui-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.84);
          font-size: 12px;
          font-weight: 700;
        }

        .ui-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
        }

        .ui-bubble {
          border-radius: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
        }
        .ui-bubble-user {
          background: rgba(255, 255, 255, 0.92);
          color: #000;
          border-color: rgba(255, 255, 255, 0.22);
        }

        [data-reveal] {
          opacity: 0;
          transform: translate3d(0, 10px, 0);
          transition: opacity 520ms ease, transform 520ms ease;
          will-change: opacity, transform;
        }
        .ui-reveal-in {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        @media (prefers-reduced-motion: reduce) {
          body.ui-enterprise-bg::before {
            animation: none !important;
          }
          .ui-shell {
            transform: none !important;
          }
          .ui-metal-stripe::before {
            animation: none !important;
          }
          [data-reveal] {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="h-[100dvh] min-h-0 flex flex-col">
        <header className="sticky top-0 z-40 flex-shrink-0 ui-header">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`ui-brand ${outfit.className}`}>
                <span className="text-white/92 text-[12px] font-semibold tracking-[0.14em] uppercase">protocolLM</span>
              </div>
              {hasActiveSubscription && (
                <span className={`hidden sm:inline-flex text-[11px] text-white/60 ${inter.className}`}>Active · site license</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className="ui-btn ui-btn-secondary">
                    Sign in
                  </button>
                  <button onClick={() => setShowPricingModal(true)} className="ui-btn ui-btn-primary">
                    Start trial
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleNewChat} className="ui-btn ui-btn-secondary hidden sm:inline-flex items-center gap-2">
                    <Icons.Plus />
                    New chat
                  </button>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="ui-icon-btn"
                      aria-label="User menu"
                      title={session?.user?.email || 'User'}
                    >
                      <span className="text-xs font-semibold">{session.user.email?.[0]?.toUpperCase() || 'U'}</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-52 ui-modal overflow-hidden">
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Icons.Settings />
                          <span>Subscription</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-white/5 transition-colors"
                        >
                          <Icons.LogOut />
                          <span>Log out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col">
          {!isAuthenticated ? (
            <div ref={landingWrapRef} className="flex-1 min-h-0 overflow-y-auto" onScroll={handleLandingScroll}>
              <div ref={landingRootRef} className="h-full">
                <LandingPage
                  landingRootRef={landingRootRef}
                  shellRef={shellParallaxRef}
                  onShowPricing={() => setShowPricingModal(true)}
                  onShowAuth={() => setShowAuthModal(true)}
                />
              </div>
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
                    <div className="max-w-xl text-center">
                      <p className={`text-sm leading-relaxed text-white/62 ${inter.className}`}>
                        Ask about Michigan Food Code requirements, Washtenaw enforcement actions, or attach a photo for an inspection-grade risk scan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ui-bubble ${msg.role === 'user' ? 'ui-bubble-user' : ''}`}>
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Uploaded"
                              className="mb-3 rounded-xl border border-white/10 max-h-64 object-contain bg-black/30"
                            />
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="flex gap-1 items-center">
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.24s' }} />
                            </div>
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
                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[12px] text-white/75">
                      <span>Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="ui-icon-btn !w-8 !h-8" aria-label="Remove image">
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
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className={`ui-input flex-1 max-h-32 min-h-[42px] resize-none ${inter.className}`}
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
                        className={`ui-icon-btn ${(!input.trim() && !selectedImage) || isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Send"
                      >
                        {isSending ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[11px] text-center text-white/45 ${inter.className}`}>
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
