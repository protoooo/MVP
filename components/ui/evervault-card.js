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
 * 1. Capture – camera with snap & subtle spark lines
 * Runs at the start of a 7s cycle.
 */
function CaptureIcon() {
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      {/* Spark lines around camera */}
      <div className="absolute inset-0 pointer-events-none">
        <span className="spark spark--top" />
        <span className="spark spark--right" />
        <span className="spark spark--bottom" />
        <span className="spark spark--left" />
      </div>

      <svg
        viewBox="0 0 24 24"
        className="w-16 h-16 text-slate-800"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className="camera-body">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </g>
      </svg>

      <style jsx>{`
        .camera-body {
          animation: camera-sequence 7s ease-out infinite;
          transform-origin: center;
        }

        .spark {
          position: absolute;
          background: #020617; /* near black / slate-950 */
          height: 2px;
          width: 0;
          opacity: 0;
          border-radius: 9999px;
          animation: spark-sequence 7s ease-out infinite;
        }

        .spark--top {
          top: 12%;
          left: 50%;
          transform: translateX(-50%);
        }
        .spark--bottom {
          bottom: 12%;
          left: 50%;
          transform: translateX(-50%);
        }
        .spark--left {
          left: 10%;
          top: 50%;
          transform: translateY(-50%);
        }
        .spark--right {
          right: 10%;
          top: 50%;
          transform: translateY(-50%);
        }

        /* 0–18% of the cycle: camera snap + sparks */
        @keyframes camera-sequence {
          0% {
            transform: scale(1);
          }
          3% {
            transform: scale(0.9);
          }
          7% {
            transform: scale(1.08);
          }
          12% {
            transform: scale(1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes spark-sequence {
          0%,
          3% {
            width: 0;
            opacity: 0;
          }
          4% {
            width: 0;
            opacity: 1;
          }
          8% {
            width: 1.6rem;
            opacity: 1;
          }
          12% {
            opacity: 0;
            width: 1.8rem;
          }
          100% {
            width: 0;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 2. Cross-check – document with scrolling lines
 * Lines "work" in the middle portion of the 7s cycle.
 */
function CrossCheckIcon() {
  const lines = [0, 1, 2, 3, 4];

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg
        viewBox="0 0 24 24"
        className="w-16 h-16 text-slate-800"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>

      {/* Animated "text" lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-10 h-14">
          {lines.map((i) => (
            <div
              key={i}
              className="doc-line bg-slate-700"
              style={{
                top: `${10 + i * 18}%`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .doc-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 9999px;
          opacity: 0;
          animation: doc-line-sequence 7s ease-in-out infinite;
        }

        /* 20–60%: lines appear, scroll slightly down, then fade out */
        @keyframes doc-line-sequence {
          0%,
          18% {
            opacity: 0;
            transform: translateY(0);
          }
          22% {
            opacity: 1;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(4px);
          }
          60% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 0;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 3. Correct – shield with highlight tracing
 * Traces toward the end of the 7s cycle.
 */
function CorrectIcon() {
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      {/* Base shield + check */}
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

      {/* Tracing highlight */}
      <svg
        viewBox="0 0 24 24"
        className="absolute w-16 h-16"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient
            id="highlight-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="shield-highlight"
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="url(#highlight-gradient)"
          strokeWidth="2.4"
          strokeDasharray="80"
          strokeDashoffset="80"
        />
      </svg>

      <style jsx>{`
        .shield-highlight {
          animation: shield-highlight-sequence 7s ease-in-out infinite;
        }

        /* 60–100%: highlight traces around the shield and fades */
        @keyframes shield-highlight-sequence {
          0%,
          58% {
            stroke-dashoffset: 80;
            opacity: 0;
          }
          62% {
            opacity: 1;
            stroke-dashoffset: 80;
          }
          80% {
            opacity: 1;
            stroke-dashoffset: 0;
          }
          100% {
            opacity: 0;
            stroke-dashoffset: -80;
          }
        }
      `}</style>
    </div>
  );
}

function FallbackDot() {
  return <div className="w-2 h-2 rounded-full bg-slate-400" />;
}
