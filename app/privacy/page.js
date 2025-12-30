export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Privacy Policy
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
          
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Overview</h2>
            <p className="text-gray-700 mb-4">
              This Privacy Policy describes how we collect, use, and protect your information when you use 
              the Michigan Tenant Condition Report System. We are committed to protecting your 
              privacy and maintaining the confidentiality of your data.
            </p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-800">
                <strong>Key Principle:</strong> We implement a "burn after reading" policy. Your report and all 
                uploaded photos are permanently deleted from our servers 48 hours after report generation.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Email Address:</strong> Used to send you the access code for your report</li>
              <li><strong>Property Address:</strong> Optional; used for GPS validation and included in your report</li>
              <li><strong>Photos:</strong> Images you upload of your rental unit conditions</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li><strong>Photo Metadata (EXIF):</strong> Timestamp, GPS coordinates, camera make/model</li>
              <li><strong>Server Timestamps:</strong> Trusted timestamps when photos are uploaded</li>
              <li><strong>IP Address:</strong> Used for rate limiting and abuse prevention only</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Data Retention - 48 Hour Policy</h2>
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg mb-4">
              <p className="text-sm text-gray-800 font-semibold mb-2">⚠️ Critical Privacy Protection</p>
              <p className="text-sm text-gray-700">
                All reports and uploaded photos are permanently deleted from our servers <strong>48 hours</strong> after 
                report generation. Download your PDF immediately.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Data Security</h2>
            <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
              <li>All data transmitted over HTTPS encryption</li>
              <li>Secure cloud storage with access controls</li>
              <li>No user accounts or passwords</li>
              <li>Payment processing by Stripe (PCI compliant)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              Questions about privacy? Contact us via the email on our website.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-sm text-gray-600 text-center">
            <a href="/tenant" className="text-blue-600 hover:underline">← Back to Home</a>
            {' | '}
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
