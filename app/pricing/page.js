'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function Pricing() {
  const [loadingId, setLoadingId] = useState(null)
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

  const handleCheckout = async (priceId, planName) => {
    setLoadingId(priceId)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      alert("Please create an account to start your trial.")
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
        alert('Something went wrong. Please try again.')
        setLoadingId(null)
      }
    } catch (error) {
      console.error(error)
      alert('Error starting checkout.')
      setLoadingId(null)
    }
  }

  // Icons updated to match their specific card themes
  const IconCube = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="w-16 h-16 text-teal-400">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" strokeOpacity="0.5" />
      <path d="M12 22.08V12" strokeOpacity="0.5" />
    </svg>
  )

  const IconStack = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="w-16 h-16 text-slate-400">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      <path d="M12 22V7" strokeOpacity="0.5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header - Light Theme */}
      <header className="border-b border-slate-200 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="group">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              protocol<span className="font-normal text-teal-600">LM</span>
            </span>
          </button>
          {!isAuthenticated && (
            <button 
              onClick={() => router.push('/')}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wide transition"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            Compliance Infrastructure
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
            Mitigate liability and streamline operations with unified regulatory intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* STANDARD CARD - Deep Green */}
          <div className="group bg-[#022c22] rounded-2xl p-8 hover:shadow-2xl hover:shadow-teal-900/20 transition-all duration-500 flex flex-col relative overflow-hidden">
            {/* Subtle texture for green card */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-sm font-bold text-teal-400 uppercase tracking-widest mb-2">Standard</h2>
                  <p className="text-teal-100/70 text-xs">Single location intelligence</p>
                </div>
                <IconCube />
              </div>
              
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-bold text-white tracking-tight">$49</span>
                <span className="ml-2 text-teal-100/60 text-sm font-medium">/month</span>
              </div>

              <div className="flex-1 space-y-5 mb-12">
                {['500 Queries / Month', '50 Image Analyses', 'State & Federal Code Access', 'Standard Support'].map((item, i) => (
                  <div key={i} className="flex items-center text-sm text-teal-50 font-medium">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-3 shadow-[0_0_8px_rgba(45,212,191,0.5)]"></div>
                    {item}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => handleCheckout('price_1SVJvcDlSrKA3nbAlLcPCs52', 'Pro')} 
                disabled={loadingId !== null}
                className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 hover:text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-widest border border-teal-500/30"
              >
                {loadingId === 'price_1SVJvcDlSrKA3nbAlLcPCs52' ? 'Processing...' : 'Start Trial'}
              </button>
            </div>
          </div>

          {/* ENTERPRISE CARD - Chrome / Silver */}
          <div className="group bg-gradient-to-br from-white via-slate-50 to-slate-200 border border-slate-200 rounded-2xl p-8 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-bold px-4 py-1.5 uppercase tracking-wide rounded-bl-xl shadow-sm z-20">Preferred</div>
            
            {/* Chrome reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent opacity-50 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2">Enterprise</h2>
                  <p className="text-slate-500 text-xs">Multi-unit groups & chains</p>
                </div>
                <IconStack />
              </div>
              
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-bold text-slate-900 tracking-tight">$99</span>
                <span className="ml-2 text-slate-500 text-sm font-medium">/month</span>
              </div>

              <div className="flex-1 space-y-5 mb-12">
                {['5,000 Queries / Month', '500 Image Analyses', 'Priority Email Support', 'API Access Available'].map((item, i) => (
                  <div key={i} className="flex items-center text-sm text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 bg-slate-900 rounded-full mr-3"></div>
                    {item}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => handleCheckout('price_1SVJyRDlSrKA3nbAGhdEZzXA', 'Enterprise')} 
                disabled={loadingId !== null}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-slate-900/20"
              >
                {loadingId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA' ? 'Processing...' : 'Start Trial'}
              </button>
            </div>
          </div>
          
        </div>

        <div className="mt-24 pt-8 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">© 2025 protocolLM. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
