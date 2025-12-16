'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function PrivacyPolicy() {
  useEffect(() => {
    document.body.classList.add('ui-enterprise-bg')
    return () => document.body.classList.remove('ui-enterprise-bg')
  }, [])

  return (
    <div className={`min-h-screen px-4 py-10 ${inter.className}`}>
      <style jsx global>{`
        body.ui-enterprise-bg {
          overflow-x: hidden;
          background: #050608;
          color: rgba(255, 255, 255, 0.94);
          --ui-lamp: 1.08;
          --ui-vignette: 0.93;
        }
        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1100px 520px at 50% -10%, rgba(255, 255, 255, 0.11), transparent 58%),
            radial-gradient(900px 540px at 18% 0%, rgba(0, 255, 200, 0.05), transparent 60%),
            radial-gradient(900px 540px at 85% 0%, rgba(120, 90, 255, 0.05), transparent 60%),
            repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 12px),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 24px);
          opacity: 0.9;
          filter: brightness(var(--ui-lamp));
          transform: translateZ(0);
        }
        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 25%, transparent 0%, rgba(0, 0, 0, 0.62) 70%);
          opacity: var(--ui-vignette);
          transform: translateZ(0);
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link href="/" className={`inline-flex items-baseline gap-0 select-none ${outfit.className}`}>
            <span className="text-[15px] sm:text-[16px] font-extrabold tracking-[-0.03em] text-white/90">protocol</span>
            <span className="text-[15px] sm:text-[16px] font-black tracking-[-0.03em] text-white/90">LM</span>
          </Link>

          <div className="hidden sm:block text-[12px] text-white/65">
            Made in Washtenaw County for Washtenaw County.
          </div>
        </div>

        <div className="rounded-[22px] border border-white/12 bg-white/[0.03] shadow-[0_40px_120px_rgba(0,0,0,0.7)] overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight text-white ${outfit.className}`}>Privacy Policy</h1>
            <p className="mt-2 text-[12px] text-white/60 font-semibold uppercase tracking-[0.18em]">
              Last updated: December 15, 2025
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>Introduction</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                protocolLM (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, and safeguard your information when you use our compliance software.
              </p>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>1. Information We Collect</h2>

              <div className="mt-3 space-y-4">
                <div>
                  <h3 className={`text-[13px] font-bold text-white/90 ${outfit.className}`}>Account &amp; Usage</h3>
                  <ul className="mt-2 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                    <li>Email address (for authentication and account management).</li>
                    <li>Encrypted credentials or tokens associated with your sign-in method.</li>
                    <li>Text queries and automated responses (stored to improve reliability, provide history, and investigate abuse).</li>
                    <li>Uploaded facility images and metadata needed for violation analysis.</li>
                  </ul>
                </div>

                <div>
                  <h3 className={`text-[13px] font-bold text-white/90 ${outfit.className}`}>Payment Data</h3>
                  <p className="mt-2 text-[13px] text-white/70">
                    Payments are processed securely by Stripe. We do not store full credit card numbers on our systems.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-6">
              <h2 className={`text-lg font-bold text-amber-100 ${outfit.className}`}>2. AI Processing &amp; Third-Party Services</h2>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] font-bold text-amber-100/80">How We Process Your Data</p>

              <div className="mt-4 space-y-3">
                <p className="text-[13px] leading-relaxed text-white/75">
                  protocolLM uses artificial intelligence services provided by <strong>Anthropic</strong> (Claude) for text analysis and response generation, 
                  and <strong>Cohere</strong> for document search and embedding. When you use our Service:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-[13px] text-white/70">
                  <li><strong>Anthropic Claude API:</strong> Processes your text queries and facility images to generate compliance-related responses. Data is transmitted using industry-standard encryption (TLS 1.2+).</li>
                  <li><strong>Cohere API:</strong> Creates embeddings from your queries to search our Washtenaw County food code database. Enables fast, relevant document retrieval.</li>
                  <li>Processing occurs on secure servers operated by these providers in accordance with their respective privacy policies.</li>
                  <li>
                    <strong className="text-white/85">No public training:</strong> Your individual business data and images are NOT used to train public AI models. 
                    Data may be retained temporarily to operate the platform, comply with law, or prevent misuse, as specified in each provider's data retention policy.
                  </li>
                  <li><strong>Vendor Policies:</strong> For details on how these providers handle data, see <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">Anthropic Privacy Policy</a> and <a href="https://cohere.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">Cohere Privacy Policy</a>.</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>3. Data Retention &amp; Your Rights</h2>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>
                  <strong>Active accounts:</strong> We retain relevant data while your account remains active to provide the Service.
                </li>
                <li>
                  <strong>Cancelled accounts:</strong> After cancellation, we generally retain data for up to 90 days to allow reactivation and to
                  maintain audit logs, after which it is scheduled for deletion or anonymization.
                </li>
                <li>
                  <strong>Deletion requests:</strong> You may request deletion of your account data at any time by contacting support. Certain records
                  may be kept where required by law or legitimate business needs (for example, billing records).
                </li>
                <li>
                  <strong>Access &amp; Portability:</strong> You can request a copy of your data or ask us to transfer it to another service where technically feasible.
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>4. Data Security</h2>
              <p className="mt-2 text-[13px] text-white/70">
                We implement industry-standard security measures including:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>TLS 1.2+ encryption for all data in transit</li>
                <li>Encrypted storage for sensitive data at rest</li>
                <li>Regular security audits and monitoring</li>
                <li>Strict access controls and authentication requirements</li>
                <li>CAPTCHA protection against automated abuse</li>
              </ul>
              <p className="mt-3 text-[13px] text-white/70">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but continuously work to protect your data.
              </p>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>5. Cookies &amp; Tracking</h2>
              <p className="mt-2 text-[13px] text-white/70">
                We use essential cookies for:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>Authentication and session management</li>
                <li>Security features (CSRF protection, rate limiting)</li>
                <li>Remembering your preferences</li>
              </ul>
              <p className="mt-3 text-[13px] text-white/70">
                We do NOT use third-party advertising or tracking cookies. You can manage cookie preferences in your browser settings.
              </p>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>Contact Us</h2>
              <p className="mt-2 text-[13px] text-white/70">
                For questions about this Privacy Policy or your data, contact:
                <br />
                <a href="mailto:hello@protocollm.org" className="text-white/90 hover:text-white underline underline-offset-4">
                  hello@protocollm.org
                </a>
              </p>
              <p className="mt-3 text-[13px] text-white/70">
                For data deletion requests, please include your account email and specify what data you'd like removed.
              </p>
            </section>

            <div className="pt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.02] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white/80 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <span>←</span> Return Home
              </Link>
            </div>
          </div>
        </div>

        <div className="sm:hidden mt-6 text-center text-[12px] text-white/65">
          Made in Washtenaw County for Washtenaw County.
        </div>
      </div>
    </div>
  )
}
