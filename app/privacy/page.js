export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-600">Last updated: November 22, 2024</p>
        </div>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
            <p className="text-slate-700 mb-4">
              We collect information that you provide directly to us when you:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Create an account (email address, password)</li>
              <li>Subscribe to our service (payment information via Stripe)</li>
              <li>Use our chat feature (queries, uploaded images, chat history)</li>
              <li>Contact customer support</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-slate-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your subscription payments</li>
              <li>Generate AI-powered responses to your queries</li>
              <li>Analyze uploaded images for compliance guidance</li>
              <li>Send you technical notices and support messages</li>
              <li>Enforce our terms and conditions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Third-Party Services</h2>
            <p className="text-slate-700 mb-4">
              We use the following third-party services to operate protocolLM:
            </p>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-bold text-slate-900 mb-2">Supabase (Database & Authentication)</h3>
                <p className="text-slate-700 text-sm">
                  Stores your account information, subscription status, and chat history. 
                  <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener">
                    View Supabase Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-bold text-slate-900 mb-2">Google Vertex AI (AI Processing)</h3>
                <p className="text-slate-700 text-sm">
                  Processes your queries and images to generate compliance guidance. Images are analyzed in real-time and not permanently stored by Google.
                  <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener">
                    View Google Cloud Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-bold text-slate-900 mb-2">Stripe (Payment Processing)</h3>
                <p className="text-slate-700 text-sm">
                  Handles all payment transactions. We do not store your credit card information.
                  <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener">
                    View Stripe Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Data Retention</h2>
            <p className="text-slate-700 mb-4">
              We retain your information for as long as your account is active or as needed to provide you services. If you cancel your subscription:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Account information is retained for 90 days</li>
              <li>Chat history is retained for 90 days</li>
              <li>Payment records are retained for 7 years (legal requirement)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Your Rights</h2>
            <p className="text-slate-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update incorrect information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your chat history</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails (if any)</li>
            </ul>
            <p className="text-slate-700">
              To exercise these rights, email us at{' '}
              <a href="mailto:support@protocollm.com" className="text-blue-600 hover:underline">
                support@protocollm.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Security</h2>
            <p className="text-slate-700 mb-4">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Encrypted data storage</li>
              <li>Regular security audits</li>
              <li>Rate limiting to prevent abuse</li>
              <li>Secure authentication via Supabase</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Cookies and Tracking</h2>
            <p className="text-slate-700 mb-4">
              We use essential cookies for:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Authentication (keeping you logged in)</li>
              <li>Session management</li>
              <li>Security and fraud prevention</li>
            </ul>
            <p className="text-slate-700">
              We do not use advertising or tracking cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Children's Privacy</h2>
            <p className="text-slate-700">
              protocolLM is not intended for users under 18 years of age. We do not knowingly collect information from minors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-slate-700">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact Us</h2>
            <p className="text-slate-700 mb-2">
              If you have questions about this privacy policy, please contact us:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700">
                <strong>Email:</strong>{' '}
                <a href="mailto:support@protocollm.com" className="text-blue-600 hover:underline">
                  support@protocollm.com
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
