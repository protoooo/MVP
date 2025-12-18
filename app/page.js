// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react'
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

const UI = {
  pageBg: 'min-h-screen bg-[#f8f8f6] text-[#1f1f1f] relative',
  gridBg:
    'pointer-events-none absolute inset-0 opacity-5 [background-image:linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:42px_42px]',
  noiseOverlay:
    'pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.06),rgba(0,0,0,0.06)_1px,transparent_1px,transparent_3px)]',
  container: 'relative z-10 mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-12',
  panel: 'bg-white/90 backdrop-blur-sm border border-[#d4d4d4] rounded-[18px] shadow-sm shadow-black/5',
  panelHeader:
    'flex items-center justify-between px-5 py-3 border-b border-[#d4d4d4] sticky top-0 bg-white/92 backdrop-blur-sm z-10',
  panelTitle: `${outfit.className} text-[17px] md:text-lg font-semibold tracking-tight`,
  panelBody: 'px-5 py-4 space-y-4',
  panelHeaderLabel: 'text-[11px] uppercase tracking-[0.18em] text-[#6b6b6b] font-semibold',
  buttonPrimary:
    'inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#1f1f1f] text-[#f8f8f6] px-4 py-2.5 text-sm font-semibold tracking-tight shadow-sm transition-all duration-200 ease-out disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f]',
  buttonSecondary:
    'inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#d4d4d4] bg-white text-[#1f1f1f] px-4 py-2.5 text-sm font-semibold tracking-tight shadow-sm transition-all duration-200 ease-out hover:border-[#bfbfbf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] disabled:opacity-60 disabled:cursor-not-allowed',
  buttonGhost:
    'inline-flex items-center justify-center gap-2 rounded-[12px] border border-transparent px-3 py-2 text-sm font-medium text-[#1f1f1f] transition-all duration-200 ease-out hover:border-[#d4d4d4] hover:bg-[#f3f3f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f] disabled:opacity-50',
  input:
    'w-full rounded-[14px] border border-[#d4d4d4] bg-white px-3.5 py-2.5 text-sm text-[#1f1f1f] shadow-inner shadow-black/5 placeholder:text-[#8a8a8a] focus-visible:border-[#1f1f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f]',
  textarea:
    'w-full rounded-[14px] border border-[#d4d4d4] bg-white px-3.5 py-3 text-sm text-[#1f1f1f] shadow-inner shadow-black/5 placeholder:text-[#8a8a8a] focus-visible:border-[#1f1f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f]',
  select:
    'w-full rounded-[14px] border border-[#d4d4d4] bg-white px-3.5 py-2.5 text-sm text-[#1f1f1f] shadow-inner shadow-black/5 focus-visible:border-[#1f1f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f]',
  pill: 'inline-flex items-center gap-2 rounded-full border border-[#d4d4d4] bg-white px-3 py-1 text-xs font-semibold text-[#1f1f1f]',
  badge: 'inline-flex items-center rounded-full bg-[#1f1f1f] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f8f8f6]',
  divider: 'h-px w-full bg-[#d4d4d4]',
  card: 'rounded-[16px] border border-[#d4d4d4] bg-white shadow-sm shadow-black/5',
  cardHover: 'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10',
  focusRing: 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1f1f]',
}

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

function useTypewriter(lines = [], speed = 32) {
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!lines.length) return
    const current = lines[index] || ''
    let i = 0
    const tick = () => {
      setText(current.slice(0, i))
      i += 1
      if (i <= current.length) {
        setTimeout(tick, speed)
      } else if (index < lines.length - 1) {
        setTimeout(() => setIndex((v) => v + 1), speed * 8)
      } else {
        setDone(true)
      }
    }
    tick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lines.join('|')])

  return { text, index, done }
}

