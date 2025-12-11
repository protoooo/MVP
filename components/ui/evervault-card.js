'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function EvervaultCard({ text, className }) {
  const key = (text || '').toLowerCase();

  let visual = null;
  if (key === 'capture') {
    visual = <CaptureIcon />;
  } else if (key === 'cross-check' || key === 'crosscheck') {
    visual = <CrossCheckIcon />;
  } else if (key === 'correct') {
    visual = <CorrectIcon />;
  } else {
    visual = <FallbackDot />;
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center',
        className
      )}
    >
      {visual}
    </div>
  );
}

/**
 * Shared circle shell so all three icons look consistent
 * and about ~80% bigger than your old 24px icons.
 */
function IconCircle({ children }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 w-12 h-12 md:w-14 md:h-14">
        {children}
      </div>
    </div>
  );
}

/** 1. Capture – camera with a very soft pulse */
function CaptureIcon() {
  return (
    <IconCircle>
      <div className="relative">
        {/* subtle pulse around the camera */}
        <div className="absolute inset-0 rounded-full border border-slate-300/70 animate-ping opacity-60" />
        <svg
          viewBox="0 0 24 24"
          className="relative w-7 h-7 text-slate-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M9 7l1.2-2.2A1 1 0 0 1 11.1 4h1.8a1 1 0 0 1 .9.5L15 7" />
          <circle cx="12" cy="13" r="3.4" />
        </svg>
      </div>
    </IconCircle>
  );
}

/** 2. Cross-check – document with three “scanning” lines */
function CrossCheckIcon() {
  return (
    <IconCircle>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7 text-slate-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <polyline points="14 3.5 14 8 19 8" />
        </svg>

        {/* three tiny lines that gently pulse, like text being reviewed */}
        <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-3">
          <div className="h-[2px] w-7 bg-slate-400/70 rounded-full animate-pulse" />
          <div className="h-[2px] w-6 bg-slate-400/60 rounded-full animate-pulse delay-150" />
          <div className="h-[2px] w-8 bg-slate-400/50 rounded-full animate-pulse delay-300" />
        </div>
      </div>
    </IconCircle>
  );
}

/** 3. Correct – green check with a soft breathing effect */
function CorrectIcon() {
  return (
    <IconCircle>
      <div className="relative">
        {/* soft green halo */}
        <div className="absolute inset-0 rounded-full bg-emerald-100/40 animate-pulse" />
        <svg
          viewBox="0 0 24 24"
          className="relative w-7 h-7 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    </IconCircle>
  );
}

/** fallback if text prop doesn't match */
function FallbackDot() {
  return (
    <div className="w-2 h-2 rounded-full bg-slate-300" />
  );
}
