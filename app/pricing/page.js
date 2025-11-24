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

  const IconCube = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-[#022c22]">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" strokeOpacity="0.5" />
      <path d="M12 22.08V12" strokeOpacity="0.5" />
    </svg>
  )

  const IconStack = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-slate-800 drop-shadow-sm">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      <path d="M12 22V7" strokeOpacity="0.5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#022c22] selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 sticky top-0 z-50 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="group">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              protocol<span className="font-normal text-[#022c22]">LM</span>
            </span>
          </button>
          {!isAuthenticated && (
            <button 
              onClick={() => router.push('/')}
              className="text-xs font-bold text-slate-500 hover:text-[#022c22] uppercase tracking-wide transition"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Compliance Infrastructure
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed font-medium">
            Mitigate liability and streamline operations with unified regulatory intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          
          {/* STANDARD CARD - White Fill, Brand Green Border */}
          <div className="group bg-white border-2 border-[#022c22] rounded-xl p-8 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-300 flex flex-col relative">
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-sm font-bold text-[#022c22] uppercase tracking-widest mb-2">Standard</h2>
                <p className="text-slate-500 text-xs font-medium">Single location intelligence</p>
              </div>
              <IconCube />
            </div>
            
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-bold text-[#022c22] tracking-tighter">$49</span>
              <span className="ml-2 text-slate-500 text-sm font-medium">/month</span>
            </div>

            <div className="flex-1 space-y-5 mb-12">
              {['500 Queries / Month', '50 Image Analyses', 'State & Federal Code Access', 'Standard Support'].map((item, i) => (
                <div key={i} className="flex items-center text-sm text-slate-700 font-bold">
                  <div className="w-1.5 h-1.5 bg-[#022c22] rounded-full mr-3"></div>
                  {item}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleCheckout('price_1SVJvcDlSrKA3nbAlLcPCs52', 'Pro')} 
              disabled={loadingId !== null}
              className="w-full bg-[#022c22] hover:bg-teal-900 text-white font-bold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-teal-900/20"
            >
              {loadingId === 'price_1SVJvcDlSrKA3nbAlLcPCs52' ? 'Processing...' : 'Start Trial'}
            </button>
          </div>

          {/* ENTERPRISE CARD - Bold Chrome/Silver Gradient */}
          <div className="group bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 border border-slate-300 rounded-xl p-8 shadow-2xl shadow-slate-300 transition-all duration-300 flex flex-col relative overflow-hidden transform md:-translate-y-2">
            
            {/* Chrome Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-100 pointer-events-none"></div>
            <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shine_3s_infinite] pointer-events-none"></div>

            <div className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold px-4 py-1.5 uppercase tracking-wide rounded-bl-lg z-20 shadow-md">Preferred</div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2 drop-shadow-sm">Enterprise</h2>
                  <p className="text-slate-600 text-xs font-bold">Multi-unit groups & chains</p>
                </div>
                <IconStack />
              </div>
              
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-bold text-slate-900 tracking-tighter drop-shadow-sm">$99</span>
                <span className="ml-2 text-slate-700 text-sm font-bold">/month</span>
              </div>

              <div className="flex-1 space-y-5 mb-12">
                {['5,000 Queries / Month', '500 Image Analyses', 'Priority Email Support', 'API Access Available'].map((item, i) => (
                  <div key={i} className="flex items-center text-sm text-slate-900 font-extrabold">
                    <div className="w-2 h-2 bg-slate-900 rounded-full mr-3 shadow-sm border border-slate-400"></div>
                    {item}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => handleCheckout('price_1SVJyRDlSrKA3nbAGhdEZzXA', 'Enterprise')} 
                disabled={loadingId !== null}
                className="w-full bg-gradient-to-b from-slate-800 to-black hover:from-slate-700 hover:to-slate-900 text-white font-bold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-widest shadow-xl shadow-slate-900/30 border-t border-slate-600"
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
