
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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

// ---------- tiny icon set (keep clean + consistent) ----------
const Icons = {
  Camera: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7h3l2-2h6l2 2h3v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  ),
  Shield: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2 20 6v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  FileText: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M8 9h4" />
    </svg>
  ),
  AlertTriangle: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.3 3.2 2.3 17a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-13.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  Plus: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  Settings: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a7.9 7.9 0 0 0 .1-6l-2.1.8a6.2 6.2 0 0 0-1.2-1.2l.8-2.1a7.9 7.9 0 0 0-6-.1l.1 2.2a6.2 6.2 0 0 0-1.7.7L7.8 7.7a7.9 7.9 0 0 0-2.9 5.2l2.1.8c0 .6.1 1.2.3 1.7l-1.7 1.4a7.9 7.9 0 0 0 4.6 3.8l.8-2.1c.6.1 1.2.1 1.8 0l.8 2.1a7.9 7.9 0 0 0 5.2-2.9l-1.4-1.7c.3-.5.6-1.1.8-1.6l2.2.1Z" />
    </svg>
  ),
  LogOut: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  X: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  ),
  Check: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
}

// ---------- small helpers ----------
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

// ---------- doc index (from your Supabase screenshots) ----------
const DOC_INDEX = [
  '3-Compartment Sink',
  'Consumer Advisory',
  'Cooling Foods',
  'Cross Contamination',
  'Date Marking Guide',
  'Enforcement Action — Washtenaw County, MI',
  'FDA Food Code 2022',
  'FOG',
  'Food Allergy Information — Washtenaw County, MI',
  'Food Service Inspection Program — Washtenaw County, MI',
  'Food Labeling Guide',
  'Food Temperatures',
  'Inspection Report Types — Washtenaw County, MI',
  'Internal Cooking Temperatures',
  'Michigan Act 92 of 2000',
  'Michigan Modified Food Code',
  'New Business Information Packet',
  'Norovirus Environmental Cleaning',
  'Procedures for Administration & Enforcement — Michigan Food Code',
  'Retail Food Establishments Emergency Action Plan',
  'Minimum Cooking Temperatures & Holding Times',
  'USDA Safe Minimum Internal Temperature Chart',
  'Violation Types — Washtenaw County, MI',
]

