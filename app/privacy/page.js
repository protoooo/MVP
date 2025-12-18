'use client'

import { Outfit } from 'next/font/google'
import InfoPageLayout from '@/components/InfoPageLayout'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })

export default function PrivacyPolicy() {
  return (
    <InfoPageLayout
      title="Privacy Policy"
      subtitle="protocolLM protects operator data with encryption, limited retention, and clear controls. Review how we collect, use, and safeguard your information."
      eyebrow="Data stewardship"
    >
      <div className="space-y-6 text-[15px] leading-relaxed text-[#3D4F5F]">
        <section className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
          <h2 className={`text-xl font-bold text-[#0B1220] ${outfit.className}`}>Introduction</h2>
          <p className="mt-2 text-[#3D4F5F]">
            protocolLM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard
            your information when you use our compliance software.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
          <h2 className={`text-xl font-bold text-[#0B1220] ${outfit.className}`}>1. Information We Collect</h2>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-[#E8F0ED] bg-[#F6FAF9] px-4 py-3">
              <h3 className={`text-[14px] font-bold text-[#0B1220] ${outfit.className}`}>Account &amp; Usage</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-[#3D4F5F]">
                <li>Email address (for authentication and account management).</li>
                <li>Encrypted credentials or tokens associated with your sign-in method.</li>
                <li>Text queries and automated responses (stored to improve reliability, provide history, and investigate abuse).</li>
                <li>Uploaded facility images and metadata needed for violation analysis.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-[#E8F0ED] bg-[#F6FAF9] px-4 py-3">
              <h3 className={`text-[14px] font-bold text-[#0B1220] ${outfit.className}`}>Payment Data</h3>
              <p className="mt-2 text-[#3D4F5F]">Payments are processed securely by Stripe. We do not store full credit card numbers on our systems.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#B8CFC8] bg-[#E8FAF4] px-6 py-5 shadow-[0_10px_30px_rgba(22,94,76,0.08)]">
          <p className={`text-[13px] font-semibold uppercase tracking-[0.18em] text-[#2F5D8A] ${outfit.className}`}>2. AI Processing &amp; Third-Party Services</p>
          <p className="mt-2 text-[#0B1220] font-semibold">How we process your data</p>
          <div className="mt-3 space-y-3">
            <p className="text-[#3D4F5F]">
              protocolLM uses artificial intelligence services provided by <strong>Anthropic</strong> (Claude) for text analysis and response generation,
              and <strong>Cohere</strong> for document search and embedding. When you use our Service:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-[#3D4F5F]">
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
                <strong className="text-[#0B1220]">No public training:</strong> Your individual business data and images are NOT used to train public AI models. Data may be retained temporarily to
                operate the platform, comply with law, or prevent misuse, as specified in each provider&apos;s data retention policy.
              </li>
              <li>
                <strong>Vendor Policies:</strong> For details on how these providers handle data, see{' '}
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2F5D8A] underline-offset-4 hover:text-[#1F4E7A] hover:underline">
                  Anthropic Privacy Policy
                </a>{' '}
                and{' '}
                <a href="https://cohere.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2F5D8A] underline-offset-4 hover:text-[#1F4E7A] hover:underline">
                  Cohere Privacy Policy
                </a>
                .
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
          <h2 className={`text-xl font-bold text-[#0B1220] ${outfit.className}`}>3. Data Retention &amp; Your Rights</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[#3D4F5F]">
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
              <strong>Access &amp; Portability:</strong> You can request a copy of your data or ask us to transfer it to another service where technically
              feasible.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
          <h2 className={`text-xl font-bold text-[#0B1220] ${outfit.className}`}>4. Data Security</h2>
          <p className="mt-2 text-[#3D4F5F]">We implement industry-standard security measures including:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-[#3D4F5F]">
            <li>TLS 1.2+ encryption for all data in transit.</li>
            <li>Encrypted storage for sensitive data at rest.</li>
            <li>Regular security audits and monitoring.</li>
            <li>Strict access controls and authentication requirements.</li>
            <li>CAPTCHA protection against automated abuse.</li>
          </ul>
          <p className="mt-3 text-[#3D4F5F]">
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but continuously work to protect your
            data.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
          <h2 className={`text-xl font-bold text-[#0B1220] ${outfit.className}`}>5. Cookies &amp; Tracking</h2>
          <p className="mt-2 text-[#3D4F5F]">We use essential cookies for:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-[#3D4F5F]">
            <li>Authentication and session management.</li>
            <li>Security features (CSRF protection, rate limiting).</li>
            <li>Remembering your preferences.</li>
          </ul>
          <p className="mt-3 text-[#3D4F5F]">
            We do NOT use third-party advertising or tracking cookies. You can manage cookie preferences in your browser settings.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
          <h2 className={`text-xl font-bold text-[#0B1220] ${outfit.className}`}>Contact Us</h2>
          <p className="mt-2 text-[#3D4F5F]">
            For questions about this Privacy Policy or your data, contact:
            <br />
            <a href="mailto:hello@protocollm.org" className="text-[#2F5D8A] underline-offset-4 hover:text-[#1F4E7A] hover:underline">
              support@protocollm.org
            </a>
          </p>
          <p className="mt-3 text-[#3D4F5F]">
            For data deletion requests, please include your account email and specify what data you&apos;d like removed.
          </p>
        </section>
      </div>
    </InfoPageLayout>
  )
}
