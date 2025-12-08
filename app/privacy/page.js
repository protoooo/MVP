'use client'
// Force Update: 2025-12-08
import Link from 'next/link'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function PrivacyPolicy() {
  return (
    <div
      className={`min-h-screen bg-[#FAFAFA] font-sans text-slate-600 selection:bg-emerald-100 selection:text-emerald-900 ${outfit.className}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 text-center md:text-left border-b border-slate-200 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
            Last updated: December 8, 2025
          </p>
        </div>

        <div className="space-y-6">
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Introduction</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              protocolLM (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed
              to protecting your privacy. This Privacy Policy explains how we collect,
              use, and safeguard your information when you use our compliance software.
            </p>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              1. Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-slate-800 font-bold mb-2 text-sm">
                  Account &amp; Usage
                </h3>
                <ul className="list-disc pl-5 text-slate-500 space-y-2 text-sm">
                  <li>Email address (for authentication and account management).</li>
                  <li>
                    Encrypted credentials or tokens associated with your sign-in method.
                  </li>
                  <li>
                    Text queries and automated responses (stored to improve reliability,
                    provide history, and investigate abuse).
                  </li>
                  <li>
                    Uploaded facility images and metadata needed for violation analysis.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-slate-800 font-bold mb-2 text-sm">Payment Data</h3>
                <p className="text-slate-500 text-sm">
                  Payments are processed securely by Stripe or a similar processor. We
                  do not store full credit card numbers on our systems.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              2. Automated Data Processing
            </h2>
            <p className="text-amber-600 mb-4 uppercase text-[10px] font-bold tracking-widest">
              Third-Party Processing
            </p>
            <div className="space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                Our Service uses infrastructure and a large language model API operated
                by <strong>OpenAI</strong> (or a comparable provider) to process your
                text queries and facility images and to generate compliance-related
                responses.
              </p>
              <ul className="list-disc pl-5 text-slate-500 space-y-2 text-sm">
                <li>
                  Data sent to the provider is transmitted using industry-standard
                  encryption (such as TLS 1.2 or higher).
                </li>
                <li>
                  The provider processes data solely for the purpose of generating
                  outputs requested by you through the Service.
                </li>
                <li>
                  Processing occurs on secure servers in regions selected by the
                  provider (currently expected to be within the United States or other
                  comparable jurisdictions).
                </li>
                <li>
                  <strong className="text-slate-700">No public training:</strong> We do
                  not allow your individual business data or images to be used to train
                  public models. They may be retained as necessary to operate the
                  platform, comply with law, or prevent misuse.
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              3. Data Retention &amp; Your Rights
            </h2>
            <ul className="list-disc pl-5 text-slate-500 space-y-2 text-sm">
              <li>
                <strong>Active accounts:</strong> We retain relevant data while your
                account remains active to provide the Service.
              </li>
              <li>
                <strong>Cancelled accounts:</strong> After cancellation, we generally
                retain data for up to 90 days to allow reactivation and to maintain
                audit logs, after which it is scheduled for deletion or anonymization.
              </li>
              <li>
                <strong>Deletion requests:</strong> You may request deletion of your
                account data at any time by contacting support. Certain records may be
                kept where required by law or legitimate business needs (for example,
                billing records).
              </li>
            </ul>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Contact Us</h2>
            <p className="text-slate-500 text-sm">
              For questions about this Privacy Policy or your data, contact:
              <br />
              <a
                href="mailto:austinrnorthrop@gmail.com"
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                austinrnorthrop@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <span>←</span> Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
