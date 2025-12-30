'use client'

import { useState } from 'react'

const PRICING_TIERS = [
  { 
    name: 'Free', 
    price: 0, 
    included: 100, 
    tier: 'free', 
    stripeLink: null,
    description: 'Perfect for testing and evaluation',
    isFree: true,
    features: ['100 images per month', 'Full API access', 'All compliance features', 'Community support']
  },
  { 
    name: 'Growth', 
    price: 99, 
    included: 3000, 
    tier: 'growth', 
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_LINK_GROWTH,
    envName: 'NEXT_PUBLIC_STRIPE_LINK_GROWTH',
    description: 'Ideal for single locations or small teams',
    features: ['3,000 images/month', 'Unlimited webhooks', 'Michigan Food Code refs', 'Email support']
  },
  { 
    name: 'Chain', 
    price: 499, 
    included: 20000, 
    tier: 'chain', 
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_LINK_CHAIN,
    envName: 'NEXT_PUBLIC_STRIPE_LINK_CHAIN',
    description: 'Built for multi-location operations',
    popular: true,
    features: ['20,000 images/month', 'Unlimited webhooks', 'Priority support', 'Custom integrations']
  },
  { 
    name: 'Enterprise', 
    price: 1999, 
    included: 'Unlimited', 
    tier: 'enterprise_sub', 
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB,
    envName: 'NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE_SUB',
    description: 'Custom support and volume usage',
    features: ['Unlimited images', 'Dedicated support', 'SLA guarantees', 'Custom development']
  },
]

