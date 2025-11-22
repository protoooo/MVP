'use client'

import { useState, useEffect } from 'react'

export default function TermsAcceptanceModal({ isOpen, onAccept, onDecline, userEmail }) {
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false)
  const [hasScrolledPrivacy, setHasScrolledPrivacy] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [activeTab, setActiveTab] = useState('terms')

  const handleTermsScroll = (e) => {
    const element = e.target
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10
    if (isAtBottom && !hasScrolledTerms) {
      setHasScrolledTerms(true)
    }
  }

  const handlePrivacyScroll = (e) => {
    const element = e.target
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10
    if (isAtBottom && !hasScrolledPrivacy) {
      setHasScrolledPrivacy(true)
    }
  }

  const canAccept = hasScrolledTerms && hasScrolledPrivacy && agreedToTerms && agreedToPrivacy

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to protocolLM Beta</h2>
          <p className="text-sm text-slate-600">
            Before you start, please review and accept our Terms of Service and Privacy Policy
          </p>
          {userEmail && (
            <p className="text-xs text-slate-500 mt-2">Account: {userEmail}</p>
          )}
        </div>

        {/* Beta Warning Banner */}
        <div className="bg-amber-50 border-y border-amber-200 p-4 flex-shrink-0">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Beta Product Notice</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                This is a <strong>BETA product</strong>. AI-generated guidance may contain errors. Always verify critical compliance decisions with your local health department or licensed consultant. Not for mission-critical use.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'terms'
                ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Terms of Service {hasScrolledTerms && '✓'}
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'privacy'
                ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Privacy Policy {hasScrolledPrivacy && '✓'}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'terms' ? (
            <div 
              className="h-full overflow-y-auto p-6 text-sm text-slate-700 leading-relaxed"
              onScroll={handleTermsScroll}
            >
              <h3 className="font-bold text-slate-900 mb-3 text-base">1. Beta Service Agreement</h3>
              <p className="mb-4">
                By accessing protocolLM ("the Service"), you acknowledge this is a BETA product under active development. Features may change, and service interruptions may occur.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">2. AI Limitations & Disclaimer</h3>
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <p className="font-bold text-red-900 mb-2">⚠️ CRITICAL DISCLAIMER</p>
                <p className="text-red-800 text-sm">
                  AI-generated responses may contain errors, outdated information, or misinterpretations. This service does NOT replace:
                </p>
                <ul className="list-disc pl-5 mt-2 text-red-800 text-sm space-y-1">
                  <li>Official health department guidance</li>
                  <li>Licensed food safety consultants</li>
                  <li>Legal counsel</li>
                  <li>Professional inspection services</li>
                </ul>
                <p className="text-red-900 font-bold mt-2 text-sm">
                  You are solely responsible for verifying all information before making compliance decisions.
                </p>
              </div>

              <h3 className="font-bold text-slate-900 mb-3 text-base">3. Use of Service</h3>
              <p className="mb-4">You must:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Be at least 18 years old</li>
                <li>Provide accurate registration information</li>
                <li>Maintain account security</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Verify all AI-generated guidance with official sources</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">4. Subscription & Billing</h3>
              <p className="mb-2"><strong>30-Day Free Trial:</strong></p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Requires valid payment method</li>
                <li>Automatic billing after trial ends</li>
                <li>Cancel anytime during trial to avoid charges</li>
              </ul>
              <p className="mb-2"><strong>Pricing:</strong></p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Pro Plan: $49/month</li>
                <li>Enterprise Plan: $99/month</li>
                <li>Prices subject to change with 30 days notice</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">5. Cancellation & Refunds</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Cancel anytime via account settings</li>
                <li>Access continues until end of billing period</li>
                <li>No refunds for partial months</li>
                <li>Refunds at our discretion for technical failures</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">6. Limitation of Liability</h3>
              <div className="bg-slate-50 p-4 rounded-lg mb-4">
                <p className="font-bold text-slate-900 mb-2">PROTOCOLLM IS NOT LIABLE FOR:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Health inspection failures or violations</li>
                  <li>Fines, penalties, or legal fees</li>
                  <li>Business interruption or lost revenue</li>
                  <li>Reliance on AI-generated content</li>
                  <li>Data loss or service interruptions</li>
                  <li>Any indirect or consequential damages</li>
                </ul>
                <p className="font-bold mt-3 text-sm">
                  Maximum liability is limited to fees paid in past 12 months.
                </p>
              </div>

              <h3 className="font-bold text-slate-900 mb-3 text-base">7. Beta-Specific Terms</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Service may be discontinued with 30 days notice</li>
                <li>Features may change without notice</li>
                <li>No SLA guarantees during beta period</li>
                <li>Your feedback may be used to improve the service</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">8. Data & Content</h3>
              <p className="mb-4">
                You retain ownership of content you upload. By using the Service, you grant us a license to process your content solely to provide the Service.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">9. Prohibited Activities</h3>
              <p className="mb-2">You may NOT:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Share account credentials</li>
                <li>Reverse engineer the Service</li>
                <li>Use for illegal activities</li>
                <li>Scrape or extract data automatically</li>
                <li>Violate usage limits or rate limits</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">10. Termination</h3>
              <p className="mb-4">
                We may suspend or terminate your account for violating these terms, fraudulent activity, or failure to pay. Upon termination, your data may be deleted after 90 days.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">11. Changes to Terms</h3>
              <p className="mb-4">
                We may modify these terms at any time. Continued use after changes constitutes acceptance. Material changes will be notified via email.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">12. Governing Law</h3>
              <p className="mb-4">
                These terms are governed by Michigan state law, United States.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">13. Contact</h3>
              <p className="mb-4">
                Questions? Email: <a href="mailto:support@protocollm.com" className="text-blue-600 hover:underline">support@protocollm.com</a>
              </p>

              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-600">
                  Last updated: {new Date().toLocaleDateString()}<br />
                  Version: Beta 1.0
                </p>
              </div>

              {!hasScrolledTerms && (
                <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 text-center">
                  <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    Scroll to bottom to continue
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="h-full overflow-y-auto p-6 text-sm text-slate-700 leading-relaxed"
              onScroll={handlePrivacyScroll}
            >
              <h3 className="font-bold text-slate-900 mb-3 text-base">1. Information We Collect</h3>
              <p className="mb-4">We collect:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Account Information:</strong> Email, password (encrypted)</li>
                <li><strong>Usage Data:</strong> Queries, uploaded images, chat history</li>
                <li><strong>Payment Information:</strong> Processed by Stripe (we don't store card details)</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">2. How We Use Your Information</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Provide and improve the Service</li>
                <li>Generate AI-powered responses</li>
                <li>Process payments</li>
                <li>Send service updates and support messages</li>
                <li>Analyze usage patterns to improve features</li>
                <li>Enforce our terms and prevent abuse</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">3. Third-Party Services</h3>
              <div className="space-y-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-bold text-slate-900 mb-1">Supabase (Database & Auth)</p>
                  <p className="text-sm">Stores your account and chat data</p>
                  <a href="https://supabase.com/privacy" className="text-blue-600 text-xs hover:underline" target="_blank" rel="noopener">Privacy Policy</a>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-bold text-slate-900 mb-1">Google Vertex AI (AI Processing)</p>
                  <p className="text-sm">Processes queries and images (not permanently stored)</p>
                  <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-blue-600 text-xs hover:underline" target="_blank" rel="noopener">Privacy Policy</a>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-bold text-slate-900 mb-1">Stripe (Payment Processing)</p>
                  <p className="text-sm">Handles all payment transactions</p>
                  <a href="https://stripe.com/privacy" className="text-blue-600 text-xs hover:underline" target="_blank" rel="noopener">Privacy Policy</a>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 mb-3 text-base">4. Data Retention</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Account data: Retained while account is active + 90 days</li>
                <li>Chat history: Retained while account is active + 90 days</li>
                <li>Payment records: 7 years (legal requirement)</li>
                <li>Analytics data: Aggregated and anonymized permanently</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">5. Your Rights (GDPR/CCPA)</h3>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of your data</li>
                <li><strong>Correction:</strong> Update incorrect information</li>
                <li><strong>Deletion:</strong> Request account and data deletion</li>
                <li><strong>Export:</strong> Download your chat history</li>
                <li><strong>Opt-out:</strong> Unsubscribe from emails</li>
              </ul>
              <p className="mb-4 text-sm">
                To exercise these rights, email: <a href="mailto:privacy@protocollm.com" className="text-blue-600 hover:underline">privacy@protocollm.com</a>
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">6. Data Security</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>All data transmitted via HTTPS/TLS encryption</li>
                <li>Database encryption at rest</li>
                <li>Regular security audits</li>
                <li>Rate limiting to prevent abuse</li>
                <li>Secure authentication via Supabase</li>
              </ul>

              <h3 className="font-bold text-slate-900 mb-3 text-base">7. Cookies & Tracking</h3>
              <p className="mb-2">We use essential cookies for:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Authentication (keeping you logged in)</li>
                <li>Session management</li>
                <li>Security and fraud prevention</li>
              </ul>
              <p className="mb-4 text-sm">We do NOT use advertising or tracking cookies.</p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">8. Children's Privacy</h3>
              <p className="mb-4">
                The Service is not intended for users under 18. We do not knowingly collect information from minors.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">9. International Users</h3>
              <p className="mb-4">
                Data is processed in the United States. By using the Service, you consent to data transfer to the US.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">10. Changes to Privacy Policy</h3>
              <p className="mb-4">
                We may update this policy. Material changes will be notified via email. Continued use constitutes acceptance.
              </p>

              <h3 className="font-bold text-slate-900 mb-3 text-base">11. Contact</h3>
              <div className="bg-slate-50 p-4 rounded-lg mb-4">
                <p className="font-bold text-slate-900 mb-2">Privacy Questions?</p>
                <p className="text-sm">Email: <a href="mailto:privacy@protocollm.com" className="text-blue-600 hover:underline">privacy@protocollm.com</a></p>
                <p className="text-sm mt-2">
                  protocolLM<br />
                  Michigan, United States
                </p>
              </div>

              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-600">
                  Last updated: {new Date().toLocaleDateString()}<br />
                  Version: Beta 1.0
                </p>
              </div>

              {!hasScrolledPrivacy && (
                <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 text-center">
                  <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    Scroll to bottom to continue
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div className="p-6 border-t border-slate-200 space-y-3 flex-shrink-0">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={!hasScrolledTerms}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">
              I have read and agree to the <strong>Terms of Service</strong>
              {!hasScrolledTerms && <span className="text-slate-400 ml-1">(scroll to enable)</span>}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              disabled={!hasScrolledPrivacy}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">
              I have read and agree to the <strong>Privacy Policy</strong>
              {!hasScrolledPrivacy && <span className="text-slate-400 ml-1">(scroll to enable)</span>}
            </span>
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 pt-0 flex gap-3 flex-shrink-0">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-xl transition"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={!canAccept}
            className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canAccept ? 'Accept & Continue' : 'Read & Check All'}
          </button>
        </div>
      </div>
    </div>
  )
}
