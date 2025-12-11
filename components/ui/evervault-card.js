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

/** 1. Capture – simple static camera icon */
function CaptureIcon() {
  return (
    <div className="flex items-center justify-center w-28 h-28">
      <svg
        viewBox="0 0 24 24"
        className="w-16 h-16 text-slate-800"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </div>
  );
}

/** 2. Cross-check – document with a few thicker lines inside */
function CrossCheckIcon() {
  return (
    <div className="flex items-center justify-center w-28 h-28">
      <svg
        viewBox="0 0 24 24"
        className="w-16 h-16 text-slate-800"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Document outline */}
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />

        {/* Thick “text” lines inside the document */}
        <line x1="8" y1="11" x2="16" y2="11" strokeWidth="2" />
        <line x1="8" y1="14" x2="16" y2="14" strokeWidth="2" />
        <line x1="8" y1="17" x2="13" y2="17" strokeWidth="2" />
      </svg>
    </div>
  );
}

/** 3. Correct – simple shield + check */
function CorrectIcon() {
  return (
    <div className="flex items-center justify-center w-28 h-28">
      <svg
        viewBox="0 0 24 24"
        className="w-16 h-16 text-slate-800"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </div>
  );
}

function FallbackDot() {
  return <div className="w-2 h-2 rounded-full bg-slate-400" />;
}
