'use client'

import { useState } from 'react'

const PRICING_TIERS = [
  { 
    name: 'Free', 
    price: 0, 
    included: 100, 
    tier: 'free', 
    env: null,
    description: 'Perfect for testing and evaluation',
    isFree: true,
    features: ['100 images per month', 'Full API access', 'All compliance features', 'Community support']
  },
  { 
    name: 'Growth', 
    price: 99, 
    included: 3000, 
    tier: 'growth', 
    env: 'NEXT_PUBLIC_STRIPE_LINK_GROWTH',
    description: 'Ideal for single locations or small teams',
    features: ['3,000 images/month', 'Unlimited webhooks', 'Michigan Food Code refs', 'Email support']
  },
  { 
    name: 'Chain', 
    price: 499, 
    included: 20000, 
    tier: 'chain', 
    env: 'NEXT_PUBLIC_STRIPE_LINK_CHAIN',
    description: 'Built for multi-location operations',
    popular: true,
    features: ['20,000 images/month', 'Unlimited webhooks', 'Priority support', 'Custom integrations']
  },
  { 
    name: 'Enterprise', 
    price: 1999, 
    included: 'Unlimited', 
    tier: 'enterprise_sub', 
    env: 'NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB',
    description: 'Custom support and volume usage',
    features: ['Unlimited images', 'Dedicated support', 'SLA guarantees', 'Custom development']
  },
]

