'use client'

import { useState } from 'react'

const PRICING_TIERS = {
  prepaid: [
    { name: 'Starter', images: 1000, price: 39, perImage: 0.039, tier: 'starter', env: 'NEXT_PUBLIC_STRIPE_LINK_STARTER' },
    { name: 'Pro', images: 10000, price: 349, perImage: 0.035, tier: 'pro', env: 'NEXT_PUBLIC_STRIPE_LINK_PRO' },
    { name: 'Enterprise', images: 100000, price: 3000, perImage: 0.03, tier: 'enterprise', env: 'NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE' },
  ],
  subscription: [
    { name: 'Growth', price: 99, included: 3000, extra: 0.03, tier: 'growth', env: 'NEXT_PUBLIC_STRIPE_LINK_GROWTH' },
    { name: 'Chain', price: 499, included: 20000, extra: 0.025, tier: 'chain', env: 'NEXT_PUBLIC_STRIPE_LINK_CHAIN' },
    { name: 'Enterprise', price: 1999, included: 'Unlimited', extra: null, tier: 'enterprise_sub', env: 'NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB' },
  ]
}

export default function ApiLanding() {
  const [selectedTab, setSelectedTab] = useState('prepaid')
  const [copiedCode, setCopiedCode] = useState(false)

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'

  const curlExample = `curl -X POST ${baseUrl}/api/audit-photos \\
  -H "Content-Type: application/json" \\
  -d '{
    "images": ["https://example.com/kitchen.jpg"],
    "api_key": "sk_your_api_key_here"
  }'`

  const jsExample = `const response = await fetch('${baseUrl}/api/audit-photos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
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
print(f"Codes: {data['michigan_code_refs']}")`

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

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: #1a202c;
        }

        .hero {
          text-align: center;
          padding: 60px 20px;
          color: white;
        }

        .hero h1 {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .hero .tagline {
          font-size: 20px;
          opacity: 0.95;
          margin-bottom: 12px;
        }

        .hero .cost {
          font-size: 16px;
          opacity: 0.85;
          background: rgba(255, 255, 255, 0.1);
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .endpoint-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 40px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .endpoint-section h2 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #1a202c;
        }

        .endpoint-box {
          background: #f7fafc;
          border: 2px solid #667eea;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .endpoint-box .method {
          color: #667eea;
          font-weight: 700;
          font-size: 16px;
        }

        .endpoint-box .path {
          color: #1a202c;
          font-size: 18px;
          font-weight: 600;
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

        .pricing-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 40px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .pricing-section h2 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 24px;
          text-align: center;
          color: #1a202c;
        }

        .pricing-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 32px;
        }

        .tab-button {
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        .pricing-card {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
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
          font-size: 36px;
          font-weight: 800;
          color: #667eea;
          margin-bottom: 8px;
        }

        .pricing-card .details {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .pricing-card ul {
          list-style: none;
          margin-bottom: 20px;
        }

        .pricing-card li {
          padding: 8px 0;
          color: #475569;
          font-size: 14px;
        }

        .pricing-card li::before {
          content: "✓ ";
          color: #667eea;
          font-weight: 700;
          margin-right: 8px;
        }

        .buy-button {
          width: 100%;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .buy-button:hover {
          background: #5568d3;
          transform: translateY(-1px);
        }

        .buy-button:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          transform: none;
        }

        .features-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 40px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .features-section h2 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 24px;
          color: #1a202c;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .feature-item {
          padding: 20px;
          background: #f7fafc;
          border-radius: 8px;
        }

        .feature-item h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 8px;
        }

        .feature-item p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: 32px;
          }

          .pricing-tabs {
            flex-direction: column;
          }

          .tab-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="hero">
        <h1>Michigan Food Safety Compliance API</h1>
        <p className="tagline">Webhook/API Integration for Automatic Photo Compliance Checks</p>
        <p className="cost">Every photo taken during normal operations → instant compliance data</p>
      </div>

      <div className="container">
        {/* Single Endpoint */}
        <div className="endpoint-section">
          <h2>Single Endpoint</h2>
          <div className="endpoint-box">
            <span className="method">POST</span>{' '}
            <span className="path">/api/audit-photos</span>
          </div>
          
          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>Request</h3>
          <div className="code-block">
            <button className="copy-button" onClick={() => copyToClipboard(curlExample)}>
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
            <pre>{curlExample}</pre>
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>Response</h3>
          <div className="code-block">
            <pre>{JSON.stringify({
              violations: ["3-501.16 Cold storage <41°F", "4-601.11 Equipment surfaces not clean"],
              score: 87,
              michigan_code_refs: ["3-501.16", "4-601.11"],
              analyzed_count: 1,
              violation_count: 2,
              credits_used: 1,
              remaining_credits: 999
            }, null, 2)}</pre>
          </div>
        </div>

        {/* Pricing */}
        <div className="pricing-section" id="pricing">
          <h2>Perfect Pricing Strategy</h2>
          
          <div className="pricing-tabs">
            <button 
              className={`tab-button ${selectedTab === 'prepaid' ? 'active' : ''}`}
              onClick={() => setSelectedTab('prepaid')}
            >
              Prepaid Packs
            </button>
            <button 
              className={`tab-button ${selectedTab === 'subscription' ? 'active' : ''}`}
              onClick={() => setSelectedTab('subscription')}
            >
              Subscriptions
            </button>
          </div>

          {selectedTab === 'prepaid' && (
            <div className="pricing-grid">
              {PRICING_TIERS.prepaid.map(tier => (
                <div key={tier.tier} className="pricing-card">
                  <h3>{tier.name}</h3>
                  <div className="price">${tier.price}</div>
                  <div className="details">${tier.perImage.toFixed(3)}/image</div>
                  <ul>
                    <li>{tier.images.toLocaleString()} images</li>
                    <li>No commitment</li>
                    <li>API key via email instantly</li>
                    <li>1 year validity</li>
                  </ul>
                  <button 
                    className="buy-button"
                    onClick={() => alert('Stripe payment link will be configured here')}
                  >
                    Buy Now
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'subscription' && (
            <div className="pricing-grid">
              {PRICING_TIERS.subscription.map(tier => (
                <div key={tier.tier} className="pricing-card">
                  <h3>{tier.name}</h3>
                  <div className="price">${tier.price}<span style={{ fontSize: '16px', color: '#64748b' }}>/mo</span></div>
                  <div className="details">
                    {typeof tier.included === 'number' 
                      ? `${tier.included.toLocaleString()} images included` 
                      : tier.included}
                  </div>
                  <ul>
                    {tier.extra && <li>${tier.extra.toFixed(3)}/extra image</li>}
                    <li>Unlimited webhook calls</li>
                    <li>Priority support</li>
                    <li>Cancel anytime</li>
                  </ul>
                  <button 
                    className="buy-button"
                    onClick={() => alert('Stripe subscription link will be configured here')}
                  >
                    Subscribe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Code Examples */}
        <div className="features-section">
          <h2>Integration Examples</h2>
          
          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>JavaScript / Node.js</h3>
          <div className="code-block">
            <button className="copy-button" onClick={() => copyToClipboard(jsExample)}>
              Copy
            </button>
            <pre>{jsExample}</pre>
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>Python</h3>
          <div className="code-block">
            <button className="copy-button" onClick={() => copyToClipboard(pythonExample)}>
              Copy
            </button>
            <pre>{pythonExample}</pre>
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>Webhook Integration</h3>
          <div className="code-block">
            <button className="copy-button" onClick={() => copyToClipboard(webhookExample)}>
              Copy
            </button>
            <pre>{webhookExample}</pre>
          </div>
        </div>

        {/* Features */}
        <div className="features-section">
          <h2>Why This Works</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>🚀 Zero Friction</h3>
              <p>Photos taken during normal workflows (inventory, stocking, store scans) → automatic compliance checks</p>
            </div>
            <div className="feature-item">
              <h3>⚡ Instant Integration</h3>
              <p>Buy credits → Get API key → Webhook integration in minutes</p>
            </div>
            <div className="feature-item">
              <h3>💰 90% Margins</h3>
              <p>Powered by Cohere Vision (AYA-32B) at $0.01/image → Price at $0.03-$0.04</p>
            </div>
            <div className="feature-item">
              <h3>📊 Flexible Output</h3>
              <p>JSON response → Store in your DB, export to Excel, integrate anywhere</p>
            </div>
            <div className="feature-item">
              <h3>🎯 Michigan Focused</h3>
              <p>9 core Food Code violations with specific citations (Cohere Rerank 4.0 + Embed 4.0)</p>
            </div>
            <div className="feature-item">
              <h3>🔐 Secure & Simple</h3>
              <p>API key authentication. No accounts. No login. PCI compliant via Stripe.</p>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="features-section">
          <h2>Perfect For</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>Restaurant Chains</h3>
              <p>Every photo during store checks → instant compliance data</p>
            </div>
            <div className="feature-item">
              <h3>Grocery & Retail</h3>
              <p>Inventory photos → auto-check food safety compliance</p>
            </div>
            <div className="feature-item">
              <h3>Food Safety Systems</h3>
              <p>Add compliance layer to existing photo workflows</p>
            </div>
            <div className="feature-item">
              <h3>Health Departments</h3>
              <p>Inspection photos → instant violation detection</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
