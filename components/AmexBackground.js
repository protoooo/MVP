'use client'

export default function AmexBackground() {
  return (
    <>
      {/* Base deep black layer */}
      <div className="fixed inset-0 -z-50 bg-[#000000]" />
      
      {/* Dramatic depth layers */}
      <div className="fixed inset-0 -z-40 overflow-hidden pointer-events-none">
        {/* Top-left dramatic glow */}
        <div 
          className="absolute -top-[30%] -left-[15%] w-[70%] h-[70%] opacity-[0.25]"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 65%)',
            filter: 'blur(120px)'
          }}
        />
        
        {/* Bottom-right purple accent (more intense) */}
        <div 
          className="absolute -bottom-[30%] -right-[15%] w-[70%] h-[70%] opacity-[0.22]"
          style={{
            background: 'radial-gradient(circle, rgba(120, 100, 160, 0.25) 0%, transparent 65%)',
            filter: 'blur(140px)'
          }}
        />
        
        {/* Center spotlight effect */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] opacity-[0.15]"
          style={{
            background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.12) 0%, transparent 55%)',
            filter: 'blur(150px)'
          }}
        />
        
        {/* Animated floating orbs for depth */}
        <div 
          className="absolute top-[20%] left-[30%] w-[300px] h-[300px] opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, rgba(100, 200, 255, 0.3) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'float 20s ease-in-out infinite'
          }}
        />
        
        <div 
          className="absolute bottom-[25%] right-[35%] w-[250px] h-[250px] opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, rgba(200, 100, 255, 0.3) 0%, transparent 70%)',
            filter: 'blur(90px)',
            animation: 'float 25s ease-in-out infinite reverse'
          }}
        />
        
        {/* More visible grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
        
        {/* Enhanced noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Stronger vignette */}
        <div 
          className="absolute inset-0 opacity-80"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.6) 100%)'
          }}
        />
        
        {/* Dramatic edge shadows */}
        <div 
          className="absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 200px rgba(0, 0, 0, 0.8)'
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translate(0, 0) scale(1);
          }
          25% { 
            transform: translate(30px, -30px) scale(1.1);
          }
          50% { 
            transform: translate(-20px, 40px) scale(0.9);
          }
          75% { 
            transform: translate(40px, 20px) scale(1.05);
          }
        }
      `}</style>
    </>
  )
}
