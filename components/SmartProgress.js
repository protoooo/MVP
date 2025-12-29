'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export default function SmartProgress({ active, mode = 'text', requestKey = 0 }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('Starting…')

  const refs = useRef({
    pct: 0,
    timer: null,
    startedAt: 0,
  })

  const config = useMemo(() => {
    // vision/upload mode needs more gradual progress to feel honest
    return mode === 'vision'
      ? { baseCap: 92, finalCap: 98, k: 0.025 }
      : { baseCap: 90, finalCap: 96, k: 0.040 }
  }, [mode])

  useEffect(() => {
    const refsSnapshot = refs.current
    
    // reset when a new request starts
    if (active) {
      setVisible(true)
      setProgress(0)
      setPhase(mode === 'vision' ? 'Uploading image…' : 'Sending…')

      refsSnapshot.pct = 0
      refsSnapshot.startedAt = Date.now()

      if (refsSnapshot.timer) clearInterval(refsSnapshot.timer)

      refsSnapshot.timer = setInterval(() => {
        const elapsed = (Date.now() - refsSnapshot.startedAt) / 1000

        // cap rises slowly over time so it feels like it's "getting closer"
        const cap =
          elapsed < 2
            ? config.baseCap - 10
            : elapsed < 5
              ? config.baseCap - 5
              : elapsed < 10
                ? config.baseCap
                : config.finalCap

        // smooth monotonic ease-out: pct += (cap - pct) * k
        const next = refsSnapshot.pct + (cap - refsSnapshot.pct) * config.k

        // guarantee never decreasing
        refsSnapshot.pct = Math.max(refsSnapshot.pct, next)

        const pctInt = Math.min(99, Math.floor(refsSnapshot.pct)) // hold at 99 until done
        setProgress(pctInt)

        // phase text driven by progress (no jitter)
        const p = pctInt
        if (p < 20) setPhase(mode === 'vision' ? 'Uploading files…' : 'Reading question…')
        else if (p < 50) setPhase(mode === 'vision' ? 'Processing media…' : 'Searching Michigan excerpts…')
        else if (p < 75) setPhase(mode === 'vision' ? 'Analyzing content…' : 'Cross-checking requirements…')
        else if (p < 92) setPhase(mode === 'vision' ? 'Generating report…' : 'Building the best answer…')
        else setPhase('Finalizing…')
      }, 120)

      return () => {
        if (refsSnapshot.timer) clearInterval(refsSnapshot.timer)
      }
    }

    // when request completes, finish smoothly to 100 and fade out
    if (!active && visible) {
      const refsSnapshot = refs.current
      if (refsSnapshot.timer) clearInterval(refsSnapshot.timer)

      setProgress(100)
      setPhase('Done')

      const t = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 350)

      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestKey])

  if (!visible) return null

  return (
    <div className="w-full px-3 pb-2">
      <div className="flex items-center justify-between text-xs text-slate-700 mb-2">
        <span>{phase}</span>
        <span>{progress}%</span>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-200/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width: `${progress}%`,
            transition: 'width 160ms linear',
            willChange: 'width',
          }}
        />
      </div>
    </div>
  )
}
