export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F0F9FF] font-sans selection:bg-[#0077B6] selection:text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-bold text-[#023E8A] mb-2 tracking-tight">Terms of Service</h1>
          <p className="text-[#0077B6] font-bold text-xs uppercase tracking-widest">Last updated: November 25, 2025</p>
        </div>

        <div className="prose prose-slate max-w-none prose-headings:text-[#023E8A] prose-a:text-[#0077B6] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#023E8A]">
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-0">
              By accessing or using protocolLM ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-4">
              protocolLM is an AI-powered compliance assistant for Michigan restaurants. The Service provides:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Access to food safety regulations and official county documentation</li>
              <li>AI-assisted interpretation of compliance requirements via Chat</li>
              <li>Image analysis for equipment and facility compliance</li>
              <li>Mock Audit workflows (Pro & Enterprise Plans)</li>
              <li>Staff Memo generation (Enterprise Plan only)</li>
              <li>County-specific guidance (Washtenaw, Wayne, Oakland)</li>
            </ul>
            
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 my-4 rounded-r-lg">
              <p className="text-orange-800 font-bold mb-1 text-sm uppercase tracking-wide">⚠️ Important Disclaimer</p>
              <p className="text-orange-900/80 text-sm leading-relaxed">
                protocolLM is a reference tool only. It does NOT replace professional legal advice, official health 
                department guidance, or licensed food safety consultants. You are solely responsible for verifying 
                all information with your local health department before making compliance decisions.
              </p>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">3. Account Registration</h2>
            <p className="text-slate-700 mb-4">To use the Service, you must:</p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">4. Subscription and Billing</h2>
            
            <h3 className="text-xl font-bold mb-3 mt-6">4.1 Free Trial</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-4">
              <li>New users receive a 30-day free trial</li>
              <li>A valid payment method is required to start the trial</li>
              <li>You will be charged automatically after the trial ends unless you cancel</li>
            </ul>

            <h3 className="text-xl font-bold mb-3 mt-6">4.2 Subscription Plans</h3>
            <div className="grid gap-4 mt-4">
              <div className="bg-[#F0F9FF] border border-[#90E0EF] p-4 rounded-xl">
                <p className="text-[#023E8A] font-bold mb-2">Starter Plan - $49/month</p>
                <ul className="list-disc pl-6 text-slate-700 space-y-1 text-sm">
                  <li>500 Regulatory Text Queries per month</li>
                  <li>No Image Analysis capabilities</li>
                  <li>No Mock Audit access</li>
                </ul>
              </div>

              <div className="bg-[#F0F9FF] border border-[#90E0EF] p-4 rounded-xl">
                <p className="text-[#023E8A] font-bold mb-2">Pro Plan - $99/month</p>
                <ul className="list-disc pl-6 text-slate-700 space-y-1 text-sm">
                  <li>Unlimited Regulatory Text Queries</li>
                  <li>100 Image Analyses per month</li>
                  <li>Mock Audit Workflow included</li>
                </ul>
              </div>

              <div className="bg-[#F0F9FF] border border-[#90E0EF] p-4 rounded-xl">
                <p className="text-[#023E8A] font-bold mb-2">Enterprise Plan - $199/month</p>
                <ul className="list-disc pl-6 text-slate-700 space-y-1 text-sm">
                  <li>Unlimited Queries & 500 Image Analyses</li>
                  <li>Mock Audit Workflow & Staff Memo Generator</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-3 mt-6">4.4 Cancellation</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 mb-0">
              <li>You may cancel your subscription at any time via the Billing Portal</li>
              <li>Access continues until the end of the paid period</li>
            </ul>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">5. Usage Limits</h2>
            <p className="text-slate-700 mb-4">
              "Unlimited" usage is subject to a Fair Use Policy prohibiting automated scraping or bot activity. 
              Rate limits apply to prevent system abuse.
            </p>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">6. Liability & Indemnification</h2>
            <p className="text-slate-700 mb-4 uppercase text-xs font-bold tracking-widest text-[#0077B6]">Read Carefully</p>
            <p className="text-slate-700 mb-4 font-medium">
              THE SERVICE IS PROVIDED "AS IS". PROTOCOLLM SHALL NOT BE LIABLE FOR INSPECTION FAILURES, FINES, OR LOST REVENUE.
            </p>
            <p className="text-slate-700">
              You agree to indemnify protocolLM from any claims arising from your use of the Service.
            </p>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
            <p className="text-slate-700">
              <strong>Email:</strong>{' '}
              <a href="mailto:austinrnorthrop@gmail.com" className="text-[#0077B6] hover:underline font-bold">
                austinrnorthrop@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#90E0EF] text-center">
          <a href="/" className="inline-flex items-center gap-2 text-[#0077B6] font-bold uppercase tracking-widest text-xs hover:text-[#023E8A] transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
