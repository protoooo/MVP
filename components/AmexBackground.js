// components/AmexBackground.js - iOS Safari Optimized
'use client'

export default function AmexBackground() {
  return (
    <>
      {/* Base deep black layer */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -50,
          backgroundColor: '#000000'
        }} 
      />
      
      {/* Animated gradient layer - simplified for iOS */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -40,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {/* Top-left dramatic glow */}
        <div 
          className="animate-float"
          style={{
            position: 'absolute',
            top: '-30%',
            left: '-15%',
            width: '70%',
            height: '70%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 65%)',
            filter: 'blur(120px)',
            opacity: 0.25,
            animationDuration: '20s'
          }}
        />
        
        {/* Bottom-right purple accent */}
        <div 
          className="animate-float-reverse"
          style={{
            position: 'absolute',
            bottom: '-30%',
            right: '-15%',
            width: '70%',
            height: '70%',
            background: 'radial-gradient(circle, rgba(120, 100, 160, 0.25) 0%, transparent 65%)',
            filter: 'blur(140px)',
            opacity: 0.22,
            animationDuration: '25s'
          }}
        />
        
        {/* Center spotlight */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70%',
            height: '70%',
            background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.12) 0%, transparent 55%)',
            filter: 'blur(150px)',
            opacity: 0.15
          }}
        />
        
        {/* Floating orbs */}
        <div 
          className="animate-float"
          style={{
            position: 'absolute',
            top: '20%',
            left: '30%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(100, 200, 255, 0.3) 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.08,
            animationDuration: '20s'
          }}
        />
        
        <div 
          className="animate-float-reverse"
          style={{
            position: 'absolute',
            bottom: '25%',
            right: '35%',
            width: '250px',
            height: '250px',
            background: 'radial-gradient(circle, rgba(200, 100, 255, 0.3) 0%, transparent 70%)',
            filter: 'blur(90px)',
            opacity: 0.06,
            animationDuration: '25s'
          }}
        />
        
        {/* Grid overlay - removed for iOS compatibility */}
        
        {/* Noise texture - removed for iOS performance */}
        
        {/* Vignette (stronger for iOS) */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.6) 100%)',
            opacity: 0.8
          }}
        />
        
        {/* Edge shadows */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 200px rgba(0, 0, 0, 0.8)'
          }}
        />
      </div>
    </>
  )
}
