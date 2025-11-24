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

  // --- ICONS (Steel Blue Theme) ---
  const IconCircle = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-[#6b85a3]">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" strokeOpacity="0.5" />
    </svg>
  )

  const IconCube = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-[#6b85a3]">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" strokeOpacity="0.5" />
      <path d="M12 22.08V12" strokeOpacity="0.5" />
    </svg>
  )

  const IconStack = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-[#6b85a3]">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      <path d="M12 22V7" strokeOpacity="0.5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-[#f8fafc]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="group">
            <span className="text-lg font-bold tracking-tighter text-slate-900">
              protocol<span style={{ color: '#6b85a3' }}>LM</span>
            </span>
          </button>
          {!isAuthenticated && (
            <button 
              onClick={() => router.push('/')}
              className="text-[10px] font-bold text-slate-500 hover:text-[#6b85a3] uppercase tracking-widest transition"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-block px-2 py-1 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-[#6b85a3] mb-6 rounded-sm shadow-sm">
            Fee Structure
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
            Compliance Infrastructure.
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            Select the capacity tier required for your operational volume. All plans include the Unified Intelligence Engine.
          </p>
        </div>

        {/* 3-COLUMN GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto items-start">
          
          {/* STARTER CARD ($19) */}
          <div className="group bg-white border border-slate-200 rounded-lg p-8 hover:border-[#6b85a3]/50 transition-all duration-300 flex flex-col relative h-full shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xs font-bold text-[#6b85a3] uppercase tracking-widest mb-2">Starter</h2>
                <p className="text-slate-500 text-xs">Single location basic access</p>
              </div>
              <IconCircle />
            </div>
            
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-bold text-slate-900 tracking-tighter">$19</span>
              <span className="ml-2 text-slate-400 text-xs">/month</span>
            </div>

            <div className="flex-1 space-y-4 mb-12">
              {['100 Queries / Month', '10 Image Analyses', 'State & Federal Code Access', 'Email Support'].map((item, i) => (
                <div key={i} className="flex items-center text-xs text-slate-600">
                  <div className="w-1 h-1 bg-slate-300 rounded-full mr-3 group-hover:bg-[#6b85a3] transition-colors"></div>
                  {item}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleCheckout('price_1SWzz2DlSrKA3nbAR2I856jl', 'Starter')} 
              disabled={loadingId !== null}
              className="w-full bg-white hover:bg-[#f1f5f9] text-slate-600 hover:text-[#6b85a3] font-bold py-3.5 rounded-md transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-widest border border-slate-200"
            >
              {loadingId === 'price_1SWzz2DlSrKA3nbAR2I856jl' ? 'Processing...' : 'Start Trial'}
            </button>
          </div>

          {/* STANDARD CARD ($49) */}
          <div className="group bg-white border-2 border-[#6b85a3]/20 rounded-lg p-8 hover:border-[#6b85a3] transition-all duration-300 flex flex-col relative h-full shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xs font-bold text-[#6b85a3] uppercase tracking-widest mb-2">Standard</h2>
                <p className="text-slate-500 text-xs">Enhanced intelligence</p>
              </div>
              <IconCube />
            </div>
            
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-bold text-slate-900 tracking-tighter">$49</span>
              <span className="ml-2 text-slate-400 text-xs">/month</span>
            </div>

            <div className="flex-1 space-y-4 mb-12">
              {['500 Queries / Month', '50 Image Analyses', 'State & Federal Code Access', 'Standard Support'].map((item, i) => (
                <div key={i} className="flex items-center text-xs text-slate-700 font-bold">
                  <div className="w-1 h-1 bg-[#6b85a3] rounded-full mr-3"></div>
                  {item}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleCheckout('price_1SVJvcDlSrKA3nbAlLcPCs52', 'Pro')} 
              disabled={loadingId !== null}
              className="w-full bg-white hover:bg-[#6b85a3] text-[#6b85a3] hover:text-white font-bold py-3.5 rounded-md transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-widest border-2 border-[#6b85a3]"
            >
              {loadingId === 'price_1SVJvcDlSrKA3nbAlLcPCs52' ? 'Processing...' : 'Start Trial'}
            </button>
          </div>

          {/* ENTERPRISE CARD ($99) */}
          <div className="group bg-white border border-slate-300 rounded-lg p-8 shadow-xl shadow-slate-200 transition-all duration-300 flex flex-col relative h-full transform lg:-translate-y-4">
            
            <div className="absolute top-0 right-0 bg-[#6b85a3] text-white text-[9px] font-bold px-3 py-1 uppercase tracking-wide rounded-bl-lg z-20">
              Recommended
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-xs font-bold text-[#6b85a3] uppercase tracking-widest mb-2">Enterprise</h2>
                  <p className="text-slate-600 text-xs font-bold">Multi-unit groups & chains</p>
                </div>
                <IconStack />
              </div>
              
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-bold text-slate-900 tracking-tighter">$99</span>
                <span className="ml-2 text-slate-500 text-xs font-bold">/month</span>
              </div>

              <div className="flex-1 space-y-4 mb-12">
                {['5,000 Queries / Month', '500 Image Analyses', 'Priority Email Support', 'API Access Available'].map((item, i) => (
                  <div key={i} className="flex items-center text-xs text-slate-900 font-extrabold">
                    <div className="w-1.5 h-1.5 bg-[#6b85a3] rounded-full mr-3"></div>
                    {item}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => handleCheckout('price_1SVJyRDlSrKA3nbAGhdEZzXA', 'Enterprise')} 
                disabled={loadingId !== null}
                className="w-full text-white font-bold py-3.5 rounded-md transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-md hover:shadow-lg hover:opacity-90"
                style={{ backgroundColor: '#6b85a3' }}
              >
                {loadingId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA' ? 'Processing...' : 'Start Trial'}
              </button>
            </div>
          </div>
          
        </div>

        <div className="mt-24 pt-8 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">© 2025 protocolLM. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
