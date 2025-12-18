// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'] })

const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// eslint-disable-next-line no-unused-vars
const isAdmin = false

const UI = {
  pageBg: `min-h-screen bg-[#f6f5f2] text-[#161616] relative`,
  gridBg:
    'pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(0,0,0,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.10)_1px,transparent_1px)] [background-size:44px_44px]',
  noiseOverlay:
    'pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.25),rgba(0,0,0,0.25)_1px,transparent_1px,transparent_4px)]',
  vignette:
    'pointer-events-none absolute inset-0 opacity-[0.45] [background-image:radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.05)_75%,rgba(0,0,0,0.10)_100%)]',
  container: 'relative z-10 mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-12',

  // Terminal window language
  win: 'overflow-hidden rounded-[12px] border border-[#cfcfc7] bg-[#f0f0ea] shadow-[0_1px_0_rgba(0,0,0,0.06)]',
  winHeader:
    'flex items-center justify-between gap-3 border-b border-[#cfcfc7] bg-[#e9e9e1] px-4 py-3',
  winLabel: 'text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold',
  winTitle: 'text-[13px] tracking-tight text-[#161616] font-semibold',
  winBody: 'relative px-4 py-4',
  scanlines:
    'pointer-events-none absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.55),rgba(0,0,0,0.55)_1px,transparent_1px,transparent_5px)]',
  phosphor:
    'pointer-events-none absolute inset-0 opacity-[0.10] [background-image:radial-gradient(circle_at_center,rgba(0,0,0,0.06),transparent_55%)] [background-size:160%]',
  mono: plexMono.className,
  sans: inter.className,
  heading: outfit.className,

  divider: 'h-px w-full bg-[#cfcfc7]',
  subtleDivider: 'h-px w-full bg-[#dcdcd4]',

  // Inputs/buttons as “commands”
  cmdBtn:
    'inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#bdbdb4] bg-[#f7f7f2] px-3 py-2 text-[12px] font-semibold tracking-tight text-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:bg-[#ffffff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#161616] disabled:opacity-60 disabled:cursor-not-allowed',
  cmdBtnPrimary:
    'inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#161616] bg-[#161616] px-3 py-2 text-[12px] font-semibold tracking-tight text-[#f6f5f2] shadow-[0_1px_0_rgba(0,0,0,0.10)] transition hover:bg-[#0f0f0f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#161616] disabled:opacity-60 disabled:cursor-not-allowed',
  cmdBtnGhost:
    'inline-flex items-center justify-center gap-2 rounded-[10px] border border-transparent bg-transparent px-3 py-2 text-[12px] font-semibold tracking-tight text-[#161616] transition hover:border-[#cfcfc7] hover:bg-[#f7f7f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#161616] disabled:opacity-50 disabled:cursor-not-allowed',

  input:
    'w-full rounded-[10px] border border-[#bdbdb4] bg-[#fbfbf7] px-3 py-2 text-[13px] text-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-[#7a7a7a] focus-visible:border-[#161616] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#161616]',
  textarea:
    'w-full rounded-[10px] border border-[#bdbdb4] bg-[#fbfbf7] px-3 py-2 text-[13px] text-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-[#7a7a7a] focus-visible:border-[#161616] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#161616]',

  pill:
    'inline-flex items-center gap-2 rounded-full border border-[#cfcfc7] bg-[#f7f7f2] px-3 py-1 text-[11px] font-semibold text-[#161616]',

  statusDot: 'h-2 w-2 rounded-full bg-[#161616]',
  statusDotDim: 'h-2 w-2 rounded-full bg-[#6a6a6a]',
}

const Icons = {
  Camera: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="3.7" />
    </svg>
  ),
  FileText: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

function nowStamp() {
  try {
    return new Date().toISOString()
  } catch {
    return String(Date.now())
  }
}

