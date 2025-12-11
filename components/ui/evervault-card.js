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

        /* ~80% larger than your old tiny icons */
        .ev-icon {
          width: 3rem;
          height: 3rem;
          color: #64748b;
        }

        .ev-fallback {
          width: 1.8rem;
          height: 1.8rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
        }

        /* CAPTURE – camera snap animation */
        .camera-icon {
          animation: cameraShake 3s ease-in-out infinite;
        }

        .camera-lens {
          transform-origin: center;
          animation: lensZoom 3s ease-in-out infinite;
        }

        .camera-flash {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 0) 70%
          );
          opacity: 0;
          animation: flashSnap 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes cameraShake {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          45% {
            transform: translateY(0) rotate(0deg);
          }
          48% {
            transform: translateY(-2px) rotate(-1deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          52% {
            transform: translateY(-1px) rotate(1deg);
          }
          55% {
            transform: translateY(0) rotate(0deg);
          }
        }

        @keyframes lensZoom {
          0%, 100% {
            transform: scale(1);
          }
          45% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.85);
          }
          55% {
            transform: scale(1);
          }
        }

        @keyframes flashSnap {
          0%, 100% {
            opacity: 0;
          }
          49% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          52% {
            opacity: 0;
          }
        }

        /* CROSS-CHECK – scrolling document lines */
        .doc-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .doc-line {
          position: absolute;
          left: 1rem;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(148, 163, 184, 0.6) 20%,
            rgba(148, 163, 184, 0.9) 50%,
            rgba(148, 163, 184, 0.6) 80%,
            transparent 100%
          );
          border-radius: 9999px;
          animation: docScroll 2.5s ease-in-out infinite;
        }

        .doc-line--1 {
          top: 30%;
          width: 65%;
        }

        .doc-line--2 {
          top: 42%;
          width: 55%;
          animation-delay: 0.6s;
        }

        .doc-line--3 {
          top: 54%;
          width: 70%;
          animation-delay: 1.2s;
        }

        .doc-line--4 {
          top: 66%;
          width: 50%;
          animation-delay: 1.8s;
        }

        @keyframes docScroll {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(150%);
            opacity: 0;
          }
        }

        /* CORRECT – clean animated checkmark */
        .check-shell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .checkmark-icon {
          color: #22c55e;
        }

        .check-path {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
          animation: checkDraw 1.2s ease-out forwards;
          animation-delay: 0.2s;
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
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M9 7l1.2-2.2A1 1 0 0 1 11.1 4h1.8a1 1 0 0 1 .9.5L15 7" />
        <circle cx="12" cy="13" r="3.4" className="camera-lens" />
      </svg>

      {/* snap flash effect */}
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
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
      </svg>

      {/* scrolling document lines */}
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
        strokeWidth="2.2"
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