export default function ApiLanding() {
  const [selectedExample, setSelectedExample] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [freeKeyEmail, setFreeKeyEmail] = useState('')

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'

  const handleSubscribe = (tier) => {
    if (tier.isFree) {
      // Show email modal for free tier
      setSelectedExample({ type: 'free-signup' })
    } else {
      // Get Stripe link from environment
      const stripeLink = tier.env ? process.env[tier.env] : null
      if (stripeLink) {
        window.location.href = stripeLink
      } else {
        alert(`Please configure ${tier.env} in your environment variables.\n\nIn Stripe:\n1. Create a subscription product for "${tier.name}" at $${tier.price}/month\n2. Add metadata: tier="${tier.tier}", included="${tier.included}"\n3. Create a Payment Link\n4. Add the link to your .env file as ${tier.env}`)
      }
    }
  }

  const handleFreeTierSignup = async (e) => {
    e.preventDefault()
    setGeneratingKey(true)

    try {
      const response = await fetch('/api/generate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: 100,
          customerEmail: freeKeyEmail,
          tier: 'free',
          stripeSessionId: `free_${Date.now()}`
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Redirect to dashboard
        window.location.href = data.dashboardUrl
      } else {
        alert('Failed to generate API key: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setGeneratingKey(false)
    }
  }

  // Code examples
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
console.log('Violations:', data.violations)`

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
print(f"Violations: {data['violations']}")`

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
  
  // Store results in your system
  await db.compliance_logs.insert({
    location_id,
    score: result.score,
    violations: result.violations,
    timestamp: new Date()
  })
  
  res.json({ success: true })
})`

  const integrationExamples = [
    {
      id: 'javascript',
      title: 'JavaScript / Node.js',
      code: jsExample,
      icon: '{ }'
    },
    {
      id: 'python',
      title: 'Python',
      code: pythonExample,
      icon: '🐍'
    },
    {
      id: 'webhook',
      title: 'Webhook Integration',
      code: webhookExample,
      icon: '⚡'
    }
  ]

  return (
    <div className="landing-page">
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

        .landing-page {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .hero {
          min-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 40px 20px;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
          z-index: 0;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 1000px;
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero h1 {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 800;
          color: white;
          margin-bottom: 24px;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .hero p {
          font-size: clamp(1.1rem, 2vw, 1.5rem);
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 40px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .cta-group {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 40px;
        }

        .cta-button {
          padding: 18px 40px;
          font-size: 18px;
          font-weight: 600;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          display: inline-block;
        }

        .cta-button.primary {
          background: white;
          color: #667eea;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .cta-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.3);
        }

        .cta-button.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .cta-button.secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .section {
          background: white;
          border-radius: 24px;
          padding: 60px 50px;
          margin-bottom: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .section.business {
          background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
        }

        .section.developer {
          background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
          color: white;
        }

        .section-tag {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-tag.business {
          background: #667eea;
          color: white;
        }

        .section-tag.developer {
          background: #48bb78;
          color: white;
        }

        .section h2 {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          margin-bottom: 20px;
          line-height: 1.2;
        }

        .section.developer h2 {
          color: white;
        }

        .section h3 {
          font-size: 24px;
          font-weight: 600;
          margin: 32px 0 16px;
          color: #2d3748;
        }

        .section.developer h3 {
          color: #e2e8f0;
        }

        .section p {
          font-size: 18px;
          line-height: 1.8;
          color: #4a5568;
          margin-bottom: 20px;
        }

        .section.developer p {
          color: #cbd5e1;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin: 40px 0;
        }

        .feature-card {
          padding: 30px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border-color: #667eea;
        }

        .feature-icon {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .feature-card h4 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #1a202c;
        }

        .feature-card p {
          font-size: 16px;
          color: #64748b;
          margin: 0;
        }

        .code-preview {
          background: #1a202c;
          color: #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
          position: relative;
          overflow-x: auto;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .code-label {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #667eea;
          color: white;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .code-label:hover {
          background: #5568d3;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          margin-top: 50px;
        }

        .pricing-card {
          background: white;
          border-radius: 20px;
          padding: 40px 30px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 3px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .pricing-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .pricing-card:hover::before {
          opacity: 1;
        }

        .pricing-card.popular {
          border-color: #667eea;
          transform: scale(1.05);
        }

        .pricing-card.popular::before {
          opacity: 1;
        }

        .pricing-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .popular-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #667eea;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .pricing-card h3 {
          font-size: 28px;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 12px;
        }

        .pricing-card .price {
          font-size: 56px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }

        .pricing-card .price span {
          font-size: 24px;
          color: #94a3b8;
        }

        .pricing-card .description {
          font-size: 15px;
          color: #64748b;
          margin-bottom: 30px;
          min-height: 45px;
        }

        .pricing-card ul {
          list-style: none;
          margin-bottom: 30px;
        }

        .pricing-card li {
          padding: 12px 0;
          color: #475569;
          font-size: 16px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
        }

        .pricing-card li:last-child {
          border-bottom: none;
        }

        .pricing-card li::before {
          content: "✓";
          color: #667eea;
          font-weight: 700;
          margin-right: 12px;
          font-size: 18px;
        }

        .subscribe-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }

        .subscribe-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
        }

        .subscribe-button:active {
          transform: translateY(0);
        }

        .integration-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin: 40px 0;
        }

        .integration-card {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .integration-card:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-5px);
        }

        .integration-card .icon {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .integration-card h3 {
          font-size: 22px;
          color: white;
          margin-bottom: 12px;
        }

        .integration-card p {
          font-size: 16px;
          color: #cbd5e1;
          margin-bottom: 20px;
        }

        .view-code-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .view-code-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(5px);
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          background: white;
          border-radius: 24px;
          padding: 40px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .modal-header h3 {
          font-size: 28px;
          font-weight: 700;
          color: #1a202c;
        }

        .close-btn {
          background: #e2e8f0;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
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
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
          position: relative;
          overflow-x: auto;
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
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .copy-button:hover {
          background: #5568d3;
        }

        .free-signup-form {
          margin-top: 20px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2d3748;
        }

        .form-group input {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .api-key-info {
          background: linear-gradient(135deg, #f6f9fc 0%, #e9f2ff 100%);
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
          border-left: 4px solid #667eea;
        }

        .api-key-info h4 {
          font-size: 20px;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 12px;
        }

        .api-key-info p {
          color: #4a5568;
          margin-bottom: 10px;
          line-height: 1.7;
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2rem;
          }

          .section {
            padding: 40px 30px;
          }

          .pricing-card.popular {
            transform: scale(1);
          }

          .cta-group {
            flex-direction: column;
          }

          .cta-button {
            width: 100%;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Food Safety Compliance API</h1>
          <p>
            Turn any photo into instant compliance data. One simple API that checks food safety 
            violations and returns Michigan Food Code references. No complex setup, no user accounts.
          </p>
          <div className="cta-group">
            <a href="#pricing" className="cta-button primary">
              Get Started Free
            </a>
            <a href="#developer" className="cta-button secondary">
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Business Section */}
      <div className="container">
        <section className="section business" id="business">
          <span className="section-tag business">For Business</span>
          <h2>Automated Food Safety Audits</h2>
          <p>
            Stop worrying about health inspections. Our API automatically checks your photos for 
            food safety violations before inspectors arrive. It's like having a health inspector 
            on your team 24/7.
          </p>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h4>Send Photos, Get Results</h4>
              <p>
                Take photos during your normal operations. Our API instantly checks for violations 
                and tells you what needs fixing.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h4>Instant Feedback</h4>
              <p>
                Get compliance scores and specific violation details in seconds. Know exactly 
                what to fix before inspectors arrive.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h4>Michigan Food Code</h4>
              <p>
                Every violation includes the exact Michigan Food Code reference, so you know 
                the regulations you need to follow.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h4>Works With Your Systems</h4>
              <p>
                Connect to your existing POS, management software, or mobile apps through simple 
                HTTP requests. No special setup required.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h4>Simple Pricing</h4>
              <p>
                Pay only for what you use. Start free with 100 images, then scale to thousands 
                as your business grows.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h4>No Installation</h4>
              <p>
                Pure API service. No software to install, no user accounts to manage. Just send 
                photos and receive compliance data.
              </p>
            </div>
          </div>

          <h3>How It Works</h3>
          <p>
            <strong>1. Get Your API Key:</strong> Choose a plan below and receive your API key instantly via email.
          </p>
          <p>
            <strong>2. Send Photos:</strong> Your systems send photos to our API endpoint whenever you need a compliance check.
          </p>
          <p>
            <strong>3. Receive Results:</strong> Get back detailed violation lists, compliance scores, and Michigan Food Code references.
          </p>
          <p>
            <strong>4. Take Action:</strong> Use the results to fix violations, train staff, or generate compliance reports.
          </p>

          <div className="api-key-info">
            <h4>🔑 What's an API Key?</h4>
            <p>
              An API key is like a password that proves you've paid for access to our service. When your 
              system sends photos to us, it includes this key so we know who you are and can track your usage.
            </p>
            <p>
              <strong>It's secure:</strong> Your key is unique to you and cryptographically generated. 
              Anyone with your key can use your credits, so keep it safe in your system's configuration.
            </p>
            <p>
              <strong>No login required:</strong> Unlike traditional software, you don't need usernames or 
              passwords. Just include your API key in each request and you're authenticated.
            </p>
          </div>
        </section>

        {/* Developer Section */}
        <section className="section developer" id="developer">
          <span className="section-tag developer">For Developers</span>
          <h2>Simple REST API Integration</h2>
          <p>
            One endpoint. Send images, get compliance data. That's it. No SDKs required, works with 
            any programming language that can make HTTP requests.
          </p>

          <h3>API Endpoint</h3>
          <div className="code-preview">
            <span className="code-label">POST</span>
            <pre>{`${baseUrl}/api/audit-photos`}</pre>
          </div>

          <h3>Request Format</h3>
          <div className="code-preview">
            <span className="code-label" onClick={() => copyToClipboard(requestExample)}>
              {copiedCode ? 'Copied!' : 'Copy'}
            </span>
            <pre>{requestExample}</pre>
          </div>

          <h3>Response Format</h3>
          <div className="code-preview">
            <span className="code-label" onClick={() => copyToClipboard(responseExample)}>
              {copiedCode ? 'Copied!' : 'Copy'}
            </span>
            <pre>{responseExample}</pre>
          </div>

          <h3>Integration Examples</h3>
          <div className="integration-grid">
            {integrationExamples.map(example => (
              <div 
                key={example.id} 
                className="integration-card"
                onClick={() => setSelectedExample(example)}
              >
                <div className="icon">{example.icon}</div>
                <h3>{example.title}</h3>
                <button className="view-code-btn">View Full Example</button>
              </div>
            ))}
          </div>

          <h3>Authentication</h3>
          <p>
            Include your API key in the request body as shown above. The key is validated on each 
            request, and your usage is tracked automatically.
          </p>

          <h3>Rate Limits</h3>
          <p>
            Standard rate limits apply based on your plan. Free tier: 100 requests/month. 
            Paid plans include higher limits and can be customized for enterprise needs.
          </p>

          <h3>Webhooks</h3>
          <p>
            Our API is designed to work seamlessly with webhook patterns. Your in-house systems can 
            trigger our API when new photos are captured, and we'll return the compliance data immediately.
          </p>
          <div className="code-preview">
            <span className="code-label" onClick={() => copyToClipboard(webhookExample)}>
              {copiedCode ? 'Copied!' : 'Copy'}
            </span>
            <pre>{webhookExample}</pre>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="section" id="pricing">
          <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>Simple, Transparent Pricing</h2>
          <p style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 50px', fontSize: '18px' }}>
            Start free, scale as you grow. All plans include unlimited webhook calls - you only pay for image analysis.
          </p>

          <div className="pricing-grid">
            {PRICING_TIERS.map(tier => (
              <div key={tier.tier} className={`pricing-card ${tier.popular ? 'popular' : ''}`}>
                {tier.popular && <div className="popular-badge">Most Popular</div>}
                <h3>{tier.name}</h3>
                <div className="price">
                  ${tier.price}
                  {!tier.isFree && <span>/month</span>}
                </div>
                <div className="description">{tier.description}</div>
                <ul>
                  {tier.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
                <button 
                  className="subscribe-button"
                  onClick={() => handleSubscribe(tier)}
                >
                  {tier.isFree ? 'Get Free API Key' : `Subscribe to ${tier.name}`}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '50px', padding: '30px', background: 'linear-gradient(135deg, #f6f9fc 0%, #e9f2ff 100%)', borderRadius: '16px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px', color: '#1a202c' }}>Need a Custom Plan?</h3>
            <p style={{ marginBottom: '20px', color: '#4a5568' }}>
              Enterprise customers with high volume needs can get custom pricing and dedicated support.
            </p>
            <a href="/contact" className="cta-button primary">
              Contact Sales
            </a>
          </div>
        </section>
      </div>

      {/* Modal for code examples and free signup */}
      {selectedExample && (
        <div className="modal-overlay" onClick={() => setSelectedExample(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedExample.type === 'free-signup' ? 'Get Your Free API Key' : selectedExample.title}</h3>
              <button className="close-btn" onClick={() => setSelectedExample(null)}>Close</button>
            </div>

            {selectedExample.type === 'free-signup' ? (
              <div className="free-signup-form">
                <p style={{ marginBottom: '24px', color: '#4a5568' }}>
                  Enter your email to receive your free API key instantly. You'll get 100 free images 
                  per month to test and evaluate our service.
                </p>
                <form onSubmit={handleFreeTierSignup}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={freeKeyEmail}
                      onChange={(e) => setFreeKeyEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="subscribe-button"
                    disabled={generatingKey}
                  >
                    {generatingKey ? 'Generating...' : 'Get Free API Key'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="code-block">
                <button 
                  className="copy-button" 
                  onClick={() => copyToClipboard(selectedExample.code)}
                >
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
                <pre>{selectedExample.code}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
