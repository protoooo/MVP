// components/AmexBackground.js
'use client'

export default function AmexBackground() {
  return (
    <div
      aria-hidden="true"
      className="plm-amex-bg"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -50,
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: '#000000',
      }}
    >
      {/* Base matte-black + subtle steel undertones */}
      <div
        className="plm-amex-layer plm-amex-base"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            [
              'radial-gradient(1200px 680px at 18% 0%, rgba(255,255,255,0.05) 0%, transparent 58%)',
              'radial-gradient(900px 520px at 85% 28%, rgba(90,110,140,0.10) 0%, transparent 62%)',
              'radial-gradient(800px 520px at 55% 72%, rgba(255,255,255,0.025) 0%, transparent 60%)',
              'linear-gradient(180deg, #050608 0%, #000000 100%)',
            ].join(','),
        }}
      />

      {/* Very subtle “Aceternity-ish” beams (kept soft + low contrast) */}
      <div
        className="plm-amex-layer plm-amex-beams"
        style={{
          position: 'absolute',
          inset: '-20%',
          background:
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 72px)',
          opacity: 0.22,
          filter: 'blur(0.6px)',
          transform: 'translate3d(0,0,0)',
        }}
      />

      {/* Soft center “card surface” depth */}
      <div
        className="plm-amex-layer plm-amex-depth"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 62% 42% at 50% 46%, rgba(255,255,255,0.04) 0%, transparent 60%)',
          opacity: 0.9,
        }}
      />

      {/* Sheen sweep (subtle, like a card reflection) */}
      <div
        className="plm-amex-layer plm-amex-sheen"
        style={{
          position: 'absolute',
          top: '-35%',
          left: '-60%',
          width: '140%',
          height: '170%',
          background:
            'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.012) 50%, transparent 58%)',
          opacity: 0.55,
          filter: 'blur(1px)',
          transform: 'translate3d(0,0,0)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Secondary micro-sheen (adds premium movement without “AI aurora”) */}
      <div
        className="plm-amex-layer plm-amex-sheen-2"
        style={{
          position: 'absolute',
          bottom: '-35%',
          right: '-65%',
          width: '150%',
          height: '170%',
          background:
            'linear-gradient(250deg, transparent 0%, rgba(140,170,210,0.05) 40%, rgba(255,255,255,0.01) 50%, transparent 60%)',
          opacity: 0.45,
          filter: 'blur(1.2px)',
          transform: 'translate3d(0,0,0)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Fine grain / matte texture */}
      <div
        className="plm-amex-layer plm-amex-noise"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.085,
          mixBlendMode: 'overlay',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%2760%27 height=%2760%27 filter=%27url(%23n)%27 opacity=%270.9%27/%3E%3C/svg%3E")',
        }}
      />

      {/* Vignette + edge falloff (premium photography look) */}
      <div
        className="plm-amex-layer plm-amex-vignette"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            [
              'radial-gradient(ellipse 70% 55% at 50% 42%, transparent 0%, rgba(0,0,0,0.62) 100%)',
              'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 14%, transparent 86%, rgba(0,0,0,0.35) 100%)',
            ].join(','),
          opacity: 0.95,
        }}
      />

      {/* Tiny edge glints (super subtle) */}
      <div
        className="plm-amex-layer plm-amex-edges"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.018) 0%, transparent 4%, transparent 96%, rgba(255,255,255,0.018) 100%)',
          opacity: 0.55,
        }}
      />

      <style jsx>{`
        .plm-amex-layer {
          will-change: transform, opacity;
        }

        /* Keep beams barely moving so it feels “alive” but not “aurora” */
        .plm-amex-beams {
          animation: plmBeams 38s ease-in-out infinite;
        }
        @keyframes plmBeams {
          0% {
            transform: translate3d(-1.5%, -1%, 0) rotate(-2deg);
          }
          50% {
            transform: translate3d(1.5%, 1%, 0) rotate(2deg);
          }
          100% {
            transform: translate3d(-1.5%, -1%, 0) rotate(-2deg);
          }
        }

        /* Main sheen sweep */
        .plm-amex-sheen {
          animation: plmSheen 26s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        @keyframes plmSheen {
          0% {
            transform: translate3d(-18%, -6%, 0) rotate(-8deg);
            opacity: 0.38;
          }
          45% {
            transform: translate3d(22%, 6%, 0) rotate(-8deg);
            opacity: 0.6;
          }
          100% {
            transform: translate3d(36%, 10%, 0) rotate(-8deg);
            opacity: 0.35;
          }
        }

        /* Secondary sheen (counter motion) */
        .plm-amex-sheen-2 {
          animation: plmSheen2 32s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        @keyframes plmSheen2 {
          0% {
            transform: translate3d(18%, 8%, 0) rotate(10deg);
            opacity: 0.25;
          }
          55% {
            transform: translate3d(-18%, -8%, 0) rotate(10deg);
            opacity: 0.5;
          }
          100% {
            transform: translate3d(-30%, -12%, 0) rotate(10deg);
            opacity: 0.26;
          }
        }

        /* Reduce motion respect */
        @media (prefers-reduced-motion: reduce) {
          .plm-amex-beams,
          .plm-amex-sheen,
          .plm-amex-sheen-2 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
