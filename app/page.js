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

function WaveBackground() {
  return (
    <div className="wave-bg-container">
      <svg className="wave-svg" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67C090" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#26667F" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="wave-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F3A63" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#67C090" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="wave-gradient-3" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#26667F" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0F3A63" stopOpacity="0.07" />
          </linearGradient>
        </defs>
        
        {/* Wave 1 - starts higher, flows through hero */}
        <path className="wave wave-1" fill="url(#wave-gradient-1)">
          <animate
            attributeName="d"
            dur="25s"
            repeatCount="indefinite"
            values="
              M0,200 C150,150 350,250 500,200 C650,150 750,100 900,150 C1050,200 1150,250 1300,200 C1450,150 1440,200 1440,200 L1440,800 L0,800 Z;
              M0,150 C150,200 350,150 500,200 C650,250 750,200 900,150 C1050,100 1150,150 1300,200 C1450,250 1440,150 1440,150 L1440,800 L0,800 Z;
              M0,200 C150,150 350,250 500,200 C650,150 750,100 900,150 C1050,200 1150,250 1300,200 C1450,150 1440,200 1440,200 L1440,800 L0,800 Z
            "
          />
        </path>
        
        {/* Wave 2 - middle layer */}
        <path className="wave wave-2" fill="url(#wave-gradient-2)">
          <animate
            attributeName="d"
            dur="20s"
            repeatCount="indefinite"
            values="
              M0,350 C200,300 400,400 600,350 C800,300 1000,250 1200,300 C1400,350 1440,300 1440,300 L1440,800 L0,800 Z;
              M0,300 C200,350 400,300 600,350 C800,400 1000,350 1200,300 C1400,250 1440,350 1440,350 L1440,800 L0,800 Z;
              M0,350 C200,300 400,400 600,350 C800,300 1000,250 1200,300 C1400,350 1440,300 1440,300 L1440,800 L0,800 Z
            "
          />
        </path>
        
        {/* Wave 3 - lower layer */}
        <path className="wave wave-3" fill="url(#wave-gradient-3)">
          <animate
            attributeName="d"
            dur="30s"
            repeatCount="indefinite"
            values="
              M0,500 C180,450 360,550 540,500 C720,450 900,400 1080,450 C1260,500 1440,450 1440,450 L1440,800 L0,800 Z;
              M0,450 C180,500 360,450 540,500 C720,550 900,500 1080,450 C1260,400 1440,500 1440,500 L1440,800 L0,800 Z;
              M0,500 C180,450 360,550 540,500 C720,450 900,400 1080,450 C1260,500 1440,450 1440,450 L1440,800 L0,800 Z
            "
          />
        </path>
      </svg>
      
      {/* Subtle grid overlay */}
      <div className="grid-overlay" />
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
          <span className={`faq-question ${inter.className}`}>{q}</span>
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

  // Real data from FDA, CDC, and industry sources
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
  const knowledgeSources = useMemo(
    () => [
      { title: '3-Comp Sink', tag: 'Sanitation' },
      { title: 'Consumer Advisory', tag: 'Disclosure' },
      { title: 'Consumer Advisory (Guide)', tag: 'Disclosure' },
      { title: 'Cooling Foods', tag: 'Process' },
      { title: 'Cross Contamination', tag: 'Safety' },
      { title: 'Date Marking Guide', tag: 'Storage' },
      { title: 'Enforcement Action | Washtenaw County, MI', tag: 'Local Enforcement' },
      { title: 'FDA Food Code 2022', tag: 'Federal Code' },
      { title: 'FOG', tag: 'Grease Control' },
      { title: 'Food Allergy Information | Washtenaw County, MI', tag: 'Allergens' },
      { title: 'Food Service Inspection Program | Washtenaw County, MI (Official)', tag: 'Local Program' },
      { title: 'Food Service Inspection Program | Washtenaw County, MI', tag: 'Local Program' },
      { title: 'Food Labeling Guide', tag: 'Labeling' },
      { title: 'Food Temperatures', tag: 'Temp Control' },
      { title: 'Inspection Report Types | Washtenaw County, MI', tag: 'Inspections' },
      { title: 'Internal Cooking Temperatures', tag: 'Cooking' },
      { title: 'Michigan Food Law Act 92 of 2000', tag: 'State Law' },
      { title: 'Michigan Modified Food Code', tag: 'State Code' },
      { title: 'New Business Information Packet', tag: 'Onboarding' },
      { title: 'Norovirus Environmental Cleaning', tag: 'Cleaning' },
      { title: 'Procedures for Administration & Enforcement of the Michigan Food Law', tag: 'State Procedures' },
      { title: 'Retail Food Establishments Emergency Action Plan', tag: 'Emergency' },
      { title: 'Summary Chart: Cooking Temps & Holding Times', tag: 'Temp Control' },
      { title: 'USDA Safe Minimum Internal Temperature Chart', tag: 'Federal Reference' },
      { title: 'Violation Types | Washtenaw County, MI', tag: 'Violations' },
    ],
    []
  )
  const knowledgeLoop = useMemo(() => [...knowledgeSources, ...knowledgeSources], [knowledgeSources])

  return (
    <div className="landing-wrapper">
      {/* Animated wave background */}
      <WaveBackground />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <Reveal delay={0}>
              <h1 className={`hero-title ${outfit.className} hero-title-animated`}>
                <span className="hero-title-line">Catch violations</span>
                <span className="hero-title-line hero-title-gradient">before the inspector does</span>
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

          <Reveal delay={120}>
              <div className="hero-visual hero-data-visual">
              <div className="hero-data-frame">
                <div className="hero-data-header">
                  <div className="hero-data-title">
                    <span className="hero-data-pip" />
                    <span className={`hero-data-label ${inter.className}`}>protocolLM training base</span>
                  </div>
                  <span className="hero-data-status">Live</span>
                </div>
                <div className="hero-data-viewport" role="log" aria-label="protocolLM knowledge base">
                  <div className="hero-data-loop">
                    {knowledgeLoop.map((item, idx) => (
                      <div key={idx} className="hero-data-row">
                        <div className="hero-data-text">
                          <div className={`hero-data-title-row ${inter.className}`}>{item.title}</div>
                          <div className={`hero-data-meta ${inter.className}`}>{item.tag}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                  <div className="feature-card-border" />
                  <div className="feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <h3 className={`feature-title ${inter.className}`}>{feature.title}</h3>
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
                  <div className="risk-card-border" />
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
              <div className="pricing-card-border" />
              <div className="pricing-card-inner">
                <div className="pricing-amount">
                  <span className={`pricing-currency ${inter.className}`}>$</span>
                  <span className={`pricing-number ${outfit.className}`}>100</span>
                  <span className={`pricing-period ${inter.className}`}>/month</span>
                </div>

                <p className={`pricing-annual ${inter.className}`}>
                  or $1,000/year <span className="pricing-savings">(save $200)</span>
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

          <Reveal delay={250}>
            <p className={`pricing-comparison ${inter.className}`}>
              
            </p>
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
            <span className="footer-divider">·</span>
            <Link href="/privacy" className={`footer-link ${inter.className}`}>Privacy Policy</Link>
            <span className="footer-divider">·</span>
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
            <span className={`pricing-number-lg ${outfit.className}`}>100</span>
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
              <span className={`btn-label ${inter.className}`}>Annual plan · $1,000/year</span>
              <span className={`btn-badge ${inter.className}`}>Save $200</span>
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
           PREMIUM LIGHT THEME - protocolLM
           Seafoam + teal stack with deep ink text
           Color Palette: Cream seafoam base + Teal accent + Deep navy contrast
           ═══════════════════════════════════════════════════════════════════════ */

        /* ─── Design Tokens ─── */
        :root {
          /* Core Colors */
          --color-bg: #DDF4E7;
          --color-surface: #FFFFFF;
          --color-card: #FFFFFF;
          --color-border: rgba(15, 58, 99, 0.16);
          --color-border-subtle: rgba(15, 58, 99, 0.08);
          --color-border-hover: rgba(15, 58, 99, 0.28);
          --color-border-focus: #0F3A63;
          
          /* Text Colors */
          --color-text: #0F2F45;
          --color-text-secondary: #1F4D63;
          --color-text-tertiary: #3F6F7F;
          --color-text-muted: #5C8795;
          
          /* Brand Colors */
          --color-primary: #26667F;
          --color-primary-hover: #1F5670;
          --color-primary-light: #2E7A99;
          --color-accent: #67C090;
          --color-accent-hover: #57A87C;
          --color-accent-light: rgba(103, 192, 144, 0.16);
          
          /* Status Colors */
          --color-success: #2F8E6B;
          --color-success-bg: rgba(103, 192, 144, 0.18);
          --color-warning: #A77C45;
          --color-warning-bg: rgba(167, 124, 69, 0.18);
          --color-error: #A44F4F;
          --color-error-bg: rgba(164, 79, 79, 0.14);
          
          /* Shadows */
          --shadow-xs: 0 1px 2px rgba(15, 58, 99, 0.06);
          --shadow-sm: 0 1px 3px rgba(15, 58, 99, 0.1), 0 1px 2px rgba(15, 58, 99, 0.05);
          --shadow-md: 0 6px 12px -2px rgba(15, 58, 99, 0.12), 0 2px 6px -2px rgba(15, 58, 99, 0.06);
          --shadow-lg: 0 14px 28px -6px rgba(15, 58, 99, 0.18), 0 6px 18px -8px rgba(15, 58, 99, 0.1);
          --shadow-xl: 0 24px 40px -8px rgba(15, 58, 99, 0.2), 0 10px 24px -10px rgba(15, 58, 99, 0.1);
          --shadow-card: 0 1px 3px rgba(15, 58, 99, 0.08), 0 0 0 1px rgba(15, 58, 99, 0.1);
          --shadow-card-hover: 0 12px 30px rgba(15, 58, 99, 0.18), 0 0 0 1px rgba(38, 102, 127, 0.24);
          --shadow-glass: 0 16px 48px rgba(15, 58, 99, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.14);
          
          /* Radii */
          --radius-xs: 4px;
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 12px;
          --radius-xl: 16px;
          --radius-2xl: 20px;
          --radius-3xl: 24px;
          --radius-full: 9999px;
          
          /* Transitions */
          --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
          --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
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
          background: var(--color-bg);
        }

        body {
          min-height: 100%;
          background: var(--color-bg);
          color: var(--color-text);
          overflow-x: hidden;
          line-height: 1.6;
        }

        ::selection {
          background: rgba(103, 192, 144, 0.22);
          color: var(--color-text);
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
          background: var(--color-border-hover);
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
          border: 2.5px solid var(--color-border);
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
           WAVE BACKGROUND
           ═══════════════════════════════════════════════════════════════════════ */
        .wave-bg-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .wave-svg {
          position: absolute;
          width: 100%;
          height: 100%;
          min-height: 100vh;
        }

        .wave {
          opacity: 1;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(61, 61, 61, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(61, 61, 61, 0.04) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 70%);
          opacity: 0.55;
          mix-blend-mode: multiply;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════════ */
        .app-header {
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          background: rgba(221, 244, 231, 0.9);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 14px 24px;
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
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--color-text);
        }

        .logo-accent {
          font-weight: 800;
          color: var(--color-text);
        }

        .header-meta {
          display: none;
        }

        @media (min-width: 768px) {
          .header-meta {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding-left: 20px;
            border-left: 1px solid var(--color-border);
          }

          .header-meta-primary {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-secondary);
          }

          .header-meta-secondary {
            font-size: 11px;
            color: var(--color-text-muted);
          }
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
          height: 52px;
          padding: 0 28px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-md), 0 0 0 1px rgba(38, 102, 127, 0.14);
          position: relative;
          overflow: hidden;
        }

        .btn-hero-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
          opacity: 0;
          transition: opacity var(--duration-normal) var(--ease-out-expo);
        }

        .btn-hero-primary:hover {
          background: var(--color-primary-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg), 0 0 0 1px rgba(38, 102, 127, 0.2);
        }

        .btn-hero-primary:hover::before {
          opacity: 1;
        }

        .btn-hero-primary:active {
          transform: translateY(0);
        }

        .btn-hero-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 52px;
          padding: 0 24px;
          background: var(--color-surface);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-xs);
        }

        .btn-hero-secondary:hover {
          background: var(--color-card);
          border-color: var(--color-border-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
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
          font-weight: 600;
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
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, var(--color-accent-light) 0%, var(--color-card) 100%);
          border: 1px solid var(--color-border);
          color: var(--color-primary);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out-expo);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-xs);
        }

        .avatar-btn:hover {
          transform: scale(1.05);
          border-color: var(--color-accent);
          box-shadow: var(--shadow-sm);
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
           LANDING PAGE
           ═══════════════════════════════════════════════════════════════════════ */
        .landing-wrapper {
          flex: 1;
          position: relative;
          overflow-x: hidden;
        }

        /* ─── Reveal Animations ─── */
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
          padding: 80px 24px 120px;
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
        }

        @media (min-width: 1024px) {
          .hero-section {
            padding: 80px 48px 120px;
          }
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          gap: 48px;
          align-items: center;
          text-align: center;
        }

        @media (min-width: 1024px) {
          .hero-container {
            grid-template-columns: 1.05fr 0.95fr;
            text-align: left;
            align-items: center;
          }
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
          z-index: 2;
          align-items: flex-start;
        }

        @media (max-width: 1023px) {
          .hero-content {
            align-items: center;
            text-align: center;
          }
        }

        .hero-title-animated {
          display: inline-flex;
          flex-direction: column;
          gap: 6px;
          text-align: center;
        }

        @media (min-width: 1024px) {
          .hero-title-animated {
            text-align: left;
            align-items: flex-start;
          }
        }

        .hero-title-line {
          display: block;
          opacity: 0;
          transform: translateY(18px);
          animation: titleLift 720ms var(--ease-out-expo) forwards;
        }

        .hero-title-line:nth-child(2) {
          animation-delay: 120ms;
        }

        @keyframes titleLift {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .hero-title {
          font-size: clamp(40px, 6vw, 64px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: var(--color-text);
          max-width: 640px;
        }

        .hero-title-gradient {
          background: linear-gradient(135deg, var(--color-text) 0%, var(--color-primary) 45%, var(--color-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 18px;
          line-height: 1.7;
          color: var(--color-text-secondary);
          max-width: 540px;
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

        .hero-visual {
          position: relative;
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: flex-start;
        }

        .hero-data-frame {
          width: 100%;
          padding: 18px;
          border-radius: 24px;
          background: linear-gradient(160deg, #ffffff 0%, rgba(221, 244, 231, 0.9) 100%);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-glass);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .hero-data-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px 12px;
        }

        .hero-data-title {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--color-text);
        }

        .hero-data-pip {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--color-primary);
          box-shadow: 0 0 0 6px rgba(38, 102, 127, 0.16), 0 0 0 0.5px rgba(15, 58, 99, 0.16);
        }

        .hero-data-label {
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .hero-data-status {
          font-size: 13px;
          padding: 6px 12px;
          border-radius: 999px;
          background: var(--color-accent-light);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-xs);
        }

        .hero-data-viewport {
          margin-top: 8px;
          position: relative;
          height: 320px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid var(--color-border);
          background: linear-gradient(180deg, #ffffff 0%, rgba(221, 244, 231, 0.9) 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .hero-data-viewport::before,
        .hero-data-viewport::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 34px;
          z-index: 2;
          pointer-events: none;
        }

        .hero-data-viewport::before {
          top: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), transparent);
        }

        .hero-data-viewport::after {
          bottom: 0;
          background: linear-gradient(0deg, rgba(255, 255, 255, 0.98), transparent);
        }

        .hero-data-loop {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          animation: dataScroll 20s linear infinite;
        }

        .hero-data-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--color-border);
          border-radius: 14px;
          box-shadow: var(--shadow-sm);
        }

        .hero-data-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .hero-data-title-row {
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hero-data-meta {
          font-size: 12px;
          color: var(--color-text-tertiary);
        }

        .hero-data-chip {
          padding: 6px 10px;
          border-radius: 10px;
          background: rgba(103, 192, 144, 0.16);
          color: var(--color-text);
          font-size: 12px;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-xs);
        }

        @keyframes dataScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }

        .hero-visual-metadata {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 1023px) {
          .hero-visual {
            order: 3;
            align-items: center;
          }
          .hero-data-viewport {
            height: 280px;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           PROOF SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .proof-section {
          position: relative;
          z-index: 1;
          padding: 0 24px 80px;
          background: var(--color-bg);
        }

        .proof-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .proof-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          overflow: hidden;
          box-shadow: var(--shadow-card);
        }

        .proof-item {
          padding: 28px 24px;
          text-align: center;
          background: #ffffff;
          border-right: 1px solid var(--color-border-subtle);
        }

        .proof-item:last-child {
          border-right: none;
        }

        @media (max-width: 640px) {
          .proof-grid {
            grid-template-columns: 1fr;
          }
          
          .proof-item {
            border-right: none;
            border-bottom: 1px solid var(--color-border-subtle);
            padding: 20px;
          }
          
          .proof-item:last-child {
            border-bottom: none;
          }
        }

        .proof-value {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 4px;
        }

        .proof-label {
          font-size: 13px;
          color: var(--color-text-muted);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           SECTION STYLES
           ═══════════════════════════════════════════════════════════════════════ */
        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 48px;
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
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 800;
          letter-spacing: -0.03em;
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
          padding: 80px 24px;
        }

        .features-container {
          max-width: 1100px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          position: relative;
        }

        .features-grid::before {
          content: '';
          position: absolute;
          top: 16px;
          left: 8%;
          right: 8%;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, rgba(103, 192, 144, 0.28) 20%, rgba(38, 102, 127, 0.45) 50%, rgba(103, 192, 144, 0.28) 80%, transparent 100%);
          opacity: 0.7;
          mask-image: radial-gradient(circle at 50% 50%, black 0%, transparent 70%);
          pointer-events: none;
        }

        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .feature-card {
          position: relative;
          padding: 32px 28px;
          background: linear-gradient(150deg, #ffffff 0%, #f5fbf8 100%);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          transition: all var(--duration-slow) var(--ease-out-expo);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          min-height: 220px;
          backdrop-filter: blur(12px);
        }

        .feature-card-border {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-2xl);
          padding: 1px;
          background: linear-gradient(135deg, transparent 0%, transparent 50%, var(--color-accent) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity var(--duration-slow) var(--ease-out-expo);
        }

        .feature-card::before {
          content: '';
          position: absolute;
          inset: -40%;
          background: linear-gradient(120deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 40%, transparent 60%);
          transform: translateX(-60%);
          transition: transform var(--duration-slow) var(--ease-out-expo);
          pointer-events: none;
        }

        .feature-card:hover {
          border-color: var(--color-border-hover);
          transform: translateY(-4px) rotate3d(1, -1, 0, 6deg);
          box-shadow: var(--shadow-card-hover);
        }

        .feature-card:hover .feature-card-border {
          opacity: 1;
        }

        .feature-card:hover::before {
          transform: translateX(40%);
        }

        .feature-icon-wrapper {
          position: relative;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(103, 192, 144, 0.16);
          border: 1px solid rgba(61, 61, 61, 0.12);
          border-radius: var(--radius-lg);
          margin-bottom: 20px;
          color: var(--color-primary);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
        }

        .feature-icon-wrapper svg {
          width: 22px;
          height: 22px;
        }

        .feature-title {
          position: relative;
          font-size: 17px;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 8px;
        }

        .feature-description {
          position: relative;
          font-size: 14px;
          line-height: 1.65;
          color: var(--color-text-secondary);
          flex: 1;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           RISK SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .risk-section {
          position: relative;
          z-index: 1;
          padding: 80px 24px;
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
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (min-width: 768px) {
          .risk-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .risk-card {
          position: relative;
          padding: 24px 20px;
          background: linear-gradient(160deg, #ffffff 0%, #f5fbf8 100%);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          text-align: center;
          transition: all var(--duration-normal) var(--ease-out-expo);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          min-height: 180px;
          backdrop-filter: blur(10px);
        }

        .risk-card-border {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-xl);
          padding: 1px;
          background: linear-gradient(180deg, var(--color-accent) 0%, transparent 50%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity var(--duration-normal) var(--ease-out-expo);
        }

        .risk-card::before {
          content: '';
          position: absolute;
          inset: -30%;
          background: linear-gradient(120deg, rgba(255,255,255,0.3) 0%, transparent 60%);
          transform: translateX(-60%);
          transition: transform var(--duration-normal) var(--ease-out-expo);
          pointer-events: none;
        }

        .risk-card:hover {
          border-color: var(--color-border-hover);
          transform: translateY(-3px) rotate3d(1, -1, 0, 4deg);
        }

        .risk-card:hover .risk-card-border {
          opacity: 1;
        }

        .risk-card:hover::before {
          transform: translateX(40%);
        }

        .risk-icon {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-card);
          border-radius: var(--radius-md);
          margin: 0 auto 14px;
          color: var(--color-text-secondary);
        }

        .risk-icon svg {
          width: 20px;
          height: 20px;
        }

        .risk-value {
          position: relative;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 6px;
        }

        .risk-label {
          position: relative;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-secondary);
          line-height: 1.4;
          flex: 1;
        }

        .risk-sources {
          text-align: center;
          font-size: 12px;
          color: var(--color-text-muted);
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
          padding: 80px 24px;
        }

        .pricing-container {
          max-width: 480px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .pricing-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-3xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .pricing-card-border {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-3xl);
          padding: 2px;
          background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 50%, var(--color-accent) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: borderRotate 8s linear infinite;
          background-size: 300% 300%;
        }

        @keyframes borderRotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .pricing-card-inner {
          position: relative;
          padding: 44px 36px;
          z-index: 1;
          background: var(--color-surface);
          border-radius: var(--radius-3xl);
        }

        @media (max-width: 640px) {
          .pricing-card-inner {
            padding: 32px 24px;
          }
        }

        .pricing-badge-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 0;
        }

        .pricing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--color-accent-light);
          border: 1px solid rgba(103, 192, 144, 0.26);
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          color: var(--color-primary);
        }

        .pricing-amount {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 6px;
        }

        .pricing-currency {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .pricing-number {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--color-text);
          line-height: 1;
        }

        .pricing-number-lg {
          font-size: 72px;
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
          background: var(--color-success-bg);
          border-radius: var(--radius-xs);
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
          height: 54px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-md);
        }

        .btn-pricing-primary:hover {
          background: var(--color-primary-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .pricing-note {
          text-align: center;
          font-size: 13px;
          color: var(--color-text-muted);
        }

        .pricing-comparison {
          text-align: center;
          margin-top: 32px;
          font-size: 13px;
          color: var(--color-text-tertiary);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FAQ SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .faq-section {
          position: relative;
          z-index: 1;
          padding: 60px 24px 80px;
          background: var(--color-card);
        }

        .faq-container {
          max-width: 680px;
          margin: 0 auto;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .faq-item {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-xs);
        }

        .faq-item:hover {
          border-color: var(--color-border-hover);
        }

        .faq-item.is-open {
          border-color: var(--color-accent);
          box-shadow: var(--shadow-sm), 0 0 0 1px rgba(103, 192, 144, 0.14);
        }

        .faq-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 22px;
          background: none;
          border: none;
          color: var(--color-text);
          cursor: pointer;
          text-align: left;
        }

        .faq-question {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.4;
        }

        .faq-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-card);
          border-radius: var(--radius-sm);
          color: var(--color-text-tertiary);
          flex-shrink: 0;
          transition: all var(--duration-normal) var(--ease-out-expo);
        }

        .faq-item.is-open .faq-icon {
          transform: rotate(180deg);
          background: var(--color-accent-light);
          color: var(--color-primary);
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
          padding: 0 22px;
          font-size: 14px;
          line-height: 1.7;
          color: var(--color-text-secondary);
        }

        .faq-item.is-open .faq-answer {
          padding: 0 22px 20px;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CTA SECTION
           ═══════════════════════════════════════════════════════════════════════ */
        .cta-section {
          position: relative;
          z-index: 1;
          padding: 80px 24px 100px;
          overflow: hidden;
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
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 16px;
          line-height: 1.2;
        }

        .cta-description {
          font-size: 16px;
          line-height: 1.7;
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
          height: 54px;
          padding: 0 32px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-md);
        }

        .btn-cta-primary:hover {
          background: var(--color-primary-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .btn-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 54px;
          padding: 0 28px;
          background: var(--color-surface);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          box-shadow: var(--shadow-xs);
        }

        .btn-cta-secondary:hover {
          background: var(--color-card);
          border-color: var(--color-border-hover);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FOOTER
           ═══════════════════════════════════════════════════════════════════════ */
        .landing-footer {
          position: relative;
          z-index: 1;
          padding: 40px 24px 48px;
          border-top: 1px solid var(--color-border-subtle);
          background: var(--color-surface);
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-links {
          display: flex;
          gap: 6px;
          justify-content: center;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .footer-link {
          font-size: 14px;
          color: var(--color-text-secondary);
          text-decoration: none;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          transition: all var(--duration-fast) var(--ease-out-expo);
        }

        .footer-link:hover {
          color: var(--color-primary);
          background: var(--color-card);
        }

        .footer-divider {
          color: var(--color-text-muted);
        }

        .footer-api-note {
          font-size: 12px;
          color: var(--color-text-muted);
          margin-bottom: 10px;
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
          background: rgba(11, 18, 32, 0.5);
          backdrop-filter: blur(8px);
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
          max-width: 420px;
          animation: modalSlideUp 300ms var(--ease-out-expo);
        }

        .modal-wrapper-lg {
          max-width: 480px;
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
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          padding: 32px;
          overflow: hidden;
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 24px 20px;
          }
        }

        .modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-tertiary);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out-expo);
          z-index: 10;
        }

        .modal-close-btn:hover {
          background: var(--color-surface);
          color: var(--color-text);
          border-color: var(--color-border-hover);
        }

        .modal-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .modal-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent-light);
          border: 1px solid rgba(103, 192, 144, 0.26);
          border-radius: var(--radius-lg);
          margin: 0 auto 18px;
          color: var(--color-primary);
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin-bottom: 8px;
        }

        .modal-subtitle {
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .form-input {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text);
          font-size: 15px;
          transition: all var(--duration-fast) var(--ease-out-expo);
          outline: none;
        }

        .form-input::placeholder {
          color: var(--color-text-muted);
        }

        .form-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(103, 192, 144, 0.18);
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
          font-weight: 600;
          cursor: pointer;
          transition: color var(--duration-fast) var(--ease-out-expo);
        }

        .form-toggle:hover {
          color: var(--color-primary);
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
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
          margin-top: 4px;
        }

        .btn-form-submit:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
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
          border-radius: var(--radius-md);
          margin-top: 18px;
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
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .modal-link {
          background: none;
          border: none;
          font-size: 14px;
          color: var(--color-text-tertiary);
          cursor: pointer;
          transition: color var(--duration-fast) var(--ease-out-expo);
        }

        .modal-link:hover {
          color: var(--color-primary);
        }

        .modal-link strong {
          color: var(--color-primary);
          font-weight: 600;
        }

        /* ─── Pricing Modal ─── */
        .pricing-modal-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: var(--color-accent-light);
          border: 1px solid rgba(103, 192, 144, 0.22);
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: 16px;
        }

        .pricing-modal-amount {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 24px;
        }

        .pricing-modal-features {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;
          justify-content: center;
          margin-bottom: 24px;
          padding: 20px;
          background: var(--color-card);
          border-radius: var(--radius-lg);
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
          gap: 10px;
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
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
        }

        .btn-pricing-modal-primary:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .btn-pricing-modal-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-pricing-modal-secondary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 48px;
          background: var(--color-surface);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--ease-out-expo);
        }

        .btn-pricing-modal-secondary:hover:not(:disabled) {
          background: var(--color-card);
          border-color: var(--color-border-hover);
        }

        .btn-pricing-modal-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-badge {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-success);
          background: var(--color-success-bg);
          padding: 3px 8px;
          border-radius: var(--radius-xs);
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
          background: radial-gradient(circle at 20% 20%, rgba(103, 192, 144, 0.1), transparent 32%), 
                      radial-gradient(circle at 80% 10%, rgba(38, 102, 127, 0.08), transparent 40%),
                      var(--color-bg);
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px 18px;
          gap: 14px;
        }

        .chat-empty {
          width: 100%;
          max-width: 960px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .chat-empty-content {
          max-width: 560px;
          width: 100%;
          text-align: center;
          padding: 48px 38px;
          background: linear-gradient(180deg, rgba(221,244,231,0.92), rgba(234,247,240,0.9));
          border: 1px solid var(--color-border);
          border-radius: var(--radius-3xl);
          box-shadow: var(--shadow-card-hover);
          backdrop-filter: blur(16px);
        }

        .chat-empty-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent-light);
          border: 1px solid rgba(103, 192, 144, 0.22);
          border-radius: var(--radius-xl);
          color: var(--color-primary);
          margin: 0 auto 20px;
        }

        .chat-empty-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 8px;
        }

        .chat-empty-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-text-secondary);
          margin-bottom: 24px;
        }

        .chat-empty-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .chat-history {
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(221, 244, 231, 0.9);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-3xl);
          box-shadow: var(--shadow-card-hover);
          backdrop-filter: blur(12px);
        }

        .chat-message {
          display: flex;
          width: 100%;
          padding: 2px 4px;
        }

        .chat-message-user {
          justify-content: flex-end;
        }

        .chat-message-assistant {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 90%;
          padding: 14px 18px;
          border-radius: var(--radius-xl);
          font-size: 15px;
          line-height: 1.65;
          position: relative;
          transition: transform var(--duration-fast) var(--ease-out-expo), box-shadow var(--duration-fast) var(--ease-out-expo);
        }

        .chat-bubble-user {
          background: var(--color-primary);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 6px 24px rgba(14, 116, 144, 0.25);
        }

        .chat-bubble-assistant {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          border-bottom-left-radius: 4px;
          box-shadow: 0 10px 30px rgba(11, 18, 32, 0.08), 0 0 0 1px rgba(215, 230, 226, 0.6);
        }

        .chat-message:hover .chat-bubble {
          transform: translateY(-1px);
          box-shadow: var(--shadow-card-hover);
        }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 10px;
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
          background: rgba(246, 250, 249, 0.95);
          backdrop-filter: blur(16px);
          border-top: 1px solid var(--color-border-subtle);
          box-shadow: 0 -10px 30px rgba(11, 18, 32, 0.08);
        }

        .chat-input-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: 18px 24px;
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }

        .smart-progress {
          padding: 0 4px 14px;
        }

        .smart-progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .smart-progress-phase {
          font-size: 12px;
          color: var(--color-text-tertiary);
        }

        .smart-progress-pct {
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          color: var(--color-text-muted);
        }

        .smart-progress-track {
          height: 3px;
          background: var(--color-border);
          border-radius: 2px;
          overflow: hidden;
        }

        .smart-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
          border-radius: 2px;
          transition: width 150ms linear;
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--color-text-secondary);
          margin-bottom: 12px;
          box-shadow: var(--shadow-xs);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .chat-textarea {
          flex: 1;
          min-height: 48px;
          max-height: 160px;
          padding: 12px 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          color: var(--color-text);
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          outline: none;
          transition: all var(--duration-fast) var(--ease-out-expo);
          box-shadow: var(--shadow-xs);
        }

        .chat-textarea::placeholder {
          color: var(--color-text-muted);
        }

        .chat-textarea:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(103, 192, 144, 0.18);
        }

        .chat-send-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          border: none;
          border-radius: var(--radius-lg);
          color: white;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out-expo);
          flex-shrink: 0;
          box-shadow: var(--shadow-sm);
        }

        .chat-send-btn:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: scale(1.05);
        }

        .chat-send-btn:disabled {
          opacity: 0.4;
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
          .chat-input-inner {
            padding: 14px 16px;
          }

          .chat-history {
            padding: 18px 14px;
          }

          .chat-bubble {
            max-width: 88%;
          }

          .chat-empty-content {
            padding: 32px 20px;
          }
        }

        /* ─── Reduced Motion ─── */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          .wave path,
          .hero-data-loop {
            animation: none !important;
          }

          .feature-card:hover,
          .risk-card:hover {
            transform: none !important;
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
              <div className={`logo ${outfit.className}`}>
                <span className="logo-text">protocol</span>
                <span className="logo-text logo-accent">LM</span>
              </div>

              <div className={`header-meta ${inter.className}`}>
                <span className="header-meta-primary">Washtenaw County Compliance</span>
              </div>
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
                  className="btn-secondary"
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
                  <div className="chat-empty">
                    <div className="chat-empty-content">
                      <div className="chat-empty-icon">
                        <Icons.Shield />
                      </div>
                      <h2 className={`chat-empty-title ${inter.className}`}>
                        Upload a photo or ask a question
                      </h2>
                      <p className={`chat-empty-text ${inter.className}`}>
                        Run quick photo checks to spot likely issues, or search the 
                        Washtenaw-focused database when you need a clear answer.
                      </p>
                      <div className="chat-empty-actions">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-secondary"
                        >
                          <Icons.Camera />
                          <span className={`btn-label ${inter.className}`}>Attach photo</span>
                        </button>
                        <button
                          onClick={() => textAreaRef.current?.focus()}
                          className="btn-secondary"
                        >
                          <span className={`btn-label ${inter.className}`}>Ask a question</span>
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
                            <span className="chat-thinking">Analyzing…</span>
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
                        style={{ width: 28, height: 28 }}
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
                        {isSending ? <div className="loading-spinner" style={{ width: 18, height: 18 }} /> : <Icons.ArrowUp />}
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
