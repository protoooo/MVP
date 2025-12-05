'use client'
import { useEffect, useRef, useState } from 'react'

export default function ThreeBackground() {
  const vantaRef = useRef(null)
  const [vantaEffect, setVantaEffect] = useState(null)

  useEffect(() => {
    // 1. Define the cleanup function early
    let effect = null

    // 2. Load the scripts in order (Three.js -> then Vanta)
    const loadVanta = async () => {
      // Check if Three.js is already loaded
      if (!window.THREE) {
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
          script.async = true
          script.onload = resolve
          document.body.appendChild(script)
        })
      }

      // Check if Vanta Rings is already loaded
      if (!window.VANTA) {
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.rings.min.js'
          script.async = true
          script.onload = resolve
          document.body.appendChild(script)
        })
      }

      // 3. Initialize Vanta (The "Apple Health" Config)
      if (vantaRef.current && window.VANTA) {
        effect = window.VANTA.RINGS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          
          // === APPLE HEALTH / PROTOCOL STYLE ===
          backgroundColor: 0xffffff, // Pure Clean White
          color: 0x4f46e5,           // Protocol Indigo/Purple
          backgroundAlpha: 1.0
        })
        setVantaEffect(effect)
      }
    }

    loadVanta()

    // 4. Cleanup to prevent memory leaks
    return () => {
      if (effect) effect.destroy()
    }
  }, [])

  return (
    <div 
      ref={vantaRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      // We reduce opacity slightly so the rings aren't too aggressive behind text
      // Added transform to move Up/Left and Scale to cover edges
      style={{ 
        opacity: 0.4, 
        filter: 'grayscale(20%)',
        transform: 'translate(-10%, -15%) scale(1.2)' 
      }} 
    />
  )
}
