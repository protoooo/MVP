'use client'
import { useEffect, useRef, useState } from 'react'

export default function ThreeBackground() {
  const vantaRef = useRef(null)
  const [vantaEffect, setVantaEffect] = useState(null)

  useEffect(() => {
    // 1. Load Three.js (Specific version r121 is best for Vanta)
    const loadThree = () => {
      if (window.THREE) {
        loadVanta()
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js'
      script.async = true
      script.onload = loadVanta
      document.body.appendChild(script)
    }

    // 2. Load Vanta Rings
    const loadVanta = () => {
      if (window.VANTA) {
        initVanta()
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.rings.min.js'
      script.async = true
      script.onload = initVanta
      document.body.appendChild(script)
    }

    // 3. Initialize the Effect
    const initVanta = () => {
      if (!vantaRef.current || window.VANTA === undefined) return

      // Prevent multiple instances
      if (vantaEffect) return

      try {
        const effect = window.VANTA.RINGS({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          
          // === BRAND COLORS ===
          // Matches your site background
          backgroundColor: 0xfafafa, 
          // The color of the rings (ProtocolLM Orange/Purple mix)
          color: 0x8833ff, 
          // Background mode (lighter = cleaner for food service)
          backgroundAlpha: 1.0
        })
        setVantaEffect(effect)
      } catch (error) {
        console.error("Vanta error:", error)
      }
    }

    // Start loading
    loadThree()

    // Cleanup on unmount
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, []) // Empty dependency array means run once on mount

  return (
    <div 
      ref={vantaRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.6 }} // Adjust opacity if it's too busy behind text
    />
  )
}
