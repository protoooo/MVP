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

  // Wireframe Icons
  const IconCube = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="w-16 h-16 text-teal-200/50">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" strokeOpacity="0.5" />
      <path d="M12 22.08V12" strokeOpacity="0.5" />
    </svg>
  )

  const IconStack = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" className="w-16 h-16 text-teal-200/50">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      <path d="M12 22V7" strokeOpacity="0.5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#022c22] font-sans text-white">
      {/* Header */}
      <header className="border-b border-teal-900 sticky top-0 z-50 bg-[#022c22]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="group">
            <span className="text-xl font-bold tracking-tight text-white">
              protocol<span className="font-normal text-teal-500">LM</span>
            </span>
          </button>
          {!isAuthenticated && (
            <button 
              onClick={() => router.push('/')}
              className="text-xs font-bold text-teal-400 hover:text-white uppercase tracking-wide transition"
            >
              Log in
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Compliance Infrastructure
          </h1>
          <p className="text-teal-200/60 max-w-xl mx-auto leading-relaxed">
            Mitigate liability and streamline operations with unified regulatory intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Pro Plan - Light Glass */}
          <div className="group bg-white/[0.02] border border-teal-500/20 rounded-xl p-8 hover:bg-white/[0.04] transition-all duration-500 flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Standard</h2>
                <p className="text-teal-400/60 text-xs">Single location intelligence</p>
              </div>
              <IconCube />
            </div>
            
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-bold text-white">$49</span>
              <span className="ml-1 text-teal-400/60 text-sm">/month</span>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {['500 Queries / Month', '50 Image Analyses', 'State & Federal Code Access', 'Standard Support'].map((item, i) => (
                <div key={i} className="flex items-center text-sm text-teal-100/80">
                  <div className="w-1 h-1 bg-teal-500 rounded-full mr-3"></div>
                  {item}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleCheckout('price_1SVJvcDlSrKA3nbAlLcPCs52', 'Pro')} 
              disabled={loadingId !== null}
              className="w-full bg-transparent hover:bg-teal-900 text-white font-bold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-widest border border-teal-500/30 hover:border-teal-500/50"
            >
              {loadingId === 'price_1SVJvcDlSrKA3nbAlLcPCs52' ? 'Processing...' : 'Start Trial'}
            </button>
          </div>

          {/* Enterprise Plan - Premium Glass */}
          <div className="group bg-teal-900/20 border border-teal-500/40 rounded-xl p-8 hover:bg-teal-900/30 transition-all duration-500 flex flex-col relative overflow-hidden shadow-2xl shadow-teal-900/20">
            <div className="absolute top-0 right-0 bg-teal-500 text-[#022c22] text-[10px] font-bold px-3 py-1 uppercase tracking-wide">Preferred</div>
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Enterprise</h2>
                <p className="text-teal-400/60 text-xs">Multi-unit groups & chains</p>
              </div>
              <IconStack />
            </div>
            
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-bold text-white">$99</span>
              <span className="ml-1 text-teal-400/60 text-sm">/month</span>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {['5,000 Queries / Month', '500 Image Analyses', 'Priority Email Support', 'API Access Available'].map((item, i) => (
                <div key={i} className="flex items-center text-sm text-white">
                  <div className="w-1 h-1 bg-teal-400 rounded-full mr-3"></div>
                  {item}
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleCheckout('price_1SVJyRDlSrKA3nbAGhdEZzXA', 'Enterprise')} 
              disabled={loadingId !== null}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-teal-900/50"
            >
              {loadingId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA' ? 'Processing...' : 'Start Trial'}
            </button>
          </div>
          
        </div>

        <div className="mt-20 pt-8 border-t border-teal-900/50 text-center">
          <p className="text-[10px] text-teal-500/50 uppercase tracking-widest">© 2025 protocolLM. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
