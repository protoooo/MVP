'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function TermsOfService() {
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
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight text-white ${outfit.className}`}>Terms of Service</h1>
            <p className="mt-2 text-[12px] text-white/60 font-semibold uppercase tracking-[0.18em]">
              Last updated: December 15, 2025
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>1. Acceptance of Terms</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                By accessing or using protocolLM (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
                These Terms constitute a legally binding agreement between you and protocolLM.
              </p>
            </section>

            <section className="rounded-2xl border border-red-400/25 bg-red-500/10 p-6">
              <h2 className={`text-lg font-bold text-red-200 ${outfit.className}`}>2. Critical Disclaimers</h2>

              <div className="mt-4 rounded-xl border border-red-400/25 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-red-200">Not Legal or Health Advice</p>
                <p className="mt-2 text-[13px] leading-relaxed text-red-100/90">
                  protocolLM is a reference tool only. It does <strong>NOT</strong> replace professional legal advice, official health department
                  guidance, or licensed food safety consultants. You are solely responsible for verifying all information with the Washtenaw County
                  Health Department or other applicable authorities.
                </p>
              </div>

              <h3 className={`mt-5 text-[13px] font-bold text-white ${outfit.className}`}>2.1 AI Technology Limitations</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                Our Service uses artificial intelligence technology provided by Anthropic (Claude) and Cohere to analyze text and images and to generate responses. You acknowledge that:
              </p>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>AI-generated responses may contain inaccuracies, omissions, or misinterpretations of statutes, rules, or local enforcement practices.</li>
                <li>The Service may not reflect real-time changes to county or state policies, inspection procedures, or interpretive guidance.</li>
                <li>Output is probabilistic and may differ when the same question or image is submitted more than once.</li>
                <li>AI models can "hallucinate" or generate plausible-sounding but incorrect information.</li>
                <li>
                  <strong>Human Review Required:</strong> Compliance decisions, equipment purchases, staffing changes, and operational adjustments must not
                  be based solely on responses generated by the Service. Always verify critical information with official sources.
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>3. Indemnification (Hold Harmless)</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                You agree to defend, indemnify, and hold harmless protocolLM, its owners, and affiliates from and against any claims, liabilities,
                damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees) arising out of or relating to:
              </p>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>Your use of the Service.</li>
                <li>Any violation of health codes, fines, closures, or legal action taken against your business.</li>
                <li>Your reliance on any information provided by the Service.</li>
                <li>Any claim that your use of AI-generated content violates third-party rights or applicable regulations.</li>
              </ul>
              <p className="mt-3 text-[13px] font-semibold text-white/85">
                You acknowledge that you maintain sole responsibility for your establishment&apos;s compliance with applicable laws and regulations.
              </p>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>4. Limitation of Liability</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL PROTOCOLLM BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, GOODWILL, OR BUSINESS INTERRUPTION ARISING FROM:
              </p>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>Your use of or inability to use the Service</li>
                <li>Any AI-generated content, including errors, inaccuracies, or omissions</li>
                <li>Health code violations, fines, or enforcement actions</li>
                <li>Any unauthorized access to or alteration of your data</li>
              </ul>
              <p className="mt-3 text-[13px] leading-relaxed text-white/75">
                OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE FEES YOU PAID TO US IN THE TWELVE (12)
                MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
              </p>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>5. Subscription &amp; Cancellation</h2>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>
                  <strong>Free Trial:</strong> A 7-day trial may be offered. Unless cancelled before the trial ends, your subscription will
                  convert to a paid plan at $100/month.
                </li>
                <li>
                  <strong>Cancellation:</strong> You may cancel at any time via the self-service billing portal to stop future billing cycles.
                  Access continues until the end of your current billing period.
                </li>
                <li>
                  <strong>Refunds:</strong> We do not provide refunds for partial months or unused portions of the Service.
                </li>
                <li>
                  <strong>Usage Limits:</strong> Your plan includes up to 1,300 checks per month (text questions count as 1 check, photo analysis counts as 2 checks). 
                  Exceeding these limits may result in service interruption until the next billing cycle.
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>6. Acceptable Use</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                You agree NOT to:
              </p>
              <ul className="mt-3 list-disc pl-5 space-y-2 text-[13px] text-white/70">
                <li>Use the Service for any unlawful purpose or in violation of these Terms</li>
                <li>Attempt to reverse engineer, decompile, or extract the AI models or algorithms</li>
                <li>Use automated systems (bots, scrapers) to access the Service</li>
                <li>Share your account credentials with others or create multiple accounts</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Abuse or overload the Service with excessive requests</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>7. Changes to Terms</h2>
              <p className="mt-2 text-[13px] text-white/70">
                We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the Service. 
                Your continued use after notification constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="rounded-2xl border border-white/12 bg-white/[0.02] p-6">
              <h2 className={`text-lg font-bold text-white ${outfit.className}`}>8. Contact</h2>
              <p className="mt-2 text-[13px] text-white/70">
                For questions about these Terms, contact:
                <br />
                <a href="mailto:hello@protocollm.org" className="text-white/90 hover:text-white underline underline-offset-4">
                  hello@protocollm.org
                </a>
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
