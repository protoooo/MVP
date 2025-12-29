'use client'

import { useState } from 'react'

const PRICING_TIERS = [
  { 
    name: 'Growth', 
    price: 100, 
    included: 2000, 
    tier: 'growth', 
    env: 'NEXT_PUBLIC_STRIPE_LINK_GROWTH',
    description: 'Ideal for single locations or small teams'
  },
  { 
    name: 'Chain', 
    price: 500, 
    included: 20000, 
    tier: 'chain', 
    env: 'NEXT_PUBLIC_STRIPE_LINK_CHAIN',
    description: 'Built for multi-location operations'
  },
  { 
    name: 'Enterprise', 
    price: 1999, 
    included: 'Unlimited', 
    tier: 'enterprise_sub', 
    env: 'NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB',
    description: 'Custom support and volume usage'
  },
]

export default function ApiLanding() {
  const [selectedExample, setSelectedExample] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'

  const requestExample = `{
  "images": ["https://example.com/kitchen.jpg"],
  "api_key": "sk_your_api_key_here",
  "location": "kitchen"
}`

  const responseExample = `{
  "violations": [
    "3-501.16 Cold storage <41°F",
    "4-601.11 Equipment surfaces not clean"
  ],
  "score": 87,
  "michigan_code_refs": ["3-501.16", "4-601.11"],
  "analyzed_count": 1,
  "violation_count": 2,
  "credits_used": 1,
  "remaining_credits": 999
}`

  const jsExample = `const response = await fetch('${baseUrl}/api/audit-photos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    images: ['https://example.com/kitchen.jpg'],
    api_key: 'sk_your_api_key_here'
  })
})

const data = await response.json()
console.log('Score:', data.score)
console.log('Violations:', data.violations)
console.log('Michigan Codes:', data.michigan_code_refs)`

  const pythonExample = `import requests

response = requests.post(
    '${baseUrl}/api/audit-photos',
    json={
        'images': ['https://example.com/kitchen.jpg'],
        'api_key': 'sk_your_api_key_here'
    }
)

data = response.json()
print(f"Score: {data['score']}")
print(f"Violations: {data['violations']}")
print(f"Michigan Codes: {data['michigan_code_refs']}")`

  const webhookExample = `// Webhook receiver for in-house systems
app.post('/webhook/photos', async (req, res) => {
  const { photos, location_id } = req.body
  
  // Send to compliance API
  const result = await fetch('${baseUrl}/api/audit-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: photos.map(p => p.url),
      api_key: process.env.FOOD_SAFETY_API_KEY,
      location: location_id
    })
  }).then(r => r.json())
  
  // Store in your database, Excel, or wherever
  await db.compliance_logs.insert({
    location_id,
    score: result.score,
    violations: result.violations,
    michigan_codes: result.michigan_code_refs,
    timestamp: new Date()
  })
  
  res.json({ success: true })
})`

  const integrationExamples = [
    {
      id: 'javascript',
      title: 'JavaScript / Node.js',
      description: 'Use this for web applications, Node.js backends, or serverless functions.',
      code: jsExample,
      icon: '{ }'
    },
    {
      id: 'python',
      title: 'Python',
      description: 'Perfect for data pipelines, automation scripts, or Django/Flask applications.',
      code: pythonExample,
      icon: '🐍'
    },
    {
      id: 'webhook',
      title: 'Webhook Integration',
      description: 'Integrate with existing systems that already capture photos during operations.',
      code: webhookExample,
      icon: '⚡'
    }
  ]

  const closeModal = () => setSelectedExample(null)

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #f8fafc;
          min-height: 100vh;
          color: #1a202c;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .section {
          background: white;
          border-radius: 16px;
          padding: 48px 40px;
          margin-bottom: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section h2 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #1a202c;
        }

        .section h3 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #2d3748;
        }

        .section p {
          font-size: 16px;
          line-height: 1.7;
          color: #4a5568;
          margin-bottom: 16px;
        }

        .section ul {
          list-style: none;
          margin: 16px 0;
        }

        .section li {
          padding: 8px 0;
          color: #4a5568;
          font-size: 16px;
          line-height: 1.6;
        }

        .section li::before {
          content: "• ";
          color: #667eea;
          font-weight: 700;
          margin-right: 8px;
        }

        .endpoint-box {
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .endpoint-box .method {
          color: #667eea;
          font-weight: 700;
          font-size: 18px;
        }

        .endpoint-box .path {
          color: #1a202c;
          font-size: 20px;
          font-weight: 600;
        }

        .code-preview {
          background: #1a202c;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
          position: relative;
          overflow-x: auto;
          cursor: pointer;
          transition: all 0.2s;
        }

        .code-preview:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .code-preview pre {
          margin: 0;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
        }

        .code-label {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #667eea;
          color: white;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .integration-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .integration-card {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          background: white;
          transition: all 0.2s;
          cursor: pointer;
        }

        .integration-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
          transform: translateY(-2px);
        }

        .integration-card .icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .integration-card h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 8px;
        }

        .integration-card p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .view-code-btn {
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .view-code-btn:hover {
          background: #5568d3;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
        }

        .close-btn {
          background: #e2e8f0;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #cbd5e1;
        }

        .code-block {
          background: #1a202c;
          color: #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
          position: relative;
          overflow-x: auto;
        }

        .code-block pre {
          margin: 0;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
        }

        .copy-button {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .copy-button:hover {
          background: #5568d3;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 32px;
        }

        .pricing-card {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 32px 24px;
          background: white;
          transition: all 0.2s;
        }

        .pricing-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        .pricing-card h3 {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 8px;
        }

        .pricing-card .price {
          font-size: 48px;
          font-weight: 800;
          color: #667eea;
          margin-bottom: 8px;
        }

        .pricing-card .price span {
          font-size: 20px;
          color: #64748b;
        }

        .pricing-card .description {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
        }

        .pricing-card ul {
          list-style: none;
          margin-bottom: 24px;
        }

        .pricing-card li {
          padding: 10px 0;
          color: #475569;
          font-size: 15px;
          border-bottom: 1px solid #f1f5f9;
        }

        .pricing-card li:last-child {
          border-bottom: none;
        }

        .pricing-card li::before {
          content: "✓ ";
          color: #667eea;
          font-weight: 700;
          margin-right: 8px;
        }

        .subscribe-button {
          width: 100%;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .subscribe-button:hover {
          background: #5568d3;
          transform: translateY(-1px);
        }

        .workflow-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .workflow-step {
          text-align: center;
          padding: 20px;
        }

        .workflow-step .step-number {
          display: inline-block;
          width: 48px;
          height: 48px;
          background: #667eea;
          color: white;
          border-radius: 50%;
          font-size: 24px;
          font-weight: 700;
          line-height: 48px;
          margin-bottom: 12px;
        }

        .workflow-step h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 8px;
        }

        .workflow-step p {
          font-size: 14px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .section {
            padding: 32px 24px;
          }

          .section h2 {
            font-size: 24px;
          }

          .pricing-card .price {
            font-size: 36px;
          }

          .modal-content {
            padding: 24px;
          }
        }
      `}</style>

      <div className="container">
        {/* Section 1: Single Endpoint Overview */}
        <div className="section">
          <h2>Single API Endpoint</h2>
          <p>
            This API provides one simple POST endpoint that accepts photos for audit analysis and returns
            structured compliance and inspection results. Send your images, receive clear violation data
            with Michigan Food Code references.
          </p>
          <div className="endpoint-box">
            <span className="method">POST</span>{' '}
            <span className="path">/api/audit-photos</span>
          </div>
          <p>
            That's it. One endpoint, clear results. No complex integration, no multiple services to coordinate.
          </p>
        </div>

        {/* Section 2: What We Offer */}
        <div className="section">
          <h2>What This API Does</h2>
          <p>
            This service is built for restaurants, restaurant chains, food service operations, compliance teams,
            and enterprises that need to automate food safety inspections and compliance checks.
          </p>
          
          <h3>Problems We Solve</h3>
          <ul>
            <li>Automated photo audits - turn photos into actionable compliance data</li>
            <li>Pre-inspection checks - catch violations before official inspections</li>
            <li>Internal compliance reviews - maintain standards across locations</li>
            <li>Real-time monitoring - instant feedback on food safety practices</li>
          </ul>

          <h3>What You Can Build</h3>
          <ul>
            <li>Internal compliance dashboards for multi-location monitoring</li>
            <li>Automated inspection workflows that trigger alerts</li>
            <li>Quality control systems integrated with existing operations</li>
            <li>Compliance logging systems for regulatory documentation</li>
          </ul>
        </div>

        {/* Section 3: API Request */}
        <div className="section">
          <h2>API Request</h2>
          <p>
            <strong>For business owners:</strong> You send a photo URL and your API key. That's all.
          </p>
          <p>
            <strong>For developers:</strong> Send a POST request with an array of image URLs and your API key.
            The system downloads and analyzes each image.
          </p>

          <h3>Required Fields</h3>
          <ul>
            <li><strong>images</strong> - Array of photo URLs (up to 200 images per request)</li>
            <li><strong>api_key</strong> - Your unique API key (received after subscription)</li>
            <li><strong>location</strong> (optional) - Label for the area being audited</li>
          </ul>

          <div 
            className="code-preview"
            onClick={() => setSelectedExample({ title: 'Request Example', code: requestExample })}
          >
            <span className="code-label">Click to expand</span>
            <pre>{requestExample}</pre>
          </div>
        </div>

        {/* Section 4: API Response */}
        <div className="section">
          <h2>API Response</h2>
          <p>
            The response is structured JSON data that tells you exactly what violations were found,
            which Michigan Food Code sections apply, and provides a compliance score.
          </p>

          <h3>How to Use the Response</h3>
          <ul>
            <li>Trigger alerts when violations are detected</li>
            <li>Log results to your database or Excel spreadsheets</li>
            <li>Display compliance dashboards for managers</li>
            <li>Automate corrective action workflows</li>
            <li>Generate compliance reports for regulatory agencies</li>
          </ul>

          <p>
            All responses are machine-readable JSON, making it easy to integrate with any system.
          </p>

          <div 
            className="code-preview"
            onClick={() => setSelectedExample({ title: 'Response Example', code: responseExample })}
          >
            <span className="code-label">Click to expand</span>
            <pre>{responseExample}</pre>
          </div>
        </div>

        {/* Section 5: How to Use & Integrate */}
        <div className="section">
          <h2>How to Use This API</h2>
          <p>
            Whether you're a business owner or working with a developer, here's how to get started:
          </p>

          <h3>Two Integration Paths</h3>
          <ul>
            <li><strong>DIY Integration</strong> - Use our code examples to integrate yourself</li>
            <li><strong>Developer Integration</strong> - Hand this documentation to your development team</li>
          </ul>

          <h3>Simple Workflow</h3>
          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <h4>Subscribe</h4>
              <p>Choose a plan and get your API key instantly</p>
            </div>
            <div className="workflow-step">
              <div className="step-number">2</div>
              <h4>Send Photos</h4>
              <p>Submit images via API or webhook</p>
            </div>
            <div className="workflow-step">
              <div className="step-number">3</div>
              <h4>Receive Results</h4>
              <p>Get structured compliance data back</p>
            </div>
            <div className="workflow-step">
              <div className="step-number">4</div>
              <h4>Automate Actions</h4>
              <p>Trigger alerts, logs, or workflows</p>
            </div>
          </div>
        </div>

        {/* Section 6: Integration Examples */}
        <div className="section">
          <h2>Integration Examples</h2>
          <p>
            Choose the integration method that works best for your stack. Click any card to view the full code example.
          </p>

          <div className="integration-grid">
            {integrationExamples.map(example => (
              <div 
                key={example.id} 
                className="integration-card"
                onClick={() => setSelectedExample(example)}
              >
                <div className="icon">{example.icon}</div>
                <h3>{example.title}</h3>
                <p>{example.description}</p>
                <button className="view-code-btn">View Code Example</button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Authentication */}
        <div className="section">
          <h2>API Keys & Authentication</h2>
          <p>
            This API uses a simple, secure authentication system with no user accounts required.
          </p>

          <h3>No User Accounts</h3>
          <p>
            There are no usernames, passwords, or login portals. Access is controlled entirely through API keys.
          </p>

          <h3>How It Works</h3>
          <ul>
            <li>Subscribe to a plan using Stripe payment links</li>
            <li>Receive your API key via email immediately after payment</li>
            <li>Include your API key in the request header or body</li>
            <li>The system validates your key and tracks your usage</li>
          </ul>

          <h3>Security Best Practices</h3>
          <ul>
            <li>Store API keys as environment variables, never in code</li>
            <li>Use HTTPS for all API requests (enforced)</li>
            <li>Rotate keys if compromised</li>
            <li>Monitor usage to detect unauthorized access</li>
          </ul>
        </div>

        {/* Section 8: Pricing */}
        <div className="section">
          <h2>Pricing</h2>
          <p>
            Simple, transparent subscription pricing based on your monthly image analysis needs.
            All plans include unlimited webhook calls - you only pay for image analysis.
          </p>

          <div className="pricing-grid">
            {PRICING_TIERS.map(tier => (
              <div key={tier.tier} className="pricing-card">
                <h3>{tier.name}</h3>
                <div className="price">
                  ${tier.price}<span>/month</span>
                </div>
                <div className="description">{tier.description}</div>
                <ul>
                  <li>
                    {typeof tier.included === 'number' 
                      ? `${tier.included.toLocaleString()} images per month` 
                      : `${tier.included} images (fair use)`}
                  </li>
                  <li>Unlimited webhook calls</li>
                  <li>Michigan Food Code references</li>
                  <li>JSON & PDF reports</li>
                  {tier.tier === 'enterprise_sub' && <li>Priority support</li>}
                  {tier.tier === 'enterprise_sub' && <li>Custom volume pricing</li>}
                </ul>
                <button 
                  className="subscribe-button"
                  onClick={() => alert('Stripe subscription link will be configured here')}
                >
                  Subscribe to {tier.name}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', padding: '20px', background: '#f7fafc', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '12px' }}>About Webhooks & Image Limits</h3>
            <p style={{ marginBottom: '8px' }}>
              <strong>Webhooks are unlimited.</strong> You can send as many webhook notifications as needed
              to deliver results to your systems.
            </p>
            <p style={{ marginBottom: '0' }}>
              <strong>Image limits apply only to analysis.</strong> Each photo analyzed counts as one image.
              Webhook delivery is free and unlimited across all plans.
            </p>
          </div>
        </div>
      </div>

      {/* Modal for code examples */}
      {selectedExample && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedExample.title}</h3>
              <button className="close-btn" onClick={closeModal}>Close</button>
            </div>
            <div className="code-block">
              <button className="copy-button" onClick={() => copyToClipboard(selectedExample.code)}>
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
              <pre>{selectedExample.code}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