function Panel({ label, title, actions, children, className = '' }) {
  return (
    <div className={`${UI.panel} ${className}`}>
      {(label || title || actions) && (
        <div className={UI.panelHeader}>
          <div className="flex flex-col gap-1">
            {label && <span className={UI.panelHeaderLabel}>{label}</span>}
            {title && <h3 className={UI.panelTitle}>{title}</h3>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={UI.panelBody}>{children}</div>
    </div>
  )
}

function MonoButton({ variant = 'primary', className = '', children, ...props }) {
  const base =
    variant === 'ghost' ? UI.buttonGhost : variant === 'secondary' ? UI.buttonSecondary : UI.buttonPrimary
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  )
}

const MonoInput = forwardRef(function MonoInput({ component = 'input', className = '', ...props }, ref) {
  const Comp = component === 'textarea' ? 'textarea' : component === 'select' ? 'select' : 'input'
  const base = component === 'textarea' ? UI.textarea : component === 'select' ? UI.select : UI.input
  return <Comp ref={ref} className={`${base} ${className}`} {...props} />
})

function AppShell({ children }) {
  return (
    <div className={UI.pageBg}>
      <div className={UI.gridBg} />
      <div className={UI.noiseOverlay} />
      <div className={UI.container}>{children}</div>
    </div>
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
        if (pctInt < 15) setPhase(mode === 'vision' ? 'Analyzing image…' : 'Reading input…')
        else if (pctInt < 45) setPhase('Collecting references…')
        else if (pctInt < 70) setPhase('Cross-checking rules…')
        else if (pctInt < 90) setPhase('Composing response…')
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
      }, 320)
      return () => {
        if (refs.current.hideTimer) clearTimeout(refs.current.hideTimer)
        refs.current.hideTimer = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestKey, cfg, mode, visible])

  if (!visible) return null

  return (
    <div className="space-y-2 rounded-[14px] border border-[#d4d4d4] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between text-xs text-[#6b6b6b]">
        <span className="font-semibold">{phase}</span>
        <span className="font-semibold">{progress}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#ececea]">
        <div className="h-1.5 rounded-full bg-[#1f1f1f] transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function MessageBlock({ role, content, sources, index = 0 }) {
  const isUser = role === 'user'
  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f2]'
  return (
    <div className={`${UI.card} ${UI.cardHover} ${rowBg} border-[#d4d4d4] p-4`}>
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#6b6b6b]">
        <span className="flex items-center gap-2">
          <span className={UI.badge}>{isUser ? 'INPUT' : 'PROTOCOL'}</span>
        </span>
      </div>
      <div className={`max-w-none text-sm leading-relaxed text-[#1f1f1f] ${inter.className}`}>
        {content || (isUser ? '—' : '…')}
      </div>
      {!!sources?.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sources.map((src, i) => (
            <span key={i} className={`${UI.pill} text-[11px]`}>
              {src}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 text-xs text-[#6b6b6b]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#1f1f1f]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#3a3a3a] [animation-delay:120ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#6b6b6b] [animation-delay:240ms]" />
    </div>
  )
}

function useInViewOnce({ threshold = 0.1, rootMargin = '0px 0px -50px 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const obs = new IntersectionObserver((entries) => {
      const e = entries?.[0]
      if (e?.isIntersecting) {
        setInView(true)
        obs.disconnect()
      }
    }, { threshold, rootMargin })
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
  const dirClass = direction === 'left' ? 'translate-x-3' : direction === 'right' ? '-translate-x-3' : 'translate-y-3'
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-600 ease-out ${inView ? 'opacity-100 translate-y-0 translate-x-0' : `opacity-0 ${dirClass}`}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function BootPanel({ onComplete }) {
  const bootLines = [
    '[ protocolLM v1.0 ]',
    'Initializing compliance engine…',
    'Loading Washtenaw County ruleset…',
    'Indexing enforcement actions…',
    'Image analysis module: READY',
    'Q&A module: READY',
    'License status: TRIAL AVAILABLE',
  ]
  const { text, index, done } = useTypewriter(bootLines, 30)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setCollapsed(true)
        setTimeout(() => onComplete?.(), 240)
      }, 520)
      return () => clearTimeout(t)
    }
  }, [done, onComplete])

  const history = bootLines.slice(0, index).map((line) => line)
  const currentLine = text

  return (
    <div className={`overflow-hidden transition-all duration-600 ease-linear ${collapsed ? 'max-h-[72px] opacity-80' : 'max-h-[320px]'}`}>
      <div className="relative rounded-[18px] border border-[#d4d4d4] bg-[#f2f2ef] shadow-inner shadow-black/5">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04),transparent_55%)] [background-size:160%]" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.6),rgba(0,0,0,0.6)_1px,transparent_1px,transparent_3px)]" />
        <div className="relative space-y-2 px-5 py-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#6b6b6b]">
            <span>System boot</span>
            <span>Washtenaw profile</span>
          </div>
          <div className="space-y-1 font-mono text-[13px] leading-6 text-[#1f1f1f]">
            {history.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {!collapsed && (
              <div className="flex items-center gap-2">
                <span>{currentLine}</span>
                <span className="inline-block h-4 w-2 animate-pulse rounded-sm bg-[#1f1f1f]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const [unlocked, setUnlocked] = useState(false)

  const modules = [
    { label: 'Visual Scan', desc: 'Attach kitchen frames for violation detection.', icon: <Icons.Eye /> },
    { label: 'Compliance Q&A', desc: 'Direct questions to the ruleset without jargon.', icon: <Icons.FileText /> },
    { label: 'Local Enforcement Data', desc: 'Cross-reference Washtenaw actions in-line.', icon: <Icons.AlertTriangle /> },
    { label: 'Site License', desc: 'Single-location license with unlimited usage.', icon: <Icons.Shield /> },
  ]

  const systemIntro = (
    <div className={`${UI.card} border-[#d4d4d4] bg-[#fdfdfb] p-5 shadow-sm`}>
      <div className={`${UI.panelHeaderLabel} mb-2`}>System message</div>
      <h2 className={`${outfit.className} text-xl font-semibold tracking-tight text-[#1f1f1f]`}>I’m protocolLM.</h2>
      <p className={`${inter.className} mt-2 text-sm text-[#1f1f1f]`}>I help food service teams identify violations before inspectors do.</p>
      <p className={`${inter.className} text-sm text-[#6b6b6b]`}>Configured for Washtenaw County. Built to run, not to sell.</p>
    </div>
  )

  return (
    <AppShell>
      <div className="space-y-8">
        <BootPanel onComplete={() => setUnlocked(true)} />

        {unlocked && (
          <div className="space-y-6 transition-all duration-500 ease-linear">
            {systemIntro}

            <div className="grid gap-3 md:grid-cols-2">
              {modules.map((m, idx) => (
                <div key={m.label} className={`${UI.card} ${UI.cardHover} border-[#d4d4d4] p-4`}>
                  <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#6b6b6b]">
                    <span className="flex items-center gap-2 text-[#1f1f1f]">
                      <span className="text-sm">{m.icon}</span>
                      <span>{m.label}</span>
                    </span>
                    <span className="h-2 w-2 rounded-full bg-[#1f1f1f]" />
                  </div>
                  <p className={`${inter.className} text-sm text-[#1f1f1f]`}>{m.desc}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <Panel label="License" title="Site License" className="shadow-none">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`${UI.card} p-4 border-[#d4d4d4] bg-[#fdfdfb]`}>
                    <div className={`${UI.panelHeaderLabel} mb-1`}>Price</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`${outfit.className} text-3xl font-semibold text-[#1f1f1f]`}>$100</span>
                      <span className={`${inter.className} text-sm text-[#6b6b6b]`}>per month</span>
                    </div>
                    <p className={`${inter.className} text-xs text-[#6b6b6b]`}>Annual: $1,000 (save $200)</p>
                  </div>
                  <div className={`${UI.card} p-4 border-[#d4d4d4]`}>
                    <div className={`${UI.panelHeaderLabel} mb-1`}>Status</div>
                    <p className={`${inter.className} text-sm text-[#1f1f1f]`}>Trial available · Unlimited usage for one location.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#1f1f1f]">
                  {['Unlimited photo checks', 'Unlimited questions', 'Washtenaw-specific references', 'Team access included'].map((item) => (
                    <span key={item} className={UI.pill}>
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <MonoButton onClick={onShowPricing}>Activate license</MonoButton>
                  <MonoButton variant="secondary" onClick={onShowAuth}>Access console</MonoButton>
                </div>
              </Panel>

              <Panel label="Documentation" title="Scope" className="shadow-none">
                <div className="space-y-2 text-sm text-[#1f1f1f]">
                  <div className="flex items-center justify-between rounded-[12px] border border-[#d4d4d4] bg-[#f5f5f2] px-3 py-2">
                    <span className={`${inter.className} text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]`}>Local</span>
                    <span className="text-[#1f1f1f]">Washtenaw County enforcement actions</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[12px] border border-[#d4d4d4] bg-[#f5f5f2] px-3 py-2">
                    <span className={`${inter.className} text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]`}>Code</span>
                    <span className="text-[#1f1f1f]">Michigan Modified Food Code + FDA 2022</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[12px] border border-[#d4d4d4] bg-[#f5f5f2] px-3 py-2">
                    <span className={`${inter.className} text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]`}>Vision</span>
                    <span className="text-[#1f1f1f]">Line, prep, dish, storage stations</span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </AppShell>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1f1f]/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[18px] border border-[#d4d4d4] bg-white shadow-2xl shadow-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <div className={UI.panelHeaderLabel}>Access</div>
            <h2 className={`${outfit.className} text-2xl font-semibold tracking-tight text-[#1f1f1f]`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`${inter.className} mt-1 text-sm text-[#6b6b6b]`}>
              {mode === 'signin' && 'Enter credentials to continue.'}
              {mode === 'signup' && 'Start your 7-day trial.'}
              {mode === 'reset' && 'We will email you a reset link.'}
            </p>
          </div>
          <button onClick={onClose} className={`${UI.buttonGhost} p-2`}>
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label className={`${UI.panelHeaderLabel} block`}>Email</label>
            <MonoInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              required
              autoComplete="email"
            />
            <p className={`${inter.className} text-xs text-[#6b6b6b]`}>Use the address tied to your location.</p>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-2">
              <label className={`${UI.panelHeaderLabel} block`}>Password</label>
              <div className="relative">
                <MonoInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#6b6b6b]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className={`${inter.className} text-xs text-[#6b6b6b]`}>Minimize reuse to keep access secure.</p>
            </div>
          )}

          <MonoButton type="submit" disabled={loading || !isLoaded} className="w-full justify-center py-3">
            {loading && <span className="h-4 w-4 animate-spin rounded-full border border-[#d4d4d4] border-t-[#1f1f1f]" />}<span>
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </span>
          </MonoButton>

          {message && (
            <div className={`flex items-center gap-2 rounded-[14px] border px-3 py-2 text-sm ${messageKind === 'err' ? 'border-[#d4d4d4] bg-[#f5f5f2] text-[#8a0000]' : 'border-[#d4d4d4] bg-white text-[#1f1f1f]'}`}>
              <span>{messageKind === 'err' ? <Icons.AlertTriangle /> : <Icons.Check />}</span>
              <span className={inter.className}>{message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-[#1f1f1f]">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className={`${UI.buttonGhost} px-0 py-0`}>
                  Forgot password?
                </button>
                <button type="button" onClick={() => setMode('signup')} className={`${UI.buttonGhost} px-0 py-0`}>
                  Need an account? <span className="font-semibold">Create account</span>
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className={`${UI.buttonGhost} px-0 py-0`}>
                Already have an account? <span className="font-semibold">Sign in</span>
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className={`${UI.buttonGhost} px-0 py-0`}>
                ← Back to sign in
              </button>
            )}
          </div>
        </form>
        <div className="px-6 pb-5">
          <RecaptchaBadge />
        </div>
      </div>
    </div>
  )
}

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1f1f]/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[18px] border border-[#d4d4d4] bg-white shadow-2xl shadow-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <div className={UI.panelHeaderLabel}>Site License</div>
            <h2 className={`${outfit.className} text-2xl font-semibold tracking-tight text-[#1f1f1f]`}>protocolLM Access</h2>
            <p className={`${inter.className} mt-1 text-sm text-[#6b6b6b]`}>
              Single-location license. Unlimited text and image sessions.
            </p>
          </div>
          <button onClick={onClose} className={`${UI.buttonGhost} p-2`} aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          <div className="flex items-end gap-2 text-[#1f1f1f]">
            <div className={`${outfit.className} text-3xl font-semibold`}>$100</div>
            <div className={`${inter.className} text-sm text-[#6b6b6b]`}>/ month</div>
          </div>
          <p className={`${inter.className} text-sm text-[#6b6b6b]`}>Annual: $1,000 (save $200).</p>
          <div className="space-y-2">
            {['Unlimited photo checks', 'Unlimited questions', 'Washtenaw-specific guidance', 'Full team access'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#1f1f1f]">
                <Icons.Check />
                <span className={inter.className}>{f}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <MonoButton onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')} disabled={!!loading} className="w-full justify-center py-3 text-base">
              {loading === 'monthly' && <span className="h-4 w-4 animate-spin rounded-full border border-[#d4d4d4] border-t-[#1f1f1f]" />} Activate license
            </MonoButton>
            <MonoButton
              variant="secondary"
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading}
              className="w-full justify-center py-3 text-base"
            >
              {loading === 'annual' && <span className="h-4 w-4 animate-spin rounded-full border border-[#d4d4d4] border-t-[#1f1f1f]" />} Start trial
            </MonoButton>
          </div>
          <p className={`${inter.className} text-xs text-[#6b6b6b]`}>7-day free trial · Cancel anytime · One license per location</p>
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
      loadingToast.className = 'fixed top-4 right-4 bg-[#1f1f1f] text-[#f8f8f6] px-4 py-2 rounded-lg z-[9999]'
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
            title: (question || 'New session').slice(0, 40),
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

  const sendExample = (prompt) => {
    setInput(prompt)
    setTimeout(() => handleSend(), 10)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f6] text-[#1f1f1f]">
        <div className="flex items-center gap-3 rounded-[14px] border border-[#d4d4d4] bg-white px-4 py-3 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border border-[#d4d4d4] border-t-[#1f1f1f]" />
          <span className={`${inter.className} text-sm`}>Loading protocolLM…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !hasActiveSubscription) {
    return (
      <>
        <LandingPage onShowPricing={() => setShowPricingModal(true)} onShowAuth={() => setShowAuthModal(true)} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
        <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />
      </>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-6">
        <div>
          <div className={UI.panelHeaderLabel}>Active Session</div>
          <h1 className={`${outfit.className} text-2xl font-semibold tracking-tight text-[#1f1f1f]`}>protocolLM Session Console</h1>
        </div>
        <div className="flex items-center gap-3" ref={userMenuRef}>
          <MonoButton variant="secondary" onClick={handleNewChat}>
            <Icons.Plus /> New session
          </MonoButton>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#d4d4d4] bg-white text-sm font-semibold text-[#1f1f1f] shadow-sm"
            >
              {session?.user?.email?.slice(0, 2)?.toUpperCase() || 'ME'}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-[14px] border border-[#d4d4d4] bg-white shadow-lg">
                <div className="px-4 py-3">
                  <div className={`${inter.className} text-sm font-semibold text-[#1f1f1f]`}>{session?.user?.email}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#6b6b6b]">Licensed</div>
                </div>
                <div className={UI.divider} />
                <button onClick={handleManageBilling} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f2]">
                  <Icons.Settings /> Manage billing
                </button>
                <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#1f1f1f] hover:bg-[#f5f5f2]">
                  <Icons.LogOut /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Panel
          label="Context"
          title="Controls"
          actions={<MonoButton variant="ghost" onClick={() => setShowPricingModal(true)} className="text-xs">License</MonoButton>}
          className="h-fit lg:sticky lg:top-10"
        >
          <div className="space-y-3 text-sm text-[#1f1f1f]">
            <div className="flex items-center justify-between rounded-[12px] border border-[#d4d4d4] bg-[#f5f5f2] px-3 py-2">
              <span className={`${inter.className} text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]`}>Status</span>
              <span className={UI.pill}>Session attached</span>
            </div>
            <div className="space-y-2">
              <div className={UI.panelHeaderLabel}>Commands</div>
              <div className="flex flex-wrap gap-2">
                {['Show Washtenaw violation thresholds', 'Cooling check for soups', 'Cross-contact checklist', 'Temp log reminder'].map((item) => (
                  <MonoButton key={item} variant="ghost" onClick={() => sendExample(item)} className="border border-[#d4d4d4] text-xs">
                    {item}
                  </MonoButton>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className={UI.panelHeaderLabel}>Modes</div>
              <div className="flex gap-2">
                <span className={UI.pill}>Text</span>
                <span className={UI.pill}>Vision</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel label="Session" title="Log">
          <div className="flex flex-col gap-4">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="max-h-[55vh] min-h-[260px] overflow-y-auto space-y-3 pr-1"
            >
              {messages.length === 0 && (
                <div className={`${UI.card} border-dashed border-[#d4d4d4] bg-[#f5f5f2] p-5`}>
                  <div className={`${UI.panelHeaderLabel} mb-2`}>Session idle</div>
                  <p className={`${inter.className} text-sm text-[#1f1f1f]`}>Use a command to begin.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      'List likely criticals from this walk-in photo',
                      'Provide holding temps for hot bar',
                      'Draft inspection prep checklist',
                    ].map((p) => (
                      <MonoButton key={p} variant="ghost" onClick={() => sendExample(p)} className="border border-[#d4d4d4] text-xs">
                        {p}
                      </MonoButton>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, idx) => (
                <MessageBlock key={idx} role={m.role} content={m.content} sources={m.sources} index={idx} />
              ))}

              {isSending && <TypingIndicator />}
            </div>

            {selectedImage && (
              <div className={`${UI.card} border-[#d4d4d4] bg-[#f5f5f2] p-4`}>
                <div className="flex items-center justify-between">
                  <div className={UI.panelHeaderLabel}>Scan input</div>
                  <div className="flex gap-2">
                    <MonoButton variant="ghost" onClick={() => setSelectedImage(null)}>Detach</MonoButton>
                    <MonoButton onClick={handleSend} disabled={isSending}>Analyze</MonoButton>
                  </div>
                </div>
                <div className="mt-3 overflow-hidden rounded-[14px] border border-[#d4d4d4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(selectedImage)} alt="Selected" className="w-full object-cover" />
                </div>
              </div>
            )}

            <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

            <form onSubmit={handleSend} className={`${UI.card} p-4 space-y-3`}>
              <div className="flex items-center gap-2">
                <label className={`${UI.buttonSecondary} h-10 w-10 items-center justify-center p-0`} htmlFor="image-upload">
                  <Icons.Camera />
                </label>
                <input id="image-upload" ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <MonoInput
                  component="textarea"
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter command or describe station…"
                  className={`${inter.className} flex-1`}
                  ref={textAreaRef}
                />
                <MonoButton type="submit" disabled={isSending || (!input.trim() && !selectedImage)} className="h-12 px-4">
                  Execute
                </MonoButton>
              </div>
              <div className="flex items-center justify-between text-xs text-[#6b6b6b]">
                <span className={`${inter.className}`}>Enter to execute · Shift+Enter for newline</span>
                <span className={`${inter.className}`}>{sendMode === 'vision' ? 'Vision' : 'Text'} mode</span>
              </div>
            </form>
          </div>
        </Panel>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />
    </AppShell>
  )
}
