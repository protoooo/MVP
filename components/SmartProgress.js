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
    // vision feels slower — give it a lower “cap” early so it feels honest
    return mode === 'vision'
      ? { baseCap: 88, finalCap: 94, k: 0.030 }
      : { baseCap: 90, finalCap: 96, k: 0.040 }
  }, [mode])

  useEffect(() => {
    // reset when a new request starts
    if (active) {
      setVisible(true)
      setProgress(0)
      setPhase(mode === 'vision' ? 'Uploading image…' : 'Sending…')

      refs.current.pct = 0
      refs.current.startedAt = Date.now()

      if (refs.current.timer) clearInterval(refs.current.timer)

      refs.current.timer = setInterval(() => {
        const elapsed = (Date.now() - refs.current.startedAt) / 1000

        // cap rises slowly over time so it feels like it’s “getting closer”
        const cap =
          elapsed < 1.5
            ? config.baseCap - 8
            : elapsed < 4
              ? config.baseCap
              : config.finalCap

        // smooth monotonic ease-out: pct += (cap - pct) * k
        const next = refs.current.pct + (cap - refs.current.pct) * config.k

        // guarantee never decreasing
        refs.current.pct = Math.max(refs.current.pct, next)

        const pctInt = Math.min(99, Math.floor(refs.current.pct)) // hold at 99 until done
        setProgress(pctInt)

        // phase text driven by progress (no jitter)
        const p = pctInt
        if (p < 15) setPhase(mode === 'vision' ? 'Analyzing image…' : 'Reading question…')
        else if (p < 45) setPhase('Searching Washtenaw excerpts…')
        else if (p < 70) setPhase('Cross-checking requirements…')
        else if (p < 90) setPhase('Building the best answer…')
        else setPhase('Finalizing…')
      }, 120)

      return () => {
        if (refs.current.timer) clearInterval(refs.current.timer)
      }
    }

    // when request completes, finish smoothly to 100 and fade out
    if (!active && visible) {
      if (refs.current.timer) clearInterval(refs.current.timer)

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
      <div className="flex items-center justify-between text-xs text-white/70 mb-2">
        <span>{phase}</span>
        <span>{progress}%</span>
      </div>

      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-white/60"
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
