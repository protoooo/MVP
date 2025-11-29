'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// ==========================================
// CUSTOM STYLES (Background Fix)
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #121212 !important;
      overscroll-behavior-y: none; /* Prevents bounce on pricing page too */
    }
  `}</style>
)

export default function Pricing() {
  const [loading, setLoading] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setIsAuthenticated(true)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', session.user.id)
          .single()
        if (profile?.is_subscribed) {
          setIsSubscribed(true)
        }
      }
    }
    checkAuth()
  }, [supabase])

  const handleCheckout = async (priceId, planName) => {
    setLoading(planName)
    const { data: { session } } = await supabase.auth.getSession()
    
    // Redirect to login with a query param if not authenticated
    if (!session) {
      router.push('/?auth=signup')
      return
    }

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priceId }), 
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('System busy. Please try again.')
    } catch (error) { 
      console.error(error)
      alert('Connection error.') 
    } finally { 
      setLoading(null) 
    }
  }

  // --- ICONS ---
  const CheckIcon = ({ color = "text-emerald-500" }) => (
    <svg className={`w-4 h-4 ${color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
  )
  const XIcon = () => (
    <svg className="w-4 h-4 text-[#333] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
  )

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3ECF8E] selection:text-white flex flex-col overflow-x-hidden">
        
        {/* --- HEADER --- */}
        <header className="fixed top-0 w-full border-b border-[#2C2C2C] bg-[#121212]/90 backdrop-blur-md z-50 h-16 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
            
            <div className="flex items-center gap-6">
               <button onClick={() => router.push('/')} className="text-[#666] hover:text-white transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
               </button>
               
               <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                  <span className="font-bold text-lg text-[#EDEDED] tracking-tight">protocol<span className="text-[#3ECF8E]">LM</span></span>
               </div>
            </div>

            <div className="flex gap-6 text-xs font-bold uppercase tracking-widest items-center">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => router.push('/?auth=login')} className="text-[#888] hover:text-white transition-colors hidden md:block">Sign In</button>
                  <button onClick={() => router.push('/?auth=signup')} className="text-[#151515] bg-[#3ECF8E] hover:bg-[#34b27b] border border-transparent px-4 py-2 rounded-md text-xs font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm">Create Account</button>
                </>
              ) : (
                !isSubscribed && (
                  <div className="text-[#3ECF8E] flex items-center gap-2 text-xs md:text-sm">
                    <div className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full animate-pulse"></div>
                    Select Plan
                  </div>
                )
              )}
            </div>
          </div>
        </header>

        {/* --- CONTENT --- */}
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 pt-24 pb-16 pb-safe">
          <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Choose your protection level.</h1>
              <p className="text-[#888] text-sm">No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 max-w-6xl w-full items-stretch">
            
            {/* STARTER PLAN */}
            <div className="bg-[#1C1C1C] border border-[#333] rounded-lg p-8 flex flex-col hover:border-[#555] transition-colors relative z-0">
              <div className="mb-8">
                <h3 className="text-xs font-bold text-[#888] uppercase tracking-widest mb-2">Starter</h3>
                <div className="flex items-baseline text-white">
                  <span className="text-4xl font-bold tracking-tight font-mono">$49</span>
                  <span className="ml-2 text-[#555] text-[10px] font-bold uppercase">/mo</span>
                </div>
                <p className="text-sm text-[#666] mt-4 leading-relaxed">Essential compliance for single locations.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 border-t border-[#2C2C2C] pt-6">
                <li className="flex items-start gap-3 text-sm font-medium text-[#CCC]"><CheckIcon color="text-[#333]" />500 Text Queries / Mo</li>
                <li className="flex items-start gap-3 text-sm font-medium text-[#444]"><XIcon />No Image Analysis</li>
                <li className="flex items-start gap-3 text-sm font-medium text-[#CCC]"><CheckIcon color="text-[#333]" />County Document Access</li>
                <li className="flex items-start gap-3 text-sm font-medium text-[#444]"><XIcon />No Mock Audits</li>
              </ul>
              <button onClick={() => handleCheckout('price_1SY95aDlSrKA3nbAsgxE0Jon', 'starter')} disabled={loading !== null} className="w-full bg-[#252525] border border-[#333] text-[#CCC] hover:text-white hover:border-white font-bold py-3.5 rounded-md text-xs uppercase tracking-widest transition-all active:scale-95">
                {loading === 'starter' ? 'Processing...' : 'Select Starter'}
              </button>
            </div>

            {/* PRO PLAN (Supabase Green Hero) */}
            <div className="bg-[#1C1C1C] border-2 border-[#3ECF8E] rounded-lg p-8 flex flex-col shadow-[0_0_40px_-10px_rgba(62,207,142,0.3)] relative transform md:-translate-y-4 z-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3ECF8E] text-[#121212] px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm border border-[#6EE7B7]">Most Popular</div>
              <div className="mb-8">
                <h3 className="text-xs font-bold text-[#3ECF8E] uppercase tracking-widest mb-2">Pro</h3>
                <div className="flex items-baseline text-white">
                  <span className="text-5xl font-bold tracking-tight font-mono">$99</span>
                  <span className="ml-2 text-[#555] text-[10px] font-bold uppercase">/mo</span>
                </div>
                <p className="text-sm text-[#888] mt-4 leading-relaxed">Visual compliance for proactive managers.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 border-t border-[#2C2C2C] pt-6">
                <li className="flex items-start gap-3 text-sm font-medium text-white"><CheckIcon color="text-[#3ECF8E]" />Unlimited Text Queries</li>
                <li className="flex items-start gap-3 text-sm font-medium text-white"><CheckIcon color="text-[#3ECF8E]" />100 Image Analyses / Mo</li>
                <li className="flex items-start gap-3 text-sm font-medium text-white"><CheckIcon color="text-[#3ECF8E]" />Full Database Access</li>
                <li className="flex items-start gap-3 text-sm font-medium text-white"><CheckIcon color="text-[#3ECF8E]" />Mock Audit Workflow</li>
              </ul>
              <button onClick={() => handleCheckout('price_1SY96QDlSrKA3nbACxe8QasT', 'pro')} disabled={loading !== null} className="w-full bg-[#3ECF8E] hover:bg-[#34b27b] text-[#151515] font-bold py-3.5 rounded-md text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">
                {loading === 'pro' ? 'Processing...' : 'Select Pro'}
              </button>
            </div>

            {/* ENTERPRISE PLAN (Liquid Silver / Chrome) */}
            <div className="relative p-8 flex flex-col z-0 group rounded-lg bg-[#1C1C1C] overflow-hidden">
              {/* Chrome Border Element */}
              <div className="absolute inset-0 p-[1px] rounded-lg bg-gradient-to-br from-[#ffffff40] via-[#ffffff10] to-[#ffffff40] pointer-events-none"></div>
              
              <div className="mb-8 relative z-10">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-white to-slate-400 shadow-[0_0_8px_white]"></span>
                   Enterprise
                </h3>
                <div className="flex items-baseline text-white">
                  <span className="text-4xl font-bold tracking-tight font-mono">$199</span>
                  <span className="ml-2 text-[#555] text-[10px] font-bold uppercase">/mo</span>
                </div>
                <p className="text-sm text-[#888] mt-4 leading-relaxed">Automation for zero-tolerance operators.</p>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1 border-t border-[#2C2C2C] pt-6 relative z-10">
                <li className="flex items-start gap-3 text-sm font-medium text-[#EDEDED]"><CheckIcon color="text-white" />Unlimited Text Queries</li>
                <li className="flex items-start gap-3 text-sm font-medium text-[#EDEDED]"><CheckIcon color="text-white" />500 Image Analyses / Mo</li>
                <li className="flex items-start gap-3 text-sm font-medium text-[#EDEDED]"><CheckIcon color="text-white" />Mock Audit Workflow</li>
                <li className="flex items-start gap-3 text-sm font-medium text-[#EDEDED]"><CheckIcon color="text-white" />Staff Memo Generator</li>
              </ul>

              {/* Chrome Button */}
              <button 
                 onClick={() => handleCheckout('price_1SY97KDlSrKA3nbAauq4tP8g', 'enterprise')} 
                 disabled={loading !== null} 
                 className="relative z-10 w-full bg-gradient-to-b from-white to-[#ccc] hover:from-[#eee] hover:to-[#bbb] text-black font-bold py-3.5 rounded-md text-xs uppercase tracking-widest transition-all shadow-lg shadow-white/10 active:scale-95 border-t border-white"
              >
                {loading === 'enterprise' ? 'Processing...' : 'Select Enterprise'}
              </button>
            </div>
          </div>

          <div className="mt-16 text-center max-w-md mx-auto opacity-60">
            <p className="text-[10px] text-[#3ECF8E] uppercase tracking-widest font-bold mb-3">Secure Stripe Checkout</p>
            <p className="text-sm text-[#666] font-serif italic">
              &quot;One failed inspection costs more than 5 years of the Enterprise plan.&quot;
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
