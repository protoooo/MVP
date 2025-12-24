'use client'

import InfoPageLayout from '@/components/InfoPageLayout'

export default function PrivacyPolicy() {
  return (
    <InfoPageLayout
      title="Privacy Policy"
      subtitle="protocolLM protects operator data with encryption, limited retention, and clear controls. Review how we collect, use, and safeguard your information."
      eyebrow="Data Stewardship"
    >
      <div className="info-section">
        <h2 className="info-section-title">Introduction</h2>
        <p>
          protocolLM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
          how we collect, use, and safeguard your information when you use our compliance software.
        </p>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">1. Information We Collect</h2>
        
        <div className="info-highlight">
          <div className="info-highlight-title">Account & Usage</div>
          <ul style={{ marginBottom: 0 }}>
            <li>Email address (for authentication and account management).</li>
            <li>Encrypted credentials or tokens associated with your sign-in method.</li>
            <li>Text queries and automated responses (stored to improve reliability, provide history, and investigate abuse).</li>
            <li>Uploaded facility images and metadata needed for violation analysis.</li>
          </ul>
        </div>

        <div className="info-highlight" style={{ marginTop: '16px' }}>
          <div className="info-highlight-title">Payment Data</div>
          <p style={{ marginBottom: 0 }}>
            Payments are processed securely by Stripe. We do not store full credit card numbers on our systems.
          </p>
        </div>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">2. LLM Processing & Third-Party Services</h2>
        <p>
          protocolLM uses large language model services provided by <strong>Cohere</strong> (Cohere) for text analysis 
          and response generation, and <strong>Cohere</strong> for document search and embedding. When you use our Service:
        </p>
        <ul>
          <li>
            <strong>Cohere API:</strong> Processes your text queries and facility images to generate 
            compliance-related responses. Data is transmitted using industry-standard encryption (TLS 1.2+).
          </li>
          <li>
            <strong>Cohere API:</strong> Creates embeddings from your queries to search our Washtenaw County food code
            database. Enables fast, relevant document retrieval.
          </li>
          <li>Processing occurs on secure servers operated by these providers in accordance with their respective privacy policies.</li>
          <li>
            <strong>No public training:</strong> Your individual business data and images are NOT used to train public LLM 
            models. Data may be retained temporarily to operate the platform, comply with law, or prevent misuse, as 
            specified in each provider's data retention policy.
          </li>
          <li>
            <strong>Vendor Policies:</strong> For details on how Cohere handles data, see{' '}
            <a href="https://cohere.com/privacy" target="_blank" rel="noopener noreferrer">
              Cohere Privacy Policy
            </a>.
          </li>
        </ul>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">3. Data Retention & Your Rights</h2>
        <ul>
          <li>
            <strong>Active accounts:</strong> We retain relevant data while your account remains active to provide the Service.
          </li>
          <li>
            <strong>Cancelled accounts:</strong> After cancellation, we generally retain data for up to 90 days to allow 
            reactivation and to maintain audit logs, after which it is scheduled for deletion or anonymization.
          </li>
          <li>
            <strong>Deletion requests:</strong> You may request deletion of your account data at any time by contacting 
            support. Certain records may be kept where required by law or legitimate business needs (for example, billing records).
          </li>
          <li>
            <strong>Access & Portability:</strong> You can request a copy of your data or ask us to transfer it to another 
            service where technically feasible.
          </li>
        </ul>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">4. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>TLS 1.2+ encryption for all data in transit.</li>
          <li>Encrypted storage for sensitive data at rest.</li>
          <li>Regular security audits and monitoring.</li>
          <li>Strict access controls and authentication requirements.</li>
          <li>CAPTCHA protection against automated abuse.</li>
        </ul>
        <p>
          However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but 
          continuously work to protect your data.
        </p>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">5. Cookies & Tracking</h2>
        <p>We use essential cookies for:</p>
        <ul>
          <li>Authentication and session management.</li>
          <li>Security features (CSRF protection, rate limiting).</li>
          <li>Remembering your preferences.</li>
        </ul>
        <p>
          We do NOT use third-party advertising or tracking cookies. You can manage cookie preferences in your browser settings.
        </p>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">Contact Us</h2>
        <p>
          For questions about this Privacy Policy or your data, contact:<br />
          <a href="mailto:support@protocollm.org">support@protocollm.org</a>
        </p>
        <p style={{ marginTop: '12px' }}>
          For data deletion requests, please include your account email and specify what data you'd like removed.
        </p>
      </div>
    </InfoPageLayout>
  )
}
