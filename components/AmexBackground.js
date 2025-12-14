// components/AmexBackground.js - DEBUG VERSION (Extra Visible)
'use client'

export default function AmexBackground() {
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -50,
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: '#000000'
      }}
    >
      {/* BRIGHT animated gradient - if you can't see this, CSS isn't loading */}
      <div 
        className="animate-float"
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255, 100, 100, 0.8) 0%, transparent 70%)',
          opacity: 1,
          animationDuration: '5s',
          willChange: 'transform'
        }}
      />
      
      <div 
        className="animate-float-reverse"
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(100, 100, 255, 0.8) 0%, transparent 70%)',
          opacity: 1,
          animationDuration: '5s',
          willChange: 'transform'
        }}
      />
      
      {/* Test text - if you see this, the component is rendering */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '20px',
          fontWeight: 'bold',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '10px'
        }}
      >
        DEBUG: If you see moving red/blue circles,<br/>
        the background is working!
      </div>
    </div>
  )
}
