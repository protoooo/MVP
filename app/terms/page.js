'use client'

const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #121212 !important;
      overscroll-behavior-y: none;
    }
  `}</style>
)

export default function TermsOfService() {
  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3ECF8E] selection:text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          <div className="mb-12 text-center md:text-left border-b border-[#2C2C2C] pb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">Terms of Service</h1>
            <p className="text-[#888] font-bold text-xs uppercase tracking-widest font-mono">Last updated: November 30, 2024</p>
          </div>

          <div className="space-y-6">
            
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
              <p className="text-[#A1A1AA] text-sm leading-relaxed">
                By accessing or using protocolLM (&quot;the Service&quot;), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, you may not use the Service.
              </p>
            </section>

            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">2. Description of Service</h2>
              <p className="text-[#A1A1AA] text-sm mb-4">
                protocolLM is a compliance assistant for Michigan restaurants powered by Google's Gemini API. The Service provides:
              </p>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm mb-6">
                <li>Access to food safety regulations and official county documentation</li>
                <li>Automated interpretation of compliance requirements via Chat</li>
                <li>Image analysis for equipment and facility compliance</li>
                <li>Mock Audit workflows</li>
                <li>Staff Memo generation</li>
                <li>County-specific guidance (currently Washtenaw County)</li>
              </ul>
              
              <div className="bg-[#7F1D1D]/20 border-l-2 border-[#F87171] p-4 rounded-r-md mb-6">
                <p className="text-[#FCA5A5] font-bold mb-1 text-xs uppercase tracking-wide font-mono">⚠️ Critical Disclaimer</p>
                <p className="text-[#FECACA] text-sm leading-relaxed opacity-90">
                  protocolLM is a reference tool only. It does NOT replace professional legal advice, official health 
                  department guidance, or licensed food safety consultants. You are solely responsible for verifying 
                  all information with your local health department before making compliance decisions.
                </p>
              </div>
            </section>

            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#F59E0B]">
              <h2 className="text-xl font-bold mb-4 text-white">3. Automated Content Disclaimer</h2>
              <p className="text-[#A1A1AA] text-sm mb-4">
                Our Service uses Google's Gemini API and machine learning models to analyze documents 
                and generate responses. You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-3 text-sm">
                <li>
                  <span className="text-white font-medium">Technology Limitations:</span> Responses may contain errors, inaccuracies, 
                  or &quot;hallucinations&quot;. The system may misinterpret regulations or provide outdated information.
                </li>
                <li>
                  <span className="text-white font-medium">No Substitute for Professional Review:</span> All automated outputs must be 
                  independently verified before taking any action.
                </li>
                <li>
                  <span className="text-white font-medium">Human Review Required:</span> Compliance decisions should not 
                  be determined solely by software output.
                </li>
                <li>
                  <span className="text-white font-medium">No Guarantee of Compliance:</span> Use of this Service does not guarantee compliance 
                  with health codes or prevent inspection violations, fines, or business closure.
                </li>
              </ul>
            </section>

            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">4. Account Registration</h2>
              <p className="text-[#A1A1AA] text-sm mb-4">To use the Service, you must:</p>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                <li>Be at least 18 years old</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activity under your account</li>
              </ul>
            </section>

            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-6 text-white">5. Subscription and Billing</h2>
              
              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide font-mono border-b border-[#333] pb-2 mb-4">5.1 Free Trial</h3>
                <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                  <li>New users receive a 7-day free trial.</li>
                  <li>A valid payment method is required to start the trial.</li>
                  <li>You will be charged automatically after the trial ends unless you cancel.</li>
                  <li>Only one free trial per user or business entity is permitted.</li>
                </ul>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide font-mono border-b border-[#333] pb-2 mb-4">5.2 Subscription Plan</h3>
                <div className="bg-[#232323] border border-[#3ECF8E] p-6 rounded-md max-w-md">
                  <p className="text-white font-bold mb-2">protocolLM</p>
                  <p className="text-[#3ECF8E] font-mono text-lg mb-4">$86/month</p>
                  <p className="text-[#888] text-xs mb-4 italic">&quot;Don&apos;t get 86&apos;d&quot;</p>
                  <ul className="text-[#BBB] space-y-1 text-sm list-disc pl-4">
                    <li>Unlimited text queries</li>
                    <li>Unlimited image analysis</li>
                    <li>Full compliance database</li>
                    <li>Mock audit workflow</li>
                    <li>Training materials & SOP generators</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide font-mono border-b border-[#333] pb-2 mb-4">5.3 Payment Terms</h3>
                <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                  <li>All subscriptions are billed monthly in advance.</li>
                  <li>Payments are processed securely through Stripe.</li>
                  <li>You authorize us to charge your payment method for recurring subscription fees.</li>
                  <li>Failed payments may result in immediate service suspension.</li>
                  <li>We reserve the right to modify pricing with 30 days notice to existing subscribers.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide font-mono border-b border-[#333] pb-2 mb-4">5.4 Cancellation and Refunds</h3>
                <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                  <li>You may cancel your subscription at any time.</li>
                  <li>Access continues until the end of the paid period.</li>
                  <li>No refunds are provided for partial months or unused features.</li>
                  <li>Cancellation during the free trial prevents any charges.</li>
                </ul>
              </div>
            </section>

            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">6. Usage Limits and Fair Use</h2>
              <p className="text-[#A1A1AA] text-sm mb-4 leading-relaxed">
                &quot;Unlimited&quot; usage is subject to a Fair Use Policy. We prohibit:
              </p>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                <li>Automated scraping, bot activity, or bulk data extraction</li>
                <li>Reselling or redistributing Service access to third parties</li>
                <li>Excessive usage that degrades system performance for other users</li>
                <li>Using the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section className="bg-[#7F1D1D]/20 p-8 rounded-lg border-2 border-[#F87171]">
              <h2 className="text-xl font-bold mb-4 text-white">7. LIMITATION OF LIABILITY</h2>
              <p className="text-[#FCA5A5] mb-4 uppercase text-xs font-bold tracking-widest font-mono">⚠️ READ CAREFULLY</p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">7.1 AS-IS SERVICE</h3>
                  <p className="text-[#FECACA] text-sm leading-relaxed">
                    THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">7.2 MAXIMUM LIABILITY CAP</h3>
                  <p className="text-[#FECACA] text-sm leading-relaxed">
                    OUR TOTAL LIABILITY SHALL NOT EXCEED THE FEES YOU PAID IN THE TWELVE MONTHS 
                    PRECEDING THE CLAIM, OR $100 USD, WHICHEVER IS GREATER.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">7.3 NO LIABILITY FOR AUTOMATED ERRORS</h3>
                  <p className="text-[#FECACA] text-sm leading-relaxed">
                    WE SHALL NOT BE LIABLE FOR INACCURATE, INCOMPLETE, OR MISLEADING INFORMATION 
                    PROVIDED BY THE AI, INCLUDING HALLUCINATIONS OR FAILED IMAGE ANALYSIS.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">8. Governing Law</h2>
              <p className="text-[#A1A1AA] text-sm">
                These Terms shall be governed by the laws of the State of Michigan. 
                Disputes shall be resolved through binding arbitration in Washtenaw County, Michigan.
              </p>
            </section>

            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">Contact Information</h2>
              <p className="text-[#A1A1AA] text-sm">
                For questions about these Terms:
                <br />
                <strong className="text-white">Email:</strong>{' '}
                <a href="mailto:austinrnorthrop@gmail.com" className="text-[#3ECF8E] hover:text-white transition-colors font-medium">
                  austinrnorthrop@gmail.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-[#2C2C2C] text-center">
            <a href="/" className="inline-flex items-center gap-2 text-[#888] hover:text-white font-mono text-xs uppercase tracking-widest transition-colors">
              <span>←</span> Return Home
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
