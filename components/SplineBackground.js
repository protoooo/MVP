'use client'

import { useState } from 'react'

export default function SplineBackground() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: '#000', // ✅ fallback so you never see gray
      }}
    >
      {/* Optional subtle fallback glow so it looks good before Spline loads */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 30% 25%, rgba(79,117,155,0.14), transparent 55%), radial-gradient(circle at 70% 80%, rgba(124,58,237,0.10), transparent 60%)',
          opacity: loaded ? 0 : 1,
          transition: 'opacity 400ms ease',
        }}
      />

      <iframe
        src="https://my.spline.design/3dgradient-AcpgG6LxFkpnJSoowRHPfcbO"
        title="3D Gradient Background"
        frameBorder="0"
        width="100%"
        height="100%"
        loading="eager"
        onLoad={() => setLoaded(true)}
        style={{
          border: 'none',
          display: 'block',
          opacity: loaded ? 1 : 0,           // ✅ hide gray Spline loading state
          transition: 'opacity 700ms ease',   // ✅ fade in only when ready
        }}
      />
    </div>
  )
}
