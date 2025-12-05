'use client'
import { useEffect, useRef, useState } from 'react'

export default function ThreeBackground() {
  const vantaRef = useRef(null)
  const [vantaEffect, setVantaEffect] = useState(null)

  useEffect(() => {
    let effect = null

    const loadVanta = async () => {
      // 1. Load Three.js
      if (!window.THREE) {
        await new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'
          script.async = true
          script.onload = resolve
          document.body.appendChild(script)
        })
      }

      // 2. Load Vanta GLOBE Effect
      if (!window.VANTA) {
        await new Promise((resolve) => {
          const script = document.createElement('script')
          // Note: We are loading vanta.globe.min.js here
          script.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.globe.min.js'
          script.async = true
          script.onload = resolve
          document.body.appendChild(script)
        })
      }

      // 3. Initialize Vanta Globe
      if (vantaRef.current && window.VANTA) {
        effect = window.VANTA.GLOBE({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          
          // === HYROUND STYLE CONFIGURATION ===
          color: 0x2563eb,        // The Blue Color of the globe
          color2: 0x60a5fa,       // A lighter blue for accents
          backgroundColor: 0xffffff, // Pure White background
          size: 1.20,             // Size of the dots
          spacing: 16.00          // Spacing between dots (higher = more airy)
        })
        setVantaEffect(effect)
      }
    }

    loadVanta()

    return () => {
      if (effect) effect.destroy()
    }
  }, [])

  return (
    <div 
      ref={vantaRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      // Moved slightly to the right to match the "Hyround" layout
      style={{ 
        opacity: 0.8,
        transform: 'scale(1.1) translateX(10%)' 
      }} 
    />
  )
}
