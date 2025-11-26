'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function Pricing() {
  const [loading, setLoading] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false) // NEW STATE
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setIsAuthenticated(true)
        
        // CHECK SUBSCRIPTION STATUS
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
    
    if (!session) {
      // Pass the plan they wanted so we can redirect them back later if needed
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
    } catch (error) { console.error(error); alert('Connection error.') } 
    finally { setLoading(null) }
  }

  const CheckIcon = ({ color = "text-slate-600" }) => (
    <svg className={`w-4 h-4 ${color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
  )
  const XIcon = () => (
    <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
  )

  return (
    <div className="min-h-screen bg-[#F0F9FF] font-mono text-slate-900 selection:bg-[#0077B6] selection:text-white flex flex-col">
      
      <header className="fixed top-0 w-full border-b border-[#90E0EF] bg-[#F0F9FF]/95 backdrop-blur-sm z-50 h-20 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* BACK BUTTON & LOGO */}
          <div className="flex items-center gap-6">
             <button onClick={() => router.push('/')} className="text-slate-400 hover:text-[#0077B6] transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             </button>
             <span className="text-3xl font-bold tracking-tighter text-[#023E8A] cursor-pointer" onClick={() => router.push('/')}>
               protocol<span style={{ color: '#0077B6' }}>LM</span>
             </span>
          </div>

          <div className="flex gap-6 text-sm font-bold uppercase tracking-widest">
            {!isAuthenticated ? (
              <>
                <button onClick={() => router.push('/?auth=login')} className="text-slate-500 hover:text-[#0077B6] transition-colors">Sign In</button>
                <button onClick={() => router.push('/?auth=signup')} className="text-[#0077B6] border border-[#0077B6] px-4 py-2 rounded-lg hover:bg-[#0077B6] hover:text-white transition-all active:scale-95">Create Account</button>
              </>
            ) : (
              // FIX: Only show Dashboard button if they are SUBSCRIBED
              isSubscribed ? (
                <button onClick={() => router.push('/documents')} className="text-slate-500 hover:text-[#0077B6] transition-colors">Dashboard</button>
              ) : (
                <div className="text-[#023E8A] flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#0077B6] rounded-full animate-pulse"></div>
                  Select a Plan
                </div>
              )
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 pt-24 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full items-stretch">
          {/* STARTER */}
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col hover:border-slate-400 transition-colors shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Starter</h3>
              <div className="flex items-baseline text-slate-900">
                <span className="text-5xl font-bold tracking-tighter">$29</span>
                <span className="ml-2 text-slate-400 text-[10px] font-bold uppercase">/mo</span>
              </div>
              <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed">Essential compliance for single locations.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 border-t border-slate-100 pt-6">
              <li className="flex items-start gap-3 text-xs font-bold text-slate-600"><CheckIcon />100 Text Queries / Mo</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-400"><XIcon />No Image Analysis</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-600"><CheckIcon />County Document Access</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-400"><XIcon />No Mock Audits</li>
            </ul>
            <button onClick={() => handleCheckout('price_1SXXMWDlSrKA3nbAQowl0jTE', 'starter')} disabled={loading !== null} className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 font-bold py-4 rounded-lg text-[10px] uppercase tracking-widest transition-all active:scale-95">
              {loading === 'starter' ? 'Processing...' : 'Select Starter'}
            </button>
          </div>

          {/* PRO */}
          <div className="bg-white border-2 border-[#0077B6] rounded-xl p-8 flex flex-col shadow-xl relative transform md:-translate-y-4 z-10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0077B6] text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm">Most Popular</div>
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#0077B6] uppercase tracking-widest mb-2">Pro</h3>
              <div className="flex items-baseline text-slate-900">
                <span className="text-5xl font-bold tracking-tighter">$49</span>
                <span className="ml-2 text-slate-400 text-[10px] font-bold uppercase">/mo</span>
              </div>
              <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed">Visual compliance for proactive managers.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 border-t border-slate-100 pt-6">
              <li className="flex items-start gap-3 text-xs font-bold text-slate-700"><CheckIcon color="text-[#0077B6]" />Unlimited Text Queries</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-700"><CheckIcon color="text-[#0077B6]" />50 Image Analyses / Mo</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-700"><CheckIcon color="text-[#0077B6]" />Full Database Access</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-400"><XIcon />No Mock Audits</li>
            </ul>
            <button onClick={() => handleCheckout('price_1SXXNcDlSrKA3nbAVqQKY8Jr', 'pro')} disabled={loading !== null} className="w-full bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold py-4 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95">
              {loading === 'pro' ? 'Processing...' : 'Select Pro'}
            </button>
          </div>

          {/* ENTERPRISE */}
          <div className="bg-white border border-[#023E8A] rounded-xl p-8 flex flex-col shadow-md">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#023E8A] uppercase tracking-widest mb-2">Enterprise</h3>
              <div className="flex items-baseline text-slate-900">
                <span className="text-5xl font-bold tracking-tighter">$99</span>
                <span className="ml-2 text-slate-400 text-[10px] font-bold uppercase">/mo</span>
              </div>
              <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed">Automation for zero-tolerance operators.</p>
            </div>
            <ul className="space-y-4 mb-8 flex-1 border-t border-slate-100 pt-6">
              <li className="flex items-start gap-3 text-xs font-bold text-slate-900"><CheckIcon color="text-[#023E8A]" />Unlimited Text Queries</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-900"><CheckIcon color="text-[#023E8A]" />500 Image Analyses / Mo</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-900"><CheckIcon color="text-[#023E8A]" />Mock Audit Workflow</li>
              <li className="flex items-start gap-3 text-xs font-bold text-slate-900"><CheckIcon color="text-[#023E8A]" />Staff Memo Generator</li>
            </ul>
            <button onClick={() => handleCheckout('price_1SXXOvDlSrKA3nbArPSohz15', 'enterprise')} disabled={loading !== null} className="w-full bg-[#023E8A] hover:bg-black text-white font-bold py-4 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95">
              {loading === 'enterprise' ? 'Processing...' : 'Select Enterprise'}
            </button>
          </div>
        </div>

        <div className="mt-10 text-center max-w-md mx-auto opacity-80">
          <p className="text-[10px] text-[#0077B6] uppercase tracking-widest font-bold mb-2">Cancel anytime via dashboard</p>
          <p className="text-xs text-slate-900 font-medium italic">
            "One failed inspection costs more than 5 years of the Enterprise plan."
          </p>
        </div>
      </div>
    </div>
  )
}
