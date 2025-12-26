'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans } from 'next/font/google'
import appleIcon from '@/app/apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700'] })

export default function InfoPageLayout({ 
  title, 
  subtitle, 
  eyebrow, 
  children,
  backHref = '/',
  headerAction = null,
  brandSize = 48,
  brandSizeMobile
}) {
  const mobileBrandSize = brandSizeMobile ?? Math.round(brandSize * 0.75)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = 'landing'
  }, [])

  return (
    <>
      <style jsx global>{`
        /* ✅ Notion-inspired flat design - NO GRADIENTS, NO IMAGES */
        .info-page-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--paper);
          isolation: isolate;
        }

        .info-brand {
          color: var(--ink);
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
          width: ${brandSize}px;
          height: ${brandSize}px;
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
          color: var(--ink);
        }

        .info-back-link {
          font-size: 13px;
          color: var(--ink-60);
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .info-back-link:hover {
          color: var(--ink);
        }

        .info-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .info-action-button {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .info-action-button:hover:not(:disabled) {
          background: var(--clay);
          border-color: var(--border-strong);
        }

        .info-action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .info-content {
          position: relative;
          z-index: 1;
          max-width: 760px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        /* ✅ Hero card - flat Notion style with subtle border */
        .info-hero-card {
          position: relative;
          z-index: 1;
          width: 100%;
          margin-bottom: 24px;
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
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
          color: var(--ink);
          margin: 0 0 12px;
        }

        .info-subtitle {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-60);
          margin: 0;
        }

        /* ✅ Section card - flat Notion style */
        .info-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          padding: 24px;
          margin-bottom: 20px;
        }

        .info-section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 16px;
        }

        .info-section p {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-80);
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
          color: var(--ink-80);
          margin-bottom: 8px;
        }

        .info-section li:last-child {
          margin-bottom: 0;
        }

        .info-section strong {
          color: var(--ink);
        }

        .info-section a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.15s ease;
        }

        .info-section a:hover {
          color: var(--accent);
          opacity: 0.8;
        }

        /* ✅ Highlight box - flat Notion style with left accent border */
        .info-highlight {
          background: var(--clay);
          border: 1px solid var(--border);
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
          color: var(--ink-80);
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
            width: ${mobileBrandSize}px;
            height: ${mobileBrandSize}px;
          }

          .info-brand-text {
            font-size: 15px;
          }
        }
      `}</style>

      <div className={`${plusJakarta.className} info-page-root`}>
        <main className="info-content">
          <div className="info-hero-card">
            <div className="info-hero-top">
              <Link href="/" className="info-brand">
                <span className="info-brand-inner">
                  <span className="info-brand-mark">
                    <Image src={appleIcon} alt="" width={brandSize} height={brandSize} priority />
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
