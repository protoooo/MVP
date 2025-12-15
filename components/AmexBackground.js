// components/AmexBackground.js - Premium Amex Centurion Style
'use client'

export default function AmexBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0, // ✅ FIX: avoid negative z-index disappearing behind root
        overflow: 'hidden',
        pointerEvents: 'none',
        // Deep black base - Centurion card color
        backgroundColor: '#000000',
      }}
    >
      {/* Subtle platinum sheen - top center (like card reflection) */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '50%',
          height: '50%',
          background:
            'radial-gradient(ellipse, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
          opacity: 0.7,
          animationDuration: '25s',
          willChange: 'transform',
        }}
      />

      {/* Dark gunmetal accent - left side */}
      <div
        className="animate-float-reverse"
        style={{
          position: 'absolute',
          top: '20%',
          left: '-10%',
          width: '40%',
          height: '60%',
          background:
            'radial-gradient(ellipse, rgba(60, 60, 80, 0.12) 0%, transparent 65%)',
          opacity: 0.5,
          animationDuration: '30s',
          willChange: 'transform',
        }}
      />

      {/* Cool steel blue - right side (very subtle) */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '-5%',
          width: '45%',
          height: '55%',
          background:
            'radial-gradient(ellipse, rgba(80, 100, 130, 0.1) 0%, transparent 70%)',
          opacity: 0.4,
          animationDuration: '28s',
          willChange: 'transform',
        }}
      />

      {/* Center depth - creates card surface illusion */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70%',
          height: '40%',
          background:
            'radial-gradient(ellipse, rgba(255, 255, 255, 0.03) 0%, transparent 60%)',
          opacity: 0.8,
        }}
      />

      {/* Premium vignette - darker edges like card photography */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 50% 40%, transparent 0%, rgba(0, 0, 0, 0.6) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, transparent 15%, transparent 85%, rgba(0, 0, 0, 0.3) 100%)
          `.replace(/\s+/g, ' '),
          opacity: 0.9,
        }}
      />

      {/* Subtle edge glow - like brushed metal edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0%, transparent 5%, transparent 95%, rgba(255, 255, 255, 0.02) 100%)',
          opacity: 0.6,
        }}
      />
    </div>
  )
}
