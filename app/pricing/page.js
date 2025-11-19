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
            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-slate-900 font-semibold">protocol LM</span>
          </button>
          {!isAuthenticated && (
            <button 
              onClick={() => router.push('/')}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-4">
            Choose your plan
          </h1>
          <p className="text-xl text-slate-600">
            Start with a 7-day free trial. No credit card required.
          </p>
          {!isAuthenticated && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-700">
                <span className="font-medium">New here?</span> Create an account first, then select your plan to start your free trial.
              </p>
            </div>
          )}
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Pro Plan */}
          <div className="relative bg-white rounded-2xl border-2 border-slate-900 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-bl-lg">
              MOST POPULAR
            </div>

            <div className="p-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Pro</h2>
              <p className="text-slate-600 text-sm mb-6">Perfect for single locations</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-semibold text-slate-900">$49</span>
                <span className="ml-2 text-slate-600">/month</span>
              </div>

              <div className="mb-8 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">Includes 7-day free trial</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-medium">500 queries</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-medium">50 image analyses</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Unlimited document access</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Mobile optimized</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Priority email support</span>
                </li>
              </ul>

              <button 
                onClick={() => handleCheckout('price_1SVG96DlSrKA3nbArP6hvWXr', 'Pro')} 
                disabled={loadingId !== null}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingId === 'price_1SVG96DlSrKA3nbArP6hvWXr' ? 'Processing...' : 'Start free trial'}
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">Then $49/month. Cancel anytime.</p>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden hover:border-slate-400 transition">
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Enterprise</h2>
              <p className="text-slate-600 text-sm mb-6">For restaurant groups with multiple locations</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-semibold text-slate-900">$99</span>
                <span className="ml-2 text-slate-600">/month</span>
              </div>

              <div className="mb-8 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">Includes 7-day free trial</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-medium">5,000 queries</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700"><span className="font-medium">500 image analyses</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Multi-location dashboard</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Team management (5 seats)</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">API access</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-slate-900 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Dedicated account manager</span>
                </li>
              </ul>

              <button 
                onClick={() => handleCheckout('price_1SVG8KDlSrKA3nbAfEQje8j8', 'Enterprise')} 
                disabled={loadingId !== null}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingId === 'price_1SVG8KDlSrKA3nbAfEQje8j8' ? 'Processing...' : 'Start free trial'}
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">Then $99/month. Cancel anytime.</p>
            </div>
          </div>

        </div>
        
        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-semibold text-slate-900 text-center mb-10">Frequently asked questions</h3>
          <div className="space-y-6">
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                <span className="font-medium text-slate-900">How does the 7-day free trial work?</span>
                <span className="text-slate-400 group-open:rotate-180 transition">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-4 text-slate-600">
                You get full access to all features for 7 days. Your card won't be charged until after the trial ends. Cancel anytime during the trial with no charge.
              </div>
            </details>

            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                <span className="font-medium text-slate-900">Can I cancel my subscription?</span>
                <span className="text-slate-400 group-open:rotate-180 transition">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-4 text-slate-600">
                Yes. You can cancel anytime. Your access continues until the end of your billing period.
              </div>
            </details>

            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                <span className="font-medium text-slate-900">What happens when I reach my monthly limits?</span>
                <span className="text-slate-400 group-open:rotate-180 transition">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-4 text-slate-600">
                Your limits reset monthly. Pro includes 500 queries and 50 image analyses per month. Enterprise includes 5,000 queries and 500 image analyses per month. You can track usage in your dashboard.
              </div>
            </details>

            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                <span className="font-medium text-slate-900">Which plan should I choose?</span>
                <span className="text-slate-400 group-open:rotate-180 transition">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="p-4 text-slate-600">
                Pro is perfect for single locations with moderate usage. Enterprise is ideal for restaurant groups with multiple locations needing higher usage limits and team access.
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
