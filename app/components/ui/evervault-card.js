'use client'

import React, { useState, useEffect } from 'react'
import { useMotionValue, useMotionTemplate, motion } from 'motion/react'

// tiny Tailwind class combiner
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function EvervaultCard({ text, className }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [randomString, setRandomString] = useState('')

  useEffect(() => {
    setRandomString(generateRandomString(1500))
  }, [])

  function onMouseMove(e) {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
    // new scramble when you move
    setRandomString(generateRandomString(1500))
  }

  return (
    <div
      className={cn(
        'p-0.5 bg-transparent w-full h-full flex items-center justify-center relative',
        className
      )}
    >
      <div
        onMouseMove={onMouseMove}
        className="group/card rounded-3xl w-full h-full relative overflow-hidden bg-transparent flex items-center justify-center"
      >
        <CardPattern mouseX={mouseX} mouseY={mouseY} randomString={randomString} />
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative h-44 w-44 rounded-full flex items-center justify-center text-white font-bold text-3xl">
            <div className="absolute w-full h-full bg-white/[0.85] dark:bg-black/[0.85] blur-sm rounded-full" />
            <span className="z-20 text-black dark:text-white">{text}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardPattern({ mouseX, mouseY, randomString }) {
  const maskImage = useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`
  const style = { maskImage, WebkitMaskImage: maskImage }

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl [mask-image:linear-gradient(white,transparent)] group-hover/card:opacity-50" />
      <motion.div
        style={style}
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 opacity-0 group-hover/card:opacity-100 backdrop-blur-xl transition duration-500"
      />
      <motion.div
        style={style}
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay group-hover/card:opacity-100"
      >
        <p className="absolute inset-x-0 text-xs h-full break-words whitespace-pre-wrap text-white font-mono font-bold transition duration-500">
          {randomString}
        </p>
      </motion.div>
    </div>
  )
}

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function generateRandomString(length) {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}
