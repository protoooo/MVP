import Link from 'next/link'

export default function TermsPage() {
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
        <h1 className="text-3xl font-medium text-[#0F172A] mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-[#475569]">
          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">1. Service Description</h2>
            <p>
              MI Health Inspection provides compliance analysis tools for Michigan food service establishments 
              preparing for health inspections. Services include:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Free compliance Q&A grounded in Michigan food safety regulations</li>
              <li>Paid image analysis ($50 one-time)</li>
              <li>Paid video analysis ($200 one-time, 30-minute processing window)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">2. No Legal Advice</h2>
            <p className="mb-2">
              <strong>IMPORTANT:</strong> MI Health Inspection is an informational tool only. It does NOT provide legal advice.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>This service does not create an attorney-client relationship</li>
              <li>Analysis results should not be relied upon as legal counsel</li>
              <li>Always consult qualified professionals before making compliance decisions</li>
              <li>We are not liable for any actions taken based on our analysis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">3. Accuracy and Limitations</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Analysis is based on visual inspection of photos/videos only</li>
              <li>Results may not identify all compliance issues</li>
              <li>Analysis is grounded in Michigan state food safety regulations but may not be exhaustive</li>
              <li>Technology-assisted analysis may contain errors or omissions</li>
              <li>Final compliance determination is made by official health inspectors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">4. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Image analysis: $50 one-time payment</li>
              <li>Video analysis: $200 one-time payment (30-minute processing window)</li>
              <li>Free compliance Q&A: No payment required</li>
              <li>All payments processed securely through Stripe</li>
              <li>No refunds once analysis has been processed</li>
              <li>No subscriptions or recurring charges</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">5. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Upload only content from your own establishment or with proper authorization</li>
              <li>Not upload inappropriate, illegal, or harmful content</li>
              <li>Not attempt to abuse, manipulate, or reverse-engineer the service</li>
              <li>Use analysis results responsibly and in good faith</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">6. Prohibited Uses</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Using the service to harass, defame, or harm others</li>
              <li>Uploading copyrighted content without authorization</li>
              <li>Attempting to overwhelm or damage the service infrastructure</li>
              <li>Reselling or redistributing service access or results</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">7. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain ownership of content you upload</li>
              <li>Generated reports are provided for your use only</li>
              <li>MI Health Inspection retains rights to the service platform and technology</li>
              <li>Michigan food safety regulations are public domain documents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">8. Limitation of Liability</h2>
            <p>
              MI Health Inspection and its operators are not liable for any damages, losses, or consequences 
              arising from use of this service, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Failed health inspections</li>
              <li>Regulatory penalties or fines</li>
              <li>Business interruptions or closures</li>
              <li>Inaccurate or incomplete analysis results</li>
              <li>Technical failures or service outages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">9. Service Availability</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We strive for 24/7 availability but do not guarantee uptime</li>
              <li>Service may be suspended for maintenance or updates</li>
              <li>We reserve the right to modify or discontinue features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">10. Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Michigan. Any disputes shall be 
              resolved in Michigan courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">11. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the service constitutes 
              acceptance of updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-[#0F172A] mb-3">12. Contact</h2>
            <p>
              For questions about these terms, contact: legal@mihealthinspection.com
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
