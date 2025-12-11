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
          width: 2.4rem;
          height: 2.4rem;
        }

        .ev-fallback {
          width: 1.8rem;
          height: 1.8rem;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
        }

        /* CAPTURE – subtle one-time "flash" lines on load */
        .camera-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .camera-line {
          position: absolute;
          height: 1px;
          background-color: rgba(255, 255, 255, 0.9);
          opacity: 0;
          transform-origin: center;
          animation: cameraFlash 1.4s ease-out 1;
        }

        .camera-line--2 {
          animation-delay: 0.1s;
        }

        .camera-line--3 {
          animation-delay: 0.2s;
        }

        @keyframes cameraFlash {
          0% {
            opacity: 0;
            transform: scaleX(0.5);
          }
          10% {
            opacity: 1;
            transform: scaleX(1);
          }
          35% {
            opacity: 0.6;
            transform: scaleX(1.05);
          }
          60% {
            opacity: 0;
            transform: scaleX(1.1);
          }
          100% {
            opacity: 0;
          }
        }

        /* CROSS-CHECK – "text lines" gently scanning back and forth */
        .doc-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .doc-line {
          position: absolute;
          left: 0.7rem;
          right: 0.7rem;
          height: 2px;
          background-color: rgba(148, 163, 184, 0.9);
          border-radius: 9999px;
          transform: translateX(-15%);
          animation: docScan 2.3s ease-in-out infinite;
        }

        .doc-line--1 {
          top: 46%;
        }

        .doc-line--2 {
          top: 56%;
          animation-delay: 0.25s;
        }

        .doc-line--3 {
          top: 66%;
          animation-delay: 0.5s;
        }

        @keyframes docScan {
          0% {
            transform: translateX(-18%);
            opacity: 0.2;
          }
          30% {
            opacity: 0.8;
          }
          50% {
            transform: translateX(8%);
            opacity: 1;
          }
          80% {
            opacity: 0.4;
          }
          100% {
            transform: translateX(-18%);
            opacity: 0.2;
          }
        }

        /* CORRECT – checkmark in a soft green pulse, drawing itself once */
        .check-shell {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .check-circle {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 9999px;
          border: 1px solid rgba(34, 197, 94, 0.55);
          background: radial-gradient(
            circle at 30% 20%,
            rgba(34, 197, 94, 0.26),
            transparent
          );
          display: flex;
          align-items: center;
          justify-content: center;
          animation: checkPulse 2.4s ease-out infinite;
        }

        @keyframes checkPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.25);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        .check-path {
          stroke-dasharray: 26;
          stroke-dashoffset: 26;
          animation: checkDraw 0.9s ease-out forwards;
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
        className="ev-icon"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M9 7l1.2-2.2A1 1 0 0 1 11.1 4h1.8a1 1 0 0 1 .9.5L15 7" />
        <circle cx="12" cy="13" r="3.4" />
      </svg>

      {/* subtle flash lines on first load */}
      <div className="camera-lines">
        <div
          className="camera-line camera-line--1"
          style={{ top: '0.85rem', left: '0.9rem', right: '1.6rem' }}
        />
        <div
          className="camera-line camera-line--2"
          style={{ top: '1.25rem', left: '1.4rem', right: '0.9rem' }}
        />
        <div
          className="camera-line camera-line--3"
          style={{ top: '1.7rem', left: '1.1rem', right: '1.3rem' }}
        />
      </div>
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
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        {/* static lines so it still looks good without animation */}
        <path d="M9 9h8" />
        <path d="M9 12.5h6" />
        <path d="M9 16h5" />
      </svg>

      {/* animated "text" lines */}
      <div className="doc-lines">
        <div className="doc-line doc-line--1" />
        <div className="doc-line doc-line--2" />
        <div className="doc-line doc-line--3" />
      </div>
    </div>
  );
}

function CorrectCardVisual() {
  return (
    <div className="check-shell">
      <div className="check-circle">
        <svg
          viewBox="0 0 24 24"
          className="ev-icon"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            className="check-path"
            d="M19.5 6.75L10.5 17 5 11.5"
          />
        </svg>
      </div>
    </div>
  );
}
