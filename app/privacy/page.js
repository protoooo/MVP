'use client'
// Force Update: 2025-12-05
import Link from 'next/link'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function PrivacyPolicy() {
  return (
    <div className={`min-h-screen bg-[#FAFAFA] font-sans text-slate-600 selection:bg-emerald-100 selection:text-emerald-900 ${outfit.className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        <div className="mb-12 text-center md:text-left border-b border-slate-200 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Last updated: December 5, 2024</p>
        </div>

        <div className="space-y-6">
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Introduction</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              protocolLM (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information when you use 
              our compliance software.
            </p>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">1. Information Collection</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-slate-800 font-bold mb-2 text-sm">Account & Usage</h3>
                <ul className="list-disc pl-5 text-slate-500 space-y-2 text-sm">
                  <li>Email address (authentication)</li>
                  <li>Encrypted password credentials</li>
                  <li>Queries and automated responses (stored for service accuracy)</li>
                  <li>Uploaded facility images for analysis</li>
                </ul>
              </div>
              <div>
                <h3 className="text-slate-800 font-bold mb-2 text-sm">Payment Data</h3>
                <p className="text-slate-500 text-sm">
                  Processed securely via Stripe. We do not store credit card numbers.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">2. Automated Data Processing</h2>
            <p className="text-amber-600 mb-4 uppercase text-[10px] font-bold tracking-widest">Third-Party Disclosures</p>
            <div className="space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                Our Service utilizes enterprise-grade cloud providers, specifically <strong>Google Cloud Services</strong>, to process text queries and analyze facility images.
              </p>
              <ul className="list-disc pl-5 text-slate-500 space-y-2 text-sm">
                <li>Data is transmitted using industry-standard encryption (TLS 1.3).</li>
                <li>The provider processes data strictly for generating compliance responses.</li>
                <li>Processing occurs on secure servers located in the United States.</li>
                <li><strong className="text-slate-700">No Training:</strong> We do not use your individual business data or images to train public models.</li>
              </ul>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">3. Data Retention & Rights</h2>
            <ul className="list-disc pl-5 text-slate-500 space-y-2 text-sm">
              <li><strong>Active Accounts:</strong> Data retained while account is active.</li>
              <li><strong>Cancelled Accounts:</strong> Data retained for 90 days to allow reactivation, then purged.</li>
              <li><strong>Deletion:</strong> You may request full data deletion at any time by contacting support.</li>
            </ul>
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Contact Us</h2>
            <p className="text-slate-500 text-sm">
              <a href="mailto:austinrnorthrop@gmail.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                austinrnorthrop@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors">
            <span>←</span> Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
