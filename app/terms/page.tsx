'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-text-primary">
            protocol<span className="text-brand">LM</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-text-primary mb-4">Terms of Service</h1>
        <p className="text-text-secondary mb-8">Last Updated: January 3, 2025</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ProtocolLM, you agree to be bound by these Terms of Service and our 
              Privacy Policy. If you do not agree to these terms, do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Service Description</h2>
            <p>
              ProtocolLM provides unlimited document storage with semantic search capabilities powered by 
              for businesses. Our Business Plan offers a single tier with comprehensive features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. User Accounts</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Acceptable Use & Legal Content</h2>
            <p className="font-semibold mb-2">You may ONLY use ProtocolLM for legal purposes. You may NOT:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li><strong>Upload illegal, harmful, or infringing content of any kind</strong></li>
              <li>Store content that violates any laws or regulations</li>
              <li>Upload copyrighted material without proper authorization</li>
              <li>Store content containing malware, viruses, or malicious code</li>
              <li>Use the service to distribute spam or unsolicited communications</li>
              <li>Interfere with or disrupt our services</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Share your account credentials with others</li>
            </ul>
            <p className="mt-4 font-semibold text-red-400">
              ⚠️ IMPORTANT: Any illegal content will be reported to law enforcement authorities. 
              We cooperate fully with legal investigations and may be required to disclose user data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Your Responsibility for Content</h2>
            <p>
              You are solely responsible for all content you upload to ProtocolLM. By using our service, you certify that:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>All uploaded content is legal and does not violate any laws</li>
              <li>You have the right to store and process the content</li>
              <li>The content does not infringe on third-party rights</li>
              <li>You will comply with all applicable data protection regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Storage & Features</h2>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Business Plan: Unlimited document storage</li>
              <li>14-day free trial included with new accounts</li>
              <li>Advanced semantic search</li>
              <li>Document editing, sharing, and management features</li>
            </ul>
            <p className="mt-2">
              We reserve the right to implement fair use policies to prevent abuse.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Payment Terms</h2>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>14-day free trial for all new accounts</li>
              <li>$25/month subscription fee after trial period</li>
              <li>Subscriptions auto-renew monthly unless canceled</li>
              <li>No refunds for partial months</li>
              <li>Prices subject to change with 30 days notice</li>
              <li>Payment processed securely via Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Intellectual Property</h2>
            <p>
              You retain all rights to your documents. ProtocolLM does not claim ownership of your content. 
              We only use your content to provide the services you've requested (storage, search, analysis).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Security & Privacy</h2>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>End-to-end encryption (AES-256) for all stored files</li>
              <li>Virus and malware scanning on all uploads</li>
              <li>Full audit logging of all document operations</li>
              <li>Secure document sharing with signed URLs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Service Availability</h2>
            <p>
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We are not liable for 
              any downtime, data loss, or service interruptions beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms, particularly those 
              containing illegal content. You may cancel your account at any time. Upon termination, your data 
              will be deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Limitation of Liability</h2>
            <p>
              ProtocolLM is provided "as is" without warranties. We are not liable for any indirect, 
              incidental, or consequential damages arising from use of our services. Our total liability 
              shall not exceed the amount paid by you in the last 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Changes to Terms</h2>
            <p>
              We may update these terms at any time. We will notify users of significant changes via email. 
              Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">14. Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Michigan, United States. 
              Any disputes shall be resolved in the courts of Ann Arbor, Michigan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">15. Contact</h2>
            <p>
              For questions about these terms, contact:
              <br />Austin Northrup
              <br />Email: <a href="mailto:support@protocollm.org" className="text-brand hover:underline">support@protocollm.org</a>
              <br />Phone: <a href="tel:7342164836" className="text-brand hover:underline">(734) 216-4836</a>
              <br />Location: Ann Arbor, Michigan, USA
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
