'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function EvervaultCard({ text, className }) {
  const key = (text || '').toLowerCase().trim();

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
 * and are noticeably larger than the old 24px versions.
 */
function IconCircle({ children }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="flex items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 text-slate-800 w-14 h-14 md:w-16 md:h-16">
        {children}
      </div>
    </div>
  );
}

/** 1. Capture – camera with a soft pulse halo */
function CaptureIcon() {
  return (
    <IconCircle>
      <div className="relative">
        {/* subtle pulse around the camera */}
        <div className="absolute inset-0 rounded-full border border-slate-300/80 opacity-60 animate-ping" />
        <svg
          viewBox="0 0 24 24"
          className="relative w-8 h-8 text-slate-700"
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

/** 2. Cross-check – document with gently “scanning” lines */
function CrossCheckIcon() {
  return (
    <IconCircle>
      <div className="relative w-8 h-8">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-slate-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <polyline points="14 3.5 14 8 19 8" />
        </svg>

        {/* three tiny lines that pulse like text being reviewed */}
        <div className="absolute inset-0 flex flex-col justify-center gap-1 px-3">
          <div className="h-[2px] w-8 rounded-full bg-slate-400/70 animate-pulse" />
          <div
            className="h-[2px] w-7 rounded-full bg-slate-400/60 animate-pulse"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="h-[2px] w-9 rounded-full bg-slate-400/50 animate-pulse"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </IconCircle>
  );
}

/** 3. Correct – green check with a soft breathing halo */
function CorrectIcon() {
  return (
    <IconCircle>
      <div className="relative">
        {/* soft green halo */}
        <div className="absolute inset-0 rounded-full bg-emerald-100/60 animate-pulse" />
        <svg
          viewBox="0 0 24 24"
          className="relative w-8 h-8 text-emerald-600"
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
  return <div className="w-2 h-2 rounded-full bg-slate-300" />;
}
