export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Michigan Tenant Condition Report System
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Last Updated: December 30, 2024
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-gray max-w-none">
          
          <div className="p-6 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg mb-8">
            <h3 className="font-bold text-gray-900 mb-2">IMPORTANT LEGAL DISCLAIMER</h3>
            <p className="text-sm text-gray-800 mb-2">
              This service provides documentation tools only. It is <strong>NOT legal advice</strong> and does not 
              create an attorney-client relationship. Always consult with a qualified attorney.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By using this Service, you agree to these Terms. If you disagree, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Service Description</h2>
            <p className="text-gray-700 mb-3">We provide:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>AI-powered analysis of rental unit photos</li>
              <li>Photo metadata extraction and GPS validation</li>
              <li>PDF forensic evidence package with demand letter</li>
              <li>Michigan tenant rights information</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>Analyzes VISIBLE conditions only.</strong> Cannot detect heating, plumbing, electrical issues not visible in photos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. NO LEGAL ADVICE</h2>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-gray-800 font-semibold">
                THIS SERVICE DOES NOT PROVIDE LEGAL ADVICE. NO ATTORNEY-CLIENT RELATIONSHIP IS CREATED.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Payment</h2>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>One-time payment: $20 for up to 200 photos</li>
              <li>No refunds after report generation</li>
              <li>No subscriptions or recurring charges</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. 48-Hour Data Deletion</h2>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-gray-800">
                All data permanently deleted 48 hours after report generation. Download immediately.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Acceptable Use</h2>
            <p className="text-gray-700 mb-3">You agree to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>Upload only photos you have legal right to document</li>
              <li>Provide accurate property information</li>
              <li>Not manipulate photos to misrepresent conditions</li>
              <li>Not upload illegal or inappropriate content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Warranty Disclaimer</h2>
            <p className="text-gray-700 mb-4 uppercase font-semibold">
              SERVICE PROVIDED "AS IS" WITHOUT WARRANTIES. AI ANALYSIS MAY CONTAIN ERRORS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4 uppercase font-semibold">
              NOT LIABLE FOR DAMAGES ARISING FROM SERVICE USE. MAXIMUM LIABILITY: $20.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Michigan Law</h2>
            <p className="text-gray-700 mb-4">
              Governed by Michigan law. Disputes resolved in Michigan courts.
            </p>
          </section>

          <div className="mt-12 p-6 bg-gray-100 border border-gray-300 rounded-lg">
            <p className="text-sm text-gray-700 font-semibold mb-2">By using this Service, you acknowledge:</p>
            <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
              <li>This is NOT legal advice</li>
              <li>AI analysis may have errors</li>
              <li>Consult an attorney before legal action</li>
              <li>Data deleted after 48 hours</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-sm text-gray-600 text-center">
            <a href="/tenant" className="text-blue-600 hover:underline">← Back to Home</a>
            {' | '}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
