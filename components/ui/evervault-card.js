'use client'

import React, { useState, useEffect } from 'react'
import { useMotionValue, useMotionTemplate, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const characters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export const generateRandomString = (length) => {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

/**
 * EvervaultCard
 *
 * - Keeps the Aceternity-style hover reveal effect
 * - NO central black circle anymore
 * - If you pass an `icon` prop, it renders the icon centered with no border
 *   example: <EvervaultCard icon={Icons.Camera} />
 */
export function EvervaultCard({
  text,              // kept for backwards-compat, but we prefer icon now
  icon: IconComp,    // React component for the icon
  iconClassName,
  className,
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [randomString, setRandomString] = useState('')

  useEffect(() => {
    setRandomString(generateRandomString(1500))
  }, [])

  function onMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)

    // keeps the “binary” style text changing
    setRandomString(generateRandomString(1500))
  }

  return (
    <div
      className={cn(
        'p-0.5 bg-transparent aspect-square flex items-center justify-center w-full h-full relative',
        className
      )}
    >
      <div
        onMouseMove={onMouseMove}
        className="group/card rounded-3xl w-full h-full relative overflow-hidden bg-transparent flex items-center justify-center"
      >
        <CardPattern mouseX={mouseX} mouseY={mouseY} randomString={randomString} />

        {/* CONTENT: just the icon (or fallback text) – no circle, no border */}
        <div className="relative z-10 flex items-center justify-center h-full w-full">
          {IconComp ? (
            <IconComp
              className={cn(
                'h-16 w-16 text-black dark:text-white',
                iconClassName
              )}
            />
          ) : (
            // Fallback to simple text if no icon is passed
            <span className="text-3xl font-semibold text-black dark:text-white">
              {text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function CardPattern({ mouseX, mouseY, randomString }) {
  const maskImage = useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`
  const style = { maskImage, WebkitMaskImage: maskImage }

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl [mask-image:linear-gradient(white,transparent)] group-hover/card:opacity-50" />
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black to-neutral-500 opacity-0 group-hover/card:opacity-100 backdrop-blur-xl transition duration-500"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay group-hover/card:opacity-100"
        style={style}
      >
        <p className="absolute inset-x-0 text-xs h-full break-words whitespace-pre-wrap text-white font-mono font-bold transition duration-500">
          {randomString}
        </p>
      </motion.div>
    </div>
  )
}

// Optional: still export the little corner “plus” icon if you use it anywhere
export const Icon = ({ className, ...rest }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  )
}
