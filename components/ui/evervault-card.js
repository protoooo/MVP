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

function IconCircle({ children, gradient = false }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className={cn(
        "flex items-center justify-center rounded-full w-16 h-16 md:w-20 md:h-20 shadow-lg",
        gradient 
          ? "bg-gradient-to-br from-slate-100 to-slate-50 border-2 border-white"
          : "bg-white border-2 border-slate-100"
      )}>
        {children}
      </div>
    </div>
  );
}

/** 1. Capture – camera with animated focus rings */
function CaptureIcon() {
  return (
    <IconCircle gradient>
      <div className="relative">
        {/* Animated focus rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-12 h-12 rounded-full border-2 border-blue-400/40 animate-ping" 
               style={{ animationDuration: '2s' }} />
          <div className="absolute w-14 h-14 rounded-full border-2 border-blue-300/30 animate-ping" 
               style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
        </div>
        
        <svg
          viewBox="0 0 24 24"
          className="relative w-9 h-9 text-slate-700 drop-shadow-sm"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="6" width="20" height="14" rx="2.5" />
          <path d="M7 6l1.5-2.5A1.5 1.5 0 0 1 9.8 2.5h4.4a1.5 1.5 0 0 1 1.3 1L17 6" />
          <circle cx="12" cy="13" r="3.5" strokeWidth="2" />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </div>
    </IconCircle>
  );
}

/** 2. Cross-check – document with scanning beam effect */
function CrossCheckIcon() {
  return (
    <IconCircle gradient>
      <div className="relative w-9 h-9">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-slate-700 drop-shadow-sm"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" strokeWidth="1.5" />
          <line x1="8" y1="17" x2="16" y2="17" strokeWidth="1.5" />
        </svg>
        
        {/* Scanning beam effect */}
        <div className="absolute inset-0 overflow-hidden rounded">
          <div 
            className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-scan"
            style={{
              animation: 'scan 2s ease-in-out infinite',
              filter: 'blur(1px)'
            }}
          />
        </div>
        
        {/* Magnifying glass accent */}
        <div className="absolute -bottom-1 -right-1">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-amber-500 drop-shadow"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          50% { top: 50%; opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </IconCircle>
  );
}

/** 3. Correct – checkmark with success ripple */
function CorrectIcon() {
  return (
    <IconCircle>
      <div className="relative">
        {/* Success ripple rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-14 h-14 rounded-full bg-emerald-400/20 animate-ping" 
               style={{ animationDuration: '1.5s' }} />
          <div className="absolute w-16 h-16 rounded-full bg-emerald-300/10 animate-ping" 
               style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
        </div>
        
        {/* Gradient circle background */}
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 text-white drop-shadow-sm"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        
        {/* Sparkle accent */}
        <div className="absolute -top-1 -right-1 w-3 h-3">
          <div className="w-full h-full animate-pulse" style={{ animationDuration: '1.5s' }}>
            <svg viewBox="0 0 24 24" className="w-full h-full text-emerald-400" fill="currentColor">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          </div>
        </div>
      </div>
    </IconCircle>
  );
}

function FallbackDot() {
  return (
    <div className="w-3 h-3 rounded-full bg-slate-400 shadow-sm animate-pulse" />
  );
}
