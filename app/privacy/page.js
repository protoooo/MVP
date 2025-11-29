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
            <p className="text-[#888] font-bold text-xs uppercase tracking-widest font-mono">Last updated: November 25, 2025</p>
          </div>

          <div className="space-y-6">
            
            {/* Section 1 */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">1. Information We Collect</h2>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm leading-relaxed">
                <li><span className="text-white font-medium">Account Details:</span> Email address, encrypted password credentials.</li>
                <li><span className="text-white font-medium">Payment Information:</span> Processed securely via Stripe (we do not store card numbers).</li>
                <li><span className="text-white font-medium">Usage Data:</span> Chat queries and uploaded images for compliance analysis.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">2. How We Use Information</h2>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm leading-relaxed">
                <li>To provide real-time, AI-powered compliance guidance specific to local codes.</li>
                <li>To process subscription payments and manage account status.</li>
                <li>To improve model accuracy (non-identifiable aggregate data only).</li>
                <li>To send necessary technical alerts or policy updates.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-6 text-white">3. Third-Party Infrastructure</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Supabase Card */}
                <div className="bg-[#232323] border border-[#333] p-5 rounded-md hover:border-[#3ECF8E]/50 transition-colors group">
                  <h3 className="font-bold text-white mb-2 text-sm">Supabase</h3>
                  <p className="text-[#888] text-xs mb-4 leading-relaxed">Database & Auth. Encrypted storage for chat history and user profiles.</p>
                  <a href="https://supabase.com/privacy" className="text-[#3ECF8E] text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors group-hover:underline" target="_blank" rel="noopener">Read Policy →</a>
                </div>
                
                {/* Google Card */}
                <div className="bg-[#232323] border border-[#333] p-5 rounded-md hover:border-[#3ECF8E]/50 transition-colors group">
                  <h3 className="font-bold text-white mb-2 text-sm">Google Vertex AI</h3>
                  <p className="text-[#888] text-xs mb-4 leading-relaxed">AI Processing. Analyzes queries/images. Data is <strong className="text-white">not</strong> used for model training.</p>
                  <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-[#3ECF8E] text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors group-hover:underline" target="_blank" rel="noopener">Cloud Policy →</a>
                </div>
                
                {/* Stripe Card */}
                <div className="bg-[#232323] border border-[#333] p-5 rounded-md hover:border-[#3ECF8E]/50 transition-colors group">
                  <h3 className="font-bold text-white mb-2 text-sm">Stripe</h3>
                  <p className="text-[#888] text-xs mb-4 leading-relaxed">Payment Processing. Handles all PCI-compliant billing transactions.</p>
                  <a href="https://stripe.com/privacy" className="text-[#3ECF8E] text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors group-hover:underline" target="_blank" rel="noopener">Stripe Policy →</a>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">4. Data Retention</h2>
              <p className="text-[#A1A1AA] mb-4 text-sm">
                Upon subscription cancellation:
              </p>
              <ul className="list-disc pl-5 text-[#A1A1AA] space-y-2 text-sm">
                <li>Account & Chat data is retained for <strong>90 days</strong> to allow for reactivation, then purged.</li>
                <li>Payment records are retained for <strong>7 years</strong> (required by tax law).</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="bg-[#1C1C1C] p-8 rounded-lg border border-[#2C2C2C]">
              <h2 className="text-xl font-bold mb-4 text-white">5. Contact Us</h2>
              <p className="text-[#A1A1AA] text-sm">
                For privacy concerns or data deletion requests:
                <br />
                <a href="mailto:austinrnorthrop@gmail.com" className="text-[#3ECF8E] hover:text-white font-medium transition-colors mt-2 inline-block">
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
