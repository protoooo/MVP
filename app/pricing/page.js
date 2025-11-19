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

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert("Please log in or sign up first to start your 7-day free trial.")
      router.push('/')
      setLoadingId(null)
      return
    }

    // Create Checkout Session
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
        alert('Something went wrong initiating checkout. Please try again.')
        setLoadingId(null)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error starting checkout. Please try again.')
      setLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-20 px-4 flex flex-col items-center">
      
      {/* HEADER SECTION */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-gray-400 text-lg">
          Get full access to food safety intelligence. Cancel anytime.
        </p>
        {!isAuthenticated && (
          <div className="mt-6 p-4 bg-indigo-900/30 border border-indigo-700/50 rounded-lg">
            <p className="text-sm text-indigo-200">
              💡 <strong>New here?</strong> Sign up first, then select your plan to start your free trial.
            </p>
          </div>
        )}
      </div>
      
      {/* PRICING CARDS GRID */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
        
        {/* PRO PLAN */}
        <div className="relative bg-gray-800 rounded-2xl border border-indigo-500/30 shadow-2xl shadow-indigo-900/20 flex flex-col overflow-hidden hover:border-indigo-500 transition-all duration-300 group">
          
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
            MOST POPULAR
          </div>

          <div className="p-8 flex flex-col h-full">
            <h2 className="text-xl font-bold text-indigo-400 mb-2">Pro Plan</h2>
            
            <div className="flex items-baseline mb-1">
              <span className="text-5xl font-extrabold tracking-tight text-white">$29</span>
              <span className="ml-2 text-xl text-gray-400">/month</span>
            </div>
            
            <div className="mt-4 mb-6">
              <span className="inline-block bg-indigo-900/50 text-indigo-200 text-sm font-semibold px-3 py-1 rounded-full border border-indigo-700/50">
                Includes 7-Day Free Trial
              </span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {[
                'Unlimited Document Access',
                'AI Compliance Assistant',
                '1,000 Requests per Month',
                'Washtenaw County Database',
                'Mobile Optimized',
                'Priority Email Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <svg className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleCheckout('price_1SVG96DlSrKA3nbArP6hvWXr', 'Pro')} 
              disabled={loadingId !== null}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingId === 'price_1SVG96DlSrKA3nbArP6hvWXr' ? 'Processing...' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">Then $29/mo. Cancel anytime.</p>
          </div>
        </div>

        {/* ENTERPRISE PLAN */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 flex flex-col overflow-hidden hover:border-gray-500 transition-all duration-300">
          <div className="p-8 flex flex-col h-full">
            <h2 className="text-xl font-bold text-purple-400 mb-2">Enterprise</h2>
            
            <div className="flex items-baseline mb-1">
              <span className="text-5xl font-extrabold tracking-tight text-white">$99</span>
              <span className="ml-2 text-xl text-gray-400">/month</span>
            </div>
            
            <div className="mt-4 mb-6">
              <span className="inline-block bg-purple-900/30 text-purple-200 text-sm font-semibold px-3 py-1 rounded-full border border-purple-700/30">
                Multi-Location Support
              </span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {[
                'Everything in Pro',
                'Multi-Location Dashboard',
                '10,000 Requests per Month',
                'Team Management (5 Seats)',
                'API Access',
                'Dedicated Account Manager',
                'Custom Training Sessions'
              ].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <svg className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleCheckout('price_1SVG8KDlSrKA3nbAfEQje8j8', 'Enterprise')} 
              disabled={loadingId !== null}
              className="w-full bg-gray-700 hover:bg-purple-600 text-white font-bold py-4 rounded-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingId === 'price_1SVG8KDlSrKA3nbAfEQje8j8' ? 'Processing...' : 'Start 7-Day Free Trial'}
            </button>
             <p className="text-center text-xs text-gray-500 mt-3">Then $99/mo. Cancel anytime.</p>
          </div>
        </div>

      </div>
      
      {/* FAQ Section */}
      <div className="mt-16 max-w-2xl">
        <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <details className="bg-gray-800 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">How does the 7-day free trial work?</summary>
            <p className="mt-2 text-sm text-gray-400">
              You get full access to all features for 7 days. Your card won't be charged until after the trial ends. Cancel anytime during the trial with no charge.
            </p>
          </details>
          <details className="bg-gray-800 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">Can I cancel my subscription?</summary>
            <p className="mt-2 text-sm text-gray-400">
              Yes! You can cancel anytime. Your access continues until the end of your billing period.
            </p>
          </details>
          <details className="bg-gray-800 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">What happens when I reach my request limit?</summary>
            <p className="mt-2 text-sm text-gray-400">
              Your request limit resets monthly. Pro plan includes 1,000 requests/month, Enterprise includes 10,000/month. You can track usage in your dashboard.
            </p>
          </details>
          <details className="bg-gray-800 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">Which plan should I choose?</summary>
            <p className="mt-2 text-sm text-gray-400">
              Pro is perfect for single locations. Enterprise is ideal for restaurant groups with multiple locations needing team access and higher usage limits.
            </p>
          </details>
        </div>
      </div>

      <button 
        onClick={() => router.push('/')} 
        className="mt-12 text-gray-500 hover:text-white text-sm transition-colors flex items-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Home
      </button>
    </div>
  )
}
