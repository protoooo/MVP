'use client'

import { Outfit, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export default function PrivacyPolicy() {
  return (
    <>
      <style jsx global>{`
        :root {
          --bg-0: #0e0e11;
          --bg-1: #121218;
          --bg-2: #15151a;
          --ink-0: #f2f2f2;
          --ink-1: #d9d9df;
          --ink-2: #b9b9c4;
          --line-0: #24242d;
          --line-1: #2a2a32;
          --line-2: #3a3a42;
          --accent: #2F5D8A;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: var(--bg-0);
          color: var(--ink-0);
          overflow-x: hidden;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: var(--bg-0);
          z-index: -1;
          pointer-events: none;
        }

        .policy-page {
          min-height: 100vh;
          background: var(--bg-0);
          padding: 0;
          padding-left: max(20px, env(safe-area-inset-left));
          padding-right: max(20px, env(safe-area-inset-right));
        }

        .policy-topbar {
          max-width: 960px;
          margin: 0 auto;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .plm-brand {
          color: var(--ink-0);
          text-decoration: none;
          font-weight: 700;
          letter-spacing: 0.04em;
          font-size: 22px;
          padding: 6px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .plm-brand:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .plm-brand-mark {
          width: 64px;
          height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .plm-brand-mark img {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          object-fit: contain;
          display: block;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-2);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          color: var(--ink-1);
          text-decoration: none;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          transition: all 0.15s ease;
        }

        .back-link:hover {
          background: #1c1c22;
          border-color: #34343c;
          color: var(--ink-0);
          transform: translateY(-1px);
        }

        .policy-container {
          max-width: 860px;
          margin: 0 auto;
          padding: 20px 16px 60px;
        }

        .policy-header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 1px solid var(--line-1);
        }

        .policy-eyebrow {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--ink-2);
          margin-bottom: 12px;
        }

        .policy-title {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink-0);
          margin: 0 0 12px;
          line-height: 1.1;
        }

        .policy-subtitle {
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink-1);
          margin: 0;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
        }

        .policy-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .policy-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--line-1);
          border-radius: 14px;
          padding: 24px;
          transition: border-color 0.2s ease;
        }

        .policy-section:hover {
          border-color: var(--line-2);
        }

        .policy-section h2 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--ink-0);
          margin: 0 0 14px;
        }

        .policy-section h3 {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--ink-0);
          margin: 18px 0 10px;
        }

        .policy-section p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-1);
          margin: 0 0 12px;
        }

        .policy-section p:last-child {
          margin-bottom: 0;
        }

        .policy-section ul {
          margin: 12px 0;
          padding-left: 20px;
          list-style: none;
        }

        .policy-section ul li {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-1);
          margin-bottom: 10px;
          position: relative;
          padding-left: 16px;
        }

        .policy-section ul li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--ink-2);
          font-weight: bold;
        }

        .policy-highlight {
          background: rgba(47, 93, 138, 0.12);
          border: 1px solid rgba(47, 93, 138, 0.25);
          border-left: 3px solid var(--accent);
        }

        .policy-subsection {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 16px;
          margin: 12px 0;
        }

        .policy-subsection h3 {
          margin-top: 0;
        }

        .policy-link {
          color: var(--accent);
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.15s ease;
        }

        .policy-link:hover {
          border-bottom-color: var(--accent);
        }

        .policy-strong {
          color: var(--ink-0);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .policy-title {
            font-size: 32px;
          }

          .policy-section {
            padding: 18px;
          }

          .policy-container {
            padding: 16px 12px 48px;
          }
        }
      `}</style>

      <div className={`${ibmMono.className} policy-page`}>
        <div className="policy-topbar">
          <Link href="/" className="plm-brand">
            <span className="plm-brand-mark">
              <Image src={appleIcon} alt="" width={64} height={64} priority />
            </span>
            <span>protocolLM</span>
          </Link>
          <Link href="/" className="back-link">
            ← Back
          </Link>
        </div>

        <div className="policy-container">
          <div className="policy-header">
            <div className="policy-eyebrow">Data stewardship</div>
            <h1 className={`${outfit.className} policy-title`}>Privacy Policy</h1>
            <p className="policy-subtitle">
              protocolLM protects operator data with encryption, limited retention, and clear controls. Review how we collect, use, and safeguard your information.
            </p>
          </div>

          <div className="policy-content">
            <section className="policy-section">
              <h2 className={outfit.className}>Introduction</h2>
              <p>
                protocolLM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard
                your information when you use our compliance software.
              </p>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>1. Information We Collect</h2>
              
              <div className="policy-subsection">
                <h3 className={outfit.className}>Account & Usage</h3>
                <ul>
                  <li>Email address (for authentication and account management).</li>
                  <li>Encrypted credentials or tokens associated with your sign-in method.</li>
                  <li>Text queries and automated responses (stored to improve reliability, provide history, and investigate abuse).</li>
                  <li>Uploaded facility images and metadata needed for violation analysis.</li>
                </ul>
              </div>

              <div className="policy-subsection">
                <h3 className={outfit.className}>Payment Data</h3>
                <p>Payments are processed securely by Stripe. We do not store full credit card numbers on our systems.</p>
              </div>
            </section>

            <section className="policy-section policy-highlight">
              <h2 className={outfit.className}>2. AI Processing & Third-Party Services</h2>
              <p className="policy-strong">How we process your data</p>
              
              <p>
                protocolLM uses artificial intelligence services provided by <span className="policy-strong">Anthropic</span> (Claude) for text analysis and response generation,
                and <span className="policy-strong">Cohere</span> for document search and embedding. When you use our Service:
              </p>

              <ul>
                <li>
                  <span className="policy-strong">Anthropic Claude API:</span> Processes your text queries and facility images to generate compliance-related responses. Data is
                  transmitted using industry-standard encryption (TLS 1.2+).
                </li>
                <li>
                  <span className="policy-strong">Cohere API:</span> Creates embeddings from your queries to search our Washtenaw County food code database. Enables fast, relevant
                  document retrieval.
                </li>
                <li>Processing occurs on secure servers operated by these providers in accordance with their respective privacy policies.</li>
                <li>
                  <span className="policy-strong">No public training:</span> Your individual business data and images are NOT used to train public AI models. Data may be retained temporarily to
                  operate the platform, comply with law, or prevent misuse, as specified in each provider's data retention policy.
                </li>
                <li>
                  <span className="policy-strong">Vendor Policies:</span> For details on how these providers handle data, see{' '}
                  <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="policy-link">
                    Anthropic Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="https://cohere.com/privacy" target="_blank" rel="noopener noreferrer" className="policy-link">
                    Cohere Privacy Policy
                  </a>.
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>3. Data Retention & Your Rights</h2>
              <ul>
                <li>
                  <span className="policy-strong">Active accounts:</span> We retain relevant data while your account remains active to provide the Service.
                </li>
                <li>
                  <span className="policy-strong">Cancelled accounts:</span> After cancellation, we generally retain data for up to 90 days to allow reactivation and to maintain audit
                  logs, after which it is scheduled for deletion or anonymization.
                </li>
                <li>
                  <span className="policy-strong">Deletion requests:</span> You may request deletion of your account data at any time by contacting support. Certain records may be kept
                  where required by law or legitimate business needs (for example, billing records).
                </li>
                <li>
                  <span className="policy-strong">Access & Portability:</span> You can request a copy of your data or ask us to transfer it to another service where technically
                  feasible.
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>4. Data Security</h2>
              <p>We implement industry-standard security measures including:</p>
              <ul>
                <li>TLS 1.2+ encryption for all data in transit.</li>
                <li>Encrypted storage for sensitive data at rest.</li>
                <li>Regular security audits and monitoring.</li>
                <li>Strict access controls and authentication requirements.</li>
                <li>CAPTCHA protection against automated abuse.</li>
              </ul>
              <p>
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but continuously work to protect your
                data.
              </p>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>5. Cookies & Tracking</h2>
              <p>We use essential cookies for:</p>
              <ul>
                <li>Authentication and session management.</li>
                <li>Security features (CSRF protection, rate limiting).</li>
                <li>Remembering your preferences.</li>
              </ul>
              <p>
                We do NOT use third-party advertising or tracking cookies. You can manage cookie preferences in your browser settings.
              </p>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>Contact Us</h2>
              <p>
                For questions about this Privacy Policy or your data, contact:<br />
                <a href="mailto:support@protocollm.org" className="policy-link">
                  support@protocollm.org
                </a>
              </p>
              <p>
                For data deletion requests, please include your account email and specify what data you'd like removed.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
