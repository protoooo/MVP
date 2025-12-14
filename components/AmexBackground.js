// components/AmexBackground.js
'use client'

import React from 'react'

export default function AmexBackground() {
  return (
    <div className="plm-amex-bg" aria-hidden="true">
      {/* Base */}
      <div className="plm-base" />

      {/* Subtle metallic sheens */}
      <div className="plm-sheen plm-sheen-top" />
      <div className="plm-sheen plm-sheen-left" />
      <div className="plm-sheen plm-sheen-right" />

      {/* Soft vignette / depth */}
      <div className="plm-vignette" />
      <div className="plm-edge" />

      {/* “Gemini” wave (Aceternity-inspired, subtle + slow) */}
      <div className="plm-gemini-wrap">
        <svg
          className="plm-gemini-svg"
          viewBox="0 0 1200 320"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft glow */}
            <filter id="plmGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 0.55 0
                "
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Line gradients (fade ends, brightest near center) */}
            <linearGradient id="gBlue" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(80,160,255,0)" />
              <stop offset="18%" stopColor="rgba(80,160,255,0.25)" />
              <stop offset="50%" stopColor="rgba(140,220,255,0.55)" />
              <stop offset="82%" stopColor="rgba(80,160,255,0.25)" />
              <stop offset="100%" stopColor="rgba(80,160,255,0)" />
            </linearGradient>

            <linearGradient id="gBlue2" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(70,140,240,0)" />
              <stop offset="20%" stopColor="rgba(70,140,240,0.22)" />
              <stop offset="50%" stopColor="rgba(120,200,255,0.5)" />
              <stop offset="80%" stopColor="rgba(70,140,240,0.22)" />
              <stop offset="100%" stopColor="rgba(70,140,240,0)" />
            </linearGradient>

            <linearGradient id="gSteel" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(200,220,255,0)" />
              <stop offset="22%" stopColor="rgba(200,220,255,0.14)" />
              <stop offset="50%" stopColor="rgba(220,235,255,0.28)" />
              <stop offset="78%" stopColor="rgba(200,220,255,0.14)" />
              <stop offset="100%" stopColor="rgba(200,220,255,0)" />
            </linearGradient>

            <linearGradient id="gWarm" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,120,120,0)" />
              <stop offset="20%" stopColor="rgba(255,120,120,0.12)" />
              <stop offset="50%" stopColor="rgba(255,170,200,0.22)" />
              <stop offset="80%" stopColor="rgba(255,120,120,0.12)" />
              <stop offset="100%" stopColor="rgba(255,120,120,0)" />
            </linearGradient>

            <linearGradient id="gViolet" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(160,120,255,0)" />
              <stop offset="20%" stopColor="rgba(160,120,255,0.14)" />
              <stop offset="50%" stopColor="rgba(190,160,255,0.26)" />
              <stop offset="80%" stopColor="rgba(160,120,255,0.14)" />
              <stop offset="100%" stopColor="rgba(160,120,255,0)" />
            </linearGradient>
          </defs>

          {/* Lines (base + pulse overlay per line) */}
          <g className="plm-gemini" filter="url(#plmGlow)">
            {/* 1 */}
            <path
              className="plm-line plm-line-1"
              d="M-40 180 C 200 180, 340 180, 460 180 C 540 180, 560 228, 600 228 C 640 228, 660 180, 740 180 C 860 180, 1000 180, 1240 180"
            />
            <path
              className="plm-pulse plm-pulse-1"
              d="M-40 180 C 200 180, 340 180, 460 180 C 540 180, 560 228, 600 228 C 640 228, 660 180, 740 180 C 860 180, 1000 180, 1240 180"
            />

            {/* 2 */}
            <path
              className="plm-line plm-line-2"
              d="M-40 205 C 210 205, 360 205, 485 205 C 555 205, 575 248, 600 248 C 625 248, 645 205, 715 205 C 840 205, 980 205, 1240 205"
            />
            <path
              className="plm-pulse plm-pulse-2"
              d="M-40 205 C 210 205, 360 205, 485 205 C 555 205, 575 248, 600 248 C 625 248, 645 205, 715 205 C 840 205, 980 205, 1240 205"
            />

            {/* 3 */}
            <path
              className="plm-line plm-line-3"
              d="M-40 230 C 220 230, 380 230, 505 230 C 570 230, 590 265, 600 265 C 610 265, 630 230, 695 230 C 820 230, 960 230, 1240 230"
            />
            <path
              className="plm-pulse plm-pulse-3"
              d="M-40 230 C 220 230, 380 230, 505 230 C 570 230, 590 265, 600 265 C 610 265, 630 230, 695 230 C 820 230, 960 230, 1240 230"
            />

            {/* 4 */}
            <path
              className="plm-line plm-line-4"
              d="M-40 255 C 230 255, 400 255, 525 255 C 585 255, 602 282, 600 282 C 598 282, 615 255, 675 255 C 800 255, 940 255, 1240 255"
            />
            <path
              className="plm-pulse plm-pulse-4"
              d="M-40 255 C 230 255, 400 255, 525 255 C 585 255, 602 282, 600 282 C 598 282, 615 255, 675 255 C 800 255, 940 255, 1240 255"
            />

            {/* 5 */}
            <path
              className="plm-line plm-line-5"
              d="M-40 280 C 240 280, 420 280, 545 280 C 600 280, 612 295, 600 295 C 588 295, 600 280, 655 280 C 780 280, 920 280, 1240 280"
            />
            <path
              className="plm-pulse plm-pulse-5"
              d="M-40 280 C 240 280, 420 280, 545 280 C 600 280, 612 295, 600 295 C 588 295, 600 280, 655 280 C 780 280, 920 280, 1240 280"
            />
          </g>
        </svg>
      </div>

      <style jsx>{`
        .plm-amex-bg {
          position: fixed;
          inset: 0;
          z-index: -50;
          pointer-events: none;
          overflow: hidden;
          background: #000;
        }

        .plm-base {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(900px 520px at 50% 35%, rgba(255, 255, 255, 0.035), transparent 60%),
            radial-gradient(720px 520px at 18% 18%, rgba(140, 220, 255, 0.03), transparent 65%),
            radial-gradient(720px 520px at 82% 72%, rgba(255, 170, 200, 0.02), transparent 65%),
            linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.98) 45%, rgba(0, 0, 0, 1) 100%);
        }

        .plm-sheen {
          position: absolute;
          inset: -20%;
          opacity: 0.6;
          filter: blur(0px);
          transform: translateZ(0);
          will-change: transform, opacity;
        }

        .plm-sheen-top {
          background: radial-gradient(ellipse 42% 28% at 50% 12%, rgba(255, 255, 255, 0.06), transparent 60%);
          animation: plmFloatA 22s ease-in-out infinite;
        }

        .plm-sheen-left {
          background: radial-gradient(ellipse 38% 55% at 12% 46%, rgba(120, 160, 210, 0.045), transparent 62%);
          animation: plmFloatB 28s ease-in-out infinite;
        }

        .plm-sheen-right {
          background: radial-gradient(ellipse 40% 60% at 88% 62%, rgba(90, 120, 170, 0.035), transparent 65%);
          animation: plmFloatC 30s ease-in-out infinite;
        }

        .plm-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 55% at 50% 40%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.62) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, transparent 18%, transparent 84%, rgba(0, 0, 0, 0.35) 100%);
          opacity: 0.95;
        }

        .plm-edge {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.02) 0%,
            transparent 6%,
            transparent 94%,
            rgba(255, 255, 255, 0.02) 100%
          );
          opacity: 0.55;
        }

        .plm-gemini-wrap {
          position: absolute;
          left: 50%;
          bottom: -72px;
          transform: translateX(-50%);
          width: min(1400px, 130vw);
          height: 380px;
          opacity: 0.7;
          mask-image: radial-gradient(70% 70% at 50% 45%, #000 55%, transparent 100%);
          -webkit-mask-image: radial-gradient(70% 70% at 50% 45%, #000 55%, transparent 100%);
        }

        .plm-gemini-svg {
          width: 100%;
          height: 100%;
        }

        .plm-gemini {
          animation: plmGeminiFloat 14s ease-in-out infinite;
          transform-origin: 50% 50%;
        }

        .plm-line {
          fill: none;
          stroke-width: 2.2;
          stroke-linecap: round;
          opacity: 0.55;
        }

        .plm-pulse {
          fill: none;
          stroke-width: 2.6;
          stroke-linecap: round;
          opacity: 0.35;
          stroke-dasharray: 140 2400;
          animation: plmDash 18s linear infinite;
        }

        /* Gradients per line */
        .plm-line-1 { stroke: url(#gBlue); }
        .plm-line-2 { stroke: url(#gBlue2); opacity: 0.48; }
        .plm-line-3 { stroke: url(#gSteel); opacity: 0.38; }
        .plm-line-4 { stroke: url(#gWarm); opacity: 0.28; }
        .plm-line-5 { stroke: url(#gViolet); opacity: 0.24; }

        .plm-pulse-1 { stroke: url(#gBlue); animation-duration: 20s; }
        .plm-pulse-2 { stroke: url(#gBlue2); animation-duration: 22s; animation-delay: -4s; opacity: 0.28; }
        .plm-pulse-3 { stroke: url(#gSteel); animation-duration: 24s; animation-delay: -10s; opacity: 0.18; }
        .plm-pulse-4 { stroke: url(#gWarm); animation-duration: 26s; animation-delay: -7s; opacity: 0.16; }
        .plm-pulse-5 { stroke: url(#gViolet); animation-duration: 28s; animation-delay: -13s; opacity: 0.14; }

        @keyframes plmDash {
          0%   { stroke-dashoffset: 2400; }
          100% { stroke-dashoffset: -2400; }
        }

        @keyframes plmGeminiFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }

        @keyframes plmFloatA {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50%      { transform: translate3d(22px, -18px, 0); }
        }
        @keyframes plmFloatB {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50%      { transform: translate3d(-18px, 16px, 0); }
        }
        @keyframes plmFloatC {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50%      { transform: translate3d(14px, 18px, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .plm-sheen-top,
          .plm-sheen-left,
          .plm-sheen-right,
          .plm-gemini,
          .plm-pulse {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
