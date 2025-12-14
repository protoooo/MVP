'use client'

import React, { useEffect, useRef } from 'react'

function clamp01(n) {
  return Math.min(1, Math.max(0, n))
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax - inMin === 0) return outMin
  const t = (value - inMin) / (inMax - inMin)
  return outMin + (outMax - outMin) * t
}

function pickScrollContainer() {
  // Prefer normal document scrolling
  const se = document.scrollingElement || document.documentElement
  const docMax = (se?.scrollHeight || 0) - window.innerHeight
  if (docMax > 8) return { kind: 'window', se }

  // Fallback: find a likely internal scroller (if your body is overflow-hidden)
  const selectors = [
    '[data-scroll-container="true"]',
    '#app-scroll',
    '#scroll-area',
    'main',
    '[role="main"]',
    'body > div',
  ]

  let bestEl = null
  let bestMax = 0

  for (const sel of selectors) {
    const nodes = document.querySelectorAll(sel)
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue
      const cs = window.getComputedStyle(node)
      const oy = cs.overflowY
      if (oy !== 'auto' && oy !== 'scroll') continue
      const max = node.scrollHeight - node.clientHeight
      if (max > bestMax + 8) {
        bestMax = max
        bestEl = node
      }
    }
  }

  if (bestEl) return { kind: 'element', el: bestEl }
  return { kind: 'window', se }
}

function getScrollProgress(container) {
  if (!container) return 0

  if (container.kind === 'element' && container.el) {
    const el = container.el
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return 0
    return clamp01(el.scrollTop / max)
  }

  const se = container.se || document.scrollingElement || document.documentElement
  const max = (se?.scrollHeight || 0) - window.innerHeight
  if (max <= 0) return 0

  // Use scrollY when available; fall back to scrollingElement.scrollTop
  const y = typeof window.scrollY === 'number' ? window.scrollY : se.scrollTop || 0
  return clamp01(y / max)
}