function fmtTime(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

function useTypewriter(lines = [], speed = 28) {
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

function TerminalWindow({
  label,
  title,
  right,
  status = 'ok',
  actions,
  children,
  className = '',
  bodyClassName = '',
}) {
  const dotClass = status === 'dim' ? UI.statusDotDim : UI.statusDot
  return (
    <div className={`${UI.win} ${className}`}>
      <div className={`${UI.winHeader} ${UI.mono}`}>
        <div className="min-w-0">
          {label && <div className={UI.winLabel}>{label}</div>}
          {title && <div className={UI.winTitle}>{title}</div>}
        </div>
        <div className="flex items-center gap-3">
          {right && <div className="hidden sm:block text-[12px] text-[#575757]">{right}</div>}
          <span className={dotClass} />
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div className={`${UI.winBody} ${bodyClassName}`}>
        <div className={UI.phosphor} />
        <div className={UI.scanlines} />
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

function MonoButton({ variant = 'primary', className = '', children, ...props }) {
  const base = variant === 'ghost' ? UI.cmdBtnGhost : variant === 'secondary' ? UI.cmdBtn : UI.cmdBtnPrimary
  return (
    <button className={`${base} ${UI.mono} ${className}`} {...props}>
      {children}
    </button>
  )
}

const MonoInput = forwardRef(function MonoInput({ component = 'input', className = '', ...props }, ref) {
  const Comp = component === 'textarea' ? 'textarea' : component === 'select' ? 'select' : 'input'
  const base = component === 'textarea' ? UI.textarea : UI.input
  return <Comp ref={ref} className={`${base} ${UI.mono} ${className}`} {...props} />
})

function AppShell({ children }) {
  return (
    <div className={UI.pageBg}>
      <div className={UI.gridBg} />
      <div className={UI.noiseOverlay} />
      <div className={UI.vignette} />
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
    return mode === 'vision' ? { baseCap: 86, finalCap: 93, k: 0.028 } : { baseCap: 90, finalCap: 96, k: 0.036 }
  }, [mode])

  useEffect(() => {
    if (refs.current.hideTimer) {
      clearTimeout(refs.current.hideTimer)
      refs.current.hideTimer = null
    }

    if (active) {
      setVisible(true)
      setProgress(0)
      setPhase(mode === 'vision' ? 'IMG → PIPELINE' : 'TX → PIPELINE')
      refs.current.pct = 0
      refs.current.startedAt = Date.now()
      if (refs.current.timer) clearInterval(refs.current.timer)
      refs.current.timer = setInterval(() => {
        const elapsed = (Date.now() - refs.current.startedAt) / 1000
        const cap = elapsed < 1.4 ? cfg.baseCap - 10 : elapsed < 4 ? cfg.baseCap : cfg.finalCap
        const next = refs.current.pct + (cap - refs.current.pct) * cfg.k
        refs.current.pct = Math.max(refs.current.pct, next)
        const pctInt = Math.min(99, Math.floor(refs.current.pct))
        setProgress(pctInt)
        if (pctInt < 15) setPhase(mode === 'vision' ? 'HASHING FRAME…' : 'READING INPUT…')
        else if (pctInt < 45) setPhase('COLLECTING REFERENCES…')
        else if (pctInt < 70) setPhase('CROSS-CHECKING RULESET…')
        else if (pctInt < 90) setPhase('COMPOSING RESPONSE…')
        else setPhase('FINALIZING…')
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
      setPhase('DONE')
      refs.current.hideTimer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 360)
      return () => {
        if (refs.current.hideTimer) clearTimeout(refs.current.hideTimer)
        refs.current.hideTimer = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestKey, cfg, mode, visible])

  if (!visible) return null

  return (
    <TerminalWindow label="Pipeline" title="Execution Progress" right={mode === 'vision' ? 'VISION' : 'TEXT'} status="dim">
      <div className={`${UI.mono} space-y-2`}>
        <div className="flex items-center justify-between text-[12px] text-[#575757]">
          <span className="font-semibold">{phase}</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7]">
          <div className="h-full bg-[#161616] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </TerminalWindow>
  )
}

function TypingIndicator() {
  return (
    <div className={`${UI.mono} flex items-center gap-2 text-[12px] text-[#575757]`}>
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#161616]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#3a3a3a] [animation-delay:120ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#6b6b6b] [animation-delay:240ms]" />
      <span className="ml-1">PROCESSING…</span>
    </div>
  )
}

function LogRow({ message, index }) {
  const isUser = message.role === 'user'
  const ts = fmtTime(message.ts || message.created_at || Date.now())
  const bg = index % 2 === 0 ? 'bg-[#fbfbf7]' : 'bg-[#f4f4ee]'
  const tag = isUser ? 'INPUT' : 'PROTOCOL'
  const tagBg = isUser ? 'bg-[#161616] text-[#f6f5f2]' : 'bg-[#2a2a2a] text-[#f6f5f2]'

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[#cfcfc7] ${bg}`}>
      <div className={`flex items-center justify-between gap-3 border-b border-[#dcdcd4] px-3 py-2 ${UI.mono}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`rounded-[8px] px-2 py-1 text-[11px] font-semibold tracking-tight ${tagBg}`}>{tag}</span>
          <span className="truncate text-[12px] text-[#575757]">{isUser ? 'COMMAND/QUERY' : 'RULESET RESPONSE'}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#575757]">
          <span>{ts}</span>
          {message.image && (
            <span className="inline-flex items-center gap-1 rounded-[8px] border border-[#cfcfc7] bg-[#f7f7f2] px-2 py-1">
              <Icons.Camera />
              <span className="text-[11px] font-semibold">FRAME</span>
            </span>
          )}
        </div>
      </div>

      <div className="px-3 py-3">
        <div className={`${UI.mono} whitespace-pre-wrap text-[13px] leading-6 text-[#161616]`}>
          {message.content || (isUser ? '—' : '…')}
        </div>

        {!!message.sources?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map((src, i) => (
              <span key={i} className={UI.pill}>
                {src}
              </span>
            ))}
          </div>
        )}
      </div>
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
  const { text, index, done } = useTypewriter(bootLines, 26)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setCollapsed(true)
        setTimeout(() => onComplete?.(), 220)
      }, 520)
      return () => clearTimeout(t)
    }
  }, [done, onComplete])

  const history = bootLines.slice(0, index).map((line) => line)
  const currentLine = text

  return (
    <div
      className={`overflow-hidden transition-all ease-linear ${collapsed ? 'max-h-[78px] opacity-85' : 'max-h-[360px]'}`}
      style={{ transitionDuration: '600ms' }}
    >
      <TerminalWindow label="System boot" title="[ protocolLM v1.0 ]" right="WASHTENAW PROFILE" status="dim">
        <div className={`${UI.mono} space-y-1 text-[13px] leading-6`}>
          {history.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span>{currentLine}</span>
              <span className="inline-block h-4 w-2 animate-pulse rounded-sm bg-[#161616]" />
            </div>
          )}
        </div>
      </TerminalWindow>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const [unlocked, setUnlocked] = useState(false)

  const modules = [
    { code: 'VIS', label: 'Visual Scan', desc: 'Attach kitchen frames for violation detection.', icon: <Icons.Camera /> },
    { code: 'QNA', label: 'Compliance Q&A', desc: 'Direct questions to the ruleset without jargon.', icon: <Icons.FileText /> },
    { code: 'LOC', label: 'Local Enforcement Data', desc: 'Cross-reference Washtenaw actions inline.', icon: <Icons.AlertTriangle /> },
    { code: 'LIC', label: 'Site License', desc: 'Single-location license with unlimited usage.', icon: <Icons.Shield /> },
  ]

  return (
    <AppShell>
      <div className="space-y-8">
        <BootPanel onComplete={() => setUnlocked(true)} />

        {unlocked && (
          <div className="space-y-6">
            <TerminalWindow label="Interface" title="Unlocked" right="protocolLM shell">
              <div className="space-y-4">
                <div className={`rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] ${UI.mono}`}>
                  <div className="flex items-center justify-between border-b border-[#dcdcd4] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">
                      System message
                    </div>
                    <span className={UI.statusDot} />
                  </div>
                  <div className="px-3 py-3">
                    <div className={`${UI.heading} text-[18px] font-semibold tracking-tight text-[#161616]`}>
                      I’m protocolLM.
                    </div>
                    <div className="mt-1 text-[13px] leading-6 text-[#161616]">
                      I help food service teams identify violations before inspectors do.
                    </div>
                    <div className="mt-1 text-[13px] leading-6 text-[#575757]">
                      Configured for Washtenaw County. Built to run, not to sell.
                    </div>
                  </div>
                </div>

                <div className={`overflow-hidden rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] ${UI.mono}`}>
                  <div className="flex items-center justify-between border-b border-[#dcdcd4] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">
                      Module directory
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">Status</div>
                  </div>
                  <div className="divide-y divide-[#e1e1da]">
                    {modules.map((m) => (
                      <div key={m.code} className="flex items-start justify-between gap-4 px-3 py-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-[2px] text-[#161616]">{m.icon}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-[8px] border border-[#cfcfc7] bg-[#f7f7f2] px-2 py-1 text-[11px] font-semibold">
                                {m.code}
                              </span>
                              <div className="truncate text-[13px] font-semibold text-[#161616]">{m.label}</div>
                            </div>
                            <div className="mt-1 text-[12px] leading-5 text-[#575757]">{m.desc}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pt-1 text-[12px] text-[#575757]">
                          <span className="h-2 w-2 rounded-full bg-[#161616]" />
                          READY
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <TerminalWindow label="License" title="Site License" right="single location" status="dim">
                    <div className={`${UI.mono} space-y-3`}>
                      <div className="overflow-hidden rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7]">
                        <div className="grid grid-cols-3 border-b border-[#dcdcd4] px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">
                          <div>Field</div>
                          <div>Value</div>
                          <div className="text-right">Notes</div>
                        </div>
                        <div className="divide-y divide-[#e1e1da] text-[12px]">
                          <div className="grid grid-cols-3 px-3 py-2">
                            <div className="text-[#575757]">PRICE</div>
                            <div className="font-semibold text-[#161616]">$100 / month</div>
                            <div className="text-right text-[#575757]">Annual: $1,000</div>
                          </div>
                          <div className="grid grid-cols-3 px-3 py-2">
                            <div className="text-[#575757]">TRIAL</div>
                            <div className="font-semibold text-[#161616]">7 days</div>
                            <div className="text-right text-[#575757]">cancel anytime</div>
                          </div>
                          <div className="grid grid-cols-3 px-3 py-2">
                            <div className="text-[#575757]">USAGE</div>
                            <div className="font-semibold text-[#161616]">Unlimited</div>
                            <div className="text-right text-[#575757]">text + image</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {['Unlimited photo checks', 'Unlimited questions', 'Washtenaw references', 'Team access'].map((t) => (
                          <span key={t} className={UI.pill}>
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <MonoButton onClick={onShowPricing}>
                          <Icons.Shield /> Activate license
                        </MonoButton>
                        <MonoButton variant="secondary" onClick={onShowAuth}>
                          Access console
                        </MonoButton>
                      </div>
                    </div>
                  </TerminalWindow>

                  <TerminalWindow label="Documentation" title="Scope" right="ruleset map" status="dim">
                    <div className={`${UI.mono} space-y-2 text-[12px]`}>
                      {[
                        ['LOCAL', 'Washtenaw County enforcement actions'],
                        ['CODE', 'Michigan Modified Food Code + FDA 2022'],
                        ['VISION', 'Line, prep, dish, storage stations'],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-center justify-between gap-3 rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] px-3 py-2"
                        >
                          <span className="text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">{k}</span>
                          <span className="text-right font-semibold text-[#161616]">{v}</span>
                        </div>
                      ))}

                      <div className="pt-2 text-[12px] leading-5 text-[#575757]">
                        Tip: Try <span className="font-semibold text-[#161616]">Visual Scan</span> for station photos (coolers, prep tables, dish).
                      </div>
                    </div>
                  </TerminalWindow>
                </div>
              </div>
            </TerminalWindow>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`${UI.mono} text-[12px] text-[#575757]`}>
                <span className="font-semibold text-[#161616]">protocolLM</span> · Washtenaw profile · v1.0
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className={`${UI.mono} text-[12px] font-semibold text-[#161616] underline decoration-[#c0c0b8]`} href="/privacy">
                  Privacy
                </Link>
                <Link className={`${UI.mono} text-[12px] font-semibold text-[#161616] underline decoration-[#c0c0b8]`} href="/terms">
                  Terms
                </Link>
              </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f0f]/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <TerminalWindow
          label="Access"
          title={
            mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Access'
          }
          right="protocolLM shell"
          actions={
            <button onClick={onClose} className={`${UI.cmdBtnGhost} p-2`} aria-label="Close">
              <Icons.X />
            </button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`${UI.mono} text-[12px] text-[#575757]`}>
              {mode === 'signin' && 'Enter credentials to continue.'}
              {mode === 'signup' && 'Start your 7-day trial.'}
              {mode === 'reset' && 'We will email you a reset link.'}
            </div>

            <div className="space-y-2">
              <label className={`${UI.mono} text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold block`}>Email</label>
              <MonoInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                required
                autoComplete="email"
              />
              <div className={`${UI.mono} text-[11px] text-[#575757]`}>Use the address tied to your location.</div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <label className={`${UI.mono} text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold block`}>
                  Password
                </label>
                <div className="relative">
                  <MonoInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`${UI.mono} absolute inset-y-0 right-2 my-1 rounded-[8px] border border-[#cfcfc7] bg-[#f7f7f2] px-2 text-[11px] font-semibold text-[#161616]`}
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <div className={`${UI.mono} text-[11px] text-[#575757]`}>Minimize reuse to keep access secure.</div>
              </div>
            )}

            <MonoButton type="submit" disabled={loading || !isLoaded} className="w-full justify-center py-3">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border border-[#cfcfc7] border-t-[#f6f5f2]" />}
              <span>
                {mode === 'signin' ? 'EXECUTE SIGN-IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'}
              </span>
            </MonoButton>

            {message && (
              <div
                className={`rounded-[10px] border px-3 py-2 ${UI.mono} text-[12px] ${
                  messageKind === 'err' ? 'border-[#cfcfc7] bg-[#f4f4ee] text-[#8a0000]' : 'border-[#cfcfc7] bg-[#fbfbf7] text-[#161616]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{messageKind === 'err' ? <Icons.AlertTriangle /> : <Icons.Check />}</span>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <div className={`${UI.mono} flex flex-wrap gap-3 text-[12px]`}>
              {mode === 'signin' && (
                <>
                  <button type="button" onClick={() => setMode('reset')} className={`${UI.cmdBtnGhost} px-0 py-0`}>
                    FORGOT PASSWORD?
                  </button>
                  <button type="button" onClick={() => setMode('signup')} className={`${UI.cmdBtnGhost} px-0 py-0`}>
                    NEED AN ACCOUNT? <span className="font-semibold">CREATE</span>
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button type="button" onClick={() => setMode('signin')} className={`${UI.cmdBtnGhost} px-0 py-0`}>
                  ALREADY HAVE AN ACCOUNT? <span className="font-semibold">SIGN IN</span>
                </button>
              )}
              {mode === 'reset' && (
                <button type="button" onClick={() => setMode('signin')} className={`${UI.cmdBtnGhost} px-0 py-0`}>
                  ← BACK TO SIGN IN
                </button>
              )}
            </div>

            <div className="pt-2">
              <RecaptchaBadge />
            </div>
          </form>
        </TerminalWindow>
      </div>
    </div>
  )
}

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f0f]/40 px-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <TerminalWindow
          label="Site license"
          title="protocolLM Access"
          right="single location"
          actions={
            <button onClick={onClose} className={`${UI.cmdBtnGhost} p-2`} aria-label="Close">
              <Icons.X />
            </button>
          }
        >
          <div className={`${UI.mono} space-y-4`}>
            <div className="rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] p-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">Pricing</div>
              <div className="mt-2 flex items-end gap-3">
                <div className={`${UI.heading} text-3xl font-semibold tracking-tight text-[#161616]`}>$100</div>
                <div className="pb-1 text-[12px] text-[#575757]">/ month</div>
              </div>
              <div className="mt-1 text-[12px] text-[#575757]">Annual: $1,000 (save $200).</div>
            </div>

            <div className="rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] p-3">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">Includes</div>
              <div className="mt-2 space-y-2 text-[12px] text-[#161616]">
                {['Unlimited photo checks', 'Unlimited questions', 'Washtenaw-specific guidance', 'Full team access'].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Icons.Check />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <MonoButton
                onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
                disabled={!!loading}
                className="w-full justify-center py-3"
              >
                {loading === 'monthly' && (
                  <span className="h-4 w-4 animate-spin rounded-full border border-[#cfcfc7] border-t-[#f6f5f2]" />
                )}
                ACTIVATE MONTHLY
              </MonoButton>

              <MonoButton
                variant="secondary"
                onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                disabled={!!loading}
                className="w-full justify-center py-3"
              >
                {loading === 'annual' && (
                  <span className="h-4 w-4 animate-spin rounded-full border border-[#cfcfc7] border-t-[#161616]" />
                )}
                START TRIAL / ANNUAL
              </MonoButton>
            </div>

            <div className="text-[11px] text-[#575757]">
              7-day free trial · Cancel anytime · One license per location
            </div>
          </div>
        </TerminalWindow>
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
    const threshold = 140
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
      loadingToast.className =
        'fixed top-4 right-4 bg-[#161616] text-[#f6f5f2] px-4 py-2 rounded-[10px] z-[9999] font-mono text-[12px]'
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

    const userMsg = { role: 'user', content: question, image, ts: nowStamp() }
    const placeholder = { role: 'assistant', content: '', ts: nowStamp() }

    setMessages((prev) => [...prev, userMsg, placeholder])
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
          messages: [...messages, userMsg],
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
        updated[updated.length - 1] = { role: 'assistant', content: data.message || 'No response.', ts: updated[updated.length - 1]?.ts || nowStamp() }
        return updated
      })
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${error.message}`, ts: updated[updated.length - 1]?.ts || nowStamp() }
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

  const onCommandKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f5f2] text-[#161616]">
        <div className={`flex items-center gap-3 rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] px-4 py-3 ${UI.mono}`}>
          <span className="h-4 w-4 animate-spin rounded-full border border-[#cfcfc7] border-t-[#161616]" />
          <span className="text-[12px] font-semibold">LOADING protocolLM…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !hasActiveSubscription) {
    return (
      <>
        <LandingPage onShowPricing={() => setShowPricingModal(true)} onShowAuth={() => setShowAuthModal(true)} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onCheckout={handleCheckout}
          loading={checkoutLoading}
        />
      </>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <TerminalWindow
          label="Active session"
          title="protocolLM Session Console"
          right="Washtenaw profile"
          actions={
            <div className="flex items-center gap-2" ref={userMenuRef}>
              <MonoButton variant="secondary" onClick={handleNewChat}>
                <Icons.Plus /> NEW
              </MonoButton>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className={`flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] text-[12px] font-semibold text-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${UI.mono}`}
                >
                  {(session?.user?.email?.slice(0, 2) || 'ME').toUpperCase()}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-[12px] border border-[#cfcfc7] bg-[#fbfbf7] shadow-lg">
                    <div className="px-4 py-3">
                      <div className={`${UI.mono} text-[12px] font-semibold text-[#161616]`}>{session?.user?.email}</div>
                      <div className={`${UI.mono} text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold`}>LICENSED</div>
                    </div>
                    <div className={UI.divider} />
                    <button
                      onClick={handleManageBilling}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-[12px] text-[#161616] hover:bg-[#f4f4ee] ${UI.mono}`}
                    >
                      <Icons.Settings /> MANAGE BILLING
                    </button>
                    <button
                      onClick={handleSignOut}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-[12px] text-[#161616] hover:bg-[#f4f4ee] ${UI.mono}`}
                    >
                      <Icons.LogOut /> SIGN OUT
                    </button>
                  </div>
                )}
              </div>
            </div>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
            <TerminalWindow
              label="Context buffer"
              title="Controls"
              right={`CHAT_ID: ${currentChatId ? String(currentChatId).slice(0, 8) : '—'}`}
              status="dim"
              className="h-fit lg:sticky lg:top-10"
              actions={
                <MonoButton variant="ghost" onClick={() => setShowPricingModal(true)} className="text-[11px]">
                  LICENSE
                </MonoButton>
              }
            >
              <div className={`${UI.mono} space-y-4`}>
                <div className="rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7]">
                  <div className="border-b border-[#dcdcd4] px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">
                    Status
                  </div>
                  <div className="px-3 py-3 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#575757]">SUBSCRIPTION</span>
                      <span className="font-semibold text-[#161616]">ACTIVE</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[#575757]">MODES</span>
                      <span className="font-semibold text-[#161616]">TEXT / VISION</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7]">
                  <div className="border-b border-[#dcdcd4] px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">
                    Quick commands
                  </div>
                  <div className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Show Washtenaw violation thresholds',
                        'Cooling check for soups',
                        'Cross-contact checklist',
                        'Temp log reminder',
                      ].map((item) => (
                        <MonoButton
                          key={item}
                          variant="ghost"
                          onClick={() => sendExample(item)}
                          className="border border-[#cfcfc7] bg-[#f7f7f2]"
                        >
                          {item}
                        </MonoButton>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7]">
                  <div className="border-b border-[#dcdcd4] px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">
                    Guidance
                  </div>
                  <div className="px-3 py-3 text-[12px] leading-5 text-[#575757]">
                    Use <span className="font-semibold text-[#161616]">Visual Scan</span> for station photos (walk-in, prep table, dish).
                    For text, issue a short command. Press <span className="font-semibold text-[#161616]">Enter</span> to execute.
                  </div>
                </div>
              </div>
            </TerminalWindow>

            <div className="space-y-6">
              <TerminalWindow label="Session" title="Log" right={`MODE: ${sendMode === 'vision' ? 'VISION' : 'TEXT'}`} status="dim">
                <div className="space-y-3">
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="max-h-[56vh] min-h-[280px] overflow-y-auto space-y-3 pr-1"
                  >
                    {messages.length === 0 && (
                      <div className={`rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7] p-4 ${UI.mono}`}>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[#575757] font-semibold">
                          Session idle
                        </div>
                        <div className="mt-2 text-[12px] text-[#575757]">Issue a command to begin.</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            'List likely criticals from this walk-in photo',
                            'Provide holding temps for hot bar',
                            'Draft inspection prep checklist',
                          ].map((p) => (
                            <MonoButton
                              key={p}
                              variant="ghost"
                              onClick={() => sendExample(p)}
                              className="border border-[#cfcfc7] bg-[#f7f7f2]"
                            >
                              {p}
                            </MonoButton>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((m, idx) => (
                      <LogRow key={idx} message={m} index={idx} />
                    ))}

                    {isSending && <TypingIndicator />}
                  </div>
                </div>
              </TerminalWindow>

              {selectedImage && (
                <TerminalWindow label="Image analysis" title="Scan Dock" right="frame attached" status="dim">
                  <div className={`${UI.mono} space-y-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[12px] text-[#575757]">
                        Frame staged. Execute will run vision pipeline.
                      </div>
                      <div className="flex gap-2">
                        <MonoButton variant="secondary" onClick={() => setSelectedImage(null)}>
                          DETACH
                        </MonoButton>
                        <MonoButton onClick={handleSend} disabled={isSending}>
                          <Icons.Camera /> ANALYZE
                        </MonoButton>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[10px] border border-[#cfcfc7] bg-[#fbfbf7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(selectedImage)} alt="Selected" className="w-full object-cover" />
                    </div>
                  </div>
                </TerminalWindow>
              )}

              <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

              <TerminalWindow label="Command line" title="Execute" right="Enter = run · Shift+Enter = newline" status="dim">
                <form onSubmit={handleSend} className={`${UI.mono} space-y-3`}>
                  <div className="flex items-start gap-2">
                    <label
                      className={`${UI.cmdBtn} h-10 w-10 flex items-center justify-center p-0`}
                      htmlFor="image-upload"
                      title="Attach image frame"
                    >
                      <Icons.Camera />
                    </label>
                    <input
                      id="image-upload"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`select-none text-[12px] text-[#575757] ${UI.mono}`}>{'>'}</div>
                        <MonoInput
                          component="textarea"
                          rows={3}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={onCommandKeyDown}
                          placeholder="Describe station… or issue a command (e.g., 'Cooling log for chili')"
                          className="flex-1"
                          ref={textAreaRef}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[#575757]">
                        <span>ATTACHMENT: {selectedImage ? 'FRAME READY' : 'NONE'}</span>
                        <span>PIPELINE: {selectedImage ? 'VISION' : 'TEXT'}</span>
                      </div>
                    </div>

                    <MonoButton type="submit" disabled={isSending || (!input.trim() && !selectedImage)} className="h-10 px-4">
                      EXECUTE
                    </MonoButton>
                  </div>
                </form>
              </TerminalWindow>
            </div>
          </div>
        </TerminalWindow>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onCheckout={handleCheckout}
          loading={checkoutLoading}
        />
      </div>
    </AppShell>
  )
}
