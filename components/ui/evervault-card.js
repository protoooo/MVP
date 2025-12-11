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

/** 1. Capture – camera with snap animation and spark lines */
function CaptureIcon() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      {/* Spark lines that shoot out from camera */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-1/2 left-1/2 w-8 h-[2px] bg-slate-600 origin-left"
          style={{
            transform: 'translate(-50%, -50%) rotate(45deg) scaleX(0)',
            animation: 'spark 0.3s ease-out 0.1s forwards'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-8 h-[2px] bg-slate-600 origin-left"
          style={{
            transform: 'translate(-50%, -50%) rotate(-45deg) scaleX(0)',
            animation: 'spark 0.3s ease-out 0.15s forwards'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-8 h-[2px] bg-slate-600 origin-left"
          style={{
            transform: 'translate(-50%, -50%) rotate(135deg) scaleX(0)',
            animation: 'spark 0.3s ease-out 0.2s forwards'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-8 h-[2px] bg-slate-600 origin-left"
          style={{
            transform: 'translate(-50%, -50%) rotate(-135deg) scaleX(0)',
            animation: 'spark 0.3s ease-out 0.25s forwards'
          }}
        />
      </div>
      
      <svg
        viewBox="0 0 24 24"
        className="w-12 h-12 text-slate-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: 'cameraSnap 0.4s ease-out forwards'
        }}
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      
      <style jsx>{`
        @keyframes cameraSnap {
          0% { transform: scale(1); }
          30% { transform: scale(0.92); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes spark {
          0% { transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scaleX(0); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/** 2. Cross-check – document with scrolling lines */
function CrossCheckIcon() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg
        viewBox="0 0 24 24"
        className="w-12 h-12 text-slate-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      
      {/* Animated scrolling lines inside document */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-8 h-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-[1.5px] bg-slate-600"
              style={{
                top: `${20 + i * 15}%`,
                animation: `scrollLine 2s ease-in-out ${0.6 + i * 0.1}s infinite`
              }}
            />
          ))}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scrollLine {
          0%, 15% { opacity: 0; transform: translateY(0); }
          20%, 50% { opacity: 1; transform: translateY(0); }
          70% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 0; transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
}

/** 3. Correct – shield with tracing highlight animation */
function CorrectIcon() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg
        viewBox="0 0 24 24"
        className="w-12 h-12 text-slate-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      
      {/* Tracing highlight around the shield */}
      <svg
        viewBox="0 0 24 24"
        className="absolute w-12 h-12"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path 
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="url(#highlight-gradient)"
          strokeWidth="2.5"
          strokeDasharray="80"
          strokeDashoffset="80"
          style={{
            animation: 'trace 2s ease-in-out 2.8s infinite'
          }}
        />
        <defs>
          <linearGradient id="highlight-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      <style jsx>{`
        @keyframes trace {
          0% { strokeDashoffset: 80; opacity: 0; }
          5% { opacity: 1; }
          50% { strokeDashoffset: 0; opacity: 1; }
          95% { opacity: 1; }
          100% { strokeDashoffset: -80; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function FallbackDot() {
  return <div className="w-2 h-2 rounded-full bg-slate-400" />;
}
