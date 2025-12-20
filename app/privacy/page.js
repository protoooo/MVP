'use client'

import { Outfit } from 'next/font/google'
import InfoPageLayout from '@/components/InfoPageLayout'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700'] })

export default function PrivacyPolicy() {
  return (
    <InfoPageLayout
      title="Privacy Policy"
      subtitle="protocolLM protects operator data with encryption, limited retention, and clear controls. Review how we collect, use, and safeguard your information."
      eyebrow="Data stewardship"
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>Introduction</h2>
          <p className="mt-3">
            protocolLM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard
            your information when you use our compliance software.
          </p>
        </section>

        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>1. Information We Collect</h2>
          
          <div className="mt-4 rounded-lg border border-[#24242d] bg-[#121218] p-4">
            <h3 className={`text-base font-bold ${outfit.className}`}>Account & Usage</h3>
            <ul className="mt-2 space-y-2">
              <li>Email address (for authentication and account management).</li>
              <li>Encrypted credentials or tokens associated with your sign-in method.</li>
              <li>Text queries and automated responses (stored to improve reliability, provide history, and investigate abuse).</li>
              <li>Uploaded facility images and metadata needed for violation analysis.</li>
            </ul>
          </div>

          <div className="mt-4 rounded-lg border border-[#24242d] bg-[#121218] p-4">
            <h3 className={`text-base font-bold ${outfit.className}`}>Payment Data</h3>
            <p className="mt-2">Payments are processed securely by Stripe. We do not store full credit card numbers on our systems.</p>
          </div>
        </section>

        <section className="rounded-xl border border-[#2F5D8A] border-l-4 bg-[#15151a] p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-[#1c1c22] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-[#2F5D8A]">
            2. LLM Processing & Third-Party Services
          </div>
          <h2 className={`text-xl font-bold ${outfit.className}`}>How we process your data</h2>
          
          <p className="mt-4">
            protocolLM uses large language model services provided by <strong>Anthropic</strong> (Claude) for text analysis and response generation,
            and <strong>Cohere</strong> for document search and embedding. When you use our Service:
          </p>

          <ul className="mt-4 space-y-3">
            <li>
              <strong>Anthropic Claude API:</strong> Processes your text queries and facility images to generate compliance-related responses. Data is
              transmitted using industry-standard encryption (TLS 1.2+).
            </li>
            <li>
              <strong>Cohere API:</strong> Creates embeddings from your queries to search our Washtenaw County food code database. Enables fast, relevant
              document retrieval.
            </li>
            <li>Processing occurs on secure servers operated by these providers in accordance with their respective privacy policies.</li>
            <li>
              <strong>No public training:</strong> Your individual business data and images are NOT used to train public LLM models. Data may be retained temporarily to
              operate the platform, comply with law, or prevent misuse, as specified in each provider's data retention policy.
            </li>
            <li>
              <strong>Vendor Policies:</strong> For details on how these providers handle data, see{' '}
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                Anthropic Privacy Policy
              </a>{' '}
              and{' '}
              <a href="https://cohere.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                Cohere Privacy Policy
              </a>.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>3. Data Retention & Your Rights</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <strong>Active accounts:</strong> We retain relevant data while your account remains active to provide the Service.
            </li>
            <li>
              <strong>Cancelled accounts:</strong> After cancellation, we generally retain data for up to 90 days to allow reactivation and to maintain audit
              logs, after which it is scheduled for deletion or anonymization.
            </li>
            <li>
              <strong>Deletion requests:</strong> You may request deletion of your account data at any time by contacting support. Certain records may be kept
              where required by law or legitimate business needs (for example, billing records).
            </li>
            <li>
              <strong>Access & Portability:</strong> You can request a copy of your data or ask us to transfer it to another service where technically
              feasible.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>4. Data Security</h2>
          <p className="mt-3">We implement industry-standard security measures including:</p>
          <ul className="mt-3 space-y-2">
            <li>TLS 1.2+ encryption for all data in transit.</li>
            <li>Encrypted storage for sensitive data at rest.</li>
            <li>Regular security audits and monitoring.</li>
            <li>Strict access controls and authentication requirements.</li>
            <li>CAPTCHA protection against automated abuse.</li>
          </ul>
          <p className="mt-3">
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but continuously work to protect your
            data.
          </p>
        </section>

        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>5. Cookies & Tracking</h2>
          <p className="mt-3">We use essential cookies for:</p>
          <ul className="mt-3 space-y-2">
            <li>Authentication and session management.</li>
            <li>Security features (CSRF protection, rate limiting).</li>
            <li>Remembering your preferences.</li>
          </ul>
          <p className="mt-3">
            We do NOT use third-party advertising or tracking cookies. You can manage cookie preferences in your browser settings.
          </p>
        </section>

        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>Contact Us</h2>
          <p className="mt-3">
            For questions about this Privacy Policy or your data, contact:<br />
            <a href="mailto:support@protocollm.org" className="underline underline-offset-2">
              support@protocollm.org
            </a>
          </p>
          <p className="mt-3">
            For data deletion requests, please include your account email and specify what data you'd like removed.
          </p>
        </section>
      </div>
    </InfoPageLayout>
  )
}
