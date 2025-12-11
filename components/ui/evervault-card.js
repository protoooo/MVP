'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Simple bigger camera icon
function CameraIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M9 7l1.2-2.2A1 1 0 0 1 11.1 4h1.8a1 1 0 0 1 .9.5L15 7" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

// Document icon for Cross-check
function DocumentIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 9h8" />
      <path d="M9 12.5h6" />
      <path d="M9 16h5" />
    </svg>
  );
}

// Checkmark icon for Correct
function CheckIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6.5L10.5 17 5 11.5" />
    </svg>
  );
}

function CaptureContent() {
  return (
    <div className="relative flex items-center justify-center h-full w-full">
      {/* Camera with a little “snap” on first paint */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: [0, 1, 1],
          scale: [0.9, 1.05, 1],
        }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="relative flex items-center justify-center"
      >
        <CameraIcon className="w-12 h-12 text-neutral-900 dark:text-neutral-50" />

        {/* Flash lines – only play once on load */}
        <motion.span
          className="absolute -top-3 left-1/2 -translate-x-1/2 h-px w-8 bg-white dark:bg-neutral-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4, delay: 0.1 }}
        />
        <motion.span
          className="absolute top-1/2 -right-3 -translate-y-1/2 w-px h-8 bg-white dark:bg-neutral-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4, delay: 0.18 }}
        />
        <motion.span
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-px w-8 bg-white dark:bg-neutral-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4, delay: 0.26 }}
        />
        <motion.span
          className="absolute top-1/2 -left-3 -translate-y-1/2 w-px h-8 bg-white dark:bg-neutral-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4, delay: 0.34 }}
        />
      </motion.div>
    </div>
  );
}

function CrossCheckContent() {
  return (
    <div className="relative flex items-center justify-center h-full w-full">
      <DocumentIcon className="w-11 h-11 text-neutral-900 dark:text-neutral-50" />

      {/* “Text” lines sliding like scanning / reviewing */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-px w-12 rounded-full bg-neutral-400/70 dark:bg-neutral-500/80"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: [0, 1, 1, 0], x: [10, 0, -6, -6] }}
            transition={{
              duration: 1.3,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 0.4,
              delay: 0.12 * i,
            }}
            style={{ marginTop: i === 0 ? 0 : 4 }}
          />
        ))}
      </div>
    </div>
  );
}

function CorrectContent() {
  return (
    <div className="relative flex items-center justify-center h-full w-full">
      {/* Soft green glow */}
      <motion.div
        className="absolute w-16 h-16 rounded-full bg-emerald-500/25 blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.7] }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />
      {/* Circle + checkmark */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.65, ease: 'easeOut', delay: 0.1 }}
        className="relative flex items-center justify-center"
      >
        <div className="w-12 h-12 rounded-full border border-emerald-500/80 dark:border-emerald-400/90 flex items-center justify-center bg-white dark:bg-neutral-900">
          <CheckIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
      </motion.div>
    </div>
  );
}

export function EvervaultCard({ text, className }) {
  const key = (text || '').toLowerCase();

  let content;
  if (key === 'capture') {
    content = <CaptureContent />;
  } else if (key === 'cross-check' || key === 'crosscheck') {
    content = <CrossCheckContent />;
  } else if (key === 'correct') {
    content = <CorrectContent />;
  } else {
    // Fallback – shouldn’t really hit this
    content = (
      <div className="flex items-center justify-center h-full w-full">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center h-full w-full',
        className
      )}
    >
      {content}
    </div>
  );
}
