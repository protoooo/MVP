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

export default function Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  // Auth modal
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'

  // Optional query param to open auth
  useEffect(() => {
    const open = searchParams?.get('auth')
    if (open === '1') {
      setAuthOpen(true)
      setAuthMode(searchParams?.get('mode') === 'signup' ? 'signup' : 'signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(data?.session ?? null)
        setUser(data?.session?.user ?? null)
      } finally {
        if (mounted) setInitializing(false)
      }
    }

    bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [supabase])

  const openSignIn = useCallback(() => {
    setAuthMode('signin')
    setAuthOpen(true)
  }, [])

  const openSignUp = useCallback(() => {
    setAuthMode('signup')
    setAuthOpen(true)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  // You can keep a separate “App view” for authenticated users.
  // If you want the landing page always, remove this conditional.
  if (initializing) {
    return (
      <div className="page">
        <div className="boot">
          <div className={`boot-title ${outfit.className}`}>protocolLM</div>
          <div className={`boot-sub ${inter.className}`}>Loading…</div>
        </div>
        <GlobalStyles />
      </div>
    )
  }

  return (
    <div className="page">
      <Header
        user={user}
        onSignIn={openSignIn}
        onSignUp={openSignUp}
        onSignOut={signOut}
      />

      {/* If signed in, you can route to an internal app screen or keep the landing + add a “Launch Console” section */}
      {!user ? (
        <LandingPage onSignIn={openSignIn} onSignUp={openSignUp} />
      ) : (
        <AuthedHome user={user} onSignOut={signOut} />
      )}

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        setMode={setAuthMode}
        supabase={supabase}
      />

      <RecaptchaBadge />
      <GlobalStyles />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Header
   ────────────────────────────────────────────────────────────────────────────── */

function Header({ user, onSignIn, onSignUp, onSignOut }) {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo" aria-label="protocolLM home">
          <span className={`logo-text ${outfit.className}`}>protocolLM</span>
        </Link>

        <nav className="nav">
          <a className={`nav-link ${inter.className}`} href="#features">
            Features
          </a>
          <a className={`nav-link ${inter.className}`} href="#console">
            Console
          </a>
          <a className={`nav-link ${inter.className}`} href="#pricing">
            Pricing
          </a>
        </nav>

        <div className="header-actions">
          {!user ? (
            <>
              <button className={`btn btn-ghost ${inter.className}`} onClick={onSignIn}>
                Sign in
              </button>
              <button className={`btn btn-solid ${inter.className}`} onClick={onSignUp}>
                Get started
              </button>
            </>
          ) : (
            <>
              <div className={`user-pill ${inter.className}`}>
                {user?.email ?? 'Signed in'}
              </div>
              <button className={`btn btn-ghost ${inter.className}`} onClick={onSignOut}>
                Sign out
              </button>
            </>
          )}
        </div>
      </div>

      <div className="header-glow" aria-hidden="true" />
    </header>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Landing Page (light, terminal-clean, not “vibe-coded”)
   - No redundant “protocolLM” headline above the header
   - “Compliance Console” section includes:
     • Output card
     • Documentation scroller (forced LIGHT)
     • Loaded Modules (no icons, no “Ready”)
   - Fixes right-side dead space with a structured 2-col grid on desktop
   ────────────────────────────────────────────────────────────────────────────── */

function LandingPage({ onSignIn, onSignUp }) {
  return (
    <main className="main">
      <Hero onSignIn={onSignIn} onSignUp={onSignUp} />
      <Features />
      <ConsolePreview />
      <Pricing />
      <Footer />
    </main>
  )
}

function Hero({ onSignIn, onSignUp }) {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-left">
          <div className={`hero-kicker ${inter.className}`}>Food safety, enforced locally.</div>

          <h1 className={`hero-title ${outfit.className}`}>
            Instant compliance answers your team can actually use.
          </h1>

          <p className={`hero-subtitle ${inter.className}`}>
            ProtocolLM helps food-service staff resolve common violations fast—grounded in the documents
            inspectors care about, with practical corrective actions.
          </p>

          <div className="hero-cta">
            <button className={`btn btn-solid ${inter.className}`} onClick={onSignUp}>
              Start free trial
            </button>
            <button className={`btn btn-ghost ${inter.className}`} onClick={onSignIn}>
              Sign in
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className={`stat-value ${outfit.className}`}>Washtenaw</div>
              <div className={`stat-label ${inter.className}`}>local grounding</div>
            </div>
            <div className="stat">
              <div className={`stat-value ${outfit.className}`}>Images + Q&A</div>
              <div className={`stat-label ${inter.className}`}>photo checks</div>
            </div>
            <div className="stat">
              <div className={`stat-value ${outfit.className}`}>Citations</div>
              <div className={`stat-label ${inter.className}`}>verifiable sources</div>
            </div>
          </div>
        </div>

        <div className="hero-right" aria-hidden="true">
          <TerminalCard />
        </div>
      </div>
    </section>
  )
}

function TerminalCard() {
  return (
    <div className="terminal-wrap">
      <div className="terminal-border" />
      <div className="terminal">
        <div className="terminal-top">
          <span className="dot dot-r" />
          <span className="dot dot-y" />
          <span className="dot dot-g" />
          <span className={`terminal-title ${inter.className}`}>protocolLM — console</span>
        </div>

        <div className={`terminal-body ${inter.className}`}>
          <div className="tline">
            <span className="tdim">$</span> load knowledge: washtenaw/public
          </div>
          <div className="tline">
            <span className="tdim">→</span> parsing enforcement procedures…
          </div>
          <div className="tline">
            <span className="tdim">→</span> indexing food code excerpts…
          </div>
          <div className="tline">
            <span className="tdim">→</span> enabling photo checks…
          </div>

          <div className="tspacer" />

          <div className="tline">
            <span className="tdim">Q:</span> How long can RTE TCS food be held after opening?
          </div>
          <div className="tline">
            <span className="tdim">A:</span> Use date marking and discard by the allowed timeframe; label clearly.
          </div>
          <div className="tline">
            <span className="tdim">Next:</span> Upload a station photo to identify likely violations.
          </div>
        </div>
      </div>
    </div>
  )
}

function Features() {
  const items = [
    {
      title: 'Grounded answers',
      desc: 'Responses are based on your curated documents, with citations your managers can verify.',
    },
    {
      title: 'Photo checks',
      desc: 'Snap a walk-in, prep table, or dish station. Get likely issues and concrete fixes.',
    },
    {
      title: 'Shift-ready guidance',
      desc: 'Designed for real service speed—short, actionable, repeatable steps.',
    },
    {
      title: 'Local-first',
      desc: 'Aligned with what inspectors actually flag in your area, not generic advice.',
    },
  ]

  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-head">
          <span className={`section-label ${inter.className}`}>Core</span>
          <h2 className={`section-title ${outfit.className}`}>Built for the way restaurants actually run.</h2>
          <p className={`section-desc ${inter.className}`}>
            Clean interface. Fast workflows. No fluff. Your team gets clarity in seconds.
          </p>
        </div>

        <div className="feature-grid">
          {items.map((x, idx) => (
            <Reveal key={idx} delay={idx * 80}>
              <div className="feature-card">
                <div className="feature-card-border" />
                <div className="feature-card-inner">
                  <div className={`feature-title ${outfit.className}`}>{x.title}</div>
                  <div className={`feature-desc ${inter.className}`}>{x.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Compliance Console Preview Section
   - Forced LIGHT docs scroller (even if you later add darker sections elsewhere)
   - No icons and no "Ready" lines in Loaded Modules
   - Tight grid to remove dead space on desktop
   ────────────────────────────────────────────────────────────────────────────── */

function ConsolePreview() {
  const docLines = useMemo(
    () => [
      'Time/temperature control: cold holding requirements and corrective actions.',
      'Date marking: ready-to-eat TCS foods opened/held in refrigeration.',
      'Hand sink accessibility: blocked sinks and required supplies.',
      'Sanitizer concentration: verification steps and common failure points.',
      'Food storage order: raw animal products below ready-to-eat foods.',
      'Dish machine / 3-compartment: wash–rinse–sanitize workflow expectations.',
      'Wiping cloth storage: sanitizer bucket rules during service.',
      'Allergen controls: separation, labeling, and training expectations.',
    ],
    []
  )

  const modules = useMemo(
    () => [
      {
        name: 'Washtenaw Enforcement Patterns',
        desc: 'Local expectations, common citations, and corrective actions written for daily operations.',
      },
      {
        name: 'Michigan Food Code Context',
        desc: 'Relevant excerpts translated into plain language so staff understand what to do next.',
      },
      {
        name: 'Photo Check Workflow',
        desc: 'Fast scan → likely issues → step-by-step fixes to correct problems before inspection.',
      },
      {
        name: 'Citation Builder',
        desc: 'Returns the most relevant document excerpts so managers can verify and train confidently.',
      },
    ],
    []
  )

  return (
    <section className="console" id="console">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <span className={`section-label ${inter.className}`}>Preview</span>
            <h2 className={`section-title ${outfit.className}`}>Compliance Console</h2>
            <p className={`section-desc ${inter.className}`}>
              A focused workspace for quick answers, photo checks, and grounded citations—built for real shifts.
            </p>
          </div>
        </Reveal>

        <div className="console-grid">
          {/* Output */}
          <Reveal delay={80}>
            <div className="console-card console-output">
              <div className="console-card-border" />
              <div className="console-card-inner">
                <div className="console-topline">
                  <span className={`console-kicker ${inter.className}`}>Output</span>
                  <span className={`console-pill ${inter.className}`}>Washtenaw-mode</span>
                </div>

                <div className={`console-window ${inter.className}`}>
                  <div className="cline">
                    <span className="cdim">Q:</span> Is this walk-in shelf setup okay?
                  </div>
                  <div className="cline">
                    <span className="cdim">A:</span> Check raw-over-ready-to-eat separation, labeling, and container coverage.
                  </div>
                  <div className="cline">
                    <span className="cdim">Fix:</span> Move raw poultry below RTE foods. Label open containers with prep/expire.
                  </div>
                  <div className="cline">
                    <span className="cdim">Citations:</span> Washtenaw enforcement patterns + MI Food Code excerpts.
                  </div>

                  <div className="console-divider" />

                  <div className="cline">
                    <span className="cdim">Photo check:</span> Identify likely issues in 10–20 seconds.
                  </div>
                  <div className="cline">
                    <span className="cdim">Next:</span> Upload a station photo → get actionable steps.
                  </div>
                </div>

                <div className={`console-footnote ${inter.className}`}>
                  Designed for clarity: short answers, practical actions, and sources you can verify.
                </div>
              </div>
            </div>
          </Reveal>

          {/* Documentation (forced light) */}
          <Reveal delay={140}>
            <div className="console-card console-docs">
              <div className="console-card-border" />
              <div className="console-card-inner">
                <div className="console-topline">
                  <span className={`console-kicker ${inter.className}`}>Documentation</span>
                  <span className={`console-subtle ${inter.className}`}>Grounded excerpts · searchable</span>
                </div>

                <div className="doc-scroller" aria-hidden="true">
                  <div className="doc-track">
                    {docLines.map((t, i) => (
                      <div key={i} className={`doc-item ${inter.className}`}>
                        {t}
                      </div>
                    ))}
                    {/* duplicate for seamless loop */}
                    {docLines.map((t, i) => (
                      <div key={`d2-${i}`} className={`doc-item ${inter.className}`}>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>

                <p className={`console-footnote ${inter.className}`}>
                  Excerpts are curated to match what inspectors flag—and to give staff clear corrective steps.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Loaded Modules (no icons, no “Ready”) */}
          <Reveal delay={200}>
            <div className="console-card console-modules">
              <div className="console-card-border" />
              <div className="console-card-inner">
                <div className="console-topline">
                  <span className={`console-kicker ${inter.className}`}>Loaded Modules</span>
                  <span className={`console-subtle ${inter.className}`}>What the console uses</span>
                </div>

                <div className="modules-list">
                  {modules.map((m, i) => (
                    <div key={i} className="module-row">
                      <div className={`module-name ${inter.className}`}>{m.name}</div>
                      <div className={`module-desc ${inter.className}`}>{m.desc}</div>
                    </div>
                  ))}
                </div>

                <p className={`console-footnote ${inter.className}`}>
                  Everything is built to be quick, repeatable, and easy to act on—without clutter.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Pricing
   - No count-up animation (static values)
   - Uses environment variables for Stripe price IDs
   ────────────────────────────────────────────────────────────────────────────── */

function Pricing() {
  const [billing, setBilling] = useState('monthly') // monthly | annual
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const priceId = billing === 'monthly' ? MONTHLY_PRICE : ANNUAL_PRICE

  const startCheckout = useCallback(async () => {
    setErr('')
    setLoading(true)
    try {
      if (!priceId) throw new Error('Missing Stripe price ID env var for this plan.')

      // This assumes you have an API route that creates a Stripe checkout session.
      // If your route path differs, change it here (still only page.js).
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Checkout request failed.')
      }

      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned.')
      }
    } catch (e) {
      setErr(e?.message || 'Unable to start checkout.')
    } finally {
      setLoading(false)
    }
  }, [priceId])

  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <div className="section-head">
          <span className={`section-label ${inter.className}`}>Pricing</span>
          <h2 className={`section-title ${outfit.className}`}>Simple, single-tier.</h2>
          <p className={`section-desc ${inter.className}`}>
            Unlimited usage for one location. Built to be easy to buy, easy to train, and easy to use.
          </p>
        </div>

        <div className="billing-toggle">
          <button
            className={`toggle ${billing === 'monthly' ? 'active' : ''} ${inter.className}`}
            onClick={() => setBilling('monthly')}
            type="button"
          >
            Monthly
          </button>
          <button
            className={`toggle ${billing === 'annual' ? 'active' : ''} ${inter.className}`}
            onClick={() => setBilling('annual')}
            type="button"
          >
            Annual
          </button>
        </div>

        <div className="pricing-grid">
          <div className="price-card">
            <div className="price-card-border" />
            <div className="price-card-inner">
              <div className={`price-title ${outfit.className}`}>ProtocolLM</div>
              <div className={`price-sub ${inter.className}`}>One location · unlimited usage</div>

              <div className="price-amount">
                <span className={`price-dollar ${outfit.className}`}>$</span>
                <span className={`price-number ${outfit.className}`}>
                  {billing === 'monthly' ? '100' : '1000'}
                </span>
                <span className={`price-term ${inter.className}`}>
                  {billing === 'monthly' ? '/month' : '/year'}
                </span>
              </div>

              <ul className={`price-list ${inter.className}`}>
                <li>Photo checks for common violations</li>
                <li>Grounded Q&amp;A with citations</li>
                <li>Local-first compliance guidance</li>
                <li>Fast workflows designed for shifts</li>
              </ul>

              <button className={`btn btn-solid w-full ${inter.className}`} onClick={startCheckout} disabled={loading}>
                {loading ? 'Starting checkout…' : 'Subscribe'}
              </button>

              {err ? <div className={`price-error ${inter.className}`}>{err}</div> : null}

              <div className={`price-note ${inter.className}`}>
                If your Stripe route name differs, update <span className="mono">/api/stripe/create-checkout-session</span> in page.js.
              </div>
            </div>
          </div>

          <div className="price-side">
            <div className="side-card">
              <div className="side-card-border" />
              <div className="side-card-inner">
                <div className={`side-title ${outfit.className}`}>What you get</div>
                <p className={`side-desc ${inter.className}`}>
                  This is a compliance tool, not a generic chatbot. It’s designed to reduce inspector risk by turning local
                  documents into clear actions your team can follow.
                </p>

                <div className="side-grid">
                  <div className="side-item">
                    <div className={`side-k ${outfit.className}`}>Capture</div>
                    <div className={`side-v ${inter.className}`}>Use a quick photo to spot likely issues.</div>
                  </div>
                  <div className="side-item">
                    <div className={`side-k ${outfit.className}`}>Cross-check</div>
                    <div className={`side-v ${inter.className}`}>Get grounded guidance with citations.</div>
                  </div>
                  <div className="side-item">
                    <div className={`side-k ${outfit.className}`}>Correct</div>
                    <div className={`side-v ${inter.className}`}>Follow step-by-step fixes during service.</div>
                  </div>
                </div>

                <div className={`side-foot ${inter.className}`}>
                  Built to train new staff, reduce repeat violations, and keep managers confident.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className={`footer-left ${inter.className}`}>
          <div className={`footer-brand ${outfit.className}`}>protocolLM</div>
          <div className="footer-sub">Local-first compliance workflows for food service.</div>
        </div>
        <div className={`footer-right ${inter.className}`}>
          <a className="footer-link" href="#features">Features</a>
          <a className="footer-link" href="#console">Console</a>
          <a className="footer-link" href="#pricing">Pricing</a>
        </div>
      </div>
    </footer>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Authenticated Home (simple placeholder)
   - Keeps sign out
   - You can swap this with your full app UI later
   ────────────────────────────────────────────────────────────────────────────── */

function AuthedHome({ user, onSignOut }) {
  return (
    <main className="main">
      <section className="authed">
        <div className="container">
          <div className="authed-card">
            <div className="authed-card-border" />
            <div className="authed-card-inner">
              <div className={`authed-title ${outfit.className}`}>Compliance Console</div>
              <div className={`authed-sub ${inter.className}`}>
                Signed in as <span className="mono">{user?.email}</span>
              </div>

              <div className="authed-actions">
                <Link className={`btn btn-solid ${inter.className}`} href="/app">
                  Launch Console
                </Link>
                <button className={`btn btn-ghost ${inter.className}`} onClick={onSignOut}>
                  Sign out
                </button>
              </div>

              <div className={`authed-note ${inter.className}`}>
                If your console lives on <span className="mono">/app</span>, this link will take you there.
                If it’s on a different route, change it here (only page.js).
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Auth Modal
   - Email/password sign-in + sign-up
   - Keeps “Sign in” present as requested
   ────────────────────────────────────────────────────────────────────────────── */

function AuthModal({ open, mode, setMode, onClose, supabase }) {
  const { executeRecaptcha } = useRecaptcha?.() || {}
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const modalRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setError('')
    setBusy(false)
    setPassword('')
    // keep email for convenience
  }, [open])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const submit = useCallback(
    async (e) => {
      e.preventDefault()
      setError('')
      setBusy(true)

      try {
        // optional recaptcha (won't break if your hook returns nothing)
        if (executeRecaptcha) {
          try {
            await executeRecaptcha(mode === 'signup' ? 'signup' : 'signin')
          } catch {
            // ignore: fail-open if recaptcha isn't critical
          }
        }

        if (!email || !password) {
          throw new Error('Enter an email and password.')
        }

        if (mode === 'signin') {
          const { error: err } = await supabase.auth.signInWithPassword({ email, password })
          if (err) throw err
          onClose?.()
        } else {
          const { error: err } = await supabase.auth.signUp({ email, password })
          if (err) throw err
          onClose?.()
        }
      } catch (err) {
        setError(err?.message || 'Authentication failed.')
      } finally {
        setBusy(false)
      }
    },
    [email, password, mode, supabase, executeRecaptcha, onClose]
  )

  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal" ref={modalRef}>
        <div className="modal-header">
          <div className={`modal-title ${outfit.className}`}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={submit}>
          <label className={`field ${inter.className}`}>
            <span className="label">Email</span>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              type="email"
              autoComplete="email"
            />
          </label>

          <label className={`field ${inter.className}`}>
            <span className="label">Password</span>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {error ? <div className={`modal-error ${inter.className}`}>{error}</div> : null}

          <button className={`btn btn-solid w-full ${inter.className}`} disabled={busy} type="submit">
            {busy ? (mode === 'signin' ? 'Signing in…' : 'Creating…') : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>

          <div className={`modal-switch ${inter.className}`}>
            {mode === 'signin' ? (
              <>
                New here?{' '}
                <button type="button" className="linklike" onClick={() => setMode('signup')}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="linklike" onClick={() => setMode('signin')}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Reveal (scroll animation)
   - IntersectionObserver for clean, subtle motion
   ────────────────────────────────────────────────────────────────────────────── */

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShow(true)
            obs.disconnect()
          }
        })
      },
      { threshold: 0.15 }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${show ? 'in' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   Global Styles
   - Fixes: logo sizing + broken border-bottom in user menu header (kept for safety)
   - Console docs scroller forced LIGHT
   ────────────────────────────────────────────────────────────────────────────── */

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --bg: #ffffff;
        --ink: #111111;
        --muted: rgba(17, 17, 17, 0.65);

        --card: rgba(255, 255, 255, 0.72);
        --card-strong: rgba(255, 255, 255, 0.92);
        --border: rgba(17, 17, 17, 0.10);
        --border-strong: rgba(17, 17, 17, 0.18);

        --shadow: 0 18px 50px rgba(0, 0, 0, 0.10);
        --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.08);

        --radius: 18px;
        --radius-lg: 22px;

        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }

      * { box-sizing: border-box; }
      html, body { padding: 0; margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      button { font: inherit; }
      .mono { font-family: var(--mono); }

      .page {
        min-height: 100vh;
        background: radial-gradient(1200px 600px at 20% -10%, rgba(0,0,0,0.06), transparent 60%),
                    radial-gradient(900px 500px at 90% 10%, rgba(0,0,0,0.05), transparent 60%),
                    linear-gradient(#ffffff, #fbfbfb);
      }

      /* Boot */
      .boot {
        min-height: 100vh;
        display: grid;
        place-items: center;
        gap: 10px;
        text-align: center;
      }
      .boot-title { font-size: 28px; letter-spacing: -0.02em; }
      .boot-sub { color: var(--muted); }

      /* Header */
      .header {
        position: sticky;
        top: 0;
        z-index: 50;
        backdrop-filter: blur(14px);
        background: rgba(255,255,255,0.65);
        border-bottom: 1px solid rgba(17,17,17,0.06);
      }

      .header-inner {
        max-width: 1100px;
        margin: 0 auto;
        padding: 14px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .logo { display: inline-flex; align-items: center; gap: 10px; }
      .logo-text {
        font-size: 24px; /* bigger top-left protocolLM */
        letter-spacing: -0.02em;
        line-height: 1;
      }

      .nav {
        display: none;
        align-items: center;
        gap: 18px;
      }
      @media (min-width: 900px) {
        .nav { display: flex; }
      }
      .nav-link {
        color: rgba(17,17,17,0.75);
        font-size: 14px;
      }
      .nav-link:hover { color: rgba(17,17,17,0.95); }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .user-pill {
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.7);
        padding: 8px 10px;
        border-radius: 999px;
        font-size: 12px;
        color: rgba(17,17,17,0.75);
      }

      .header-glow {
        position: absolute;
        inset: -40px 0 auto 0;
        height: 80px;
        background: radial-gradient(700px 120px at 50% 0%, rgba(0,0,0,0.06), transparent 60%);
        pointer-events: none;
      }

      /* Main */
      .main { padding-bottom: 40px; }
      .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

      /* Buttons */
      .btn {
        border-radius: 999px;
        border: 1px solid transparent;
        padding: 10px 14px;
        font-size: 14px;
        cursor: pointer;
        transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        will-change: transform;
      }
      .btn:active { transform: translateY(1px); }
      .btn-ghost {
        background: rgba(255,255,255,0.0);
        border-color: rgba(17,17,17,0.10);
        color: rgba(17,17,17,0.85);
      }
      .btn-ghost:hover {
        background: rgba(17,17,17,0.03);
        border-color: rgba(17,17,17,0.16);
      }
      .btn-solid {
        background: rgba(17,17,17,0.92);
        color: #fff;
        box-shadow: 0 12px 26px rgba(0,0,0,0.14);
      }
      .btn-solid:hover {
        background: rgba(17,17,17,0.98);
        box-shadow: 0 18px 40px rgba(0,0,0,0.16);
      }
      .w-full { width: 100%; }

      /* Hero */
      .hero { position: relative; padding: 56px 0 26px; }
      .hero-bg {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(900px 500px at 20% 10%, rgba(0,0,0,0.06), transparent 60%),
          radial-gradient(700px 400px at 90% 0%, rgba(0,0,0,0.05), transparent 60%);
        pointer-events: none;
      }
      .hero-inner {
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 24px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 26px;
        align-items: center;
      }
      @media (min-width: 980px) {
        .hero-inner { grid-template-columns: 1.05fr 0.95fr; }
      }

      .hero-kicker {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(17,17,17,0.65);
        margin-bottom: 10px;
      }
      .hero-title {
        font-size: 40px;
        letter-spacing: -0.03em;
        line-height: 1.05;
        margin: 0 0 12px;
      }
      @media (min-width: 980px) {
        .hero-title { font-size: 46px; }
      }
      .hero-subtitle {
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
        color: rgba(17,17,17,0.70);
        max-width: 54ch;
      }

      .hero-cta { display: flex; gap: 12px; margin-top: 18px; flex-wrap: wrap; }
      .hero-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }
      .stat {
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.65);
        border-radius: 16px;
        padding: 12px 12px;
      }
      .stat-value { font-size: 14px; letter-spacing: -0.01em; }
      .stat-label { margin-top: 2px; font-size: 12px; color: rgba(17,17,17,0.62); }

      /* Terminal Card */
      .terminal-wrap { position: relative; }
      .terminal-border {
        position: absolute;
        inset: -1px;
        border-radius: var(--radius-lg);
        background: linear-gradient(135deg, rgba(17,17,17,0.18), rgba(17,17,17,0.06));
        filter: blur(0px);
        pointer-events: none;
      }
      .terminal {
        position: relative;
        border-radius: var(--radius-lg);
        background: rgba(255,255,255,0.70);
        border: 1px solid rgba(17,17,17,0.12);
        box-shadow: var(--shadow);
        overflow: hidden;
      }
      .terminal-top {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(17,17,17,0.08);
        background: rgba(255,255,255,0.85);
      }
      .dot { width: 10px; height: 10px; border-radius: 50%; opacity: 0.85; }
      .dot-r { background: rgba(255, 80, 80, 0.95); }
      .dot-y { background: rgba(255, 200, 80, 0.95); }
      .dot-g { background: rgba(100, 220, 140, 0.95); }
      .terminal-title { margin-left: 8px; font-size: 12px; color: rgba(17,17,17,0.72); }

      .terminal-body {
        padding: 14px 14px 16px;
        font-family: var(--mono);
        font-size: 12px;
        line-height: 1.55;
        color: rgba(17,17,17,0.86);
      }
      .tline { margin: 2px 0; }
      .tdim { color: rgba(17,17,17,0.55); margin-right: 6px; }
      .tspacer { height: 10px; }

      /* Sections */
      .section-head { margin-bottom: 18px; }
      .section-label {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.70);
        font-size: 12px;
        color: rgba(17,17,17,0.70);
        letter-spacing: 0.03em;
      }
      .section-title {
        margin: 10px 0 8px;
        font-size: 28px;
        letter-spacing: -0.02em;
        line-height: 1.15;
      }
      .section-desc {
        margin: 0;
        color: rgba(17,17,17,0.70);
        max-width: 65ch;
        line-height: 1.6;
        font-size: 15px;
      }

      /* Features */
      .features { padding: 60px 0; }
      .feature-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin-top: 18px;
      }
      @media (min-width: 900px) {
        .feature-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      }

      .feature-card { position: relative; border-radius: var(--radius); overflow: hidden; }
      .feature-card-border {
        position: absolute;
        inset: -1px;
        border-radius: var(--radius);
        background: linear-gradient(135deg, rgba(17,17,17,0.16), rgba(17,17,17,0.06));
        pointer-events: none;
      }
      .feature-card-inner {
        position: relative;
        border-radius: var(--radius);
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(17,17,17,0.10);
        box-shadow: var(--shadow-soft);
        padding: 16px 16px;
        min-height: 118px;
      }
      .feature-title { font-size: 16px; letter-spacing: -0.01em; margin-bottom: 8px; }
      .feature-desc { font-size: 14px; line-height: 1.55; color: rgba(17,17,17,0.70); }

      /* Console */
      .console { padding: 64px 0; }
      .console-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin-top: 18px;
      }
      @media (min-width: 980px) {
        .console-grid {
          grid-template-columns: 1.1fr 0.9fr;
          grid-template-rows: auto auto;
          align-items: stretch;
        }
        .console-output { grid-column: 1; grid-row: 1 / span 2; }
        .console-docs { grid-column: 2; grid-row: 1; }
        .console-modules { grid-column: 2; grid-row: 2; }
      }

      .console-card { position: relative; border-radius: var(--radius); overflow: hidden; }
      .console-card-border {
        position: absolute;
        inset: -1px;
        border-radius: var(--radius);
        background: linear-gradient(135deg, rgba(17,17,17,0.16), rgba(17,17,17,0.06));
        pointer-events: none;
      }
      .console-card-inner {
        position: relative;
        border-radius: var(--radius);
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(17,17,17,0.10);
        box-shadow: var(--shadow-soft);
        padding: 16px 16px;
      }

      .console-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .console-kicker { font-size: 12px; color: rgba(17,17,17,0.72); }
      .console-subtle { font-size: 12px; color: rgba(17,17,17,0.55); }

      .console-pill {
        font-size: 12px;
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.80);
        color: rgba(17,17,17,0.70);
        padding: 6px 10px;
        border-radius: 999px;
        white-space: nowrap;
      }

      .console-window {
        border-radius: 14px;
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.85);
        padding: 12px 12px;
        font-family: var(--mono);
        font-size: 12px;
        line-height: 1.6;
        color: rgba(17,17,17,0.90);
      }
      .cline { margin: 4px 0; }
      .cdim { color: rgba(17,17,17,0.55); margin-right: 6px; }

      .console-divider {
        height: 1px;
        background: rgba(17,17,17,0.10);
        margin: 10px 0;
      }

      /* Documentation scroller — forced LIGHT */
      .doc-scroller {
        position: relative;
        height: 210px;
        border-radius: 14px;
        border: 1px solid rgba(17,17,17,0.10);
        background: #ffffff; /* forced */
        overflow: hidden;
      }
      .doc-track {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        animation: docScroll 18s linear infinite;
      }
      .doc-item {
        background: rgba(17,17,17,0.03);
        border: 1px solid rgba(17,17,17,0.08);
        color: rgba(17,17,17,0.78);
        border-radius: 12px;
        padding: 10px 10px;
        font-size: 12px;
        line-height: 1.45;
      }
      @keyframes docScroll {
        0% { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }

      .modules-list { display: grid; gap: 10px; margin-top: 8px; }
      .module-row {
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.85);
        border-radius: 14px;
        padding: 10px 10px;
      }
      .module-name { font-size: 13px; letter-spacing: -0.01em; }
      .module-desc { margin-top: 4px; font-size: 12px; color: rgba(17,17,17,0.68); line-height: 1.5; }

      .console-footnote {
        margin-top: 10px;
        color: rgba(17,17,17,0.62);
        font-size: 12px;
        line-height: 1.5;
      }

      /* Pricing */
      .pricing { padding: 64px 0 72px; }
      .billing-toggle {
        display: inline-flex;
        margin-top: 16px;
        border-radius: 999px;
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.70);
        overflow: hidden;
      }
      .toggle {
        padding: 10px 14px;
        border: 0;
        background: transparent;
        cursor: pointer;
        font-size: 13px;
        color: rgba(17,17,17,0.70);
      }
      .toggle.active {
        background: rgba(17,17,17,0.92);
        color: #fff;
      }

      .pricing-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin-top: 18px;
        align-items: start;
      }
      @media (min-width: 980px) {
        .pricing-grid { grid-template-columns: 0.95fr 1.05fr; }
      }

      .price-card, .side-card { position: relative; border-radius: var(--radius); overflow: hidden; }
      .price-card-border, .side-card-border {
        position: absolute;
        inset: -1px;
        border-radius: var(--radius);
        background: linear-gradient(135deg, rgba(17,17,17,0.16), rgba(17,17,17,0.06));
        pointer-events: none;
      }
      .price-card-inner, .side-card-inner {
        position: relative;
        border-radius: var(--radius);
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(17,17,17,0.10);
        box-shadow: var(--shadow-soft);
        padding: 18px 18px;
      }

      .price-title { font-size: 18px; letter-spacing: -0.01em; }
      .price-sub { margin-top: 4px; color: rgba(17,17,17,0.65); font-size: 13px; }
      .price-amount {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-top: 14px;
        margin-bottom: 12px;
      }
      .price-dollar { font-size: 18px; }
      .price-number { font-size: 44px; letter-spacing: -0.03em; line-height: 1; }
      .price-term { color: rgba(17,17,17,0.65); font-size: 14px; }

      .price-list {
        margin: 0 0 14px;
        padding-left: 18px;
        color: rgba(17,17,17,0.70);
        line-height: 1.6;
        font-size: 14px;
      }

      .price-error {
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(220, 38, 38, 0.20);
        background: rgba(220, 38, 38, 0.06);
        color: rgba(220, 38, 38, 0.90);
        font-size: 13px;
      }

      .price-note {
        margin-top: 12px;
        font-size: 12px;
        color: rgba(17,17,17,0.55);
      }

      .side-title { font-size: 18px; letter-spacing: -0.01em; }
      .side-desc { margin: 10px 0 12px; color: rgba(17,17,17,0.70); line-height: 1.6; font-size: 14px; }
      .side-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      @media (min-width: 700px) {
        .side-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      .side-item {
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.85);
        border-radius: 14px;
        padding: 12px 12px;
      }
      .side-k { font-size: 14px; }
      .side-v { margin-top: 6px; color: rgba(17,17,17,0.66); font-size: 13px; line-height: 1.5; }
      .side-foot { margin-top: 12px; color: rgba(17,17,17,0.60); font-size: 12px; line-height: 1.5; }

      /* Footer */
      .footer { padding: 34px 0 60px; border-top: 1px solid rgba(17,17,17,0.06); }
      .footer-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
      .footer-brand { font-size: 16px; letter-spacing: -0.01em; }
      .footer-sub { margin-top: 6px; color: rgba(17,17,17,0.62); font-size: 13px; }
      .footer-right { display: flex; gap: 14px; }
      .footer-link { color: rgba(17,17,17,0.70); font-size: 13px; }
      .footer-link:hover { color: rgba(17,17,17,0.95); }

      /* Authed */
      .authed { padding: 70px 0; }
      .authed-card { position: relative; border-radius: var(--radius); overflow: hidden; }
      .authed-card-border {
        position: absolute; inset: -1px; border-radius: var(--radius);
        background: linear-gradient(135deg, rgba(17,17,17,0.16), rgba(17,17,17,0.06));
        pointer-events: none;
      }
      .authed-card-inner {
        position: relative; border-radius: var(--radius);
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(17,17,17,0.10);
        box-shadow: var(--shadow-soft);
        padding: 20px 20px;
      }
      .authed-title { font-size: 22px; letter-spacing: -0.02em; margin-bottom: 6px; }
      .authed-sub { color: rgba(17,17,17,0.70); }
      .authed-actions { margin-top: 14px; display: flex; gap: 12px; flex-wrap: wrap; }
      .authed-note { margin-top: 12px; color: rgba(17,17,17,0.58); font-size: 12px; line-height: 1.5; }

      /* Modal */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(0,0,0,0.42);
        display: grid;
        place-items: center;
        padding: 22px;
      }
      .modal {
        width: 100%;
        max-width: 420px;
        border-radius: 18px;
        background: rgba(255,255,255,0.90);
        border: 1px solid rgba(17,17,17,0.12);
        box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        overflow: hidden;
      }
      .modal-header {
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(17,17,17,0.08);
        background: rgba(255,255,255,0.92);
      }
      .modal-title { font-size: 18px; letter-spacing: -0.01em; }
      .modal-x {
        border: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.65);
        border-radius: 10px;
        padding: 6px 8px;
        cursor: pointer;
        color: rgba(17,17,17,0.75);
      }
      .modal-body { padding: 14px 16px 16px; display: grid; gap: 12px; }
      .field { display: grid; gap: 6px; }
      .label { font-size: 12px; color: rgba(17,17,17,0.65); }
      .input {
        border-radius: 12px;
        border: 1px solid rgba(17,17,17,0.12);
        background: rgba(255,255,255,0.95);
        padding: 10px 12px;
        outline: none;
        color: rgba(17,17,17,0.90);
      }
      .input:focus {
        border-color: rgba(17,17,17,0.22);
        box-shadow: 0 0 0 4px rgba(17,17,17,0.06);
      }
      .modal-error {
        border-radius: 12px;
        border: 1px solid rgba(220, 38, 38, 0.20);
        background: rgba(220, 38, 38, 0.06);
        color: rgba(220, 38, 38, 0.90);
        padding: 10px 12px;
        font-size: 13px;
      }
      .modal-switch {
        margin-top: 2px;
        font-size: 13px;
        color: rgba(17,17,17,0.65);
      }
      .linklike {
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
        color: rgba(17,17,17,0.90);
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      /* Reveal */
      .reveal {
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 520ms ease, transform 520ms ease;
      }
      .reveal.in {
        opacity: 1;
        transform: translateY(0);
      }

      /* Safety fix for a common broken CSS line you mentioned elsewhere */
      .user-menu-header {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(17,17,17,0.10);
        background: rgba(255,255,255,0.85);
      }
    `}</style>
  )
}