// ---------- UI tokens ----------
const UI = {
  bg: 'bg-[#fffeff]',
  shell: 'bg-[#f3f3f1]',
  ink: 'text-[#111111]',
  ink2: 'text-[#333333]',
  hair: 'border-black/10',
  hair2: 'border-black/15',
  shadow: 'shadow-[0_18px_60px_rgba(0,0,0,0.08)]',
  shadow2: 'shadow-[0_10px_30px_rgba(0,0,0,0.08)]',
  radius: 'rounded-[16px]',
  radius2: 'rounded-[14px]',
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --plm-doc-duration: 34s;
      }
      @keyframes plm-doc-scroll {
        0% { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }
      .plm-doc-scroll {
        animation: plm-doc-scroll var(--plm-doc-duration) linear infinite;
        will-change: transform;
      }
      @keyframes plm-soft-pulse {
        0%, 100% { opacity: 0.55; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.06); }
      }
      .plm-soft-pulse { animation: plm-soft-pulse 2.4s ease-in-out infinite; }
      .plm-scanlines {
        background-image: repeating-linear-gradient(
          to bottom,
          rgba(0,0,0,0.05),
          rgba(0,0,0,0.05) 1px,
          rgba(0,0,0,0) 3px,
          rgba(0,0,0,0) 7px
        );
      }
    `}</style>
  )
}

// ---------- typewriter ----------
function useTypewriter(lines, speed = 18, lineDelay = 220) {
  const [lineIndex, setLineIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!lines?.length) return
    if (done) return

    const current = lines[lineIndex] ?? ''
    if (charIndex >= current.length) {
      if (lineIndex >= lines.length - 1) {
        const t = setTimeout(() => setDone(true), lineDelay)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => {
        setLineIndex((v) => v + 1)
        setCharIndex(0)
      }, lineDelay)
      return () => clearTimeout(t)
    }

    const t = setTimeout(() => setCharIndex((v) => v + 1), speed)
    return () => clearTimeout(t)
  }, [lines, lineIndex, charIndex, speed, lineDelay, done])

  const currentLineFull = lines?.[lineIndex] ?? ''
  const currentLineTyped = currentLineFull.slice(0, charIndex)

  const history = useMemo(() => {
    const h = []
    for (let i = 0; i < lineIndex; i++) h.push(lines[i])
    return h
  }, [lineIndex, lines])

  return { history, currentLineTyped, done }
}

function StatusPill({ label = 'READY', pulse = true }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-2.5 py-1 text-[11px] tracking-[0.14em] text-black/70', plexMono.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full bg-black/70', pulse && 'plm-soft-pulse')} />
      <span>{label}</span>
    </span>
  )
}

function Panel({ label, title, children, right }) {
  return (
    <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/70', UI.shadow2)}>
      <div className={cn('flex items-start justify-between gap-4 border-b', UI.hair, 'px-4 py-3')}>
        <div>
          <div className={cn('text-[10px] tracking-[0.22em] text-black/50', plexMono.className)}>{label}</div>
          <div className={cn('mt-0.5 text-[13px] font-semibold text-black/80', outfit.className)}>{title}</div>
        </div>
        {right ? <div className="pt-0.5">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function DotGridBg() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:18px_18px] opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/70" />
    </div>
  )
}

function Shell({ children }) {
  return (
    <div className={cn('relative overflow-hidden border', UI.hair, UI.radius, UI.shell, UI.shadow)}>
      <DotGridBg />
      <div className="relative">{children}</div>
    </div>
  )
}

// ---------- boot ----------
function BootLine({ line }) {
  const idx = line.indexOf('READY')
  if (idx === -1) return <span>{line}</span>
  const left = line.slice(0, idx)
  const right = line.slice(idx + 'READY'.length)
  return (
    <span>
      {left}
      <span className="ml-1 inline-flex items-center gap-2">
        <span className="plm-soft-pulse inline-block h-1.5 w-1.5 rounded-full bg-black/80" />
        <span className="font-semibold tracking-[0.12em] text-black/70">READY</span>
      </span>
      {right}
    </span>
  )
}

function BootPanel({ onDone, collapsed }) {
  const bootLines = useMemo(
    () => [
      '[ protocolLM v1.0 ]',
      'Initializing shell…',
      'Connecting: Washtenaw corpus…',
      'Index: documents table…',
      'Image analysis module: READY',
      'Compliance Q&A module: READY',
      'Local rules module: READY',
      'License module: READY',
      'System: ONLINE',
    ],
    []
  )

  const { history, currentLineTyped, done } = useTypewriter(bootLines, 16, 210)

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onDone?.(), 600)
    return () => clearTimeout(t)
  }, [done, onDone])

  if (collapsed) {
    return (
      <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/75', 'p-4', UI.shadow2)}>
        <div className={cn('text-[12px] text-black/70', plexMono.className)}>[ protocolLM v1.0 ]</div>
        <div className="mt-2 h-1.5 w-28 rounded-full bg-black/10">
          <div className="h-full w-20 rounded-full bg-black/35" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/75', 'overflow-hidden', UI.shadow2)}>
      <div className={cn('flex items-center justify-between border-b', UI.hair, 'px-4 py-3')}>
        <div className={cn('text-[10px] tracking-[0.22em] text-black/50', plexMono.className)}>SYSTEM BOOT</div>
        <div className={cn('text-[10px] tracking-[0.22em] text-black/40', plexMono.className)}>SHELL</div>
      </div>
      <div className={cn('relative p-4', plexMono.className)}>
        <div className="pointer-events-none absolute inset-0 plm-scanlines opacity-40" />
        <div className="relative space-y-1 text-[12px] leading-5 text-black/70">
          {history.map((l, i) => (
            <div key={i}>
              <BootLine line={l} />
            </div>
          ))}
          {!done ? <div>{currentLineTyped}<Cursor /></div> : null}
          {done ? (
            <div className="pt-2 text-black/60">
              Press <span className="font-semibold text-black/70">ENTER</span> to continue…
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Cursor() {
  return <span className="ml-0.5 inline-block h-[12px] w-[8px] translate-y-[2px] animate-pulse rounded-[2px] bg-black/50" />
}

// ---------- doc scroller ----------
function DocDatabase({ titles }) {
  const rows = useMemo(() => {
    const uniq = Array.from(new Set((titles || []).map((t) => (t || '').trim()).filter(Boolean)))
    return uniq.map((t, i) => ({
      id: String(i + 1).padStart(3, '0'),
      title: t,
      status: 'LOADED',
    }))
  }, [titles])

  const doubled = useMemo(() => rows.concat(rows), [rows])

  const duration = useMemo(() => {
    // slower as list grows; clamp to feel calm
    const seconds = clamp(rows.length * 2.1, 28, 70)
    return `${seconds}s`
  }, [rows.length])

  return (
    <div
      className={cn(
        UI.radius2,
        'relative overflow-hidden border',
        UI.hair,
        'bg-[#0f0f10] text-white/80',
        'shadow-[0_10px_30px_rgba(0,0,0,0.25)]'
      )}
      style={{ ['--plm-doc-duration']: duration }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 plm-scanlines" />
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />

      <div className={cn('flex items-center justify-between border-b border-white/10 px-4 py-3', plexMono.className)}>
        <div className="text-[10px] tracking-[0.22em] text-white/50">DOCUMENTS</div>
        <div className="text-[10px] tracking-[0.22em] text-white/35">INDEX</div>
      </div>

      <div className="relative h-[220px] overflow-hidden">
        <div className={cn('plm-doc-scroll flex flex-col', plexMono.className)}>
          {doubled.map((r, idx) => (
            <div
              key={`${r.id}-${idx}`}
              className="flex items-center gap-3 border-b border-white/10 px-4 py-2 text-[12px]"
            >
              <span className="w-10 text-white/35">{r.id}</span>
              <span className="flex-1 truncate">{r.title}</span>
              <span className="text-white/30">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Landing ----------
function LandingPage({ onStartAuth }) {
  const modules = useMemo(
    () => [
      {
        label: 'Visual Scan',
        icon: <Icons.Camera className="h-4 w-4" />,
        desc: 'Snap a photo, flag risks, get fixes.',
        status: 'READY',
      },
      {
        label: 'Compliance Q&A',
        icon: <Icons.Shield className="h-4 w-4" />,
        desc: 'Ask in plain English, cite your corpus.',
        status: 'READY',
      },
      {
        label: 'Local Rules',
        icon: <Icons.FileText className="h-4 w-4" />,
        desc: 'Washtenaw-first requirements and enforcement.',
        status: 'READY',
      },
      {
        label: 'Licensing',
        icon: <Icons.AlertTriangle className="h-4 w-4" />,
        desc: 'Know what you need before you open.',
        status: 'READY',
      },
    ],
    []
  )

  const docs = useMemo(() => Array.from(new Set(DOC_INDEX)), [])

  return (
    <div className="w-full">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-10">
        <Shell>
          <div className="border-b border-black/10 px-6 py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={cn('text-[11px] tracking-[0.22em] text-black/45', plexMono.className)}>PROTOCOLLM</div>
                <h1 className={cn('mt-1 text-2xl font-semibold text-black/90 md:text-3xl', outfit.className)}>
                  A local compliance console for food service
                </h1>
                <p className={cn('mt-2 max-w-2xl text-[14px] leading-6 text-black/60', inter.className)}>
                  Built for Washtenaw County workflows: documents you trust, answers you can act on, scans that help staff catch issues
                  before the inspector does.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onStartAuth}
                  className={cn(
                    UI.radius2,
                    'inline-flex items-center gap-2 border border-black/15 bg-black px-4 py-2 text-[12px] font-semibold text-white',
                    'transition hover:bg-black/90'
                  )}
                >
                  <Icons.Plus className="h-4 w-4" />
                  Start 7-day trial
                </button>
                <a
                  href="#pricing"
                  className={cn(UI.radius2, 'inline-flex items-center border border-black/15 bg-white/70 px-4 py-2 text-[12px] font-semibold text-black/70 hover:bg-white')}
                >
                  View pricing
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <Panel
                label="MODULE DIRECTORY"
                title="Loaded modules"
                right={<StatusPill label="SYSTEM READY" pulse />}
              >
                <div className="space-y-2">
                  {modules.map((m) => (
                    <div key={m.label} className={cn(UI.radius2, 'border', UI.hair, 'bg-white/70 px-4 py-3')}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-white">
                            {m.icon}
                          </span>
                          <div>
                            <div className={cn('text-[12px] font-semibold text-black/80', outfit.className)}>{m.label}</div>
                            <div className={cn('text-[12px] text-black/55', inter.className)}>{m.desc}</div>
                          </div>
                        </div>
                        <StatusPill label={m.status} pulse />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Panel label="TRIAL" title="Simple, one plan">
                  <div className={cn('text-[12px] leading-6 text-black/65', inter.className)}>
                    Unlimited usage under one price point. Designed for small teams that just want answers fast.
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className={cn('text-[24px] font-semibold text-black', outfit.className)}>$100</div>
                      <div className={cn('text-[12px] text-black/55', inter.className)}>per month</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-[12px] text-black/55', inter.className)}>$1,000 / year</div>
                      <div className={cn('text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>ANNUAL</div>
                    </div>
                  </div>
                </Panel>

                <Panel label="OUTPUT" title="Citable answers">
                  <div className={cn('text-[12px] leading-6 text-black/65', inter.className)}>
                    Q&A responses are grounded in your Washtenaw + Michigan corpus. This keeps the tool useful and predictable for staff.
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[12px] text-black/60">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-white">
                      <Icons.FileText className="h-4 w-4" />
                    </span>
                    <span className={cn(plexMono.className, 'tracking-[0.12em]')}>SOURCES INCLUDED</span>
                  </div>
                </Panel>
              </div>
            </div>

            <div className="md:col-span-5">
              <Panel label="DOCUMENTATION" title="Scrolling index">
                <div className={cn('mb-3 text-[12px] text-black/60', inter.className)}>
                  Live view of what the system is trained on (de-duplicated, extension-free).
                </div>
                <DocDatabase titles={docs} />
                <div className={cn('mt-3 text-[11px] text-black/45', inter.className)}>
                  Add / rename documents anytime—this landing list can be wired to your DB later.
                </div>
              </Panel>
            </div>

            <div className="md:col-span-12" id="pricing">
              <Panel label="PRICING" title="One tier, no surprises">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/70 p-4')}>
                    <div className={cn('text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>MONTHLY</div>
                    <div className={cn('mt-1 text-[26px] font-semibold text-black', outfit.className)}>$100</div>
                    <div className={cn('text-[12px] text-black/55', inter.className)}>Unlimited usage</div>
                  </div>
                  <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/70 p-4')}>
                    <div className={cn('text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>ANNUAL</div>
                    <div className={cn('mt-1 text-[26px] font-semibold text-black', outfit.className)}>$1,000</div>
                    <div className={cn('text-[12px] text-black/55', inter.className)}>Save two months</div>
                  </div>
                  <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/70 p-4')}>
                    <div className={cn('text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>INCLUDES</div>
                    <ul className={cn('mt-2 space-y-2 text-[12px] text-black/65', inter.className)}>
                      {['Visual scan', 'Compliance Q&A', 'Washtenaw-first corpus', 'Unlimited usage'].map((t) => (
                        <li key={t} className="flex items-center gap-2">
                          <Icons.Check className="h-4 w-4 text-black/60" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </Shell>
      </div>
    </div>
  )
}

// ---------- Auth UI ----------
function MonoInput({ label, helper, error, right, ...props }) {
  return (
    <div>
      {label ? <div className={cn('mb-2 text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>{label}</div> : null}
      <div className={cn(UI.radius2, 'flex items-stretch gap-2 border', error ? 'border-red-400/50' : UI.hair, 'bg-white/75')}>
        <input
          {...props}
          className={cn(
            plexMono.className,
            'min-w-0 flex-1 bg-transparent px-4 py-3 text-[13px] text-black/80 outline-none placeholder:text-black/35'
          )}
        />
        {right ? <div className="flex items-center pr-3">{right}</div> : null}
      </div>
      {helper ? <div className={cn('mt-2 text-[12px] text-black/45', inter.className)}>{helper}</div> : null}
      {error ? <div className={cn('mt-2 text-[12px] text-red-600/80', inter.className)}>{error}</div> : null}
    </div>
  )
}

function AuthCard({ mode, email, setEmail, code, setCode, onRequestCode, onVerify, onBack, loading, error }) {
  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-10">
      <Shell>
        <div className="border-b border-black/10 px-6 py-5">
          <div className={cn('text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>AUTH</div>
          <div className={cn('mt-1 text-[18px] font-semibold text-black/85', outfit.className)}>
            {mode === 'email' ? 'Request login code' : 'Enter verification code'}
          </div>
          <div className={cn('mt-1 text-[12px] text-black/55', inter.className)}>
            {mode === 'email'
              ? 'We’ll email a 6‑digit code. No passwords.'
              : 'Check your inbox and enter the 6‑digit code to continue.'}
          </div>
        </div>

        <div className="p-6">
          {mode === 'email' ? (
            <div className="space-y-4">
              <MonoInput
                label="EMAIL"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
              />
              <button
                onClick={onRequestCode}
                disabled={loading || !email}
                className={cn(
                  UI.radius2,
                  'w-full border border-black/15 bg-black px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-black/90 disabled:opacity-50'
                )}
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
              <button
                onClick={onBack}
                className={cn(UI.radius2, 'w-full border border-black/15 bg-white/70 px-4 py-3 text-[12px] font-semibold text-black/70 hover:bg-white')}
              >
                Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <MonoInput
                label="CODE"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                error={error}
              />
              <button
                onClick={onVerify}
                disabled={loading || code.length < 6}
                className={cn(
                  UI.radius2,
                  'w-full border border-black/15 bg-black px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-black/90 disabled:opacity-50'
                )}
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                onClick={onBack}
                className={cn(UI.radius2, 'w-full border border-black/15 bg-white/70 px-4 py-3 text-[12px] font-semibold text-black/70 hover:bg-white')}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </Shell>
    </div>
  )
}

// ---------- App (chat / scan) ----------
function SourcePill({ text }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-black/15 bg-white/70 px-2 py-1 text-[11px] text-black/70', plexMono.className)}>
      {text}
    </span>
  )
}

function TypingIndicator() {
  return (
    <div className={cn('inline-flex items-center gap-1', plexMono.className)}>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/45 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/45 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/45" />
    </div>
  )
}

function MessageBlock({ role, ts, content, sources, image }) {
  const [imgUrl, setImgUrl] = useState(null)

  useEffect(() => {
    if (!image) return
    if (typeof image === 'string') {
      setImgUrl(image)
      return
    }
    try {
      const url = URL.createObjectURL(image)
      setImgUrl(url)
      return () => URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }, [image])

  const isUser = role === 'user'
  return (
    <div className={cn('space-y-2', isUser ? 'text-black/80' : 'text-black/80')}>
      <div className={cn(UI.radius2, 'border', UI.hair, isUser ? 'bg-white/70' : 'bg-[#f6f6f4]', 'p-4')}>
        <div className={cn('mb-2 flex items-center justify-between text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>
          <span>{isUser ? 'USER' : 'PROTOCOLLM'}</span>
          <span className="text-black/35">{ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
        </div>
        <div className={cn('whitespace-pre-wrap text-[13px] leading-6', inter.className)}>{content}</div>

        {imgUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white">
            <img src={imgUrl} alt="attached" className="h-48 w-full object-cover" />
            <div className={cn('border-t border-black/10 px-3 py-2 text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>
              ATTACHED IMAGE
            </div>
          </div>
        ) : null}

        {sources?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map((s, idx) => (
              <SourcePill key={`${s}-${idx}`} text={s} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ChatComposer({ value, setValue, onSend, disabled, onPickImage, imageLabel, onClearImage }) {
  return (
    <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/70 p-3')}>
      <div className="flex items-center justify-between gap-2">
        <div className={cn('text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>COMMAND</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPickImage}
            className={cn(UI.radius2, 'inline-flex items-center gap-2 border border-black/15 bg-white px-3 py-1.5 text-[11px] font-semibold text-black/70 hover:bg-white/90')}
            type="button"
          >
            <Icons.Camera className="h-4 w-4" />
            Attach
          </button>
          <button
            onClick={onSend}
            disabled={disabled}
            className={cn(UI.radius2, 'inline-flex items-center border border-black/15 bg-black px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-black/90 disabled:opacity-50')}
            type="button"
          >
            Run
          </button>
        </div>
      </div>

      {imageLabel ? (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-black/10 bg-white/70 px-3 py-2">
          <div className={cn('text-[11px] text-black/60', inter.className)}>
            <span className={cn('mr-2', plexMono.className)}>IMAGE:</span> {imageLabel}
          </div>
          <button onClick={onClearImage} className="p-1 text-black/45 hover:text-black/70" type="button">
            <Icons.X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="plm> describe the situation, ask a question, or attach a photo…"
          className={cn(
            UI.radius2,
            plexMono.className,
            'w-full resize-none border border-black/10 bg-white/80 px-4 py-3 text-[13px] text-black/80 outline-none placeholder:text-black/35 focus:border-black/20'
          )}
        />
      </div>
    </div>
  )
}

function AppShell({ user, supabase, onSignOut, onOpenPortal, onStartCheckout, isSubscribed, subscriptionLoading }) {
  const fileRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImageName, setSelectedImageName] = useState('')
  const [error, setError] = useState('')
  const [sourcesByMsgIndex, setSourcesByMsgIndex] = useState({})
  const [chatId, setChatId] = useState(null)

  const send = useCallback(async () => {
    if (sending) return
    if (!input.trim() && !selectedImage) return
    if (!isSubscribed) {
      setError('Start your trial to use the console.')
      return
    }

    setSending(true)
    setError('')

    const newUser = { role: 'user', ts: Date.now(), content: input.trim() || '(image)', image: selectedImage || null }
    const outgoing = [...messages, newUser]
    setMessages(outgoing)
    setInput('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: outgoing, image: selectedImage, chatId }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Request failed')

      const assistant = { role: 'assistant', ts: Date.now(), content: json?.message || 'OK.' }
      setMessages((m) => [...m, assistant])

      if (json?.chatId) setChatId(json.chatId)
      if (json?.sources) {
        setSourcesByMsgIndex((prev) => ({ ...prev, [outgoing.length]: json.sources }))
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', ts: Date.now(), content: `Error: ${e.message || 'failed'}` }])
    } finally {
      setSending(false)
      setSelectedImage(null)
      setSelectedImageName('')
    }
  }, [sending, input, selectedImage, isSubscribed, messages, chatId])

  const pickImage = useCallback(() => fileRef.current?.click(), [])
  const clearImage = useCallback(() => {
    setSelectedImage(null)
    setSelectedImageName('')
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const onFile = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
      setSelectedImageName(file.name)
    } catch (err) {
      setError('Could not process image.')
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-10">
      <Shell>
        <div className="border-b border-black/10 px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('text-[12px] tracking-[0.22em] text-black/45', plexMono.className)}>protocolLM shell</div>
              <StatusPill label={subscriptionLoading ? 'CHECKING…' : isSubscribed ? 'READY' : 'LOCKED'} pulse={isSubscribed} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isSubscribed ? (
                <button
                  onClick={onStartCheckout}
                  className={cn(UI.radius2, 'inline-flex items-center gap-2 border border-black/15 bg-black px-4 py-2 text-[12px] font-semibold text-white hover:bg-black/90')}
                >
                  Start trial
                </button>
              ) : (
                <button
                  onClick={onOpenPortal}
                  className={cn(UI.radius2, 'inline-flex items-center gap-2 border border-black/15 bg-white/70 px-4 py-2 text-[12px] font-semibold text-black/70 hover:bg-white')}
                >
                  <Icons.Settings className="h-4 w-4" />
                  Billing
                </button>
              )}
              <button
                onClick={onSignOut}
                className={cn(UI.radius2, 'inline-flex items-center gap-2 border border-black/15 bg-white/70 px-4 py-2 text-[12px] font-semibold text-black/70 hover:bg-white')}
              >
                <Icons.LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-12">
          <div className="md:col-span-4">
            <Panel label="SESSION" title="Account">
              <div className={cn('space-y-2 text-[12px] text-black/65', inter.className)}>
                <div className="flex items-center justify-between gap-3">
                  <span className={cn('text-black/45', plexMono.className)}>USER</span>
                  <span className="truncate text-right">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={cn('text-black/45', plexMono.className)}>PLAN</span>
                  <span className="text-right">{isSubscribed ? 'Unlimited' : 'Trial required'}</span>
                </div>
              </div>

              {!isSubscribed ? (
                <div className="mt-4 rounded-xl border border-black/10 bg-white/60 p-3">
                  <div className={cn('text-[12px] font-semibold text-black/75', outfit.className)}>Unlock the console</div>
                  <div className={cn('mt-1 text-[12px] text-black/55', inter.className)}>
                    Start your 7‑day trial to run scans and ask questions.
                  </div>
                  <button
                    onClick={onStartCheckout}
                    className={cn(UI.radius2, 'mt-3 w-full border border-black/15 bg-black px-4 py-2 text-[12px] font-semibold text-white hover:bg-black/90')}
                  >
                    Start trial
                  </button>
                </div>
              ) : null}
            </Panel>

            <div className="mt-4">
              <Panel label="MODULES" title="Status">
                <div className="space-y-2">
                  {[
                    ['Visual Scan', true],
                    ['Compliance Q&A', true],
                    ['Local Rules', true],
                    ['Licensing', true],
                  ].map(([name, ok]) => (
                    <div key={name} className={cn('flex items-center justify-between rounded-xl border border-black/10 bg-white/70 px-3 py-2')}>
                      <div className={cn('text-[12px] text-black/70', inter.className)}>{name}</div>
                      <StatusPill label={ok ? 'READY' : 'OFFLINE'} pulse={ok} />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <div className="md:col-span-8">
            <Panel
              label="CONSOLE"
              title="Ask or scan"
              right={
                <div className={cn('text-[10px] tracking-[0.22em] text-black/40', plexMono.className)}>
                  {messages.length ? `${messages.length} LOGS` : 'NO LOGS'}
                </div>
              }
            >
              <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/60 p-3')}>
                <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
                  {messages.length ? (
                    messages.map((m, idx) => (
                      <MessageBlock
                        key={idx}
                        role={m.role}
                        ts={m.ts}
                        content={m.content}
                        image={m.image}
                        sources={sourcesByMsgIndex[idx] || null}
                      />
                    ))
                  ) : (
                    <div className={cn('p-4 text-[13px] leading-6 text-black/60', inter.className)}>
                      Try: “What are the top critical violations the inspector flags?” or attach a walk‑in cooler photo and type: “scan this”.
                    </div>
                  )}
                  {sending ? (
                    <div className={cn(UI.radius2, 'border', UI.hair, 'bg-white/70 p-4')}>
                      <TypingIndicator />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3">
                <ChatComposer
                  value={input}
                  setValue={setInput}
                  onSend={send}
                  disabled={sending || (!input.trim() && !selectedImage) || !isSubscribed}
                  onPickImage={pickImage}
                  imageLabel={selectedImageName}
                  onClearImage={clearImage}
                />
                {error ? <div className={cn('mt-2 text-[12px] text-red-600/80', inter.className)}>{error}</div> : null}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    </div>
  )
}

// ---------- Page ----------
export default function Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [bootDone, setBootDone] = useState(false)
  const [bootCollapsed, setBootCollapsed] = useState(false)

  const [authMode, setAuthMode] = useState('landing') // landing | email | code | app
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [user, setUser] = useState(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const { token: recaptchaToken, executeRecaptcha, resetRecaptcha } = useRecaptcha()

  // session bootstrap
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(data?.user ?? null)
      setAuthMode(data?.user ? 'app' : 'landing')
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthMode(session?.user ? 'app' : 'landing')
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [supabase])

  // handle stripe redirect flags
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    if (success || canceled) {
      // strip params
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  // subscription state
  const fetchSubscription = useCallback(async () => {
    setSubscriptionLoading(true)
    try {
      const res = await fetch('/api/subscription/status', { method: 'GET' })
      const json = await res.json().catch(() => null)
      setIsSubscribed(Boolean(json?.active))
    } catch {
      setIsSubscribed(false)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setIsSubscribed(false)
      setSubscriptionLoading(false)
      return
    }
    fetchSubscription()
  }, [user, fetchSubscription])

  // auth flows
  const startAuth = useCallback(() => {
    setAuthError('')
    setEmail('')
    setCode('')
    setAuthMode('email')
  }, [])

  const requestCode = useCallback(async () => {
    setAuthError('')
    setAuthLoading(true)
    try {
      let token = null
      if (executeRecaptcha) {
        try {
          token = await executeRecaptcha('login_code')
        } catch {
          token = null
        }
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, captchaToken: token || undefined },
      })

      if (error) throw error
      setAuthMode('code')
      resetRecaptcha?.()
    } catch (e) {
      setAuthError(e?.message || 'Could not send code.')
    } finally {
      setAuthLoading(false)
    }
  }, [email, supabase, executeRecaptcha, resetRecaptcha])

  const verifyCode = useCallback(async () => {
    setAuthError('')
    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })
      if (error) throw error
      setUser(data?.user || null)
      setAuthMode('app')
    } catch (e) {
      setAuthError(e?.message || 'Invalid code.')
    } finally {
      setAuthLoading(false)
    }
  }, [email, code, supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAuthMode('landing')
  }, [supabase])

  const openPortal = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json().catch(() => null)
      if (json?.url) window.location.href = json.url
    } catch {
      // ignore
    }
  }, [])

  const startCheckout = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: MONTHLY_PRICE }),
      })
      const json = await res.json().catch(() => null)
      if (json?.url) window.location.href = json.url
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className={cn(UI.bg, UI.ink, inter.className, 'min-h-screen')}>
      <GlobalStyles />
      <RecaptchaBadge />

      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className={cn('text-[13px] font-semibold tracking-tight text-black/85', outfit.className)}>protocolLM</span>
          </Link>
          <div className={cn('text-[10px] tracking-[0.22em] text-black/45', plexMono.className)}>
            WASHTENAW • COMPLIANCE CONSOLE
          </div>
        </div>
      </header>

      {/* boot */}
      {!bootDone ? (
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-10">
          <BootPanel
            collapsed={bootCollapsed}
            onDone={() => {
              setBootDone(true)
              setTimeout(() => setBootCollapsed(true), 200)
            }}
          />
        </div>
      ) : null}

      {/* main */}
      {authMode === 'landing' ? <LandingPage onStartAuth={startAuth} /> : null}
      {authMode === 'email' ? (
        <AuthCard
          mode="email"
          email={email}
          setEmail={setEmail}
          code={code}
          setCode={setCode}
          onRequestCode={requestCode}
          onVerify={verifyCode}
          onBack={() => setAuthMode('landing')}
          loading={authLoading}
          error={authError}
        />
      ) : null}
      {authMode === 'code' ? (
        <AuthCard
          mode="code"
          email={email}
          setEmail={setEmail}
          code={code}
          setCode={setCode}
          onRequestCode={requestCode}
          onVerify={verifyCode}
          onBack={() => setAuthMode('email')}
          loading={authLoading}
          error={authError}
        />
      ) : null}
      {authMode === 'app' && user ? (
        <AppShell
          user={user}
          supabase={supabase}
          onSignOut={signOut}
          onOpenPortal={openPortal}
          onStartCheckout={startCheckout}
          isSubscribed={isSubscribed}
          subscriptionLoading={subscriptionLoading}
        />
      ) : null}

      <footer className="border-t border-black/10 bg-white/70">
        <div className={cn('mx-auto max-w-6xl px-5 py-6 text-[11px] text-black/45', inter.className)}>
          © {new Date().getFullYear()} protocolLM · Built for Washtenaw County food service teams.
        </div>
      </footer>
    </div>
  )
}
