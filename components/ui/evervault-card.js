// components/ui/evervault-card.js
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function EvervaultCard({ text, className }) {
  const variant = (text || '').toLowerCase();

  return (
    <div
      className={cn(
        'relative flex items-center justify-center w-full h-full rounded-3xl',
        'border border-black/10 dark:border-white/15',
        'bg-white dark:bg-black/40',
        'overflow-hidden',
        className
      )}
    >
      {variant.includes('capture') && <CaptureAnimation />}
      {variant.includes('cross') && <CrossCheckAnimation />}
      {variant.includes('correct') && <CorrectAnimation />}

      {/* subtle vignette so it still feels “special” */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-black/[0.02] to-black/[0.08] dark:from-white/[0.03] dark:to-white/[0.08]" />
    </div>
  );
}

/* --- 1. CAPTURE: big camera + flash lines on load --- */

function CaptureAnimation() {
  return (
    <div className="relative flex items-center justify-center">
      {/* camera body */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-black/15 dark:border-white/25 bg-black/90 dark:bg-white/5 px-5 py-4">
          {/* little indicator light */}
          <div className="w-3 h-3 rounded-full bg-white/70 dark:bg-white" />
          {/* big lens – about 2x the typical icon size */}
          <div className="w-12 h-12 rounded-full border-2 border-white/85 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white/80 dark:bg-white" />
          </div>
        </div>
      </motion.div>

      {/* “flash” lines – play once on load */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 1.05] }}
        transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-0"
      >
        <FlashLine className="top-2 left-1/2 -translate-x-1/2" />
        <FlashLine className="bottom-3 left-1/4" />
        <FlashLine className="top-6 right-4" />
      </motion.div>
    </div>
  );
}

function FlashLine({ className = '' }) {
  return (
    <div
      className={cn(
        'absolute h-5 w-[2px] rounded-full',
        'bg-white/80 dark:bg-white',
        className
      )}
    />
  );
}

/* --- 2. CROSS-CHECK: document with scrolling/typing lines --- */

function CrossCheckAnimation() {
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative flex items-center justify-center"
    >
      <div className="relative rounded-2xl border border-black/12 dark:border-white/25 bg-black/90 dark:bg-white/5 px-5 py-4">
        {/* document shape */}
        <div className="w-16 h-20 rounded-xl border border-white/40 bg-white/5 flex flex-col px-3 py-3 gap-1.5 overflow-hidden">
          {/* fake header */}
          <div className="h-2.5 w-8 rounded-full bg-white/60" />
          {/* scrolling lines */}
          <ScrollingLine delay={0} widthClass="w-10" />
          <ScrollingLine delay={0.12} widthClass="w-9" />
          <ScrollingLine delay={0.24} widthClass="w-11" />
          <ScrollingLine delay={0.36} widthClass="w-7" />
        </div>
      </div>
    </motion.div>
  );
}

function ScrollingLine({ delay = 0, widthClass }) {
  return (
    <motion.div
      initial={{ x: '-15%', opacity: 0.2 }}
      animate={{ x: '15%', opacity: 0.9 }}
      transition={{
        repeat: Infinity,
        repeatType: 'mirror',
        duration: 1.4,
        delay,
        ease: 'easeInOut',
      }}
      className={cn(
        'h-1.5 rounded-full bg-white/50',
        widthClass
      )}
    />
  );
}

/* --- 3. CORRECT: checkmark animation --- */

function CorrectAnimation() {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative flex items-center justify-center"
    >
      {/* outer circle */}
      <div className="w-16 h-16 rounded-full border-2 border-emerald-400/90 dark:border-emerald-300/90 flex items-center justify-center bg-emerald-500/10 dark:bg-emerald-400/10">
        {/* animated checkmark */}
        <motion.svg
          viewBox="0 0 24 24"
          className="w-9 h-9"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        >
          <motion.path
            d="M5 13.5L9.5 18 19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            className="text-emerald-500 dark:text-emerald-300"
          />
        </motion.svg>
      </div>

      {/* soft success glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.15, 1.25] }}
        transition={{ duration: 1.2, delay: 0.25 }}
        className="pointer-events-none absolute w-24 h-24 rounded-full bg-emerald-400/10 blur-xl"
      />
    </motion.div>
  );
}
