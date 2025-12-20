'use client'

import { Outfit, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export default function TermsOfService() {
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

        .policy-alert {
          background: rgba(47, 93, 138, 0.15);
          border: 1px solid rgba(47, 93, 138, 0.35);
          border-left: 3px solid var(--accent);
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 24px;
        }

        .policy-alert-label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--accent);
          margin-bottom: 8px;
        }

        .policy-alert-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--ink-0);
          margin: 0;
        }

        .policy-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(47, 93, 138, 0.2);
          border: 1px solid rgba(47, 93, 138, 0.4);
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--ink-0);
          margin-top: 12px;
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

        .section-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .section-eyebrow {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--accent);
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

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .policy-badge {
            align-self: flex-start;
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
            <div className="policy-eyebrow">Policy update</div>
            <h1 className={`${outfit.className} policy-title`}>Terms of Service</h1>
            <p className="policy-subtitle">
              Please review these terms carefully before using protocolLM. By accessing the platform you acknowledge the limits of AI assistance and agree to operate within Washtenaw County health code requirements.
            </p>
          </div>

          <div className="policy-content">
            <div className="policy-alert">
              <div className="policy-alert-label">Please read first</div>
              <p className="policy-alert-text">
                protocolLM is a reference tool only. Always verify critical decisions with official health department guidance and licensed professionals. Human
                review is required before acting on any AI output.
              </p>
            </div>

            <section className="policy-section">
              <h2 className={outfit.className}>1. Acceptance of Terms</h2>
              <p>
                By accessing or using protocolLM ("the Service"), you agree to be bound by these Terms of Service. These Terms constitute a legally binding
                agreement between you and protocolLM.
              </p>
            </section>

            <section className="policy-section policy-highlight">
              <div className="section-header">
                <div className="section-eyebrow">2. Critical Disclaimers</div>
                <h2 className={outfit.className}>AI limitations & responsibility</h2>
              </div>
              <div className="policy-badge">Human review required</div>
              <ul style={{ marginTop: '16px' }}>
                <li>AI-generated responses may contain inaccuracies, omissions, or misinterpretations of statutes, rules, or local enforcement practices.</li>
                <li>The Service may not reflect real-time changes to county or state policies, inspection procedures, or interpretive guidance.</li>
                <li>Output is probabilistic and may differ when the same question or image is submitted more than once.</li>
                <li>AI models can "hallucinate" or generate plausible-sounding but incorrect information.</li>
                <li>
                  Compliance decisions, equipment purchases, staffing changes, and operational adjustments must not be based solely on responses generated by
                  the Service. Always verify critical information with official sources.
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>3. Indemnification (Hold Harmless)</h2>
              <p>
                You agree to defend, indemnify, and hold harmless protocolLM, its owners, and affiliates from and against any claims, liabilities, damages,
                judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
              </p>
              <ul>
                <li>Your use of the Service.</li>
                <li>Any violation of health codes, fines, closures, or legal action taken against your business.</li>
                <li>Your reliance on any information provided by the Service.</li>
                <li>Any claim that your use of AI-generated content violates third-party rights or applicable regulations.</li>
              </ul>
              <p className="policy-strong">
                You acknowledge that you maintain sole responsibility for your establishment's compliance with applicable laws and regulations.
              </p>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>4. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, in no event will protocolLM be liable for any indirect, incidental, special, consequential, or punitive
                damages, including but not limited to loss of profits, revenue, goodwill, or business interruption arising from:
              </p>
              <ul>
                <li>Your use of or inability to use the Service.</li>
                <li>Any AI-generated content, including errors, inaccuracies, or omissions.</li>
                <li>Health code violations, fines, or enforcement actions.</li>
                <li>Any unauthorized access to or alteration of your data.</li>
              </ul>
              <p>
                Our total liability for any claims arising from these Terms or the Service shall not exceed the fees you paid to us in the twelve (12) months
                preceding the event giving rise to the claim.
              </p>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>5. Subscription & Cancellation</h2>
              <ul>
                <li>
                  <span className="policy-strong">Free Trial:</span> A 7-day trial may be offered. Unless cancelled before the trial ends, your subscription will convert to a paid plan
                  at $100/month.
                </li>
                <li>
                  <span className="policy-strong">Cancellation:</span> You may cancel at any time via the self-service billing portal to stop future billing cycles. Access continues
                  until the end of your current billing period.
                </li>
                <li>
                  <span className="policy-strong">Refunds:</span> We do not provide refunds for partial months or unused portions of the Service.
                </li>
                <li>
                  <span className="policy-strong">Usage Limits:</span> Your plan includes up to 1,300 checks per month (text questions count as 1 check, photo analysis counts as 2
                  checks). Exceeding these limits may result in service interruption until the next billing cycle.
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>6. Acceptable Use</h2>
              <p>You agree NOT to:</p>
              <ul>
                <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
                <li>Attempt to reverse engineer, decompile, or extract the AI models or algorithms.</li>
                <li>Use automated systems (bots, scrapers) to access the Service.</li>
                <li>Share your account credentials with others or create multiple accounts.</li>
                <li>Upload malicious code, viruses, or harmful content.</li>
                <li>Abuse or overload the Service with excessive requests.</li>
              </ul>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the Service. Your continued
                use after notification constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="policy-section">
              <h2 className={outfit.className}>8. Contact</h2>
              <p>
                For questions about these Terms, contact:<br />
                <a href="mailto:support@protocollm.org" className="policy-link">
                  support@protocollm.org
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
