// components/AmexBackground.js - Premium Amex Centurion Style (subtle motion)
'use client'

export default function AmexBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0, // ✅ keep above root background
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: '#000000',
      }}
    >
      {/* ✅ Local, self-contained animations (so it always moves even if Tailwind has no class) */}
      <style jsx global>{`
        @keyframes amexFloat {
          0% {
            transform: translate3d(0px, 0px, 0) scale(1);
          }
          35% {
            transform: translate3d(18px, -14px, 0) scale(1.03);
          }
          70% {
            transform: translate3d(-14px, 16px, 0) scale(0.99);
          }
          100% {
            transform: translate3d(0px, 0px, 0) scale(1);
          }
        }

        @keyframes amexFloatReverse {
          0% {
            transform: translate3d(0px, 0px, 0) scale(1);
          }
          40% {
            transform: translate3d(-20px, 12px, 0) scale(1.02);
          }
          75% {
            transform: translate3d(16px, -10px, 0) scale(0.99);
          }
          100% {
            transform: translate3d(0px, 0px, 0) scale(1);
          }
        }

        @keyframes amexSheenDrift {
          0% {
            transform: translate3d(-50%, 0, 0) rotate(0.001deg);
            opacity: 0.65;
          }
          50% {
            transform: translate3d(calc(-50% + 14px), -10px, 0) rotate(0.001deg);
            opacity: 0.8;
          }
          100% {
            transform: translate3d(-50%, 0, 0) rotate(0.001deg);
            opacity: 0.65;
          }
        }

        @keyframes amexGrain {
          0% {
            transform: translate3d(0, 0, 0);
          }
          25% {
            transform: translate3d(-1.5%, 1%, 0);
          }
          50% {
            transform: translate3d(1%, -1.5%, 0);
          }
          75% {
            transform: translate3d(-1%, -0.5%, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        /* keep the classnames you already used */
        .animate-float {
          animation: amexFloat 26s ease-in-out infinite;
          will-change: transform;
        }
        .animate-float-reverse {
          animation: amexFloatReverse 32s ease-in-out infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-float-reverse {
            animation: none !important;
            transform: none !important;
          }
          .amex-sheen-drift,
          .amex-grain {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Subtle platinum sheen - top center (like card reflection) */}
      <div
        className="amex-sheen-drift"
        style={{
          position: 'absolute',
          top: '-18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '56%',
          height: '56%',
          background:
            'radial-gradient(ellipse, rgba(255, 255, 255, 0.09) 0%, transparent 62%)',
          opacity: 0.7,
          animation: 'amexSheenDrift 24s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* Dark gunmetal accent - left side */}
      <div
        className="animate-float-reverse"
        style={{
          position: 'absolute',
          top: '18%',
          left: '-12%',
          width: '44%',
          height: '66%',
          background:
            'radial-gradient(ellipse, rgba(60, 60, 80, 0.14) 0%, transparent 66%)',
          opacity: 0.55,
          animationDuration: '34s',
          willChange: 'transform',
          filter: 'blur(0.2px)',
        }}
      />

      {/* Cool steel blue - right side (very subtle) */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '-8%',
          width: '50%',
          height: '60%',
          background:
            'radial-gradient(ellipse, rgba(80, 100, 130, 0.11) 0%, transparent 72%)',
          opacity: 0.45,
          animationDuration: '30s',
          willChange: 'transform',
          filter: 'blur(0.2px)',
        }}
      />

      {/* Center depth - creates card surface illusion */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '72%',
          height: '40%',
          background:
            'radial-gradient(ellipse, rgba(255, 255, 255, 0.03) 0%, transparent 62%)',
          opacity: 0.85,
          animationDuration: '40s',
          willChange: 'transform',
        }}
      />

      {/* Premium vignette - darker edges like card photography */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 50% 40%, transparent 0%, rgba(0, 0, 0, 0.62) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, transparent 16%, transparent 86%, rgba(0, 0, 0, 0.28) 100%)
          `.replace(/\s+/g, ' '),
          opacity: 0.95,
        }}
      />

      {/* Subtle edge glow - like brushed metal edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255, 255, 255, 0.022) 0%, transparent 6%, transparent 94%, rgba(255, 255, 255, 0.022) 100%)',
          opacity: 0.6,
        }}
      />

      {/* Optional: ultra-subtle grain motion (helps it feel “alive” without being flashy) */}
      <div
        className="amex-grain"
        style={{
          position: 'absolute',
          inset: '-20%',
          opacity: 0.06,
          mixBlendMode: 'overlay',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0%, transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 50%),
            radial-gradient(circle at 40% 85%, rgba(255,255,255,0.10) 0%, transparent 55%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)
          `.replace(/\s+/g, ' '),
          animation: 'amexGrain 18s steps(6) infinite',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
