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

function IconCircle({ children }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="flex items-center justify-center rounded-full bg-white border border-slate-200 w-16 h-16 md:w-18 md:h-18">
        {children}
      </div>
    </div>
  );
}

/** 1. Capture – camera */
function CaptureIcon() {
  return (
    <IconCircle>
      <svg
        viewBox="0 0 24 24"
        className="w-9 h-9 text-slate-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </IconCircle>
  );
}

/** 2. Cross-check – clipboard with checkmark */
function CrossCheckIcon() {
  return (
    <IconCircle>
      <svg
        viewBox="0 0 24 24"
        className="w-9 h-9 text-slate-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    </IconCircle>
  );
}

/** 3. Correct – shield with check */
function CorrectIcon() {
  return (
    <IconCircle>
      <svg
        viewBox="0 0 24 24"
        className="w-9 h-9 text-emerald-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </IconCircle>
  );
}

function FallbackDot() {
  return <div className="w-2 h-2 rounded-full bg-slate-400" />;
}
