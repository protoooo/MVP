// components/AmexBackground.js - Premium Amex Centurion Style
'use client'

export default function AmexBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: '#000000',
        // A tiny base sheen so it never reads as “flat black”
        backgroundImage:
          'radial-gradient(1200px 700px at 50% 15%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,1) 65%)',
      }}
    >
      {/* Subtle platinum sheen - top center (like card reflection) */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          width: '55%',
          height: '55%',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className="animate-float"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse, rgba(255, 255, 255, 0.14) 0%, transparent 60%)',
            opacity: 0.85,
            animationDuration: '25s',
            willChange: 'transform',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Dark gunmetal accent - left side */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          left: '-10%',
          width: '42%',
          height: '62%',
        }}
      >
        <div
          className="animate-float-reverse"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse, rgba(80, 80, 110, 0.22) 0%, transparent 68%)',
            opacity: 0.6,
            animationDuration: '30s',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Cool steel blue - right side (subtle) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          right: '-6%',
          width: '48%',
          height: '58%',
        }}
      >
        <div
          className="animate-float"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse, rgba(90, 120, 170, 0.18) 0%, transparent 72%)',
            opacity: 0.55,
            animationDuration: '28s',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Center depth - creates card surface illusion */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '72%',
          height: '42%',
          background:
            'radial-gradient(ellipse, rgba(255, 255, 255, 0.06) 0%, transparent 62%)',
          opacity: 0.9,
          mixBlendMode: 'screen',
        }}
      />

      {/* Premium vignette - toned down so accents are visible */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 50% 40%, transparent 0%, rgba(0, 0, 0, 0.45) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.12) 0%, transparent 18%, transparent 82%, rgba(0, 0, 0, 0.16) 100%)
          `.replace(/\s+/g, ' '),
          opacity: 0.55,
        }}
      />

      {/* Subtle edge glow - like brushed metal edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, transparent 6%, transparent 94%, rgba(255, 255, 255, 0.03) 100%)',
          opacity: 0.75,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}
