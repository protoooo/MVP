export default function PrivacyPolicy() {
  return (
    // Changed: bg-[#F0F9FF] and font-sans
    <div className="min-h-screen bg-[#F0F9FF] font-sans selection:bg-[#0077B6] selection:text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-bold text-[#023E8A] mb-2 tracking-tight">Privacy Policy</h1>
          <p className="text-[#0077B6] font-bold text-xs uppercase tracking-widest">Last updated: November 25, 2025</p>
        </div>

        <div className="prose prose-slate max-w-none prose-headings:text-[#023E8A] prose-a:text-[#0077B6] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#023E8A]">
          
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Account details (email address, password)</li>
              <li>Payment information (processed securely via Stripe)</li>
              <li>Usage data (chat queries, uploaded images)</li>
            </ul>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">2. How We Use Information</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>To provide AI-powered compliance guidance</li>
              <li>To process subscription payments</li>
              <li>To improve model accuracy and service quality</li>
              <li>To send necessary technical alerts</li>
            </ul>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-6">3. Third-Party Services</h2>
            <div className="space-y-4">
              <div className="bg-[#F0F9FF] border border-[#90E0EF] p-4 rounded-xl">
                <h3 className="font-bold text-[#023E8A] mb-1">Supabase</h3>
                <p className="text-slate-600 text-sm mb-2">Database & Authentication. Stores chat history and user profiles.</p>
                <a href="https://supabase.com/privacy" className="text-[#0077B6] text-xs font-bold uppercase tracking-wider hover:underline" target="_blank" rel="noopener">Supabase Privacy Policy →</a>
              </div>
              
              <div className="bg-[#F0F9FF] border border-[#90E0EF] p-4 rounded-xl">
                <h3 className="font-bold text-[#023E8A] mb-1">Google Vertex AI</h3>
                <p className="text-slate-600 text-sm mb-2">AI Processing. Analyzes queries/images. Data is not used for model training.</p>
                <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-[#0077B6] text-xs font-bold uppercase tracking-wider hover:underline" target="_blank" rel="noopener">Google Cloud Policy →</a>
              </div>
              
              <div className="bg-[#F0F9FF] border border-[#90E0EF] p-4 rounded-xl">
                <h3 className="font-bold text-[#023E8A] mb-1">Stripe</h3>
                <p className="text-slate-600 text-sm mb-2">Payment Processing. We do not store credit card numbers.</p>
                <a href="https://stripe.com/privacy" className="text-[#0077B6] text-xs font-bold uppercase tracking-wider hover:underline" target="_blank" rel="noopener">Stripe Policy →</a>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">4. Data Retention</h2>
            <p className="text-slate-700 mb-4">
              If you cancel your subscription:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Account & Chat data is retained for <strong>90 days</strong></li>
              <li>Payment records are retained for <strong>7 years</strong> (legal requirement)</li>
            </ul>
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-2xl font-bold mb-4">5. Contact Us</h2>
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
