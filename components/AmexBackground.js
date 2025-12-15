"use client"

import React from "react"
import { useScroll, useTransform } from "motion/react"
import { GoogleGeminiEffect } from "@/components/ui/google-gemini-effect"

export default function AmexBackground() {
  // Tracks the *entire page* scroll, so it works even on your shorter page.
  const { scrollYProgress } = useScroll()

  // Same idea as the demo, but mapped across your whole page scroll.
  const p1 = useTransform(scrollYProgress, [0, 1], [0.2, 1.15])
  const p2 = useTransform(scrollYProgress, [0, 1], [0.15, 1.15])
  const p3 = useTransform(scrollYProgress, [0, 1], [0.1, 1.15])
  const p4 = useTransform(scrollYProgress, [0, 1], [0.05, 1.15])
  const p5 = useTransform(scrollYProgress, [0, 1], [0, 1.15])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Amex-black-card base */}
      <div className="absolute inset-0 bg-[#050608]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 50% 45%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%), radial-gradient(1200px 700px at 50% 65%, rgba(0,0,0,0), rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* Centered Gemini effect (behind everything) */}
      <div
        className="absolute left-0 top-1/2 w-full -translate-y-1/2"
        style={{
          opacity: 0.75,
          filter: "saturate(1.15)",
          // fade top/bottom so it feels embedded in the background
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
        }}
      >
        <GoogleGeminiEffect
          pathLengths={[p1, p2, p3, p4, p5]}
          className="w-full"
        />
      </div>
    </div>
  )
}
