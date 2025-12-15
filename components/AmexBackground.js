'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Tracks scroll progress even when the page scroll happens inside an overflow container.
 * We listen to scroll events in capture mode so we can catch non-bubbling scroll events.
 */
function useCapturedScrollProgress() {
  const [progress, setProgress] = useState(0)
  const lastScrollableRef = useRef(null)
  const rafRef = useRef(null)

  const computeProgress = (el) => {
    const target =
      el && el !== document
        ? el
        : (document.scrollingElement || document.documentElement)

    if (!target) return 0

    const max = Math.max(0, (target.scrollHeight || 0) - (target.clientHeight || 0))
    if (max <= 6) {
      // If nothing scrolls, keep a tasteful baseline so it doesn't look "broken"
      return 0.22
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
      // If it's an element that can actually scroll, use it.
      if (t && t !== document && t instanceof HTMLElement) {
        if ((t.scrollHeight || 0) > (t.clientHeight || 0) + 6) {
          lastScrollableRef.current = t
          scheduleUpdate()
          return
        }
      }

      // Fallback to document scrolling element
      lastScrollableRef.current = document.scrollingElement || document.documentElement
      scheduleUpdate()
    }

    const onResize = () => {
      scheduleUpdate()
    }

    // Capture phase catches scroll events from overflow containers.
    document.addEventListener('scroll', onScrollCapture, true)
    window.addEventListener('resize', onResize)

    // Initial paint baseline
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

export default function AmexBackground() {
  const pRaw = useCapturedScrollProgress()

  // Smooth it a bit so it feels premium (not twitchy)
  const p = useMemo(() => {
    const t = clamp(pRaw, 0, 1)
    return easeInOutCubic(t)
  }, [pRaw])

  // Stagger the lines like the Aeternity demo
  const reveals = useMemo(() => {
    const r = (offset) => clamp((p - offset) * 1.15, 0, 1)
    return {
      r1: r(0.00),
      r2: r(0.04),
      r3: r(0.08),
      r4: r(0.12),
      r5: r(0.16),
    }
  }, [p])

  // Subtle intensity scaling with scroll (still tasteful at 0)
  const intensity = useMemo(() => {
    return 0.55 + 0.45 * clamp(p, 0, 1)
  }, [p])

  return (
    <>
      {/* Ensures the background is BEHIND everything but still visible (no negative z-index issues). */}
      <style jsx global>{`
        html, body {
          background: #050608; /* prevents any white flash before hydration */
        }
        body {
          position: relative;
        }
        /* Put all other body children above the background root */
        body > :not(.plm-bg-root) {
          position: relative;
          z-index: 1;
        }
      `}</style>

      <div className="plm-bg-root" aria-hidden="true">
        <div className="plm-bg-base" />

        {/* Gemini center-beam */}
        <div className="plm-gemini-wrap" style={{ opacity: intensity }}>
          <svg
            className="plm-gemini"
            viewBox="0 0 1200 420"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Premium soft glow */}
              <filter id="plmGlow" x="-30%" y="-50%" width="160%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gemini-ish gradient palette */}
              <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#22D3EE" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#A78BFA" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#F472B6" stopOpacity="0.95" />
              </linearGradient>

              <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#34D399" stopOpacity="0.85" />
                <stop offset="75%" stopColor="#A78BFA" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.85" />
              </linearGradient>

              {/* Soft center bloom */}
              <radialGradient id="core" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="35%" stopColor="#A78BFA" stopOpacity="0.12" />
                <stop offset="60%" stopColor="#22D3EE" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Center bloom */}
            <circle cx="600" cy="210" r="140" fill="url(#core)" />

            {/* 5 lines, each split into left+right so they fill toward the center */}
            <GeminiLine y={164} reveal={reveals.r5} stroke="url(#g2)" w={3} />
            <GeminiLine y={186} reveal={reveals.r4} stroke="url(#g1)" w={3.2} />
            <GeminiLine y={210} reveal={reveals.r3} stroke="url(#g2)" w={3.4} />
            <GeminiLine y={234} reveal={reveals.r2} stroke="url(#g1)" w={3.2} />
            <GeminiLine y={256} reveal={reveals.r1} stroke="url(#g2)" w={3} />
          </svg>
        </div>

        <style jsx>{`
          .plm-bg-root {
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
          }

          /* Matte “black card” base with subtle depth */
          .plm-bg-base {
            position: absolute;
            inset: 0;
            background:
              radial-gradient(1200px 700px at 50% 35%, rgba(255, 255, 255, 0.05), transparent 60%),
              radial-gradient(900px 500px at 20% 20%, rgba(34, 211, 238, 0.06), transparent 60%),
              radial-gradient(800px 520px at 80% 75%, rgba(167, 139, 250, 0.05), transparent 65%),
              linear-gradient(180deg, #050608 0%, #040507 40%, #030407 100%);
          }

          /* Film grain */
          .plm-bg-root::before {
            content: '';
            position: absolute;
            inset: 0;
            opacity: 0.055;
            mix-blend-mode: overlay;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
            transform: translateZ(0);
          }

          /* Vignette */
          .plm-bg-root::after {
            content: '';
            position: absolute;
            inset: -10%;
            background: radial-gradient(closest-side at 50% 45%, transparent 55%, rgba(0,0,0,0.75) 100%);
          }

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
              opacity: 0.7;
            }
          }
        `}</style>
      </div>
    </>
  )
}

function GeminiLine({ y, reveal, stroke, w }) {
  const leftPath = `M 0 ${y} C 220 ${y - 34}, 380 ${y + 34}, 600 ${y}`
  const rightPath = `M 1200 ${y} C 980 ${y - 34}, 820 ${y + 34}, 600 ${y}`

  // NOTE: pathLength="1" makes dash math super clean:
  // dasharray=1 always equals full length, dashoffset=1-reveal reveals from the start.
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
      strokeDashoffset: 1 - clamp(reveal, 0, 1),
      opacity: 0.95,
    },
  }

  // Add a faint “ghost” stroke behind for depth
  const ghost = {
    ...common,
    strokeWidth: w + 2.2,
    style: {
      ...common.style,
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