export default function AmexBackground() {
  const p0 = useRef(null)
  const p1 = useRef(null)
  const p2 = useRef(null)
  const p3 = useRef(null)
  const p4 = useRef(null)

  const lengthsRef = useRef([0, 0, 0, 0, 0])
  const containerRef = useRef(null)
  const rafRef = useRef(0)
  const reduceRef = useRef(false)

  const updatePaths = (progress) => {
    const els = [p0.current, p1.current, p2.current, p3.current, p4.current]
    const L = lengthsRef.current

    // Match the “Aceternity” feel: lines are slightly present at the top,
    // then fill quickly, and reverse perfectly when scrolling back up.
    const t = reduceRef.current ? 1 : clamp01(progress)

    const a = clamp01(mapRange(t, 0, 0.8, 0.2, 1.0))
    const b = clamp01(mapRange(t, 0, 0.8, 0.15, 1.0))
    const c = clamp01(mapRange(t, 0, 0.8, 0.1, 1.0))
    const d = clamp01(mapRange(t, 0, 0.8, 0.05, 1.0))
    const e = clamp01(mapRange(t, 0, 0.8, 0.0, 1.0))

    const ps = [a, b, c, d, e]

    for (let i = 0; i < els.length; i++) {
      const el = els[i]
      const len = L[i] || 1
      if (!el) continue
      el.style.strokeDashoffset = String(len * (1 - ps[i]))
    }
  }

  useEffect(() => {
    // Reduced motion
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      reduceRef.current = !!mq.matches
      const onChange = () => {
        reduceRef.current = !!mq.matches
        // snap to full if reduced motion toggles on
        updatePaths(getScrollProgress(containerRef.current))
      }
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    // Init dash lengths once
    const els = [p0.current, p1.current, p2.current, p3.current, p4.current].filter(Boolean)
    if (els.length !== 5) return

    const lengths = els.map((el) => {
      try {
        return el.getTotalLength()
      } catch {
        return 1
      }
    })
    lengthsRef.current = lengths

    // Setup dash for “draw” animation (no framer/motion needed)
    els.forEach((el, i) => {
      const len = lengths[i] || 1
      el.style.strokeDasharray = String(len)
      el.style.strokeDashoffset = String(len)
      el.style.willChange = 'stroke-dashoffset'
      el.style.transition = 'none'
    })

    // Pick scroll container
    containerRef.current = pickScrollContainer()

    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0
        updatePaths(getScrollProgress(containerRef.current))
      })
    }

    const attach = () => {
      const c = containerRef.current
      if (c?.kind === 'element' && c.el) {
        c.el.addEventListener('scroll', onScroll, { passive: true })
      } else {
        window.addEventListener('scroll', onScroll, { passive: true })
      }
    }

    const detach = () => {
      const c = containerRef.current
      if (c?.kind === 'element' && c.el) {
        c.el.removeEventListener('scroll', onScroll)
      } else {
        window.removeEventListener('scroll', onScroll)
      }
    }

    const onResize = () => {
      detach()
      containerRef.current = pickScrollContainer()
      attach()
      onScroll()
    }

    attach()
    window.addEventListener('resize', onResize, { passive: true })

    // First paint
    updatePaths(getScrollProgress(containerRef.current))

    return () => {
      detach()
      window.removeEventListener('resize', onResize)
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Amex-black base (no styled-jsx) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 700px at 50% 35%, rgba(255,255,255,0.06), transparent 55%),' +
            'radial-gradient(900px 520px at 20% 20%, rgba(7,110,255,0.10), transparent 60%),' +
            'linear-gradient(180deg, #050608 0%, #030406 70%, #020304 100%)',
        }}
      />

      {/* Gemini lines (centered + subtle) */}
      <div className="absolute inset-0">
        <svg
          viewBox="0 0 1440 890"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-1/2 top-1/2 h-auto w-[1400px] max-w-[180vw] -translate-x-1/2 -translate-y-1/2 opacity-90"
          style={{
            mixBlendMode: 'screen',
            filter: 'saturate(1.1)',
          }}
        >
          {/* Animated (sharp) paths */}
          <path
            ref={p0}
            d="M0 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1440 662.5"
            stroke="#FFB7C5"
            strokeWidth="2"
            fill="none"
            opacity="0.85"
            strokeLinecap="round"
          />
          <path
            ref={p1}
            d="M0 587.5C147 587.5 277 587.5 310 573.5C348 563 392.5 543.5 408 535C434 523.5 426 526.235 479 515.235C494 512.729 523 510.435 534.5 512.735C554.5 516.735 555.5 523.235 576 523.735C592 523.735 616 496.735 633 497.235C648.671 497.235 661.31 515.052 684.774 524.942C692.004 527.989 700.2 528.738 707.349 525.505C724.886 517.575 741.932 498.33 757.5 498.742C773.864 498.742 791.711 520.623 810.403 527.654C816.218 529.841 822.661 529.246 828.451 526.991C849.246 518.893 861.599 502.112 879.5 501.742C886.47 501.597 896.865 506.047 907.429 510.911C930.879 521.707 957.139 519.639 982.951 520.063C1020.91 520.686 1037.5 530.797 1056.5 537C1102.24 556.627 1116.5 570.704 1180.5 579.235C1257.5 589.5 1279 587 1440 588"
            stroke="#FFDDB7"
            strokeWidth="2"
            fill="none"
            opacity="0.8"
            strokeLinecap="round"
          />
          <path
            ref={p2}
            d="M0 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1440 513.235"
            stroke="#B1C5FF"
            strokeWidth="2"
            fill="none"
            opacity="0.8"
            strokeLinecap="round"
          />
          <path
            ref={p3}
            d="M0 438.5C150.5 438.5 261 438.318 323.5 456.5C351 464.5 387.517 484.001 423.5 494.5C447.371 501.465 472 503.735 487 507.735C503.786 512.212 504.5 516.808 523 518.735C547 521.235 564.814 501.235 584.5 501.235C604.5 501.235 626 529.069 643 528.569C658.676 528.569 672.076 511.63 695.751 501.972C703.017 499.008 711.231 498.208 718.298 501.617C735.448 509.889 751.454 529.98 767 529.569C783.364 529.569 801.211 507.687 819.903 500.657C825.718 498.469 832.141 499.104 837.992 501.194C859.178 508.764 873.089 523.365 891 523.735C907.8 524.083 923 504.235 963 506.735C1034.5 506.735 1047.5 492.68 1071 481.5C1122.5 457 1142.23 452.871 1185 446.5C1255.5 436 1294 439 1439.5 439"
            stroke="#4FABFF"
            strokeWidth="2"
            fill="none"
            opacity="0.78"
            strokeLinecap="round"
          />
          <path
            ref={p4}
            d="M0.5 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1439 364"
            stroke="#076EFF"
            strokeWidth="2"
            fill="none"
            opacity="0.75"
            strokeLinecap="round"
          />

          {/* Soft glow duplicates */}
          <defs>
            <filter id="geminiBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>

          <g filter="url(#geminiBlur)" opacity="0.35">
            <path
              d="M0 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1440 662.5"
              stroke="#FFB7C5"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M0 587.5C147 587.5 277 587.5 310 573.5C348 563 392.5 543.5 408 535C434 523.5 426 526.235 479 515.235C494 512.729 523 510.435 534.5 512.735C554.5 516.735 555.5 523.235 576 523.735C592 523.735 616 496.735 633 497.235C648.671 497.235 661.31 515.052 684.774 524.942C692.004 527.989 700.2 528.738 707.349 525.505C724.886 517.575 741.932 498.33 757.5 498.742C773.864 498.742 791.711 520.623 810.403 527.654C816.218 529.841 822.661 529.246 828.451 526.991C849.246 518.893 861.599 502.112 879.5 501.742C886.47 501.597 896.865 506.047 907.429 510.911C930.879 521.707 957.139 519.639 982.951 520.063C1020.91 520.686 1037.5 530.797 1056.5 537C1102.24 556.627 1116.5 570.704 1180.5 579.235C1257.5 589.5 1279 587 1440 588"
              stroke="#FFDDB7"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M0 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1440 513.235"
              stroke="#B1C5FF"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M0 438.5C150.5 438.5 261 438.318 323.5 456.5C351 464.5 387.517 484.001 423.5 494.5C447.371 501.465 472 503.735 487 507.735C503.786 512.212 504.5 516.808 523 518.735C547 521.235 564.814 501.235 584.5 501.235C604.5 501.235 626 529.069 643 528.569C658.676 528.569 672.076 511.63 695.751 501.972C703.017 499.008 711.231 498.208 718.298 501.617C735.448 509.889 751.454 529.98 767 529.569C783.364 529.569 801.211 507.687 819.903 500.657C825.718 498.469 832.141 499.104 837.992 501.194C859.178 508.764 873.089 523.365 891 523.735C907.8 524.083 923 504.235 963 506.735C1034.5 506.735 1047.5 492.68 1071 481.5C1122.5 457 1142.23 452.871 1185 446.5C1255.5 436 1294 439 1439.5 439"
              stroke="#4FABFF"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M0.5 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1439 364"
              stroke="#076EFF"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* Vignette to keep it “black card” and not too loud */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 700px at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)',
        }}
      />
    </div>
  )
}
