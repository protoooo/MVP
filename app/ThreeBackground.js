'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const vantaRef = useRef(null)
  const [vantaEffect, setVantaEffect] = useState(null)

  useEffect(() => {
    if (!vantaEffect) {
      // Dynamically import Vanta to avoid Server-Side Rendering (SSR) issues
      import('vanta/dist/vanta.rings.min').then((vanta) => {
        const effect = vanta.default({
          el: vantaRef.current,
          THREE: THREE, // Pass the installed THREE instance
          
          // --- VANTA CONFIGURATION ---
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          
          // --- THEME COLORS ---
          // Matches your GlobalStyles body background (#FAFAFA)
          backgroundColor: 0xFAFAFA, 
          // Ring Color: Steel Blue to match your brand (#4F759B)
          // You can change this to 0x000000 for black rings if you prefer
          color: 0x4F759B, 
          backgroundAlpha: 1
        })
        setVantaEffect(effect)
      })
    }

    // Cleanup to prevent memory leaks
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
        zIndex: -1, // Ensures it sits behind your glassmorphism content
        pointerEvents: 'none' // Allows clicks to pass through to the UI
      }} 
    />
  )
}
