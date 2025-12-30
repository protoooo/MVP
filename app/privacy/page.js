import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <Link href="/" className="text-xl font-normal text-[#0F172A] hover:text-[#4F7DF3]">
            MI Health Inspection
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-medium text-[#0F172A] mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-[#475569]">
          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">Overview</h2>
            <p>
              MI Health Inspection (mihealthinspection.com) is a utility tool for Michigan food service 
              establishments to prepare for health inspections. We collect minimal data and do not 
              require user accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Payment Information:</strong> Processed securely through Stripe. We do not store credit card details.</li>
              <li><strong>Uploaded Content:</strong> Images or videos you upload for analysis are temporarily stored for processing.</li>
              <li><strong>Analysis Results:</strong> Your inspection analysis results and generated PDF reports.</li>
              <li><strong>Questions:</strong> Compliance questions you submit for the free Q&A feature.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">Data We Do NOT Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>No user accounts or passwords</li>
              <li>No personal identification beyond payment processing</li>
              <li>No tracking cookies or analytics</li>
              <li>No email addresses (except via Stripe for receipts)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process your payment via Stripe</li>
              <li>Analyze your images/videos against Michigan food safety regulations</li>
              <li>Generate compliance reports</li>
              <li>Answer compliance questions using Michigan state documents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">Data Retention</h2>
            <p>
              Uploaded images, videos, and analysis results are stored temporarily for PDF generation 
              and download. We recommend downloading your report immediately after generation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">Third-Party Services</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> Payment processing (subject to Stripe's privacy policy)</li>
              <li><strong>Cohere:</strong> AI analysis of images, videos, and Q&A (subject to Cohere's privacy policy)</li>
              <li><strong>Supabase:</strong> Database and storage (subject to Supabase's privacy policy)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">Your Rights</h2>
            <p>
              Since we do not maintain user accounts, there is no personal data to access, modify, or delete. 
              Each transaction is independent and stateless.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">Contact</h2>
            <p>
              For privacy concerns, contact us at privacy@mihealthinspection.com
            </p>
          </section>

          <section className="pt-4 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#475569]">
              Last updated: December 30, 2024
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
