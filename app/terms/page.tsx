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
        <h1 className="text-4xl font-bold text-text-primary mb-4">Terms of Service</h1>
        <p className="text-text-secondary mb-8">Last Updated: January 2, 2025</p>

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
              AI. We offer multiple subscription tiers with varying storage limits and features.
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
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Acceptable Use</h2>
            <p>You may not use ProtocolLM to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Upload illegal, harmful, or infringing content</li>
              <li>Violate any laws or regulations</li>
              <li>Interfere with or disrupt our services</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Share your account with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Storage Limits</h2>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Personal Plan: 500GB storage limit</li>
              <li>Business Plan: 5TB storage limit</li>
              <li>Enterprise Plan: Unlimited storage</li>
            </ul>
            <p className="mt-2">
              If you exceed your plan's storage limit, you must upgrade your plan or delete files.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Payment Terms</h2>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>All plans include a 7-day free trial</li>
              <li>Subscriptions auto-renew monthly unless canceled</li>
              <li>No refunds for partial months</li>
              <li>Prices subject to change with 30 days notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Intellectual Property</h2>
            <p>
              You retain all rights to your documents. ProtocolLM does not claim ownership of your content. 
              We only use your content to provide the services you've requested.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Service Availability</h2>
            <p>
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We are not liable for 
              any downtime, data loss, or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms. You may cancel 
              your account at any time. Upon termination, your data will be deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Limitation of Liability</h2>
            <p>
              ProtocolLM is provided "as is" without warranties. We are not liable for any indirect, 
              incidental, or consequential damages arising from use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Changes to Terms</h2>
            <p>
              We may update these terms at any time. We will notify users of significant changes via email. 
              Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Contact</h2>
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
