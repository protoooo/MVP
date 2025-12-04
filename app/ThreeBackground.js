'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const vantaRef = useRef(null)
  const [vantaEffect, setVantaEffect] = useState(null)

  useEffect(() => {
    if (!vantaEffect) {
      // Dynamic import is required for Vanta in Next.js to avoid SSR errors
      import('vanta/dist/vanta.rings.min').then((vanta) => {
        const effect = vanta.default({
          el: vantaRef.current,
          THREE: THREE, // Pass your local THREE instance
          
          // --- CONFIGURATION ---
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          
          // --- THEME COLORS ---
          // Background matches your app's light theme (#FAFAFA)
          backgroundColor: 0xFAFAFA,
          // Ring color matches your Steel Blue brand (#4F759B)
          color: 0x4F759B,
          backgroundAlpha: 1
        })
        setVantaEffect(effect)
      }).catch(err => console.error("Failed to load Vanta Rings:", err))
    }

    // Cleanup function when component unmounts
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  return (
    <div 
      ref={vantaRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100dvh', 
        zIndex: -1, // Ensures it sits behind your content
        pointerEvents: 'none' // Allows you to click buttons on top of it
      }} 
    />
  )
}
