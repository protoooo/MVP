// components/AmexBackground.js
'use client'

export default function AmexBackground() {
  return (
    <div aria-hidden="true" className="amx-root">
      {/* Base matte black */}
      <div className="amx-base" />

      {/* Top specular “card sheen” */}
      <div className="amx-sheen" />

      {/* Subtle dot grid (very low contrast) */}
      <div className="amx-grid" />

      {/* Soft moving beams (aceternity-ish, but restrained) */}
      <div className="amx-beam amx-beam1" />
      <div className="amx-beam amx-beam2" />

      {/* Bottom geometry plate (matte-tech linework) */}
      <div className="amx-plate">
        <svg viewBox="0 0 1200 260" preserveAspectRatio="none" className="amx-plateSvg">
          <defs>
            <linearGradient id="amxStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(255,255,255,0.00)" />
              <stop offset="0.35" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="0.70" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.00)" />
            </linearGradient>

            <pattern id="amxDiag" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M-6 26 L26 -6" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
              <path d="M6 32 L32 6" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            </pattern>

            <clipPath id="amxClip">
              <polygon points="0,260 1200,260 820,0 380,0" />
            </clipPath>

            <linearGradient id="amxFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.00)" />
            </linearGradient>
          </defs>

          {/* Soft filled plate */}
          <polygon points="0,260 1200,260 820,0 380,0" fill="url(#amxFill)" opacity="0.55" />

          {/* Diagonal micro-lines inside the plate */}
          <rect x="0" y="0" width="1200" height="260" fill="url(#amxDiag)" clipPath="url(#amxClip)" opacity="0.55" />

          {/* Main outlines */}
          <polygon points="0,260 1200,260 820,0 380,0" fill="none" stroke="url(#amxStroke)" strokeWidth="1.25" opacity="0.9" />
          <polygon points="80,260 1120,260 785,35 415,35" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" opacity="0.8" />

          {/* A few internal rails */}
          <path d="M140 260 L470 35" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <path d="M240 260 L520 35" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <path d="M960 260 L680 35" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <path d="M1060 260 L730 35" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </svg>
      </div>

      {/* Vignette for “photographed card” edges */}
      <div className="amx-vignette" />

      <style jsx>{`
        .amx-root {
          position: fixed;
          inset: 0;
          z-index: -10;
          pointer-events: none;
          overflow: hidden;
          background: #000;
        }

        .amx-base {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(1200px 800px at 50% 20%, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0) 55%),
            radial-gradient(900px 700px at 15% 55%, rgba(120, 140, 170, 0.06), rgba(0, 0, 0, 0) 60%),
            radial-gradient(900px 700px at 85% 60%, rgba(80, 95, 120, 0.05), rgba(0, 0, 0, 0) 62%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0) 35%),
            #000;
        }

        .amx-sheen {
          position: absolute;
          inset: -20%;
          background: radial-gradient(ellipse 40% 22% at 50% 10%, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0) 70%);
          filter: blur(2px);
          opacity: 0.75;
          transform: translateZ(0);
          animation: amxSheen 18s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .amx-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px);
          background-size: 26px 26px;
          background-position: 0 0;
          opacity: 0.18;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%);
        }

        .amx-beam {
          position: absolute;
          inset: -40% -60%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.08) 45%,
            rgba(255, 255, 255, 0.14) 50%,
            rgba(255, 255, 255, 0.08) 55%,
            rgba(255, 255, 255, 0) 100%
          );
          filter: blur(10px);
          opacity: 0.35;
          mix-blend-mode: screen;
          transform: rotate(12deg) translate3d(0, 0, 0);
          animation: amxSweep 12s linear infinite;
          will-change: transform, opacity;
        }

        .amx-beam1 {
          animation-duration: 14s;
          opacity: 0.26;
          transform: rotate(14deg);
        }

        .amx-beam2 {
          animation-duration: 18s;
          animation-delay: -6s;
          opacity: 0.18;
          transform: rotate(-10deg);
        }

        .amx-plate {
          position: absolute;
          left: 50%;
          bottom: -110px;
          width: 130%;
          max-width: 1600px;
          transform: translateX(-50%);
          opacity: 0.55;
          filter: blur(0.2px);
        }

        .amx-plateSvg {
          width: 100%;
          height: auto;
          display: block;
        }

        .amx-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 75% 55% at 50% 35%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.35));
          opacity: 0.95;
        }

        @keyframes amxSweep {
          0% {
            transform: rotate(12deg) translate3d(-6%, -2%, 0);
            opacity: 0.05;
          }
          25% {
            opacity: 0.28;
          }
          50% {
            transform: rotate(12deg) translate3d(6%, 2%, 0);
            opacity: 0.18;
          }
          75% {
            opacity: 0.26;
          }
          100% {
            transform: rotate(12deg) translate3d(-6%, -2%, 0);
            opacity: 0.05;
          }
        }

        @keyframes amxSheen {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.55;
          }
          50% {
            transform: translate3d(0, 14px, 0) scale(1.02);
            opacity: 0.85;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.55;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .amx-sheen,
          .amx-beam {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
