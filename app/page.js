'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

// 1. TYPOGRAPHY SETUP
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// eslint-disable-next-line no-unused-vars
const isAdmin = false

// 2. FULL ICON SET
const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
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
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Spark: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
      <path d="M5 14l.8 2.6L8.5 17l-2.7.9L5 20l-.8-2.1L1.5 17l2.7-.4L5 14z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Zap: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Eye: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  DollarSign: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Clock: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Document: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
}

// 3. BACKGROUND COMPONENT
function GradientBlurBackground() {
  return (
    <div className="gradient-bg-container">
      <div className="gradient-blob blob-1" />
      <div className="gradient-blob blob-2" />
      <div className="gradient-blob blob-3" />
      <div className="noise-overlay" />
    </div>
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

function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
  const [ref, inView] = useInViewOnce()
  return (
    <div
      ref={ref}
      className={`rv ${inView ? 'is-inview' : ''} rv-${direction} ${className}`}
      style={{ '--d': `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function CountUp({ value, prefix = '', suffix = '', duration = 2000, className = '', animate = true }) {
  const [ref, inView] = useInViewOnce({ threshold: 0.3 })
  const [n, setN] = useState(animate ? 0 : value)

  useEffect(() => {
    if (!animate) {
      setN(value)
      return
    }
    if (!inView) return
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

  return (
    <span ref={ref} className={className}>
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  )
}

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
    <div className="smart-progress">
      <div className={`smart-progress-header ${inter.className}`}>
        <span className="smart-progress-phase">{phase}</span>
        <span className="smart-progress-pct">{progress}%</span>
      </div>
      <div className="smart-progress-track">
        <div
          className="smart-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function FAQItem({ q, a, isOpen, onToggle, index }) {
  return (
    <Reveal delay={index * 80}>
      <div className={`faq-item ${isOpen ? 'is-open' : ''}`}>
        <button type="button" onClick={onToggle} className="faq-trigger" aria-expanded={isOpen}>
          <span className={`faq-question ${outfit.className}`}>{q}</span>
          <span className="faq-icon">
            <Icons.ChevronDown />
          </span>
        </button>
        <div className="faq-content">
          <div className={`faq-answer ${inter.className}`}>{a}</div>
        </div>
      </div>
    </Reveal>
  )
}

// 4. ANIMATED APP DEMO SIMULATION (The "Cohere-like" Video Replacement)
function AppSimulation() {
  // Steps: 0=Start, 1=Scanning, 2=Detected, 3=Thinking, 4=Answer
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Loop the simulation forever
    const times = [0, 2000, 4500, 6000, 7500] // Timeline in ms
    let timeoutId
    
    const runSequence = () => {
      setStep(0)
      timeoutId = setTimeout(() => setStep(1), times[1]) // Start Scan
      setTimeout(() => setStep(2), times[2]) // Detect Violation
      setTimeout(() => setStep(3), times[3]) // User asks
      setTimeout(() => setStep(4), times[4]) // AI Answers
      
      // Reset loop after 14s
      setTimeout(runSequence, 14000)
    }

    runSequence()
    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div className="app-sim-container">
      {/* Simulation Window Frame */}
      <div className="sim-window">
        <div className="sim-header">
          <div className="sim-dots">
            <div className="sim-dot red" />
            <div className="sim-dot yellow" />
            <div className="sim-dot green" />
          </div>
          <div className={`sim-title ${inter.className}`}>protocolLM Analysis Console</div>
        </div>

        <div className="sim-body">
          {/* Left: Vision Analysis */}
          <div className="sim-view-left">
            <div className="sim-camera-feed">
               {/* This represents the "Image" being analyzed */}
               <div className="sim-image-placeholder">
                  <div className={`sim-scan-line ${step >= 1 ? 'scanning' : ''}`} />
                  <Icons.Camera />
                  <span className={inter.className}>Walk-In Cooler #2</span>

                  {/* Detected Box (appears at step 2) */}
                  <div className={`sim-detection-box ${step >= 2 ? 'visible' : ''}`}>
                    <div className="sim-detection-label">
                      <Icons.AlertTriangle />
                      <span>Temp Risk</span>
                    </div>
                  </div>
               </div>
            </div>
            <div className="sim-camera-stats">
               <div className="sim-stat">
                 <span className="label">Status</span>
                 <span className={`value ${step >= 2 ? 'risk' : 'ok'}`}>
                   {step >= 2 ? 'VIOLATION FOUND' : 'Monitoring'}
                 </span>
               </div>
               <div className="sim-stat">
                 <span className="label">Code Set</span>
                 <span className="value">Washtenaw/FDA</span>
               </div>
            </div>
          </div>

          {/* Right: Text / Compliance Logic */}
          <div className="sim-view-right">
             <div className="sim-chat-feed">
                {/* 1. Initial State */}
                <div className={`sim-chat-bubble ai ${step >= 0 ? 'visible' : ''}`}>
                   <div className="sim-avatar">AI</div>
                   <div className="sim-text">
                     Analyzing walk-in cooler image for Washtenaw County compliance...
                   </div>
                </div>

                {/* 2. Detection Alert */}
                <div className={`sim-chat-bubble system ${step >= 2 ? 'visible' : ''}`}>
                   <Icons.AlertTriangle />
                   <div className="sim-text">
                     <strong>Priority Violation Detected</strong><br/>
                     Raw animal foods stored above ready-to-eat produce.
                   </div>
                </div>

                {/* 3. Suggested Fix */}
                <div className={`sim-chat-bubble ai ${step >= 4 ? 'visible' : ''}`}>
                   <div className="sim-avatar">AI</div>
                   <div className="sim-text">
                     <strong>Corrective Action:</strong> Move raw chicken to the bottom shelf immediately to prevent cross-contamination.<br/><br/>
                     <span className="sim-citation">Ref: Washtenaw Enf. 3-302.11 / MI Food Code</span>
                   </div>
                </div>
             </div>
             
             {/* Mock Input */}
             <div className="sim-input-area">
                <div className="sim-input-placeholder">
                   {step < 3 ? 'Analyzing image...' : step === 3 ? 'Generating fix...' : 'Analysis complete'}
                </div>
                <div className="sim-send-icon">
                   <Icons.ArrowUp />
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Background Glow for Video Container */}
      <div className="sim-glow" />
    </div>
  )
}

// 5. LANDING PAGE COMPONENT
function LandingPage({ onShowPricing, onShowAuth }) {
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = useMemo(
    () => [
      {
        q: 'Is this only for Washtenaw County?',
        a: 'Yes. The database and guidance are built specifically around Washtenaw County enforcement patterns and the codes your inspector expects.',
      },
      {
        q: 'What should my team upload for photo checks?',
        a: 'Walk-ins, prep tables, hot/cold holding, dish area, labels, storage order, and any "does this look right?" moments mid-shift.',
      },
      {
        q: 'How should we use the document side?',
        a: "Ask short, operational questions. You'll get answers grounded in local enforcement actions plus the relevant food-code sources.",
      },
      {
        q: 'Is usage limited?',
        a: 'No. The plan is unlimited for text questions and photo checks for your licensed location.',
      },
      {
        q: 'Will it replace training or a manager?',
        a: "No. It's a fast second set of eyes and a reference console—meant to help you verify and fix issues earlier.",
      },
      {
        q: 'How often should my team use it?',
        a: 'Teams usually run checks before inspection windows, after onboarding new staff, and whenever something looks off during a shift.',
      },
    ],
    []
  )

  const features = useMemo(
    () => [
      {
        icon: <Icons.Eye />,
        title: 'Visual Compliance Analysis',
        description: 'Upload photos of any kitchen station and receive instant feedback on potential violations before inspectors arrive.',
      },
      {
        icon: <Icons.Document />,
        title: 'Local Regulation Database',
        description: 'Search Washtenaw County food regulation documents alongside Michigan Food Code requirements for context-aware answers.',
      },
      {
        icon: <Icons.Zap />,
        title: 'Real-time Guidance',
        description: 'Get actionable fixes in plain language, not legal jargon. Purpose-built for line staff and shift managers.',
      },
    ],
    []
  )

  const complianceRisks = useMemo(
    () => [
      { 
        label: 'Average fine per critical violation', 
        value: 500, 
        prefix: '$',
        suffix: '+',
        icon: <Icons.DollarSign />
      },
      { 
        label: 'Foodborne illness cost per incident', 
        value: 75000, 
        prefix: '$',
        suffix: '',
        icon: <Icons.AlertTriangle />
      },
      { 
        label: 'Revenue loss during closure', 
        value: 10000, 
        prefix: '$',
        suffix: '+',
        icon: <Icons.TrendingUp />
      },
      { 
        label: 'Repeat violations in first year', 
        value: 38, 
        prefix: '',
        suffix: '%',
        icon: <Icons.Clock />
      },
    ],
    []
  )

  const proofPoints = useMemo(
    () => [
      { value: '24/7', label: 'availability', isText: true },
      { value: 7, label: 'day free trial' },
      { value: 'Unlimited', label: 'photo checks', isText: true },
    ],
    []
  )

  return (
    <div className="landing-wrapper">
      <GradientBlurBackground />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <Reveal delay={0}>
              <div className="hero-badge">
                <span className={inter.className}>Washtenaw County Food Safety Intelligence</span>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className={`hero-title ${outfit.className}`}>
                Catch violations
                <br />
                <span className="hero-title-italic">before the inspector does</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className={`hero-description ${inter.className}`}>
                Upload photos of your kitchen and get instant AI analysis that spots potential 
                violations before they become citations. Built specifically for Washtenaw County 
                food code requirements.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="hero-actions">
                <button onClick={onShowPricing} className="btn-hero-primary">
                  <span className={`btn-label ${inter.className}`}>Start 7-day free trial</span>
                  <span className="btn-icon-right">
                    <Icons.ArrowRight />
                  </span>
                </button>
                <button onClick={onShowAuth} className="btn-hero-secondary">
                  <span className={`btn-label ${inter.className}`}>Sign in</span>
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={400} direction="scale">
            {/* Replaced static video tag with the AppSimulation component */}
            <div className="hero-video-wrapper">
               <AppSimulation />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="proof-section">
        <div className="proof-container">
          <Reveal>
            <div className="proof-grid">
              {proofPoints.map((point, i) => (
                <div key={i} className="proof-item">
                  <div className={`proof-value ${outfit.className}`}>
                    {point.isText ? (
                      point.value
                    ) : (
                      <CountUp value={point.value} prefix={point.prefix || ''} />
                    )}
                  </div>
                  <div className={`proof-label ${inter.className}`}>{point.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <Reveal>
            <div className="section-header">
              <span className={`section-label ${inter.className}`}>Capabilities</span>
              <h2 className={`section-title ${outfit.className}`}>
                Built for real kitchen operations
              </h2>
              <p className={`section-description ${inter.className}`}>
                Not a generic chatbot. Purpose-built workflows for photo checks, 
                quick regulatory answers, and building consistent compliance habits.
              </p>
            </div>
          </Reveal>

          <div className="features-grid">
            {features.map((feature, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <h3 className={`feature-title ${outfit.className}`}>{feature.title}</h3>
                  <p className={`feature-description ${inter.className}`}>{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Risk/Value Section */}
      <section className="risk-section">
        <div className="risk-container">
          <Reveal>
            <div className="section-header">
              <span className={`section-label ${inter.className}`}>Why it matters</span>
              <h2 className={`section-title ${outfit.className}`}>
                The real cost of non-compliance
              </h2>
              <p className={`section-description ${inter.className}`}>
                One serious violation can cost more than years of prevention. 
                These figures represent documented industry averages.
              </p>
            </div>
          </Reveal>

          <div className="risk-grid">
            {complianceRisks.map((risk, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="risk-card">
                  <div className="risk-icon">
                    {risk.icon}
                  </div>
                  <div className={`risk-value ${outfit.className}`}>
                    <CountUp 
                      value={risk.value} 
                      prefix={risk.prefix} 
                      suffix={risk.suffix}
                      duration={2500}
                    />
                  </div>
                  <div className={`risk-label ${inter.className}`}>{risk.label}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={400}>
            <p className={`risk-sources ${inter.className}`}>
              Sources: FDA Model Food Code (2022), CDC Foodborne Illness Economic Burden Report (2024), 
              National Restaurant Association compliance surveys
            </p>
          </Reveal>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="pricing-container">
          <Reveal>
            <div className="section-header">
              <span className={`section-label ${inter.className}`}>Simple pricing</span>
              <h2 className={`section-title ${outfit.className}`}>
                One plan, unlimited usage
              </h2>
              <p className={`section-description ${inter.className}`}>
                Full access for your entire team at one location. 
                No per-seat fees, no hidden costs, no usage limits.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="pricing-card">
              <div className="pricing-card-inner">
                <div className="pricing-badge-wrapper">
                  <div className="pricing-badge">
                    <span className={inter.className}>Site License</span>
                  </div>
                </div>

                <div className="pricing-amount">
                  <span className={`pricing-currency ${inter.className}`}>$</span>
                  <span className={`pricing-number ${outfit.className}`}>200</span>
                  <span className={`pricing-period ${inter.className}`}>/month</span>
                </div>

                <p className={`pricing-annual ${inter.className}`}>
                  or $2,000/year <span className="pricing-savings">(save $400)</span>
                </p>

                <div className="pricing-features">
                  {[
                    'Unlimited photo compliance checks',
                    'Unlimited regulatory questions',
                    'Washtenaw-specific guidance',
                    'Full team access included',
                    '7-day free trial to start',
                    'Cancel anytime, no questions',
                  ].map((feature, i) => (
                    <div key={i} className={`pricing-feature ${inter.className}`}>
                      <span className="pricing-check">
                        <Icons.Check />
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pricing-cta">
                  <button onClick={onShowPricing} className="btn-pricing-primary">
                    <span className={`btn-label ${inter.className}`}>Start free trial</span>
                    <Icons.ArrowRight />
                  </button>
                </div>

                <p className={`pricing-note ${inter.className}`}>
                  No credit card required to start your trial
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-container">
          <Reveal>
            <div className="section-header">
              <span className={`section-label ${inter.className}`}>Questions</span>
              <h2 className={`section-title ${outfit.className}`}>
                Frequently asked
              </h2>
            </div>
          </Reveal>

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
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <Reveal>
            <div className="cta-content">
              <h2 className={`cta-title ${outfit.className}`}>
                Ready to catch issues before&nbsp;they&nbsp;cost&nbsp;you?
              </h2>
              <p className={`cta-description ${inter.className}`}>
                Setup takes less than 2 minutes. Give your team a faster way to 
                verify compliance and fix problems before inspection day.
              </p>
              <div className="cta-actions">
                <button onClick={onShowPricing} className="btn-cta-primary">
                  <span className={`btn-label ${inter.className}`}>Start 7-day free trial</span>
                  <Icons.ArrowRight />
                </button>
                <button onClick={onShowAuth} className="btn-cta-secondary">
                  <span className={`btn-label ${inter.className}`}>Sign in to dashboard</span>
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-links">
            <Link href="/terms" className={`footer-link ${inter.className}`}>Terms of Service</Link>
            <Link href="/privacy" className={`footer-link ${inter.className}`}>Privacy Policy</Link>
            <Link href="/contact" className={`footer-link ${inter.className}`}>Contact</Link>
          </div>
          <p className={`footer-api-note ${inter.className}`}>
            Powered by Anthropic Claude and Cohere APIs. Not affiliated with or endorsed by Anthropic or Cohere.
          </p>
          <p className={`footer-copyright ${inter.className}`}>
            © 2025 protocolLM. Made in Washtenaw for Washtenaw.
          </p>
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card">
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <Icons.X />
          </button>

          <div className="modal-header">
            <div className="modal-icon">
              {mode === 'reset' ? <Icons.Lock /> : <Icons.Shield />}
            </div>
            <h2 className={`modal-title ${outfit.className}`}>
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`modal-subtitle ${inter.className}`}>
              {mode === 'signin' && 'Sign in to access your compliance dashboard'}
              {mode === 'signup' && 'Start your 7-day free trial today'}
              {mode === 'reset' && "Enter your email and we'll send reset instructions"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-field">
              <label className={`form-label ${inter.className}`}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                required
                className={`form-input ${inter.className}`}
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="form-field">
                <label className={`form-label ${inter.className}`}>Password</label>
                <div className="form-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className={`form-input ${inter.className}`}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`form-toggle ${inter.className}`}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="btn-form-submit"
            >
              {loading && <span className="btn-spinner" />}
              <span className={`btn-label ${inter.className}`}>
                {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </span>
            </button>
          </form>

          {message && (
            <div className={`modal-alert ${messageKind}`}>
              <span className="alert-icon">
                {messageKind === 'err' ? <Icons.X /> : messageKind === 'ok' ? <Icons.Check /> : <Icons.Spark />}
              </span>
              <span className={`alert-text ${inter.className}`}>{message}</span>
            </div>
          )}

          <div className="modal-footer">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className={`modal-link ${inter.className}`}
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`modal-link ${inter.className}`}
                >
                  Need an account? <strong>Sign up free</strong>
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`modal-link ${inter.className}`}
              >
                Already have an account? <strong>Sign in</strong>
              </button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`modal-link ${inter.className}`}
              >
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper modal-wrapper-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card">
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <Icons.X />
          </button>

          <div className="modal-header">
            <div className="pricing-modal-badge">
              <Icons.Shield />
              <span className={inter.className}>Site License</span>
            </div>
            <h2 className={`modal-title ${outfit.className}`}>protocolLM Access</h2>
            <p className={`modal-subtitle ${inter.className}`}>
              Unlimited photo checks and regulatory search for your entire team
            </p>
          </div>

          <div className="pricing-modal-amount">
            <span className={`pricing-currency ${inter.className}`}>$</span>
            <span className={`pricing-number-lg ${outfit.className}`}>200</span>
            <span className={`pricing-period ${inter.className}`}>/month</span>
          </div>

          <div className="pricing-modal-features">
            {['Unlimited photo checks', 'Unlimited questions', 'Washtenaw-focused', 'Full team access'].map((f, i) => (
              <div key={i} className={`pricing-modal-feature ${inter.className}`}>
                <Icons.Check />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="pricing-modal-actions">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading}
              className="btn-pricing-modal-primary"
            >
              {loading === 'monthly' && <span className="btn-spinner" />}
              <span className={`btn-label ${inter.className}`}>Start 7-day free trial</span>
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading}
              className="btn-pricing-modal-secondary"
            >
              {loading === 'annual' && <span className="btn-spinner" />}
              <span className={`btn-label ${inter.className}`}>Annual plan · $2,000/year</span>
              <span className={`btn-badge ${inter.className}`}>Save $400</span>
            </button>
          </div>

          <p className={`pricing-modal-note ${inter.className}`}>
            7-day free trial · Cancel anytime · One license per restaurant location
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
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner" />
          <span className={`loading-text ${inter.className}`}>Loading protocolLM...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════════
           COHERE-INSPIRED THEME (Sand / Charcoal / Coral)
           ═══════════════════════════════════════════════════════════════════════ */

        /* ─── Design Tokens ─── */
        :root {
          /* Core Colors - Warm Paper / Sand Backgrounds */
          --color-bg: #FDFBF7;
          --color-surface: #FFFFFF;
          --color-card: #F9F7F4;
          
          /* Borders */
          --color-border: #E6E4DF;
          --color-border-subtle: #F0EEE9;
          --color-border-hover: #D1CEC6;
          --color-border-focus: #191919;
          
          /* Text Colors - Sharp Charcoal/Black */
          --color-text: #191919;
          --color-text-secondary: #585858;
          --color-text-tertiary: #9CA3AF;
          --color-text-muted: #B8B8B8;
          
          /* Brand Colors */
          --color-primary: #191919; /* Sharp Black for primary actions */
          --color-primary-hover: #333333;
          --color-accent: #E86B58; /* Coral Accent (Cohere-like) */
          --color-accent-hover: #D65A48;
          --color-accent-light: #FDE8E4;
          
          /* Status Colors */
          --color-success: #10B981;
          --color-success-bg: #ECFDF5;
          --color-warning: #F59E0B;
          --color-warning-bg: #FFFBEB;
          --color-error: #EF4444;
          --color-error-bg: #FEF2F2;
          
          /* Shadows - Softer, diffused */
          --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
          --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
          --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
          --shadow-lg: 0 10px 25px rgba(0,0,0,0.08);
          --shadow-xl: 0 20px 40px rgba(0,0,0,0.1);
          --shadow-card: 0 4px 20px rgba(0,0,0,0.04);
          --shadow-card-hover: 0 12px 32px rgba(0,0,0,0.08);
          
          /* Radii */
          --radius-xs: 4px;
          --radius-sm: 8px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 20px;
          --radius-2xl: 32px;
          --radius-3xl: 40px;
          --radius-full: 9999px;
          
          /* Transitions */
          --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
          --duration-fast: 150ms;
          --duration-normal: 250ms;
          --duration-slow: 400ms;
          
          /* Z-index */
          --z-base: 0;
          --z-elevated: 10;
          --z-sticky: 100;
          --z-modal: 1000;
        }

        /* ─── Base Reset ─── */
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html {
          height: 100%;
          scroll-behavior: smooth;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          min-height: 100%;
          background: var(--color-bg);
          color: var(--color-text);
          overflow-x: hidden;
          line-height: 1.6;
        }

        ::selection {
          background: var(--color-accent-light);
          color: var(--color-accent);
        }

        /* ─── Scrollbar ─── */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-tertiary);
        }

        /* ─── Loading Screen ─── */
        .loading-screen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
          z-index: var(--z-modal);
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          font-size: 14px;
          color: var(--color-text-tertiary);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ─── App Container ─── */
        .app-container {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           BACKGROUND (Blurred Blobs)
           ═══════════════════════════════════════════════════════════════════════ */
        .gradient-bg-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .gradient-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: blobFloat 20s infinite alternate;
        }

        .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #F3E6D5; }
        .blob-2 { bottom: -10%; right: -10%; width: 60vw; height: 60vw; background: #E8F4F1; animation-delay: -5s; }
        .blob-3 { top: 40%; left: 40%; width: 40vw; height: 40vw; background: #FDE8E4; animation-delay: -10s; }

        .noise-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        @keyframes blobFloat { 0% { transform: translate(0,0); } 100% { transform: translate(30px, 50px); } }

        /* ═══════════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════════ */
        .app-header {
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          background: rgba(253, 251, 247, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @media (max-width: 640px) {
          .header-inner {
            padding: 12px 16px;
          }
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .logo {
          display: flex;
          align-items: baseline;
          text-decoration: none;
          transition: opacity var(--duration-fast) var(--ease-out-expo);
        }

        .logo:hover {
          opacity: 0.8;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--color-text);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-status {
          display: none;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-success);
          padding: 6px 14px;
          background: var(--color-success-bg);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-full);
        }

        @media (min-width: 1024px) {
          .header-status {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .header-status::before {
            content: '';
            width: 6px;
            height: 6px;
            background: var(--color-success);
            border-radius: 50%;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           BUTTONS
           ═══════════════════════════════════════════════════════════════════════ */
        .btn-hero-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 50px;
          padding: 0 32px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-md);
        }

        .btn-hero-primary:hover {
          background: #000;
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .btn-hero-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 50px;
          padding: 0 28px;
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border-hover);
          border-radius: 100px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
        }

        .btn-hero-secondary:hover {
          background: rgba(0,0,0,0.04);
          transform: translateY(-1px);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
          padding: 0 20px;
          background: var(--color-surface);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out-expo);
          box-shadow: var(--shadow-xs);
        }

        .btn-secondary:hover {
          background: var(--color-card);
          border-color: var(--color-border-hover);
        }

        .btn-icon {
          width: 44px;
          height: 44px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out-expo);
          box-shadow: var(--shadow-xs);
        }

        .btn-icon:hover {
          background: var(--color-card);
          color: var(--color-text);
          border-color: var(--color-border-hover);
        }

        .btn-icon-right {
          display: flex;
          transition: transform var(--duration-fast) var(--ease-out-expo);
        }

        .btn-hero-primary:hover .btn-icon-right {
          transform: translateX(3px);
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* ─── Avatar & User Menu ─── */
        .avatar-btn {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-full);
          background: var(--color-primary);
          color: white;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out-expo);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        .avatar-btn:hover {
          transform: scale(1.05);
          background: #000;
        }

        .user-menu-wrapper {
          position: relative;
        }

        .user-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 280px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          animation: menuReveal 200ms var(--ease-out-expo);
          transform-origin: top right;
          z-index: 100;
        }

        @keyframes menuReveal {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .user-menu-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border-subtle);
          background: var(--color-card);
        }

        .user-menu-email {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text);
          word-break: break-all;
        }

        .user-menu-status {
          font-size: 11px;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 4px;
        }

        .user-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: none;
          border: none;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out-expo);
          text-align: left;
        }

        .user-menu-item:hover {
          background: var(--color-card);
          color: var(--color-text);
        }

        .user-menu-item-icon {
          opacity: 0.6;
        }

        .user-menu-item-danger {
          color: var(--color-error);
        }

        .user-menu-item-danger:hover {
          background: var(--color-error-bg);
          color: var(--color-error);
        }

        .user-menu-divider {
          height: 1px;
          background: var(--color-border-subtle);
          margin: 4px 0;
        }

        .user-menu-footer {
          padding: 12px 20px;
          border-top: 1px solid var(--color-border-subtle);
          background: var(--color-card);
        }

        .user-menu-hint {
          font-size: 11px;
          color: var(--color-text-muted);
          text-align: center;
          display: block;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           LANDING PAGE ANIMATIONS
           ═══════════════════════════════════════════════════════════════════════ */
        .landing-wrapper {
          flex: 1;
          position: relative;
          overflow-x: hidden;
        }

        .rv {
          opacity: 0;
          transition: 
            opacity 700ms var(--ease-out-expo),
            transform 700ms var(--ease-out-expo);
          transition-delay: var(--d, 0ms);
          will-change: opacity, transform;
        }

        .rv-up {
          transform: translateY(32px);
        }

        .rv-scale {
          transform: scale(0.96);
        }

        .rv.is-inview {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           HERO SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .hero-section {
          position: relative;
          z-index: 1;
          padding: 80px 24px 100px;
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
        }

        @media (min-width: 1024px) {
          .hero-section {
            padding: 60px 48px 80px;
          }
        }

        .hero-container {
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 60px;
          align-items: center;
        }

        @media (min-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr 1.2fr;
            gap: 80px;
          }
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
          z-index: 2;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          background: #EEEAE4;
          border-radius: 100px;
          width: fit-content;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .hero-title {
          font-size: clamp(42px, 6vw, 68px);
          font-weight: 500;
          line-height: 1.05;
          letter-spacing: -0.035em;
          color: var(--color-text);
        }

        .hero-title-italic {
          font-family: 'Times New Roman', serif;
          font-style: italic;
          font-weight: 400;
        }

        .hero-description {
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-text-secondary);
          max-width: 520px;
        }

        @media (max-width: 640px) {
          .hero-description {
            font-size: 16px;
          }
        }

        .hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 8px;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           SIMULATED APP DEMO (THE "VIDEO" REPLACEMENT)
           ═══════════════════════════════════════════════════════════════════════ */
        .hero-video-wrapper {
          position: relative;
          width: 100%;
        }

        .app-sim-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16/10;
          border-radius: 20px;
          background: #000;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sim-glow {
          position: absolute;
          inset: -40px;
          background: radial-gradient(circle at center, rgba(232, 107, 88, 0.15) 0%, transparent 70%);
          z-index: -1;
          filter: blur(40px);
        }

        .sim-window {
          background: #191919;
          border-radius: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .sim-header {
          height: 40px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 16px;
        }

        .sim-dots {
          display: flex;
          gap: 6px;
        }

        .sim-dot { width: 10px; height: 10px; border-radius: 50%; opacity: 0.8; }
        .sim-dot.red { background: #FF5F56; }
        .sim-dot.yellow { background: #FFBD2E; }
        .sim-dot.green { background: #27C93F; }

        .sim-title {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
        }

        .sim-body {
          flex: 1;
          display: flex;
        }

        /* Sim Left: Camera */
        .sim-view-left {
          flex: 1;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          background: #111;
        }

        .sim-camera-feed {
          flex: 1;
          position: relative;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sim-image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #222 0%, #333 100%);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.2);
          font-size: 14px;
          gap: 12px;
          position: relative;
          overflow: hidden;
        }

        .sim-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--color-accent);
          box-shadow: 0 0 10px var(--color-accent);
          opacity: 0;
          z-index: 10;
        }

        .sim-scan-line.scanning {
          opacity: 1;
          animation: scanMove 2s linear infinite;
        }

        @keyframes scanMove {
          0% { top: 0; }
          100% { top: 100%; }
        }

        .sim-detection-box {
          position: absolute;
          top: 30%;
          left: 40%;
          width: 30%;
          height: 20%;
          border: 2px solid var(--color-error);
          border-radius: 4px;
          opacity: 0;
          transform: scale(0.9);
          transition: all 0.4s var(--ease-out-expo);
        }

        .sim-detection-box.visible {
          opacity: 1;
          transform: scale(1);
        }

        .sim-detection-label {
          position: absolute;
          top: -24px;
          left: -2px;
          background: var(--color-error);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .sim-camera-stats {
          height: 48px;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 24px;
          background: #151515;
        }

        .sim-stat {
          display: flex;
          flex-direction: column;
        }

        .sim-stat .label { font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase; }
        .sim-stat .value { font-size: 12px; color: white; font-weight: 500; }
        .sim-stat .value.risk { color: var(--color-error); }
        .sim-stat .value.ok { color: var(--color-success); }

        /* Sim Right: Chat */
        .sim-view-right {
          width: 45%;
          display: flex;
          flex-direction: column;
          background: #191919;
        }

        .sim-chat-feed {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .sim-chat-bubble {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.5;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.5s var(--ease-out-expo);
          display: flex;
          gap: 10px;
        }

        .sim-chat-bubble.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .sim-chat-bubble.ai {
          background: rgba(255,255,255,0.05);
          color: #eee;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .sim-chat-bubble.system {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .sim-avatar {
          width: 20px;
          height: 20px;
          background: var(--color-accent);
          border-radius: 4px;
          font-size: 9px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .sim-citation {
          display: block;
          margin-top: 8px;
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 6px;
        }

        .sim-input-area {
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sim-input-placeholder {
          flex: 1;
          height: 32px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        .sim-send-icon {
          width: 32px;
          height: 32px;
          background: var(--color-accent);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        @media (max-width: 640px) {
           .app-sim-container {
             aspect-ratio: 9/16;
           }
           .sim-body {
             flex-direction: column;
           }
           .sim-view-right {
             width: 100%;
             height: 50%;
           }
           .sim-view-left {
             border-right: none;
             border-bottom: 1px solid rgba(255,255,255,0.08);
           }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           PROOF SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .proof-section {
          position: relative;
          z-index: 1;
          padding: 0 24px 80px;
        }

        .proof-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .proof-grid {
          display: flex;
          justify-content: center;
          gap: 40px;
          flex-wrap: wrap;
          padding-top: 40px;
          border-top: 1px solid var(--color-border);
        }

        .proof-item {
          text-align: center;
          padding: 0 20px;
        }

        .proof-value {
          font-size: 36px;
          font-weight: 400; 
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 4px;
        }

        .proof-label {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-tertiary);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           SECTION STYLES
           ═══════════════════════════════════════════════════════════════════════ */
        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 60px;
          position: relative;
          z-index: 1;
        }

        .section-label {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-accent);
          margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--color-text);
          line-height: 1.15;
          margin-bottom: 16px;
        }

        .section-description {
          font-size: 16px;
          line-height: 1.7;
          color: var(--color-text-secondary);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FEATURES SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .features-section {
          position: relative;
          z-index: 1;
          padding: 100px 24px;
        }

        .features-container {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .feature-card {
          position: relative;
          padding: 32px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          transition: all var(--duration-slow) var(--ease-out-expo);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          min-height: 240px;
        }

        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-card-hover);
        }

        .feature-icon-wrapper {
          position: relative;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-card);
          border-radius: 12px;
          margin-bottom: 24px;
          color: var(--color-text);
        }

        .feature-title {
          font-size: 20px;
          font-weight: 500;
          color: var(--color-text);
          margin-bottom: 12px;
        }

        .feature-description {
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-text-secondary);
          flex: 1;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           RISK SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .risk-section {
          position: relative;
          z-index: 1;
          padding: 100px 24px;
          background: var(--color-card);
        }

        .risk-container {
          max-width: 1000px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .risk-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        @media (min-width: 768px) {
          .risk-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .risk-card {
          position: relative;
          padding: 24px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          text-align: center;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-xs);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .risk-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-card);
          border-radius: var(--radius-sm);
          margin-bottom: 16px;
          color: var(--color-text-secondary);
        }

        .risk-value {
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 8px;
        }

        .risk-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .risk-sources {
          text-align: center;
          font-size: 12px;
          color: var(--color-text-tertiary);
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           PRICING SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .pricing-section {
          position: relative;
          z-index: 1;
          padding: 100px 24px;
        }

        .pricing-container {
          max-width: 500px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .pricing-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .pricing-card-inner {
          position: relative;
          padding: 48px 40px;
          z-index: 1;
          background: var(--color-surface);
          text-align: center;
        }

        .pricing-badge-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .pricing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--color-accent-light);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-accent);
        }

        .pricing-amount {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 8px;
        }

        .pricing-currency {
          font-size: 24px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .pricing-number {
          font-size: 64px;
          font-weight: 500;
          letter-spacing: -0.04em;
          color: var(--color-text);
          line-height: 1;
        }

        .pricing-period {
          font-size: 16px;
          color: var(--color-text-tertiary);
          margin-left: 4px;
        }

        .pricing-annual {
          text-align: center;
          font-size: 14px;
          color: var(--color-text-tertiary);
          margin-bottom: 32px;
        }

        .pricing-savings {
          color: var(--color-success);
          font-weight: 600;
        }

        .pricing-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
          text-align: left;
          background: var(--color-card);
          padding: 24px;
          border-radius: 20px;
        }

        .pricing-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        .pricing-check {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 50%;
          color: var(--color-success);
          flex-shrink: 0;
        }

        .pricing-check svg {
          width: 12px;
          height: 12px;
        }

        .pricing-cta {
          margin-bottom: 16px;
        }

        .btn-pricing-primary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 52px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-md);
        }

        .btn-pricing-primary:hover {
          background: #000;
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .pricing-note {
          text-align: center;
          font-size: 13px;
          color: var(--color-text-muted);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FAQ SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .faq-section {
          position: relative;
          z-index: 1;
          padding: 80px 24px;
          background: var(--color-card);
        }

        .faq-container {
          max-width: 680px;
          margin: 0 auto;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          transition: all var(--duration-normal) var(--ease-out-expo);
        }

        .faq-item:hover {
          border-color: var(--color-border-hover);
        }

        .faq-item.is-open {
          border-color: var(--color-text);
        }

        .faq-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          background: none;
          border: none;
          color: var(--color-text);
          cursor: pointer;
          text-align: left;
        }

        .faq-question {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.4;
        }

        .faq-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-tertiary);
          transition: transform 0.2s;
        }

        .faq-item.is-open .faq-icon {
          transform: rotate(180deg);
          color: var(--color-text);
        }

        .faq-content {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows var(--duration-normal) var(--ease-out-expo);
        }

        .faq-item.is-open .faq-content {
          grid-template-rows: 1fr;
        }

        .faq-answer {
          overflow: hidden;
          padding: 0 24px;
          font-size: 15px;
          line-height: 1.7;
          color: var(--color-text-secondary);
        }

        .faq-item.is-open .faq-answer {
          padding: 0 24px 24px;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CTA SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .cta-section {
          position: relative;
          z-index: 1;
          padding: 100px 24px;
        }

        .cta-container {
          max-width: 660px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .cta-content {
          text-align: center;
        }

        .cta-title {
          font-size: clamp(32px, 4vw, 42px);
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 24px;
          line-height: 1.2;
        }

        .cta-description {
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-text-secondary);
          margin-bottom: 32px;
        }

        .cta-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-cta-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 52px;
          padding: 0 32px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 100px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-md);
        }

        .btn-cta-primary:hover {
          background: #000;
          transform: translateY(-2px);
        }

        .btn-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 52px;
          padding: 0 28px;
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border-hover);
          border-radius: 100px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
        }

        .btn-cta-secondary:hover {
          background: rgba(0,0,0,0.04);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FOOTER
           ═══════════════════════════════════════════════════════════════════════ */
        .landing-footer {
          position: relative;
          z-index: 1;
          padding: 48px 24px;
          border-top: 1px solid var(--color-border);
          background: var(--color-surface);
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-links {
          display: flex;
          gap: 24px;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .footer-link {
          font-size: 14px;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: var(--color-text);
        }

        .footer-api-note {
          font-size: 12px;
          color: var(--color-text-tertiary);
          margin-bottom: 12px;
        }

        .footer-copyright {
          font-size: 13px;
          color: var(--color-text-tertiary);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           MODALS
           ═══════════════════════════════════════════════════════════════════════ */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal);
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 200ms var(--ease-out-expo);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-wrapper {
          width: 100%;
          max-width: 440px;
          animation: modalSlideUp 300ms var(--ease-out-expo);
        }

        .modal-wrapper-lg {
          max-width: 500px;
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 24px;
          box-shadow: var(--shadow-xl);
          padding: 40px;
          overflow: hidden;
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 24px;
          }
        }

        .modal-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--color-text-tertiary);
          cursor: pointer;
          transition: color 0.2s;
          z-index: 10;
        }

        .modal-close-btn:hover {
          color: var(--color-text);
        }

        .modal-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .modal-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-card);
          border-radius: 12px;
          margin: 0 auto 16px;
          color: var(--color-text);
        }

        .modal-title {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 8px;
        }

        .modal-subtitle {
          font-size: 15px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .form-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text);
          font-size: 15px;
          transition: all var(--duration-fast) var(--ease-out-expo);
          outline: none;
        }

        .form-input::placeholder {
          color: var(--color-text-muted);
        }

        .form-input:focus {
          border-color: var(--color-text);
          background: white;
        }

        .form-input-group {
          position: relative;
        }

        .form-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--color-text-tertiary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .form-toggle:hover {
          color: var(--color-text);
        }

        .btn-form-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 48px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          margin-top: 8px;
        }

        .btn-form-submit:hover:not(:disabled) {
          background: #000;
          transform: translateY(-1px);
        }

        .btn-form-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          margin-top: 16px;
        }

        .modal-alert.ok {
          border-color: rgba(16, 185, 129, 0.3);
          background: var(--color-success-bg);
        }

        .modal-alert.err {
          border-color: rgba(239, 68, 68, 0.3);
          background: var(--color-error-bg);
        }

        .alert-icon {
          flex-shrink: 0;
          color: var(--color-text-secondary);
        }

        .modal-alert.ok .alert-icon {
          color: var(--color-success);
        }

        .modal-alert.err .alert-icon {
          color: var(--color-error);
        }

        .alert-text {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .modal-footer {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .modal-link {
          background: none;
          border: none;
          font-size: 14px;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: color 0.2s;
        }

        .modal-link:hover {
          color: var(--color-text);
        }

        .modal-link strong {
          color: var(--color-text);
          font-weight: 600;
        }

        /* ─── Pricing Modal ─── */
        .pricing-modal-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--color-accent-light);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
          margin-bottom: 16px;
        }

        .pricing-modal-amount {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 24px;
        }

        .pricing-number-lg {
          font-size: 64px;
          font-weight: 500;
          letter-spacing: -0.04em;
          color: var(--color-text);
          line-height: 1;
        }

        .pricing-modal-features {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;
          justify-content: center;
          margin-bottom: 24px;
          padding: 20px;
          background: var(--color-card);
          border-radius: 16px;
        }

        .pricing-modal-feature {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .pricing-modal-feature svg {
          color: var(--color-success);
          width: 14px;
          height: 14px;
        }

        .pricing-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .btn-pricing-modal-primary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 48px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-pricing-modal-primary:hover:not(:disabled) {
          background: #000;
          transform: translateY(-1px);
        }

        .btn-pricing-modal-secondary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 48px;
          background: transparent;
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-pricing-modal-secondary:hover:not(:disabled) {
          background: var(--color-card);
        }

        .pricing-modal-note {
          text-align: center;
          font-size: 12px;
          color: var(--color-text-muted);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CHAT INTERFACE
           ═══════════════════════════════════════════════════════════════════════ */
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: #FAFAFA;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 24px;
        }

        .chat-history {
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chat-message {
          display: flex;
          width: 100%;
        }

        .chat-message-user {
          justify-content: flex-end;
        }

        .chat-message-assistant {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 80%;
          padding: 16px 20px;
          border-radius: 16px;
          font-size: 15px;
          line-height: 1.6;
        }

        .chat-bubble-user {
          background: var(--color-primary);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-bubble-assistant {
          background: white;
          border: 1px solid var(--color-border);
          color: var(--color-text);
          border-bottom-left-radius: 4px;
          box-shadow: var(--shadow-sm);
        }

        .chat-bubble-image {
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 300px;
          object-fit: contain;
        }

        .chat-thinking {
          color: var(--color-text-tertiary);
          font-style: italic;
        }

        /* ─── Chat Input Area ─── */
        .chat-input-area {
          flex-shrink: 0;
          background: white;
          border-top: 1px solid var(--color-border);
          padding: 20px 24px;
        }

        .chat-input-inner {
          max-width: 800px;
          margin: 0 auto;
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
          margin-bottom: 12px;
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .chat-textarea {
          flex: 1;
          min-height: 52px;
          max-height: 160px;
          padding: 14px 16px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text);
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          outline: none;
          transition: all 0.2s;
        }

        .chat-textarea:focus {
          border-color: var(--color-text);
          background: white;
        }

        .chat-send-btn {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          border: none;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .chat-send-btn:hover:not(:disabled) {
          background: #000;
          transform: scale(1.05);
        }

        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chat-disclaimer {
          margin-top: 12px;
          text-align: center;
          font-size: 12px;
          color: var(--color-text-muted);
        }

        /* ─── Responsive Chat ─── */
        @media (max-width: 640px) {
          .chat-input-area {
            padding: 16px;
          }

          .chat-bubble {
            max-width: 90%;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-inner">
            <div className="header-left">
              <Link href="/" className="logo">
                <span className={`logo-text ${outfit.className}`}>protocolLM</span>
              </Link>
            </div>

            <div className="header-right">
              {hasActiveSubscription && (
                <span className={`header-status ${inter.className}`}>Site License Active</span>
              )}

              {!isAuthenticated ? (
                <button
                  onClick={() => {
                    setAuthInitialMode('signin')
                    setShowAuthModal(true)
                  }}
                  className="btn-hero-secondary"
                  style={{ height: 40, padding: '0 24px' }}
                >
                  <span className={`btn-label ${inter.className}`}>Sign in</span>
                </button>
              ) : (
                <div className="user-menu-wrapper" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className={`avatar-btn ${inter.className}`}
                    aria-label="User menu"
                  >
                    {session?.user?.email?.[0]?.toUpperCase() || 'U'}
                  </button>

                  {showUserMenu && (
                    <div className="user-menu">
                      <div className="user-menu-header">
                        <div className={`user-menu-email ${inter.className}`}>
                          {session?.user?.email || 'Signed in'}
                        </div>
                        <div className={`user-menu-status ${inter.className}`}>
                          {hasActiveSubscription ? '● Premium Active' : 'Free Account'}
                        </div>
                      </div>

                      {hasActiveSubscription ? (
                        <button onClick={handleManageBilling} className={`user-menu-item ${inter.className}`}>
                          <span className="user-menu-item-icon"><Icons.Settings /></span>
                          Manage Billing
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className={`user-menu-item ${inter.className}`}
                        >
                          <span className="user-menu-item-icon"><Icons.Spark /></span>
                          Start Free Trial
                        </button>
                      )}

                      <button
                        onClick={() => {
                          window.open('/privacy', '_blank')
                          setShowUserMenu(false)
                        }}
                        className={`user-menu-item ${inter.className}`}
                      >
                        <span className="user-menu-item-icon"><Icons.Shield /></span>
                        Privacy & Security
                      </button>

                      <div className="user-menu-divider" />

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          handleSignOut()
                        }}
                        className={`user-menu-item user-menu-item-danger ${inter.className}`}
                      >
                        <span className="user-menu-item-icon"><Icons.LogOut /></span>
                        Sign Out
                      </button>

                      <div className="user-menu-footer">
                        <span className={`user-menu-hint ${inter.className}`}>Press ESC to close</span>
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
          {!isAuthenticated ? (
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
                {messages.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', maxWidth: 400, padding: 32, background: 'var(--color-surface)', borderRadius: 24, boxShadow: 'var(--shadow-card)' }}>
                      <div style={{ width: 48, height: 48, background: 'var(--color-card)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--color-text)' }}>
                        <Icons.Camera />
                      </div>
                      <h2 className={outfit.className} style={{ fontSize: 20, marginBottom: 8 }}>Ready for analysis</h2>
                      <p className={inter.className} style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
                        Upload a photo of your kitchen or ask a regulatory question to get started.
                      </p>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
                          <Icons.Camera /> Upload Photo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="chat-history">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
                      >
                        <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'} ${inter.className}`}>
                          {msg.image && (
                            <div className="chat-bubble-image">
                              <img src={msg.image} alt="Uploaded" />
                            </div>
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <span className="chat-thinking">Analyzing compliance…</span>
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
                    <div className={`chat-attachment ${inter.className}`}>
                      <Icons.Camera />
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="btn-icon"
                        style={{ width: 24, height: 24, background: 'transparent', border: 'none', boxShadow: 'none' }}
                        aria-label="Remove"
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
                      className="btn-icon"
                      aria-label="Attach image"
                    >
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: 10 }}>
                      <textarea
                        ref={textAreaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className={`chat-textarea ${inter.className}`}
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
                        className="chat-send-btn"
                        aria-label="Send"
                      >
                        {isSending ? <div className="btn-spinner" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`chat-disclaimer ${inter.className}`}>
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
