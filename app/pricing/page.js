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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center space-x-2 group">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <div>
              <span className="text-slate-900 font-bold tracking-tight text-lg">
                protocol<span className="font-normal text-slate-500">LM</span>
              </span>
            </div>
          </button>
          {!isAuthenticated && (
            <button 
              onClick={() => router.push('/')}
              className="text-sm text-slate-600 hover:text-slate-900 font-bold transition"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Compliance plans that scale.
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Mitigate risk with instant answers and visual verification. Start your 30-day free trial today.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          
          {/* Pro Plan - Standard */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
            <div className="p-8 flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Pro</h2>
              <p className="text-slate-500 text-sm mb-6">Essential compliance for single locations.</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-bold text-slate-900">$49</span>
                <span className="ml-1 text-slate-500 font-medium">/mo</span>
              </div>

              <div className="w-full h-px bg-slate-100 mb-6"></div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-700 text-sm"><strong>500 queries</strong> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-700 text-sm"><strong>50 image analyses</strong> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-700 text-sm">All County & State Docs</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-700 text-sm">Mobile Optimized</span>
                </li>
              </ul>
            </div>
            
            <div className="p-8 pt-0">
              <button 
                onClick={() => handleCheckout('price_1SVJvcDlSrKA3nbAlLcPCs52', 'Pro')} 
                disabled={loadingId !== null}
                className="w-full bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 font-bold py-3.5 rounded-lg transition-colors duration-200 disabled:opacity-50 text-sm"
              >
                {loadingId === 'price_1SVJvcDlSrKA3nbAlLcPCs52' ? 'Processing...' : 'Start 30-Day Free Trial'}
              </button>
            </div>
          </div>

          {/* Enterprise Plan - Premium */}
          <div className="bg-slate-900 rounded-xl shadow-xl flex flex-col relative overflow-hidden transform md:-translate-y-4">
            {/* Top accent bar */}
            <div className="h-2 w-full bg-orange-600"></div>
            
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-white">Enterprise</h2>
                <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                  Recommended
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-6">For high-volume groups & chains.</p>
              
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-bold text-white">$99</span>
                <span className="ml-1 text-slate-400 font-medium">/mo</span>
              </div>

              <div className="w-full h-px bg-slate-800 mb-6"></div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-orange-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-300 text-sm"><strong>5,000 queries</strong> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-orange-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-300 text-sm"><strong>500 image analyses</strong> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-orange-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-300 text-sm">Priority Support</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-orange-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-300 text-sm">API Access Available</span>
                </li>
              </ul>
            </div>
            
            <div className="p-8 pt-0">
              <button 
                onClick={() => handleCheckout('price_1SVJyRDlSrKA3nbAGhdEZzXA', 'Enterprise')} 
                disabled={loadingId !== null}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 text-sm"
              >
                {loadingId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA' ? 'Processing...' : 'Start 30-Day Free Trial'}
              </button>
            </div>
          </div>
          
        </div>

        {/* FOOTER */}
        <div className="mt-20 pt-8 border-t border-slate-200 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 mb-4 font-medium">
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
