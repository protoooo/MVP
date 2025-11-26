export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-600">Last updated: November 25, 2025</p>
        </div>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-4">
              By accessing or using protocolLM ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-4">
              protocolLM is an AI-powered compliance assistant for Michigan restaurants. The Service provides:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Access to food safety regulations and official county documentation</li>
              <li>AI-assisted interpretation of compliance requirements via Chat</li>
              <li>Image analysis for equipment and facility compliance</li>
              <li>Mock Audit workflows and Staff Memo generation (Enterprise Plan only)</li>
              <li>County-specific guidance (Washtenaw, Wayne, Oakland)</li>
            </ul>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
              <p className="text-yellow-800 font-semibold mb-2">⚠️ Important Disclaimer</p>
              <p className="text-yellow-700 text-sm">
                protocolLM is a reference tool only. It does NOT replace professional legal advice, official health 
                department guidance, or licensed food safety consultants. You are solely responsible for verifying 
                all information with your local health department before making compliance decisions.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Account Registration</h2>
            <p className="text-slate-700 mb-4">To use the Service, you must:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
            <p className="text-slate-700">
              You are responsible for all activity that occurs under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Subscription and Billing</h2>
            
            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">4.1 Free Trial</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>New users receive a 30-day free trial</li>
              <li>A valid payment method is required to start the trial</li>
              <li>You will be charged automatically after the trial ends unless you cancel</li>
              <li>Cancel anytime during the trial to avoid charges</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">4.2 Subscription Plans</h3>
            
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-slate-700 mb-2"><strong>Starter Plan - $29/month</strong></p>
              <ul className="list-disc pl-6 text-slate-700 space-y-1 text-sm">
                <li>100 Regulatory Text Queries per month</li>
                <li>No Image Analysis capabilities</li>
                <li>Standard County Document Access</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-slate-700 mb-2"><strong>Pro Plan - $49/month</strong></p>
              <ul className="list-disc pl-6 text-slate-700 space-y-1 text-sm">
                <li>Unlimited Regulatory Text Queries</li>
                <li>50 Image Analyses per month</li>
                <li>Standard County Document Access</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <p className="text-slate-700 mb-2"><strong>Enterprise Plan - $99/month</strong></p>
              <ul className="list-disc pl-6 text-slate-700 space-y-1 text-sm">
                <li>Unlimited Regulatory Text Queries</li>
                <li>500 Image Analyses per month</li>
                <li>Access to Mock Audit Workflow & Staff Memo Generator</li>
                <li>Priority Email Support</li>
              </ul>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">4.3 Billing Terms</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Subscriptions renew automatically on a monthly basis</li>
              <li>Billing occurs on the same day each month</li>
              <li>All fees are in U.S. Dollars (USD)</li>
              <li>Prices are subject to change with 30 days notice</li>
              <li>You are responsible for all applicable taxes</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">4.4 Cancellation</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>You may cancel your subscription at any time via the Billing Portal</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds for partial months</li>
              <li>Access continues until the end of the paid period</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Usage Limits and Restrictions</h2>
            
            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">5.1 Usage Limits</h3>
            <p className="text-slate-700 mb-4">Your plan includes specific monthly limits:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li><strong>Starter Plan:</strong> Capped at 100 text queries per billing cycle.</li>
              <li><strong>Pro Plan:</strong> Unlimited text queries; capped at 50 image analyses per billing cycle.</li>
              <li><strong>Enterprise Plan:</strong> Unlimited text queries; capped at 500 image analyses per billing cycle.</li>
              <li><strong>Rate Limits:</strong> Standard technical rate limits apply to prevent system overload/abuse (e.g. 20 requests/minute).</li>
            </ul>
            <p className="text-slate-700 mb-4">
              Limits reset at the start of each billing cycle. "Unlimited" usage is subject to a Fair Use Policy prohibiting automated scraping or bot activity.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">5.2 Prohibited Uses</h3>
            <p className="text-slate-700 mb-4">You may NOT:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Share your account credentials with others (One license per establishment recommended)</li>
              <li>Use the Service for illegal activities</li>
              <li>Attempt to reverse engineer or copy the Service</li>
              <li>Upload malicious content or viruses</li>
              <li>Scrape or automatically extract data from the Service</li>
              <li>Use the Service to generate content for competing services</li>
              <li>Violate any local, state, or federal laws</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Content and Data</h2>
            
            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">6.1 Your Content</h3>
            <p className="text-slate-700 mb-4">
              You retain ownership of any content you upload (images, queries). By using the Service, you grant us 
              a license to use your content solely to provide the Service (e.g., analyzing images, generating responses).
            </p>

            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">6.2 AI-Generated Content</h3>
            <p className="text-slate-700 mb-4">
              AI-generated responses are provided "as-is" and may contain errors, outdated information, or inaccuracies. 
              You must verify all information before relying on it for compliance decisions.
            </p>

            <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">6.3 Regulatory Documents</h3>
            <p className="text-slate-700 mb-4">
              Documents provided through the Service are sourced from public government sources. While we strive for 
              accuracy, regulations may change. Always verify with official sources.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Refund Policy</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>No refunds for partial months of service</li>
              <li>Cancel before your next billing date to avoid future charges</li>
              <li>Refunds may be issued at our discretion for technical failures</li>
              <li>Contact austinrnorthrop@gmail.com for refund requests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Disclaimer of Warranties</h2>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
                PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="text-slate-700 mb-4">
                WE DO NOT WARRANT THAT:
              </p>
              <ul className="list-disc pl-6 text-slate-700 space-y-2">
                <li>The Service will be uninterrupted or error-free</li>
                <li>AI-generated content will be accurate or complete</li>
                <li>The Service will meet your specific requirements</li>
                <li>Any defects will be corrected</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Limitation of Liability</h2>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROTOCOLLM AND ITS AFFILIATES SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
                <li>Health inspection failures or violations</li>
                <li>Fines, penalties, or legal fees</li>
                <li>Business interruption or lost revenue</li>
                <li>Reliance on AI-generated content</li>
                <li>Any indirect, incidental, or consequential damages</li>
              </ul>
              <p className="text-slate-700">
                <strong>Our maximum liability is limited to the amount you paid for the Service in the past 12 months.</strong>
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Indemnification</h2>
            <p className="text-slate-700">
              You agree to indemnify and hold harmless protocolLM from any claims, damages, or expenses arising from 
              your use of the Service, violation of these terms, or violation of any laws or regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Termination</h2>
            <p className="text-slate-700 mb-4">We may terminate or suspend your account if you:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Violate these Terms of Service</li>
              <li>Engage in fraudulent activity</li>
              <li>Fail to pay subscription fees</li>
              <li>Use the Service in a way that harms our operations</li>
            </ul>
            <p className="text-slate-700">
              Upon termination, your access will be immediately revoked and your data may be deleted after 90 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Changes to Terms</h2>
            <p className="text-slate-700">
              We reserve the right to modify these terms at any time. We will notify you of material changes via 
              email or through the Service. Continued use after changes constitutes acceptance of new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Governing Law</h2>
            <p className="text-slate-700">
              These terms are governed by the laws of the State of Michigan, United States, without regard to 
              conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Contact Information</h2>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700 mb-2">
                For questions about these terms, contact us at:
              </p>
              <p className="text-slate-700">
                <strong>Email:</strong>{' '}
                <a href="mailto:austinrnorthrop@gmail.com" className="text-blue-600 hover:underline">
                  austinrnorthrop@gmail.com
                </a>
              </p>
              <p className="text-slate-700 mt-2">
                <strong>Business:</strong> protocolLM<br />
                <strong>Location:</strong> Michigan, United States
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <a href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
