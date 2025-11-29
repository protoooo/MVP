export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3B82F6] selection:text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Header */}
        <div className="mb-12 text-center md:text-left border-b border-[#2C2C2C] pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">Terms of Service</h1>
          <p className="text-[#888] font-bold text-xs uppercase tracking-widest font-mono">Last updated: November 25, 2025</p>
        </div>

        <div className="space-y-6">
          
          {/* Section 1 */}
          <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
            <h2 className="text-xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
            <p className="text-[#A1A1AA] text-sm leading-relaxed">
              By accessing or using protocolLM ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
            <h2 className="text-xl font-bold mb-4 text-white">2. Description of Service</h2>
            <p className="text-[#A1A1AA] text-sm mb-4">
              protocolLM is an AI-powered compliance assistant for Michigan restaurants. The Service provides:
            </p>
            <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm mb-6">
              <li>Access to food safety regulations and official county documentation</li>
              <li>AI-assisted interpretation of compliance requirements via Chat</li>
              <li>Image analysis for equipment and facility compliance</li>
              <li>Mock Audit workflows (Pro & Enterprise Plans)</li>
              <li>Staff Memo generation (Enterprise Plan only)</li>
              <li>County-specific guidance (Washtenaw, Wayne, Oakland)</li>
            </ul>
            
            <div className="bg-[#7F1D1D]/20 border-l-2 border-[#F87171] p-4 rounded-r-md">
              <p className="text-[#FCA5A5] font-bold mb-1 text-xs uppercase tracking-wide font-mono">⚠️ Critical Disclaimer</p>
              <p className="text-[#FECACA] text-sm leading-relaxed opacity-90">
                protocolLM is a reference tool only. It does NOT replace professional legal advice, official health 
                department guidance, or licensed food safety consultants. You are solely responsible for verifying 
                all information with your local health department before making compliance decisions.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
            <h2 className="text-xl font-bold mb-4 text-white">3. Account Registration</h2>
            <p className="text-[#A1A1AA] text-sm mb-4">To use the Service, you must:</p>
            <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
            <h2 className="text-xl font-bold mb-6 text-white">4. Subscription and Billing</h2>
            
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide font-mono border-b border-[#333] pb-2 mb-4">4.1 Free Trial</h3>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                <li>New users receive a 30-day free trial.</li>
                <li>A valid payment method is required to start the trial.</li>
                <li>You will be charged automatically after the trial ends unless you cancel.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide font-mono border-b border-[#333] pb-2 mb-4">4.2 Subscription Plans</h3>
              <div className="grid gap-4 md:grid-cols-3">
                
                {/* Starter */}
                <div className="bg-[#232323] border border-[#333] p-5 rounded-md">
                  <p className="text-white font-bold mb-2 text-sm">Starter Plan</p>
                  <p className="text-[#3B82F6] font-mono text-xs mb-4">$49/month</p>
                  <ul className="text-[#888] space-y-1 text-xs list-disc pl-4">
                    <li>500 Text Queries/mo</li>
                    <li>County Doc Access</li>
                  </ul>
                </div>

                {/* Pro */}
                <div className="bg-[#232323] border border-[#3B82F6] p-5 rounded-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#3B82F6] text-white text-[9px] font-bold px-2 py-1 uppercase">Popular</div>
                  <p className="text-white font-bold mb-2 text-sm">Pro Plan</p>
                  <p className="text-[#3B82F6] font-mono text-xs mb-4">$99/month</p>
                  <ul className="text-[#BBB] space-y-1 text-xs list-disc pl-4">
                    <li>Unlimited Queries</li>
                    <li>100 Image Analyses</li>
                    <li>Mock Audit Workflow</li>
                  </ul>
                </div>

                {/* Enterprise */}
                <div className="bg-[#232323] border border-white/30 p-5 rounded-md">
                  <p className="text-white font-bold mb-2 text-sm">Enterprise Plan</p>
                  <p className="text-[#3B82F6] font-mono text-xs mb-4">$199/month</p>
                  <ul className="text-[#888] space-y-1 text-xs list-disc pl-4">
                    <li>Unlimited All Features</li>
                    <li>500 Image Analyses</li>
                    <li>Staff Memo Gen</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide font-mono border-b border-[#333] pb-2 mb-4">4.4 Cancellation</h3>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                <li>You may cancel your subscription at any time via the Billing Portal.</li>
                <li>Access continues until the end of the paid period.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
            <h2 className="text-xl font-bold mb-4 text-white">5. Usage Limits</h2>
            <p className="text-[#A1A1AA] text-sm mb-4 leading-relaxed">
              "Unlimited" usage is subject to a Fair Use Policy prohibiting automated scraping or bot activity. 
              Rate limits apply to prevent system abuse.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
            <h2 className="text-xl font-bold mb-4 text-white">6. Liability & Indemnification</h2>
            <p className="text-[#3B82F6] mb-4 uppercase text-xs font-bold tracking-widest font-mono">READ CAREFULLY</p>
            <p className="text-white font-medium mb-4 text-sm border-l-2 border-white/20 pl-4 italic">
              THE SERVICE IS PROVIDED "AS IS". PROTOCOLLM SHALL NOT BE LIABLE FOR INSPECTION FAILURES, FINES, OR LOST REVENUE.
            </p>
            <p className="text-[#A1A1AA] text-sm">
              You agree to indemnify protocolLM from any claims arising from your use of the Service.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
            <h2 className="text-xl font-bold mb-4 text-white">Contact Information</h2>
            <p className="text-[#A1A1AA] text-sm">
              <strong className="text-white">Email:</strong>{' '}
              <a href="mailto:austinrnorthrop@gmail.com" className="text-[#3B82F6] hover:text-white transition-colors font-medium">
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
  )
}
