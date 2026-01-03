'use client';

import Link from 'next/link';

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-text-primary mb-4">Privacy Policy</h1>
        <p className="text-text-secondary mb-8">Last Updated: January 2, 2025</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Information We Collect</h2>
            <p>ProtocolLM collects information that you provide directly to us when you:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Create an account (email, password, business name)</li>
              <li>Upload documents and files</li>
              <li>Use our search features</li>
              <li>Contact our support team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and store your documents securely</li>
              <li>Enable semantic search and powerful features</li>
              <li>Communicate with you about your account and our services</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Document Processing</h2>
            <p>
              We use Cohere to process your documents for search and retrieval purposes. Your documents are 
              processed to generate embeddings and metadata but are never used to train models. All processing 
              is done securely with no data retention by Cohere.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Data Storage</h2>
            <p>
              Your documents are stored securely using Supabase's enterprise infrastructure with AES-256 encryption 
              at rest and TLS 1.3 encryption in transit. We maintain automatic backups and point-in-time recovery 
              for up to 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Data Sharing</h2>
            <p>We do not sell your data. We only share your information with:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Service providers (Supabase for storage, Cohere for processing)</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your documents</li>
              <li>Object to processing of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Security</h2>
            <p>
              We implement industry-standard security measures including encryption, secure authentication, 
              Cloudflare protection, and regular security audits. See our <Link href="/security" className="text-brand hover:underline">Security page</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Contact Us</h2>
            <p>
              For privacy questions or to exercise your rights, contact us at:
              <br />Email: <a href="mailto:support@protocollm.org" className="text-brand hover:underline">support@protocollm.org</a>
              <br />Phone: <a href="tel:7342164836" className="text-brand hover:underline">(734) 216-4836</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
