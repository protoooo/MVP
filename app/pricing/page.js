'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function Pricing() {
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
  }, [supabase])

  const handleCheckout = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/?auth=signup')
      return
    }

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priceId: 'price_1SVJyRDlSrKA3nbAGhdEZzXA' }), 
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('System busy. Please try again.')
      }
    } catch (error) {
      console.error(error)
      alert('Connection error.')
    } finally {
      setLoading(false)
    }
  }

  const FeatureItem = ({ text }) => (
    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
      <div className="w-1.5 h-1.5 bg-[#6b85a3] rounded-full shrink-0"></div>
      {text}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      <header className="border-b border-slate-200 bg-[#f8fafc]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="group">
            <span className="text-xl font-bold tracking-tighter text-slate-900">
              protocol<span style={{ color: '#6b85a3' }}>LM</span>
            </span>
          </button>
          <div className="flex gap-4">
            {!isAuthenticated ? (
              <>
                <button 
                  onClick={() => router.push('/?auth=login')}
                  className="text-[10px] font-bold text-slate-500 hover:text-[#6b85a3] uppercase tracking-widest transition"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => router.push('/?auth=signup')}
                  className="text-[10px] font-bold text-[#6b85a3] border border-[#6b85a3] px-4 py-2 rounded-lg hover:bg-[#6b85a3] hover:text-white uppercase tracking-widest transition"
                >
                  Create Account
                </button>
              </>
            ) : (
              <button 
                onClick={() => router.push('/documents')}
                className="text-[10px] font-bold text-slate-500 hover:text-[#6b85a3] uppercase tracking-widest transition"
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center w-full px-6 py-16">
        
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              Washtenaw / Wayne / Oakland Counties
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Regulatory intelligence for food service operations in Michigan.
            </p>
          </div>

          <div className="bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden relative">
            
            <div className="bg-[#6b85a3] text-white text-center py-3 text-[10px] font-bold uppercase tracking-widest border-b border-slate-300">
              Pro Access
            </div>

            <div className="p-8 md:p-10">
              <div className="flex justify-center items-baseline mb-10 text-slate-900">
                <span className="text-6xl font-bold tracking-tighter">$99</span>
                <span className="ml-2 text-slate-400 text-xs font-bold uppercase">/month</span>
              </div>

              <div className="space-y-5 mb-10 pl-4 border-l-2 border-slate-100">
                <FeatureItem text="Unlimited Regulatory Queries" />
                <FeatureItem text="500 Image Analyses / Month" />
                <FeatureItem text="Mock Audit Workflow" />
                <FeatureItem text="Corrective Action Generator" />
                <FeatureItem text="Email Support" />
              </div>

              <button 
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-[#6b85a3] hover:bg-[#5a728a] text-white font-bold py-4 rounded-md text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Start 30-Day Free Trial'}
              </button>
              
              <p className="text-center text-[10px] text-slate-400 mt-6 font-medium">
                Cancel anytime. No long-term contract required.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500 italic">
              One failed inspection costs more than 6 months of protocolLM.
            </p>
          </div>
        </div>

      </div>

      <div className="py-8 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">© 2025 protocolLM. All rights reserved.</p>
      </div>
    </div>
  )
}
