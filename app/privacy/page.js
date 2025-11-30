'use client'

// ==========================================
// CUSTOM STYLES (Background Fix)
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #121212 !important;
      overscroll-behavior-y: none;
    }
  `}</style>
)

export default function PrivacyPolicy() {
  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3ECF8E] selection:text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          {/* Header */}
          <div className="mb-12 text-center md:text-left border-b border-[#2C2C2C] pb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">Privacy Policy</h1>
            <p className="text-[#888] font-bold text-xs uppercase tracking-widest font-mono">Last updated: November 30, 2024</p>
          </div>

          <div className="space-y-6">
            
            {/* Introduction */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">Introduction</h2>
              <p className="text-[#A1A1AA] text-sm leading-relaxed">
                protocolLM (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
                our compliance service powered by Google's Gemini API.
              </p>
            </section>

            {/* Section 1 */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">1. Information We Collect</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">1.1 Account Information</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                    <li>Email address (used for authentication and communications)</li>
                    <li>Encrypted password credentials</li>
                    <li>Account creation date and last login timestamp</li>
                    <li>Selected county location for compliance guidance</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">1.2 Payment Information</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                    <li>Processed securely via Stripe (PCI DSS compliant)</li>
                    <li>We do NOT store full credit card numbers or CVV codes</li>
                    <li>We retain billing history and invoice records</li>
                    <li>Subscription status and plan tier</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">1.3 Usage Data</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                    <li>Chat queries and automated responses (stored for service improvement)</li>
                    <li>Uploaded images for compliance analysis</li>
                    <li>Feature usage statistics (e.g., Mock Audit completions, Memo generations)</li>
                    <li>Query counts and image analysis counts (for billing and usage limits)</li>
                    <li>Chat history timestamps and conversation threads</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">1.4 Technical Information</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                    <li>IP address and approximate geographic location</li>
                    <li>Browser type, operating system, and device information</li>
                    <li>Session duration and pages visited</li>
                    <li>Error logs and performance metrics</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
              <p className="text-[#A1A1AA] text-sm mb-4">We use collected information for the following purposes:</p>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm leading-relaxed">
                <li>
                  <span className="text-white font-medium">Service Delivery:</span> To provide real-time compliance 
                  guidance specific to Michigan health codes and county regulations using automated analysis.
                </li>
                <li>
                  <span className="text-white font-medium">Payment Processing:</span> To process subscription payments, manage 
                  account status, and issue invoices.
                </li>
                <li>
                  <span className="text-white font-medium">Service Improvement:</span> To analyze usage patterns and improve 
                  model accuracy using non-identifiable aggregate data only.
                </li>
                <li>
                  <span className="text-white font-medium">Communication:</span> To send transactional emails (password resets, 
                  subscription confirmations), service updates, and critical security alerts.
                </li>
                <li>
                  <span className="text-white font-medium">Security:</span> To detect and prevent fraud, abuse, and unauthorized access.
                </li>
                <li>
                  <span className="text-white font-medium">Legal Compliance:</span> To comply with applicable laws and respond to 
                  legal requests.
                </li>
              </ul>
            </section>

            {/* NEW: Section 3 - Automated Processing */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#F59E0B]">
              <h2 className="text-xl font-bold mb-4 text-white">3. Automated Data Processing</h2>
              <p className="text-[#FCD34D] mb-4 uppercase text-xs font-bold tracking-widest font-mono">⚠️ PROCESSING DISCLOSURES</p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">3.1 Third-Party Processing</h3>
                  <p className="text-[#A1A1AA] text-sm mb-3 leading-relaxed">
                    Our Service uses Google Vertex AI (including Google's Gemini API) to process your queries and analyze uploaded images. When you use 
                    our Service:
                  </p>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                    <li>Your text queries and uploaded images are sent to Google&apos;s Cloud services for automated processing</li>
                    <li>Google processes this data according to their Cloud Data Processing Addendum</li>
                    <li>Processing occurs on Google Cloud servers located in the United States</li>
                    <li>Data is transmitted using industry-standard encryption (TLS 1.3)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">3.2 Model Improvement</h3>
                  <div className="bg-[#065F46]/20 border-l-2 border-[#10B981] p-4 rounded-r-md mb-3">
                    <p className="text-[#6EE7B7] text-sm font-medium">
                      ✓ We do NOT use your individual queries, images, or business data to train our underlying models.
                    </p>
                  </div>
                  <p className="text-[#A1A1AA] text-sm mb-2">
                    However, we may use anonymized, aggregated data for:
                  </p>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                    <li>Improving response accuracy across all users</li>
                    <li>Identifying common compliance questions</li>
                    <li>Enhancing feature performance and user experience</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">3.3 Data You Should NOT Upload</h3>
                  <div className="bg-[#7F1D1D]/20 border-l-2 border-[#F87171] p-4 rounded-r-md">
                    <p className="text-[#FCA5A5] text-sm leading-relaxed">
                      Do not upload personally identifiable information (PII), protected health information (PHI), 
                      financial records, employee personal data, or confidential business information beyond what is 
                      necessary for compliance queries.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">3.4 Google Cloud Data Processing</h3>
                  <p className="text-[#A1A1AA] text-sm">
                    Google&apos;s handling of data sent to Vertex AI is governed by their Business Data Protection Terms.
                    <br />
                    <a 
                      href="https://cloud.google.com/terms/data-processing-addendum" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#3ECF8E] hover:text-white font-medium transition-colors mt-2 inline-block"
                    >
                      View Google Cloud Data Processing Addendum →
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 - Third-Party Services */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-6 text-white">4. Third-Party Service Providers</h2>
              <p className="text-[#A1A1AA] text-sm mb-6">
                We use the following third-party services to operate protocolLM. Each has its own privacy practices:
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                
                {/* Supabase Card */}
                <div className="bg-[#232323] border border-[#333] p-5 rounded-md hover:border-[#3ECF8E]/50 transition-colors group">
                  <h3 className="font-bold text-white mb-2 text-sm">Supabase</h3>
                  <p className="text-[#888] text-xs mb-3 leading-relaxed">
                    <span className="text-white font-medium">Purpose:</span> Database, authentication, and chat history storage.
                  </p>
                  <p className="text-[#888] text-xs mb-4 leading-relaxed">
                    <span className="text-white font-medium">Data Stored:</span> Account info, chat logs, usage metrics. 
                    All data is encrypted at rest and in transit.
                  </p>
                  <a href="https://supabase.com/privacy" className="text-[#3ECF8E] text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors group-hover:underline" target="_blank" rel="noopener">Read Policy →</a>
                </div>
                
                {/* Google Card */}
                <div className="bg-[#232323] border border-[#333] p-5 rounded-md hover:border-[#3ECF8E]/50 transition-colors group">
                  <h3 className="font-bold text-white mb-2 text-sm">Google Vertex AI</h3>
                  <p className="text-[#888] text-xs mb-3 leading-relaxed">
                    <span className="text-white font-medium">Purpose:</span> Automated processing for queries and image analysis.
                  </p>
                  <p className="text-[#888] text-xs mb-4 leading-relaxed">
                    <span className="text-white font-medium">Data Processed:</span> Text queries, uploaded images. 
                    Data is NOT used to train Google&apos;s models per our enterprise agreement.
                  </p>
                  <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-[#3ECF8E] text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors group-hover:underline" target="_blank" rel="noopener">Cloud Policy →</a>
                </div>
                
                {/* Stripe Card */}
                <div className="bg-[#232323] border border-[#333] p-5 rounded-md hover:border-[#3ECF8E]/50 transition-colors group">
                  <h3 className="font-bold text-white mb-2 text-sm">Stripe</h3>
                  <p className="text-[#888] text-xs mb-3 leading-relaxed">
                    <span className="text-white font-medium">Purpose:</span> Payment processing and subscription management.
                  </p>
                  <p className="text-[#888] text-xs mb-4 leading-relaxed">
                    <span className="text-white font-medium">Data Processed:</span> Payment methods, billing details, transaction history. 
                    All payment data is PCI DSS Level 1 certified.
                  </p>
                  <a href="https://stripe.com/privacy" className="text-[#3ECF8E] text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors group-hover:underline" target="_blank" rel="noopener">Stripe Policy →</a>
                </div>
              </div>

              <div className="mt-6 bg-[#232323] border border-[#444] p-4 rounded-md">
                <p className="text-[#A1A1AA] text-xs leading-relaxed">
                  <span className="text-white font-medium">Note:</span> We do not sell, rent, or share your personal information 
                  with third parties for their marketing purposes. Third-party processors only access data necessary to perform 
                  their services.
                </p>
              </div>
            </section>

            {/* Section 5 - Data Retention */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">5. Data Retention</h2>
              <p className="text-[#A1A1AA] mb-4 text-sm">
                We retain your information for as long as necessary to provide services and comply with legal obligations:
              </p>
              
              <div className="space-y-4">
                <div className="bg-[#232323] border-l-2 border-[#3ECF8E] p-4 rounded-r-md">
                  <h3 className="text-white font-bold mb-2 text-sm">Active Accounts</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-1 text-sm">
                    <li>Account data: Retained while your account is active</li>
                    <li>Chat history: Retained indefinitely (can be deleted on request)</li>
                    <li>Usage metrics: Retained for 24 months</li>
                  </ul>
                </div>

                <div className="bg-[#232323] border-l-2 border-[#F59E0B] p-4 rounded-r-md">
                  <h3 className="text-white font-bold mb-2 text-sm">After Subscription Cancellation</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-1 text-sm">
                    <li>Account & chat data: Retained for <strong className="text-white">90 days</strong> to allow for 
                    reactivation, then automatically purged</li>
                    <li>You may request immediate deletion at any time</li>
                  </ul>
                </div>

                <div className="bg-[#232323] border-l-2 border-[#DC2626] p-4 rounded-r-md">
                  <h3 className="text-white font-bold mb-2 text-sm">Payment Records</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-1 text-sm">
                    <li>Billing history, invoices, and transaction records: Retained for <strong className="text-white">7 years</strong> 
                    (required by tax law and financial regulations)</li>
                  </ul>
                </div>

                <div className="bg-[#232323] border-l-2 border-[#6366F1] p-4 rounded-r-md">
                  <h3 className="text-white font-bold mb-2 text-sm">Aggregated Data</h3>
                  <ul className="list-disc pl-5 text-[#A1A1AA] space-y-1 text-sm">
                    <li>Anonymized, non-identifiable usage statistics: Retained indefinitely for service improvement</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 6 - Your Privacy Rights */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">6. Your Privacy Rights</h2>
              <p className="text-[#A1A1AA] text-sm mb-4">
                Depending on your location, you may have the following rights under GDPR, CCPA, and other privacy laws:
              </p>
              
              <div className="space-y-3">
                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">✓ Right to Access</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Request a copy of all personal data we hold about you.
                  </p>
                </div>

                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">✓ Right to Correction</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Request correction of inaccurate or incomplete data.
                  </p>
                </div>

                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">✓ Right to Deletion</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Request deletion of your account and associated data (subject to legal retention requirements).
                  </p>
                </div>

                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">✓ Right to Data Portability</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Request an export of your data in a machine-readable format (JSON or CSV).
                  </p>
                </div>

                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">✓ Right to Opt-Out</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Opt out of marketing communications (transactional emails cannot be disabled).
                  </p>
                </div>

                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">✓ Right to Restrict Processing</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Limit how we process your data while maintaining your account.
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-[#065F46]/20 border-l-2 border-[#10B981] p-4 rounded-r-md">
                <p className="text-[#6EE7B7] text-sm">
                  <span className="font-bold">To exercise these rights:</span> Email us at{' '}
                  <a href="mailto:austinrnorthrop@gmail.com" className="underline hover:text-white transition-colors">
                    austinrnorthrop@gmail.com
                  </a>
                  {' '}with &quot;Privacy Request&quot; in the subject line. We will respond within 30 days.
                </p>
              </div>
            </section>

            {/* Section 7 - Data Security */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">7. Data Security</h2>
              <p className="text-[#A1A1AA] text-sm mb-4 leading-relaxed">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                <li><span className="text-white font-medium">Encryption:</span> All data is encrypted in transit (TLS 1.3) 
                and at rest (AES-256)</li>
                <li><span className="text-white font-medium">Authentication:</span> Passwords are hashed using bcrypt with salt</li>
                <li><span className="text-white font-medium">Access Controls:</span> Role-based access limits employee data access</li>
                <li><span className="text-white font-medium">Monitoring:</span> Automated alerts for suspicious activity and 
                unauthorized access attempts</li>
                <li><span className="text-white font-medium">Infrastructure:</span> Hosted on SOC 2 Type II certified cloud providers</li>
              </ul>
              
              <div className="mt-4 bg-[#7F1D1D]/20 border-l-2 border-[#F87171] p-4 rounded-r-md">
                <p className="text-[#FCA5A5] text-sm">
                  <span className="font-bold">Important:</span> No method of transmission over the internet is 100% secure. 
                  While we strive to protect your data, we cannot guarantee absolute security. You are responsible for 
                  maintaining the confidentiality of your account credentials.
                </p>
              </div>
            </section>

            {/* Section 8 - Cookies and Tracking */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">8. Cookies and Tracking Technologies</h2>
              <p className="text-[#A1A1AA] text-sm mb-4">We use the following cookies:</p>
              
              <div className="space-y-3">
                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">Essential Cookies (Required)</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Session management, authentication tokens, and security features. Cannot be disabled.
                  </p>
                </div>

                <div className="bg-[#232323] border border-[#333] p-4 rounded-md">
                  <h3 className="text-white font-bold mb-2 text-sm">Analytics Cookies (Optional)</h3>
                  <p className="text-[#A1A1AA] text-xs">
                    Usage statistics, feature performance tracking. You may opt out in your browser settings.
                  </p>
                </div>
              </div>

              <p className="text-[#A1A1AA] text-sm mt-4">
                We do NOT use advertising or third-party marketing cookies.
              </p>
            </section>

            {/* Section 9 - Children's Privacy */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">9. Children&apos;s Privacy</h2>
              <p className="text-[#A1A1AA] text-sm">
                Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal 
                information from children. If you believe a child has provided us with personal information, please contact 
                us immediately so we can delete it.
              </p>
            </section>

            {/* Section 10 - International Data Transfers */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">10. International Data Transfers</h2>
              <p className="text-[#A1A1AA] text-sm mb-3">
                Your information may be transferred to and processed in the United States. By using our Service, you consent 
                to this transfer.
              </p>
              <p className="text-[#A1A1AA] text-sm">
                For users in the European Economic Area (EEA), we rely on Standard Contractual Clauses approved by the 
                European Commission to ensure adequate data protection.
              </p>
            </section>

            {/* Section 11 - Changes to Privacy Policy */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">11. Changes to This Privacy Policy</h2>
              <p className="text-[#A1A1AA] text-sm">
                We may update this Privacy Policy from time to time. Material changes will be communicated via email or 
                prominent in-app notification at least 30 days before taking effect. Continued use of the Service after 
                changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Section 12 - Contact Us */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">12. Contact Us</h2>
              <p className="text-[#A1A1AA] text-sm mb-4">
                For privacy concerns, data requests, or questions about this Privacy Policy:
              </p>
              <div className="bg-[#232323] border border-[#3ECF8E]/30 p-4 rounded-md">
                <p className="text-[#A1A1AA] text-sm">
                  <span className="text-white font-medium">Email:</span>{' '}
                  <a href="mailto:austinrnorthrop@gmail.com" className="text-[#3ECF8E] hover:text-white font-medium transition-colors">
                    austinrnorthrop@gmail.com
                  </a>
                </p>
                <p class
