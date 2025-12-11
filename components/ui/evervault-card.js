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

function IconCircle({ children, color = "slate" }) {
  return (
    <div className="relative flex items-center justify-center group">
      <div className={cn(
        "flex items-center justify-center rounded-full w-16 h-16 md:w-18 md:h-18 transition-all duration-300",
        "bg-white border shadow-sm",
        color === "slate" && "border-slate-200 group-hover:border-slate-300 group-hover:shadow",
        color === "blue" && "border-blue-200 group-hover:border-blue-300 group-hover:shadow-blue-100",
        color === "emerald" && "border-emerald-200 group-hover:border-emerald-300 group-hover:shadow-emerald-100"
      )}>
        {children}
      </div>
    </div>
  );
}

/** 1. Capture – camera with subtle focus indicator */
function CaptureIcon() {
  return (
    <IconCircle color="blue">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="w-8 h-8 text-slate-700 transition-transform duration-300 group-hover:scale-105"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        
        {/* Subtle corner brackets for "focus" effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-400" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-400" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-400" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-400" />
        </div>
      </div>
    </IconCircle>
  );
}

/** 2. Cross-check – document with subtle scan line */
function CrossCheckIcon() {
  return (
    <IconCircle color="slate">
      <div className="relative w-8 h-8">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-slate-700 transition-transform duration-300 group-hover:scale-105"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
        
        {/* Very subtle scan line on hover */}
        <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div 
            className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-slate-400/40 to-transparent"
            style={{
              animation: 'scan 2s ease-in-out infinite',
              top: '50%'
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100%); opacity: 0; }
          50% { transform: translateY(100%); opacity: 1; }
        }
      `}</style>
    </IconCircle>
  );
}

/** 3. Correct – shield check with subtle glow */
function CorrectIcon() {
  return (
    <IconCircle color="emerald">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="w-8 h-8 text-emerald-600 transition-transform duration-300 group-hover:scale-105"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        
        {/* Very subtle glow on hover */}
        <div className="absolute inset-0 rounded-full bg-emerald-400/0 group-hover:bg-emerald-400/10 transition-colors duration-300 blur-sm" />
      </div>
    </IconCircle>
  );
}

function FallbackDot() {
  return <div className="w-2 h-2 rounded-full bg-slate-400" />;
}
