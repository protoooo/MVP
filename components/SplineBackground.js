'use client'

import { useEffect, useState } from 'react'

export default function SplineBackground() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Slight delay to ensure smooth page load
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out',
      }}
    >
      <iframe
        src="https://my.spline.design/3dgradient-AcpgG6LxFkpnJSoowRHPfcbO"
        frameBorder="0"
        width="100%"
        height="100%"
        title="3D Gradient Background"
        loading="eager"
        style={{
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  )
}
