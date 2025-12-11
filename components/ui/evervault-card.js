'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function EvervaultCard({ text, className }) {
  const key = (text || '').toLowerCase();

  let visual = null;
  if (key === 'capture') {
    visual = <CaptureCardVisual />;
  } else if (key === 'cross-check' || key === 'crosscheck') {
    visual = <CrossCheckCardVisual />;
  } else if (key === 'correct') {
    visual = <CorrectCardVisual />;
  } else {
    // fallback – just show a neutral circle if text doesn't match
    visual = (
      <div className="ev-shell">
        <div className="ev-fallback" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center',
        className
      )}
    >
      {visual}

      {/* Local scoped styles (no Tailwind config changes needed) */}
      <style jsx>{`
        .ev-shell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ev-icon {
          width: 2.5rem;
          height: 2.5rem;
          color: #666;
          stroke-width: 1.5;
        }

        .ev-fallback {
          width: 1.8rem;
          height: 1.8rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
        }

        /* CAPTURE – subtle camera snap */
        .camera-icon {
          animation: cameraSnap 4s ease-in-out infinite;
        }

        .camera-lens {
          transform-origin: center;
          animation: lensClick 4s ease-in-out infinite;
        }

        .camera-flash {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.4) 0%,
            rgba(255, 255, 255, 0) 60%
          );
          opacity: 0;
          animation: flashBurst 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes cameraSnap {
          0%, 100% {
            transform: translateY(0);
          }
          47% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-1px);
          }
          53% {
            transform: translateY(0);
          }
        }

        @keyframes lensClick {
          0%, 100% {
            transform: scale(1);
          }
          47% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.92);
          }
          53% {
            transform: scale(1);
          }
        }

        @keyframes flashBurst {
          0%, 100% {
            opacity: 0;
            transform: scale(0.8);
          }
          49.5% {
            opacity: 0;
          }
          50% {
            opacity: 0.6;
            transform: scale(1);
          }
          51% {
            opacity: 0;
            transform: scale(1.2);
          }
        }

        /* CROSS-CHECK – minimal scanning lines */
        .doc-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .doc-line {
          position: absolute;
          left: 0.9rem;
          height: 1.5px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(100, 100, 100, 0.3) 30%,
            rgba(100, 100, 100, 0.6) 50%,
            rgba(100, 100, 100, 0.3) 70%,
            transparent 100%
          );
          border-radius: 9999px;
          animation: docScan 3s ease-in-out infinite;
        }

        .doc-line--1 {
          top: 32%;
          width: 60%;
        }

        .doc-line--2 {
          top: 44%;
          width: 50%;
          animation-delay: 0.7s;
        }

        .doc-line--3 {
          top: 56%;
          width: 65%;
          animation-delay: 1.4s;
        }

        .doc-line--4 {
          top: 68%;
          width: 45%;
          animation-delay: 2.1s;
        }

        @keyframes docScan {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }
          15% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
          85% {
            opacity: 0.5;
          }
          100% {
            transform: translateX(180%);
            opacity: 0;
          }
        }

        /* CORRECT – clean checkmark draw */
        .check-shell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .checkmark-icon {
          color: #10b981;
          stroke-width: 2;
        }

        .check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: checkDraw 0.6s ease-out forwards;
        }

        @keyframes checkDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

/* ----- Individual visuals ----- */

function CaptureCardVisual() {
  return (
    <div className="ev-shell">
      <svg
        viewBox="0 0 24 24"
        className="ev-icon camera-icon"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M9 7l1.2-2.2A1 1 0 0 1 11.1 4h1.8a1 1 0 0 1 .9.5L15 7" />
        <circle cx="12" cy="13" r="3.4" className="camera-lens" />
      </svg>

      <div className="camera-flash" />
    </div>
  );
}

function CrossCheckCardVisual() {
  return (
    <div className="ev-shell">
      <svg
        viewBox="0 0 24 24"
        className="ev-icon"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
      </svg>

      <div className="doc-lines">
        <div className="doc-line doc-line--1" />
        <div className="doc-line doc-line--2" />
        <div className="doc-line doc-line--3" />
        <div className="doc-line doc-line--4" />
      </div>
    </div>
  );
}

function CorrectCardVisual() {
  return (
    <div className="check-shell">
      <svg
        viewBox="0 0 24 24"
        className="ev-icon checkmark-icon"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          className="check-path"
          d="M20 6L9 17l-5-5"
        />
      </svg>
    </div>
  );
}
