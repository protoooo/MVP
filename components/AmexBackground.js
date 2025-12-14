'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Tracks scroll progress even when the scroll happens inside an overflow container.
 * Uses capture-phase scroll listener to catch non-bubbling scroll events.
 */
function useCapturedScrollProgress() {
  const [progress, setProgress] = useState(0)
  const lastScrollableRef = useRef(null)
  const rafRef = useRef(null)

  const computeProgress = (el) => {
    const target =
      el && el !== document ? el : document.scrollingElement || document.documentElement

    if (!target) return 0

    const max = Math.max(0, (target.scrollHeight || 0) - (target.clientHeight || 0))
    if (max <= 6) {
      // If nothing scrolls, keep a tasteful baseline so it doesn't look broken.
      return 0.18
    }

    const top = typeof target.scrollTop === 'number' ? target.scrollTop : 0
    return clamp(top / max, 0, 1)
  }

  const scheduleUpdate = () => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const p = computeProgress(lastScrollableRef.current)
      setProgress(p)
    })
  }

  useEffect(() => {
    const onScrollCapture = (e) => {
      const t = e?.target

      // Prefer the actual scrolling element if it can scroll
      if (t && t !== document && t instanceof HTMLElement) {
        if ((t.scrollHeight || 0) > (t.clientHeight || 0) + 6) {
          lastScrollableRef.current = t
          scheduleUpdate()
          return
        }
      }

      // Fallback to document scroll
      lastScrollableRef.current = document.scrollingElement || document.documentElement
      scheduleUpdate()
    }

    const onResize = () => scheduleUpdate()

    document.addEventListener('scroll', onScrollCapture, true)
    window.addEventListener('resize', onResize)

    lastScrollableRef.current = document.scrollingElement || document.documentElement
    scheduleUpdate()

    return () => {
      document.removeEventListener('scroll', onScrollCapture, true)
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  return progress
}

function ensureGlobalStylesOnce() {
  if (typeof document === 'undefined') return
  const id = 'plm-amex-bg-global-styles'
  if (document.getElementById(id)) return

  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    html, body {
      background: #050608; /* prevents white flash on refresh */
    }
  `
  document.head.appendChild(style)
}

export default function AmexBackground() {
  useEffect(() => {
    ensureGlobalStylesOnce()
  }, [])

  const pRaw = useCapturedScrollProgress()

  // Smooth it so it feels premium and not jittery
  const p = useMemo(() => {
    return easeInOutCubic(clamp(pRaw, 0, 1))
  }, [pRaw])

  // Stagger fills like the Aeternity demo (fills down, reverses up automatically)
  const reveals = useMemo(() => {
    const r = (offset) => clamp((p - offset) * 1.18, 0, 1)
    return {
      r1: r(0.00),
      r2: r(0.04),
      r3: r(0.08),
      r4: r(0.12),
      r5: r(0.16),
    }
  }, [p])

  // Slightly stronger as you scroll, but still subtle
  const intensity = useMemo(() => 0.55 + 0.45 * p, [p])

  return (
    <div className="plm-bg-root" aria-hidden="true">
      {/* Base “Amex black card” matte background */}
      <div className="plm-bg-base" />
      <div className="plm-bg-grain" />
      <div className="plm-bg-vignette" />

      {/* Gemini center beam (in the middle of the page) */}
      <div className="plm-gemini-wrap" style={{ opacity: intensity }}>
        <svg className="plm-gemini" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="plmGlow" x="-35%" y="-70%" width="170%" height="240%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gemini-ish palette */}
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.95" />
              <stop offset="38%" stopColor="#22D3EE" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#A78BFA" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#F472B6" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#34D399" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#A78BFA" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.85" />
            </linearGradient>

            <radialGradient id="core" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="35%" stopColor="#A78BFA" stopOpacity="0.12" />
              <stop offset="65%" stopColor="#22D3EE" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* soft center bloom */}
          <circle cx="600" cy="210" r="150" fill="url(#core)" />

          {/* lines fill toward center, then reverse when scrolling up */}
          <GeminiLine y={164} reveal={reveals.r5} stroke="url(#g2)" w={3} />
          <GeminiLine y={186} reveal={reveals.r4} stroke="url(#g1)" w={3.2} />
          <GeminiLine y={210} reveal={reveals.r3} stroke="url(#g2)" w={3.4} />
          <GeminiLine y={234} reveal={reveals.r2} stroke="url(#g1)" w={3.2} />
          <GeminiLine y={256} reveal={reveals.r1} stroke="url(#g2)" w={3} />
        </svg>
      </div>

      {/* Plain CSS (NOT styled-jsx) to avoid the Railway build crash */}
      <style>{`
        .plm-bg-root {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        /* Matte “black card” base */
        .plm-bg-base {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(1100px 700px at 50% 35%, rgba(255,255,255,0.05), transparent 62%),
            radial-gradient(900px 520px at 20% 22%, rgba(34,211,238,0.06), transparent 62%),
            radial-gradient(900px 520px at 82% 75%, rgba(167,139,250,0.05), transparent 66%),
            linear-gradient(180deg, #050608 0%, #040507 45%, #030407 100%);
        }

        /* Subtle static grain (no spazzing, no data URLs) */
        .plm-bg-grain {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          mix-blend-mode: overlay;
          background-image:
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.05) 0px,
              rgba(255,255,255,0.05) 1px,
              transparent 1px,
              transparent 9px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.03) 0px,
              rgba(255,255,255,0.03) 1px,
              transparent 1px,
              transparent 7px
            );
          filter: blur(0.6px);
          transform: translateZ(0);
        }

        .plm-bg-vignette {
          position: absolute;
          inset: -12%;
          background: radial-gradient(closest-side at 50% 45%, transparent 55%, rgba(0,0,0,0.78) 100%);
        }

        /* Center the Gemini beam in the middle of the page */
        .plm-gemini-wrap {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -52%);
          width: min(1200px, 120vw);
          height: auto;
          filter: saturate(1.05);
        }

        .plm-gemini {
          width: 100%;
          height: auto;
        }

        @media (prefers-reduced-motion: reduce) {
          .plm-gemini-wrap {
            opacity: 0.7 !important;
          }
        }
      `}</style>
    </div>
  )
}

function GeminiLine({ y, reveal, stroke, w }) {
  const leftPath = `M 0 ${y} C 220 ${y - 34}, 380 ${y + 34}, 600 ${y}`
  const rightPath = `M 1200 ${y} C 980 ${y - 34}, 820 ${y + 34}, 600 ${y}`

  const r = clamp(reveal, 0, 1)

  // pathLength=1 makes dash math easy and consistent
  const common = {
    pathLength: 1,
    fill: 'none',
    stroke,
    strokeWidth: w,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    filter: 'url(#plmGlow)',
    style: {
      strokeDasharray: 1,
      strokeDashoffset: 1 - r,
      opacity: 0.95,
    },
  }

  const ghost = {
    ...common,
    strokeWidth: w + 2.2,
    style: {
      strokeDasharray: 1,
      strokeDashoffset: 1 - r,
      opacity: 0.16,
    },
  }

  return (
    <>
      <path d={leftPath} {...ghost} />
      <path d={rightPath} {...ghost} />
      <path d={leftPath} {...common} />
      <path d={rightPath} {...common} />
    </>
  )
}
