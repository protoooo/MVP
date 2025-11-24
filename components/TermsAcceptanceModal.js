'use client'

import { useState, useEffect, useRef } from 'react'

export default function TermsAcceptanceModal({ isOpen, onAccept, onDecline, userEmail }) {
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false)
  const [hasScrolledPrivacy, setHasScrolledPrivacy] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [activeTab, setActiveTab] = useState('terms')
  
  const contentRef = useRef(null)

  // Check if content needs scrolling on tab change or resize
  useEffect(() => {
    const checkScroll = () => {
      if (contentRef.current) {
        const { scrollHeight, clientHeight } = contentRef.current
        // If content fits without scrolling, mark as read immediately
        if (scrollHeight <= clientHeight + 5) {
          if (activeTab === 'terms') setHasScrolledTerms(true)
          if (activeTab === 'privacy') setHasScrolledPrivacy(true)
        }
      }
    }
    checkScroll()
    // Small timeout to allow rendering
    setTimeout(checkScroll, 100)
  }, [activeTab])

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    // More forgiving threshold (50px instead of 10px) for touch screens
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    
    if (isAtBottom) {
      if (activeTab === 'terms') setHasScrolledTerms(true)
      if (activeTab === 'privacy') setHasScrolledPrivacy(true)
    }
  }

  const canAccept = hasScrolledTerms && hasScrolledPrivacy && agreedToTerms && agreedToPrivacy

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white shrink-0">
          <h2 className="text-2xl font-bold text-slate-900">Welcome to protocolLM</h2>
          <p className="text-sm text-slate-500 mt-1">
            Please review our compliance terms to continue.
          </p>
          {userEmail && (
            <p className="text-xs font-mono text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded">
              ID: {userEmail}
            </p>
          )}
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border-y border-amber-200 p-4 shrink-0">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-amber-800">Beta Product Notice</h3>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                This AI guidance may contain errors. Always verify critical compliance decisions with your local health department. Not for mission-critical use without verification.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-3 text-sm font-bold transition-colors relative ${
              activeTab === 'terms' 
                ? 'bg-white text-slate-900 border-t-2 border-t-slate-900' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Terms of Service
            {hasScrolledTerms && <span className="ml-2 text-teal-600">✓</span>}
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 text-sm font-bold transition-colors relative ${
              activeTab === 'privacy' 
                ? 'bg-white text-slate-900 border-t-2 border-t-slate-900' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Privacy Policy
            {hasScrolledPrivacy && <span className="ml-2 text-teal-600">✓</span>}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 bg-white scroll-smooth"
        >
          {activeTab === 'terms' ? (
            <div className="prose prose-sm max-w-none text-slate-600">
              <h3 className="text-slate-900 font-bold">1. Beta Service Agreement</h3>
              <p>By accessing protocolLM ("the Service"), you acknowledge this is a BETA product under active development. Features may change, and service interruptions may occur.</p>

              <h3 className="text-slate-900 font-bold mt-4">2. AI Limitations</h3>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
                <p className="text-red-900 font-bold text-xs">CRITICAL DISCLAIMER</p>
                <p className="text-red-800 text-xs mt-1">This service does NOT replace official health department guidance, legal counsel, or professional consultants. You are solely responsible for verifying all information.</p>
              </div>

              <h3 className="text-slate-900 font-bold mt-4">3. Subscription & Billing</h3>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>30-Day Free Trial:</strong> Requires valid payment method. Automatic billing starts after trial ends.</li>
                <li><strong>Pricing:</strong> Pro ($49/mo) and Enterprise ($99/mo). Subject to change with notice.</li>
                <li><strong>Cancellation:</strong> Cancel anytime via settings. No refunds for partial months.</li>
              </ul>

              <h3 className="text-slate-900 font-bold mt-4">4. Limitation of Liability</h3>
              <p>protocolLM is not liable for inspection failures, fines, business interruptions, or reliance on AI-generated content. Maximum liability is limited to fees paid in the last 12 months.</p>

              <div className="h-20"></div> {/* Spacer for scroll */}
              
              {!hasScrolledTerms && (
                <div className="pb-4 text-center text-xs text-slate-400 animate-pulse">
                  ↓ Scroll to bottom to acknowledge
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-600">
              <h3 className="text-slate-900 font-bold">1. Data Collection</h3>
              <p>We collect account info (encrypted), usage data (queries/images), and payment processing info via Stripe. We do not store raw credit card numbers.</p>

              <h3 className="text-slate-900 font-bold mt-4">2. Third-Party Services</h3>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Supabase:</strong> Database & Auth</li>
                <li><strong>Google Vertex AI:</strong> AI Processing</li>
                <li><strong>Stripe:</strong> Payments</li>
              </ul>

              <h3 className="text-slate-900 font-bold mt-4">3. Data Retention</h3>
              <p>Chat history is retained while the account is active + 90 days. You may request data deletion at any time by contacting support.</p>

              <div className="h-20"></div> {/* Spacer for scroll */}

              {!hasScrolledPrivacy && (
                <div className="pb-4 text-center text-xs text-slate-400 animate-pulse">
                  ↓ Scroll to bottom to acknowledge
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="space-y-3 mb-6">
            <label className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
              agreedToTerms ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200'
            } ${!hasScrolledTerms ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={!hasScrolledTerms}
                className="mt-1 w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
              />
              <span className="text-sm text-slate-700">
                I have read and agree to the <strong>Terms of Service</strong>
                {!hasScrolledTerms && <span className="text-xs text-red-500 block font-bold"> (Scroll to bottom of Terms tab first)</span>}
              </span>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
              agreedToPrivacy ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200'
            } ${!hasScrolledPrivacy ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                disabled={!hasScrolledPrivacy}
                className="mt-1 w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
              />
              <span className="text-sm text-slate-700">
                I have read and agree to the <strong>Privacy Policy</strong>
                {!hasScrolledPrivacy && <span className="text-xs text-red-500 block font-bold"> (Scroll to bottom of Privacy tab first)</span>}
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition text-sm uppercase tracking-wide"
            >
              Decline
            </button>
            <button
              onClick={canAccept ? onAccept : undefined}
              disabled={!canAccept}
              className={`flex-1 py-3 px-4 font-bold rounded-xl transition text-sm uppercase tracking-wide shadow-lg ${
                canAccept 
                  ? 'bg-[#022c22] hover:bg-teal-900 text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
