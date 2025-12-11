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

      {/* Local styles – only for this component */}
      <style jsx>{`
        .ev-shell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Circular badge behind every icon */
        .ev-badge {
          width: 3.1rem;
          height: 3.1rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.55);
          background: radial-gradient(
            circle at 30% 20%,
            rgba(255, 255, 255, 0.9),
            rgba(241, 245, 249, 0.9)
          );
          box-shadow:
            0 10px 25px rgba(15, 23, 42, 0.08),
            0 0 0 1px rgba(148, 163, 184, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ev-icon {
          width: 1.7rem;
          height: 1.7rem;
          color: #0f172a;
          stroke-width: 1.7;
        }

        .ev-fallback {
          width: 0.4rem;
          height: 0.4rem;
          border-radius: 9999px;
          background: rgba(148, 163, 184, 0.7);
        }

        /* CAPTURE – tiny pulsing flash, no crazy shake */
        .camera-lens {
          transform-origin: center;
          animation: lensClick 4s ease-in-out infinite;
        }

        .camera-flash {
          position: absolute;
          inset: -0.4rem;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 0) 70%
          );
          opacity: 0;
          pointer-events: none;
          animation: flashBurst 4s ease-in-out infinite;
        }

        @keyframes lensClick {
          0%,
          100% {
            transform: scale(1);
          }
          48% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.9);
          }
          52% {
            transform: scale(1);
          }
        }

        @keyframes flashBurst {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.9);
          }
          49.5% {
            opacity: 0;
          }
          50% {
            opacity: 0.55;
            transform: scale(1);
          }
          51% {
            opacity: 0;
            transform: scale(1.1);
          }
        }

        /* CROSS-CHECK – slow scanning lines over the doc */
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
            rgba(148, 163, 184, 0.15) 10%,
            rgba(148, 163, 184, 0.6) 40%,
            rgba(148, 163, 184, 0.15) 90%,
            transparent 100%
          );
          border-radius: 9999px;
          animation: docScan 3.4s ease-in-out infinite;
        }

        .doc-line--1 {
          top: 34%;
          width: 60%;
        }

        .doc-line--2 {
          top: 46%;
          width: 50%;
          animation-delay: 0.7s;
        }

        .doc-line--3 {
          top: 58%;
          width: 68%;
          animation-delay: 1.4s;
        }

        .doc-line--4 {
          top: 70%;
          width: 44%;
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
          55% {
            opacity: 1;
          }
          85% {
            opacity: 0.4;
          }
          100% {
            transform: translateX(170%);
            opacity: 0;
          }
        }

        /* CORRECT – checkmark draws once, with a soft halo breathing */
        .check-shell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .check-halo {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.2) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          opacity: 0.6;
          animation: haloPulse 3s ease-in-out infinite;
        }

        .checkmark-icon {
          color: #16a34a;
          stroke-width: 2;
        }

        .check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: checkDraw 0.7s ease-out forwards;
          animation-delay: 0.2s;
        }

        @keyframes checkDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes haloPulse {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.6;
            transform: scale(1);
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
      <div className="ev-badge">
        <svg
          viewBox="0 0 24 24"
          className="ev-icon"
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
    </div>
  );
}

function CrossCheckCardVisual() {
  return (
    <div className="ev-shell">
      <div className="ev-badge">
        <svg
          viewBox="0 0 24 24"
          className="ev-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <polyline points="14 3.5 14 8 19 8" />
        </svg>
        <div className="doc-lines">
          <div className="doc-line doc-line--1" />
          <div className="doc-line doc-line--2" />
          <div className="doc-line doc-line--3" />
          <div className="doc-line doc-line--4" />
        </div>
      </div>
    </div>
  );
}

function CorrectCardVisual() {
  return (
    <div className="check-shell">
      <div className="ev-badge">
        <div className="check-halo" />
        <svg
          viewBox="0 0 24 24"
          className="ev-icon checkmark-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="check-path" d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    </div>
  );
}
