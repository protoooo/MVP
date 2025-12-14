// components/AmexBackground.js
'use client'

export default function AmexBackground() {
  return (
    <div aria-hidden="true" className="amxRoot">
      {/* Spline iframe layer */}
      <div className="splineWrap">
        <iframe
          title="Background"
          src="https://my.spline.design/3dgradient-AcpgG6LxFkpnJSoowRHPfcbO"
          className="splineFrame"
          frameBorder="0"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          tabIndex={-1}
        />
      </div>

      {/* Amex-black-card matte tuning overlays */}
      <div className="matteBase" />
      <div className="sheen" />
      <div className="grain" />
      <div className="vignette" />

      <style jsx>{`
        .amxRoot {
          position: fixed;
          inset: 0;
          z-index: -10;
          overflow: hidden;
          pointer-events: none;
          background: #000;
        }

        .splineWrap {
          position: absolute;
          inset: 0;
        }

        .splineFrame {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          pointer-events: none;

          /* Make it “black card” subtle */
          filter: saturate(0.85) contrast(1.05) brightness(0.72);
          transform: translateZ(0);
        }

        /* Matte black base to unify/quiet the Spline colors */
        .matteBase {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(1200px 700px at 50% 15%, rgba(255, 255, 255, 0.05), transparent 60%),
            radial-gradient(900px 600px at 18% 55%, rgba(90, 110, 140, 0.10), transparent 62%),
            radial-gradient(900px 600px at 82% 55%, rgba(70, 85, 115, 0.08), transparent 64%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.72) 55%, rgba(0, 0, 0, 0.82) 100%);
          mix-blend-mode: multiply;
          opacity: 0.9;
        }

        /* Subtle top reflection like a photographed card */
        .sheen {
          position: absolute;
          top: -30%;
          left: 50%;
          width: 120%;
          height: 70%;
          transform: translateX(-50%);
          background: radial-gradient(
            ellipse 45% 32% at 50% 35%,
            rgba(255, 255, 255, 0.09) 0%,
            rgba(255, 255, 255, 0.03) 30%,
            transparent 70%
          );
          filter: blur(2px);
          opacity: 0.5;
          animation: sheenFloat 20s ease-in-out infinite;
        }

        /* Fine grain for “matte black” texture */
        .grain {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.9'/%3E%3C/svg%3E");
        }

        /* Premium vignette edges */
        .vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 55% at 50% 40%, transparent 0%, rgba(0, 0, 0, 0.68) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, transparent 18%, transparent 82%, rgba(0, 0, 0, 0.35) 100%);
          opacity: 0.95;
        }

        @keyframes sheenFloat {
          0% {
            transform: translateX(-50%) translateY(0) scale(1);
            opacity: 0.42;
          }
          50% {
            transform: translateX(-50%) translateY(14px) scale(1.02);
            opacity: 0.58;
          }
          100% {
            transform: translateX(-50%) translateY(0) scale(1);
            opacity: 0.42;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sheen {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
