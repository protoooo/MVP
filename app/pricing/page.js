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
      alert("Please sign in first to start your 30-day free trial.")
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
        credentials: 'include',
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

  const prismGradient = {
    background: 'linear-gradient(to right, #d97706, #be123c, #4338ca, #0284c7, #16a34a)'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center space-x-2 group">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <div>
              <span className="text-slate-900 font-bold tracking-tight text-lg">
                protocol<span className="font-normal">LM</span>
              </span>
              <div className="h-0.5 w-full bg-[#4F759B] rounded-full mt-0.5"></div>
            </div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.04em', fontWeight: '800' }}>
            Choose your plan
          </h1>
          <p className="text-lg text-slate-600 font-normal" style={{ letterSpacing: '-0.01em' }}>
            Start with a 30-day free trial. Credit card required.
          </p>
          {!isAuthenticated && (
            <div className="mt-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm max-w-xl mx-auto">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold text-[#4F759B]">New here?</span> Create an account first, then select your plan to start your free trial.
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">
          
          {/* Pro Plan - $49/month */}
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden hover:shadow-lg hover:border-slate-400 transition-all duration-300">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>Pro</h2>
              <p className="text-slate-600 text-sm mb-6" style={{ letterSpacing: '-0.01em' }}>Perfect for single locations</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>$49</span>
                <span className="ml-2 text-slate-600 font-medium">/month</span>
              </div>

              <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-800">Includes 30-day free trial</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-slate-500 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm"><span className="font-semibold">500 queries</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-slate-500 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm"><span className="font-semibold">50 image analyses</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-slate-500 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm">Unlimited document access</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-slate-500 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm">Mobile optimized</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-slate-500 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm">Priority email support</span>
                </li>
              </ul>

              <button 
                onClick={() => handleCheckout('price_1SVJvcDlSrKA3nbAlLcPCs52', 'Pro')} 
                disabled={loadingId !== null}
                className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900 font-semibold py-3.5 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loadingId === 'price_1SVJvcDlSrKA3nbAlLcPCs52' ? 'Processing...' : 'Start free trial'}
              </button>
            </div>
          </div>

          {/* Enterprise Plan - $99/month */}
          <div className="relative rounded-2xl p-[2px] shadow-xl hover:shadow-2xl transition-shadow duration-300" style={prismGradient}>
            
            <div className="absolute top-0 right-0 text-white text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-bl-xl z-10" style={prismGradient}>
              Most Popular
            </div>

            <div className="bg-white rounded-xl h-full p-8 relative">
              
              <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ letterSpacing: '-0.02em' }}>Enterprise</h2>
              <p className="text-slate-600 text-sm mb-6" style={{ letterSpacing: '-0.01em' }}>For restaurant groups & chains</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>$99</span>
                <span className="ml-2 text-slate-600 font-medium">/month</span>
              </div>

              <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-800">Includes 30-day free trial</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-indigo-600 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm"><span className="font-semibold">5,000 queries</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-indigo-600 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm"><span className="font-semibold">500 image analyses</span> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-indigo-600 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm">Dedicated account manager</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-indigo-600 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm">Custom document integration</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-indigo-600 mr-2.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 text-sm">API Access</span>
                </li>
              </ul>

              <button 
                onClick={() => handleCheckout('price_1SVJyRDlSrKA3nbAGhdEZzXA', 'Enterprise')} 
                disabled={loadingId !== null}
                className="group relative w-full rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0" style={prismGradient}></div>
                <div className="relative m-[2px] bg-white text-slate-900 hover:bg-slate-50 font-bold py-3 rounded-[10px] transition-all flex items-center justify-center">
                  {loadingId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA' ? 'Processing...' : 'Start free trial'}
                </div>
              </button>

            </div>
          </div>
          
        </div>

        {/* FOOTER WITH LINKS */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 mb-4">
            <a href="/privacy" className="hover:text-slate-900 transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-900 transition">Terms of Service</a>
            <a href="/contact" className="hover:text-slate-900 transition">Contact</a>
          </div>
          <p className="text-xs text-slate-400">© 2025 protocolLM. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
