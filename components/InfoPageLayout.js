'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { IBM_Plex_Mono } from 'next/font/google'
import appleIcon from '@/app/apple-icon.png'
import bg from '@/app/assets/background/protocolLM-bg.png'

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
    document.documentElement.dataset.view = 'landing'
  }, [])

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-0: rgba(5, 7, 13, 0.72);
          --bg-1: rgba(7, 10, 18, 0.78);
          --bg-2: rgba(9, 13, 22, 0.82);
          --bg-3: rgba(255, 255, 255, 0.1);

          --ink-0: #f6f9ff;
          --ink-1: rgba(240, 244, 255, 0.86);
          --ink-2: rgba(214, 222, 240, 0.76);
          --ink-3: rgba(178, 190, 215, 0.6);

          --accent: #5fa8ff;
          --accent-hover: #7bc2ff;
          --accent-dim: rgba(95, 168, 255, 0.2);

          --border-subtle: rgba(255, 255, 255, 0.18);
          --border-default: rgba(255, 255, 255, 0.32);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
        }

        html, body {
          height: 100%;
          margin: 0;
          background: transparent;
          color: var(--ink-0);
        }

        .info-page-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          background: transparent;
          isolation: isolate;
        }

        .info-page-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(130% 80% at 18% 18%, rgba(255, 255, 255, 0.14), transparent 48%),
            radial-gradient(120% 70% at 82% 6%, rgba(95, 168, 255, 0.18), transparent 52%),
            linear-gradient(135deg, rgba(5, 7, 13, 0.74), rgba(5, 7, 13, 0.5)),
            url(${bg.src});
          background-size: 140% 140%, 140% 140%, cover, cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed, fixed, fixed, fixed;
          pointer-events: none;
          z-index: 0;
          filter: saturate(120%);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .info-content,
        .info-hero-card {
          position: relative;
          z-index: 1;
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
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .info-action-button:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.12));
          border-color: var(--border-default);
        }

        .info-action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .info-content {
          max-width: 760px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        .info-hero-card {
          width: 100%;
          margin-bottom: 24px;
          padding: 20px;
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: var(--radius-md);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.45),
            0 18px 48px rgba(5, 7, 13, 0.32);
          backdrop-filter: blur(14px) saturate(125%);
          -webkit-backdrop-filter: blur(14px) saturate(125%);
        }

        .info-hero-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .info-actions {
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .info-header {
          margin: 0;
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
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.46),
            0 26px 70px rgba(5, 7, 13, 0.4);
          backdrop-filter: blur(14px) saturate(125%);
          -webkit-backdrop-filter: blur(14px) saturate(125%);
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
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-left: 3px solid var(--accent);
          border-radius: var(--radius-sm);
          padding: 16px;
          margin: 16px 0;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38);
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
          .info-content {
            padding: 20px 16px 60px;
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
        <main className="info-content">
          <div className="info-hero-card">
            <div className="info-hero-top">
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
            </div>

            <div className="info-header">
              {eyebrow && <div className="info-eyebrow">{eyebrow}</div>}
              <h1 className="info-title">{title}</h1>
              {subtitle && <p className="info-subtitle">{subtitle}</p>}
            </div>
          </div>

          {children}
        </main>
      </div>
    </>
  )
}
