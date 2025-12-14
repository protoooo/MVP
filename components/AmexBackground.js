'use client'

export default function AmexBackground() {
  return (
    <>
      {/* Base black layer */}
      <div className="fixed inset-0 -z-50 bg-[#0a0a0a]" />
      
      {/* Depth layers - subtle gradients that create dimension */}
      <div className="fixed inset-0 -z-40 overflow-hidden pointer-events-none">
        {/* Top-left premium glow */}
        <div 
          className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] opacity-[0.15]"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
        
        {/* Bottom-right accent glow */}
        <div 
          className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] opacity-[0.12]"
          style={{
            background: 'radial-gradient(circle, rgba(100, 100, 120, 0.15) 0%, transparent 70%)',
            filter: 'blur(100px)'
          }}
        />
        
        {/* Center depth shadow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] opacity-[0.08]"
          style={{
            background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.06) 0%, transparent 60%)',
            filter: 'blur(120px)'
          }}
        />
        
        {/* Subtle grid overlay for premium texture */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px'
          }}
        />
        
        {/* Fine noise texture (Amex card feel) */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Vignette effect - darkens edges */}
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)'
          }}
        />
      </div>
    </>
  )
}
