'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { IBM_Plex_Mono } from 'next/font/google'
import appleIcon from '@/app/apple-icon.png'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function InfoPageLayout({ 
  title, 
  subtitle, 
  eyebrow, 
  children,
  backHref = '/',
  headerAction = null
}) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = 'chat'
  }, [])

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-0: #09090b;
          --bg-1: #0c0c0e;
          --bg-2: #131316;
          --bg-3: #1a1a1f;

          --ink-0: #fafafa;
          --ink-1: #a0a0a8;
          --ink-2: #636369;
          --ink-3: #3f3f46;

          --accent: #3b82f6;
          --accent-hover: #2563eb;
          --accent-dim: rgba(59, 130, 246, 0.1);

          --border-subtle: rgba(255, 255, 255, 0.05);
          --border-default: rgba(255, 255, 255, 0.08);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
        }

        html, body {
          height: 100%;
          margin: 0;
          background: var(--bg-0);
          color: var(--ink-0);
        }

        .info-page-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-0);
        }

        .info-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          padding-left: max(24px, env(safe-area-inset-left));
          padding-right: max(24px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .info-brand {
          color: var(--ink-0);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .info-brand:hover { opacity: 0.7; }

        .info-brand-inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .info-brand-mark {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }

        .info-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .info-brand-text {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .info-back-link {
          font-size: 13px;
          color: var(--ink-1);
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .info-back-link:hover {
          color: var(--ink-0);
        }

        .info-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .info-action-button {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-0);
          background: var(--bg-3);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .info-action-button:hover:not(:disabled) {
          background: var(--bg-2);
          border-color: var(--border-default);
        }

        .info-action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .info-content {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        .info-header {
          margin-bottom: 40px;
        }

        .info-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 12px;
        }

        .info-title {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--ink-0);
          margin: 0 0 12px;
        }

        .info-subtitle {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-1);
          margin: 0;
        }

        .info-section {
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 24px;
          margin-bottom: 20px;
        }

        .info-section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--ink-0);
          margin: 0 0 16px;
        }

        .info-section p {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-1);
          margin: 0 0 16px;
        }

        .info-section p:last-child {
          margin-bottom: 0;
        }

        .info-section ul {
          list-style: disc;
          padding-left: 20px;
          margin: 0 0 16px;
        }

        .info-section ul:last-child {
          margin-bottom: 0;
        }

        .info-section li {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-1);
          margin-bottom: 8px;
        }

        .info-section li:last-child {
          margin-bottom: 0;
        }

        .info-section strong {
          color: var(--ink-0);
        }

        .info-section a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s ease;
        }

        .info-section a:hover {
          color: var(--accent-hover);
        }

        .info-highlight {
          background: var(--bg-3);
          border-left: 3px solid var(--accent);
          border-radius: var(--radius-sm);
          padding: 16px;
          margin: 16px 0;
        }

        .info-highlight-title {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent);
          margin: 0 0 8px;
        }

        .info-highlight p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .info-topbar {
            padding: 12px 16px;
          }

          .info-content {
            padding: 0 16px 60px;
          }

          .info-title {
            font-size: 24px;
          }

          .info-section {
            padding: 20px;
          }

          .info-brand-mark {
            width: 40px;
            height: 40px;
          }

          .info-brand-text {
            font-size: 15px;
          }
        }
      `}</style>

      <div className={`${ibmMono.className} info-page-root`}>
        <header className="info-topbar">
          <Link href="/" className="info-brand">
            <span className="info-brand-inner">
              <span className="info-brand-mark">
                <Image src={appleIcon} alt="" width={64} height={64} priority />
              </span>
              <span className="info-brand-text">protocolLM</span>
            </span>
          </Link>
          <div className="info-actions">
            <Link href={backHref} className="info-back-link">
              ← Back
            </Link>
            {headerAction}
          </div>
        </header>

        <main className="info-content">
          <div className="info-header">
            {eyebrow && <div className="info-eyebrow">{eyebrow}</div>}
            <h1 className="info-title">{title}</h1>
            {subtitle && <p className="info-subtitle">{subtitle}</p>}
          </div>

          {children}
        </main>
      </div>
    </>
  )
}
