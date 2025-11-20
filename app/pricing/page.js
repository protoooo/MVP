'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Pricing() {
  const [loadingId, setLoadingId] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
  }, [supabase])

  const handleCheckout = async (priceId, planName) => {
    setLoadingId(priceId)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert("Please sign in first to start your 7-day free trial.")
      router.push('/')
      setLoadingId(null)
      return
    }

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        alert('Something went wrong. Please try again.')
        setLoadingId(null)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error starting checkout. Please try again.')
      setLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center space-x-2 group">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-slate-900 font-bold tracking-tight text-lg">
              protocol<span className="font-normal">LM</span>
            </span>
          </button>
          {!isAuthenticated && (
            <button 
              onClick={() => router.push('/')}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium transition"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6" style={{ letterSpacing: '-0.04em', fontWeight: '800' }}>
            Choose your plan
          </h1>
          <p className="text-xl text-slate-600 font-normal" style={{ letterSpacing: '-0.01em' }}>
            Start with a 7-day free trial. Credit card required.
          </p>
          {!isAuthenticated && (
            <div className="mt-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold">New here?</span> Create an account first, then select your plan to start your free trial.
              </p>
            </div>
          )}
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Pro Plan */}
          <div className="relative bg-white rounded-2xl border-2 border-slate-900 shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-xs font-bold tracking-wide px-5 py-2 rounded-bl-xl">
              MOST POPULAR
            </div>

            <div className="p-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.02em' }}>Pro</h2>
              <p className="text-slate-600 text-base mb-8" style={{ letterSpacing: '-0.01em' }}>Perfect for single locations</p>
              
              <div className="flex items-baseline mb-8">
                <span className="text-6xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>$49</span>
                <span className="ml-3 text-slate-600 font-medium">/month</span>
              </div>

              <div className="mb-10 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Includes 7-day free trial</p>
              </div>

              <ul className="space-y-5 mb-10">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-semibold">500 queries</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-semibold">50 image analyses</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Unlimited document access</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Mobile optimized</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Priority email support</span>
                </li>
              </ul>

              <button 
                onClick={() => handleCheckout('price_1SVJvcDlSrKA3nbAlLcPCs52', 'Pro')} 
                disabled={loadingId !== null}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingId === 'price_1SVJvcDlSrKA3nbAlLcPCs52' ? 'Processing...' : 'Start free trial'}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4 font-medium">Then $49/month. Cancel anytime.</p>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden hover:border-slate-400 transition-all duration-200 hover:shadow-xl">
            <div className="p-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.02em' }}>Enterprise</h2>
              <p className="text-slate-600 text-base mb-8" style={{ letterSpacing: '-0.01em' }}>For restaurant groups with multiple locations</p>
              
              <div className="flex items-baseline mb-8">
                <span className="text-6xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>$99</span>
                <span className="ml-3 text-slate-600 font-medium">/month</span>
              </div>

              <div className="mb-10 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Includes 7-day free trial</p>
              </div>

              <ul className="space-y-5 mb-10">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-semibold">5,000 queries</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-semibold">500 image analyses</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Multi-location dashboard</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Team management (5 seats)</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">API access</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Dedicated account manager</span>
                </li>
              </ul>

              <button 
                onClick={() => handleCheckout('price_1SVJyRDlSrKA3nbAGhdEZzXA', 'Enterprise')} 
                disabled={loadingId !== null}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA' ? 'Processing...' : 'Start free trial'}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4 font-medium">Then $99/month. Cancel anytime.</p>
            </div>
          </div>

        </div>
        
        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-slate-900 text-center mb-12" style={{ letterSpacing: '-0.03em' }}>Frequently asked questions</h3>
          <div className="space-y-4">
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-900 text-base">How does the 7-day free trial work?</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-5 text-slate-600 leading-relaxed">
                You get full access to all features for 7 days. You'll need to provide a credit card, but you won't be charged until after the trial ends. Cancel anytime during the trial with no charge.
              </div>
            </details>

            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-900 text-base">Can I cancel my subscription?</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-5 text-slate-600 leading-relaxed">
                Yes. You can cancel anytime. Your access continues until the end of your billing period.
              </div>
            </details>

            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-900 text-base">What happens when I reach my monthly limits?</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-5 text-slate-600 leading-relaxed">
                Your limits reset monthly. Pro includes 500 queries and 50 image analyses per month. Enterprise includes 5,000 queries and 500 image analyses. If you need more, upgrade to Enterprise or contact us for a custom plan.
              </div>
            </details>

            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-900 text-base">Which regulations are included?</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-5 text-slate-600 leading-relaxed">
                You'll have access to FDA Food Code 2022, Michigan Modified Food Code, county-specific enforcement guidelines, cooling procedures, cross-contamination guides, and 10+ other essential compliance documents.
              </div>
            </details>

            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-900 text-base">Do you offer refunds?</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-5 text-slate-600 leading-relaxed">
                We offer a 7-day free trial so you can try before you commit. If you're not satisfied after your trial, simply cancel before being charged. Once charged, we don't offer refunds, but you can cancel at any time to prevent future charges.
              </div>
            </details>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-20 text-center">
          <p className="text-slate-600 mb-4 text-base">Still have questions?</p>
          <a 
            href="mailto:support@protocollm.com" 
            className="text-slate-900 hover:text-slate-700 font-semibold text-base underline decoration-2 underline-offset-4"
          >
            Contact our support team
          </a>
        </div>
      </div>
    </div>
  )
}