export default function ApiLanding() {
  const [selectedExample, setSelectedExample] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [freeKeyEmail, setFreeKeyEmail] = useState('')
  const [error, setError] = useState(null)

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
      setSelectedExample({ type: 'free-signup' })
      setError(null)
    } else {
      if (tier.stripeLink) {
        window.location.href = tier.stripeLink
      } else {
        setError({
          title: 'Stripe Configuration Required',
          message: `Please configure ${tier.envName} in your environment variables.\n\nIn Stripe:\n1. Create a subscription product for "${tier.name}" at $${tier.price}/month\n2. Add metadata: tier="${tier.tier}", included="${tier.included}"\n3. Create a Payment Link\n4. Add the link to your .env file as ${tier.envName}`
        })
        setSelectedExample({ type: 'config-error', tier })
      }
    }
  }

  const handleFreeTierSignup = async (e) => {
    e.preventDefault()
    setGeneratingKey(true)
    setError(null)

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
        window.location.href = data.dashboardUrl
      } else {
        setError({
          title: 'API Key Generation Failed',
          message: data.error || 'Unknown error occurred. Please try again.'
        })
      }
    } catch (error) {
      setError({
        title: 'Network Error',
        message: error.message || 'Failed to connect to the server. Please check your connection and try again.'
      })
    } finally {
      setGeneratingKey(false)
    }
  }

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
  
  // Store results in your system
  await db.compliance_logs.insert({
    location_id,
    score: result.score,
    violations: result.violations,
    timestamp: new Date()
  })
  
  res.json({ success: true })
})`

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700">
      {/* Hero Section */}
      <section className="landing-page-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            Food Safety Compliance API
          </h1>
          <p className="landing-hero-subtitle">
            Turn any photo into instant compliance data. One simple API that checks food safety 
            violations and returns Michigan Food Code references. No complex setup, no user accounts.
          </p>
          <div className="landing-cta-group">
            <a href="#pricing" className="landing-cta-btn primary">
              Get Started Free
            </a>
            <a href="#developer" className="landing-cta-btn secondary">
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Business Section */}
        <section className="landing-section business mb-12" id="business">
          <span className="landing-section-tag business">For Business</span>
          <h2 className="text-4xl font-bold mb-6 text-gray-900">Automated Food Safety Audits</h2>
          <p className="text-lg text-gray-700 mb-8">
            Stop worrying about health inspections. Our API automatically checks your photos for 
            food safety violations before inspectors arrive. It's like having a health inspector 
            on your team 24/7.
          </p>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              { icon: '📸', title: 'Send Photos, Get Results', desc: 'Take photos during your normal operations. Our API instantly checks for violations and tells you what needs fixing.' },
              { icon: '⚡', title: 'Instant Feedback', desc: 'Get compliance scores and specific violation details in seconds. Know exactly what to fix before inspectors arrive.' },
              { icon: '📋', title: 'Michigan Food Code', desc: 'Every violation includes the exact Michigan Food Code reference, so you know the regulations you need to follow.' },
              { icon: '🔗', title: 'Works With Your Systems', desc: 'Connect to your existing POS, management software, or mobile apps through simple HTTP requests. No special setup required.' },
              { icon: '💰', title: 'Simple Pricing', desc: 'Pay only for what you use. Start free with 100 images, then scale to thousands as your business grows.' },
              { icon: '🚀', title: 'No Installation', desc: 'Pure API service. No software to install, no user accounts to manage. Just send photos and receive compliance data.' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h4>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* API Key Explainer */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-600 p-6 rounded-lg">
            <h4 className="text-xl font-semibold mb-3 text-gray-900">🔑 What's an API Key?</h4>
            <p className="text-gray-700 mb-3">
              An API key is like a password that proves you've paid for access to our service. When your 
              system sends photos to us, it includes this key so we know who you are and can track your usage.
            </p>
            <p className="text-gray-700 mb-3">
              <strong>It's secure:</strong> Your key is unique to you and cryptographically generated. 
              Anyone with your key can use your credits, so keep it safe in your system's configuration.
            </p>
            <p className="text-gray-700">
              <strong>No login required:</strong> Unlike traditional software, you don't need usernames or 
              passwords. Just include your API key in each request and you're authenticated.
            </p>
          </div>
        </section>

        {/* Developer Section */}
        <section className="landing-section developer mb-12" id="developer">
          <span className="landing-section-tag developer">For Developers</span>
          <h2 className="text-4xl font-bold mb-6">Simple REST API Integration</h2>
          <p className="text-lg mb-8 text-gray-300">
            One endpoint. Send images, get compliance data. That's it. No SDKs required, works with 
            any programming language that can make HTTP requests.
          </p>

          <h3 className="text-2xl font-semibold mb-4 text-gray-200">API Endpoint</h3>
          <div className="bg-gray-900 rounded-lg p-4 mb-8 font-mono text-sm">
            <span className="text-green-400">POST</span> <span className="text-gray-300">{baseUrl}/api/audit-photos</span>
          </div>

          <h3 className="text-2xl font-semibold mb-4 text-gray-200">Request Example</h3>
          <div className="bg-gray-900 rounded-lg p-6 mb-8 relative">
            <button 
              onClick={() => copyToClipboard(requestExample)}
              className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded"
            >
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
            <pre className="text-sm text-gray-300 overflow-x-auto">{requestExample}</pre>
          </div>

          <h3 className="text-2xl font-semibold mb-4 text-gray-200">Response Example</h3>
          <div className="bg-gray-900 rounded-lg p-6 mb-8 relative">
            <button 
              onClick={() => copyToClipboard(responseExample)}
              className="absolute top-4 right-4 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded"
            >
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
            <pre className="text-sm text-gray-300 overflow-x-auto">{responseExample}</pre>
          </div>

          {/* Integration Examples */}
          <h3 className="text-2xl font-semibold mb-6 text-gray-200">Integration Examples</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { id: 'js', title: 'JavaScript / Node.js', icon: '{ }', code: jsExample },
              { id: 'py', title: 'Python', icon: '🐍', code: pythonExample },
              { id: 'webhook', title: 'Webhook Integration', icon: '⚡', code: webhookExample },
            ].map((example) => (
              <div 
                key={example.id}
                onClick={() => setSelectedExample(example)}
                className="bg-gray-800 bg-opacity-50 border-2 border-gray-700 rounded-lg p-6 cursor-pointer hover:bg-opacity-70 hover:border-gray-600 transition-all"
              >
                <div className="text-3xl mb-3">{example.icon}</div>
                <h4 className="text-xl font-semibold mb-4 text-white">{example.title}</h4>
                <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                  View Code Example
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="landing-section mb-12" id="pricing">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Simple, Transparent Pricing</h2>
          <p className="text-center text-lg text-gray-700 mb-12 max-w-2xl mx-auto">
            Start free, scale as you grow. All plans include unlimited webhook calls - you only pay for image analysis.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div 
                key={tier.tier}
                className={`landing-pricing-card ${tier.popular ? 'popular' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2 text-gray-900">{tier.name}</h3>
                <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ${tier.price}
                  {!tier.isFree && <span className="text-xl text-gray-500">/mo</span>}
                </div>
                <p className="text-sm text-gray-600 mb-6 min-h-[3rem]">{tier.description}</p>
                <ul className="mb-6 space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-gray-700 text-sm border-b border-gray-100 pb-3">
                      <span className="text-indigo-600 mr-2 font-bold">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(tier)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  {tier.isFree ? 'Get Free API Key' : `Subscribe to ${tier.name}`}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal for code examples and free signup */}
      {selectedExample && (
        <div 
          className="landing-modal-overlay"
          onClick={() => setSelectedExample(null)}
        >
          <div 
            className="landing-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedExample.type === 'free-signup' ? 'Get Your Free API Key' : selectedExample.title}
              </h3>
              <button 
                onClick={() => setSelectedExample(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700"
              >
                Close
              </button>
            </div>

            {selectedExample.type === 'free-signup' ? (
              <div>
                <p className="text-gray-700 mb-6">
                  Enter your email to receive your free API key instantly. You'll get 100 free images 
                  per month to test and evaluate our service.
                </p>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <h4 className="text-red-800 font-semibold mb-1">{error.title}</h4>
                    <p className="text-red-700 text-sm whitespace-pre-line">{error.message}</p>
                  </div>
                )}
                <form onSubmit={handleFreeTierSignup}>
                  <div className="mb-6">
                    <label className="block mb-2 font-semibold text-gray-900">Email Address</label>
                    <input
                      type="email"
                      value={freeKeyEmail}
                      onChange={(e) => setFreeKeyEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={generatingKey}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50"
                  >
                    {generatingKey ? 'Generating...' : 'Get Free API Key'}
                  </button>
                </form>
              </div>
            ) : selectedExample.type === 'config-error' ? (
              <div className="p-6 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <h4 className="text-yellow-800 font-semibold mb-3">{error.title}</h4>
                <p className="text-yellow-700 whitespace-pre-line">{error.message}</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-6 relative">
                <button 
                  onClick={() => copyToClipboard(selectedExample.code)}
                  className="absolute top-4 right-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded"
                >
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
                <pre className="text-sm text-gray-300 overflow-x-auto">{selectedExample.code}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
