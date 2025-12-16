'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function SplineBackground() {
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let subscription = null

    const applyAuth = (isAuthed) => {
      if (cancelled) return
      setAuthed(isAuthed)
      setChecked(true)

      // ✅ Expose auth state to CSS (works even if your page.js sets transparent backgrounds)
      try {
        const v = isAuthed ? '1' : '0'
        document.body.dataset.plmAuthed = v
        document.documentElement.dataset.plmAuthed = v
      } catch {}
    }

    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        applyAuth(!!data?.session)
      } catch {
        applyAuth(false)
      }
    })()

    try {
      const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
        applyAuth(!!session)
      })
      subscription = data?.subscription
    } catch {}

    return () => {
      cancelled = true
      try {
        subscription?.unsubscribe?.()
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!checked || authed) {
      setFadeIn(false)
      return
    }
    const t = setTimeout(() => setFadeIn(true), 100)
    return () => clearTimeout(t)
  }, [checked, authed])

  // ✅ Don’t show anything until we know auth state (prevents “flash” in the chat)
  if (!checked) return null

  // ✅ If signed in, do NOT render Spline at all
  if (authed) return null

  return (
    <div
      id="plm-spline-bg"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: fadeIn ? 1 : 0,
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
