'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, JetBrains_Mono } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const STRIPE_PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
const STRIPE_PRICE_ID_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL

// ==========================================
// ICONS (Technical/Field Style)
// ==========================================
const Icons = {
  Camera: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Zap: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  ArrowUp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>,
  Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Plus: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  Settings: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></path></svg>,
  SignOut: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

// ==========================================
// STYLES & LAYOUT
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #F3F4F6; /* Light gray technical background */
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Technical Grid Pattern */
    .tech-grid {
      background-size: 40px 40px;
      background-image:
        linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
    }
    
    /* Scanner Line Animation */
    @keyframes scan {
      0% { top: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    .scanner-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #10B981;
      box-shadow: 0 0 10px #10B981;
      animation: scan 2s linear infinite;
    }
    
    .loader {
      width: 18px;
      height: 18px;
      border: 2px solid #e2e8f0;
      border-bottom-color: #000000;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }
    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}</style>
)

const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const supabase = createClient()

  const getRedirectUrl = () => { const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin; return `${baseUrl}/auth/callback` }
  const handleEmailAuth = async (e) => { e.preventDefault(); setLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: getRedirectUrl() } }); if (error) setStatusMessage('Error: ' + error.message); else setStatusMessage('✓ Check your email for the login link.'); setLoading(false) }
  const handleGoogleAuth = async () => { setGoogleLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getRedirectUrl(), queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) { setStatusMessage('Error: ' + error.message); setGoogleLoading(false) } }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-xl w-full max-w-sm p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className={`text-xl font-extrabold text-slate-900 mb-1 ${outfit.className}`}>{message || 'Unlock Full Access'}</h2>
            <p className="text-xs text-slate-500 font-medium">Washtenaw County Compliance Engine</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><Icons.X /></button>
        </div>
        
        <button onClick={handleGoogleAuth} disabled={googleLoading || loading} className="w-full bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-3 mb-4 text-sm transition-all shadow-sm">
          {googleLoading ? <div className="loader" /> : <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" /><path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" /><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" /><path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" /></svg>}
          Continue with Google
        </button>

        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-100" /></div><div className="relative flex justify-center text-[10px] font-bold tracking-widest"><span className="bg-white px-3 text-slate-300">OR EMAIL</span></div></div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@restaurant.com" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-4 py-3 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-all" />
          <button type="submit" disabled={loading || googleLoading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-lg">{loading ? 'Sending Link...' : 'Continue with Email'}</button>
        </form>
        
        <p className="text-[10px] text-slate-400 text-center mt-6 leading-relaxed">
          By continuing, you verify that you are authorized to manage food safety for your establishment and agree to our <Link href="/terms" className="underline hover:text-slate-900">Terms</Link>.
        </p>
      </div>
    </div>
  )
}

const FullScreenPricing = ({ handleCheckout, loading, onSignOut }) => {
  const [billingInterval, setBillingInterval] = useState('month')
  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white border-2 border-white rounded-2xl p-8 shadow-2xl animate-pop-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onSignOut} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors"><Icons.X /></button>
        <div className={`text-xs font-bold text-emerald-600 uppercase tracking-[0.2em] mb-4 text-center ${mono.className}`}>Active License Required</div>
        
        <div className="flex justify-center mb-6">
          <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
            <button onClick={() => setBillingInterval('month')} className={`px-5 py-2 rounded-md text-[11px] font-bold transition-all ${billingInterval === 'month' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Monthly</button>
            <button onClick={() => setBillingInterval('year')} className={`px-5 py-2 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${billingInterval === 'year' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Annual <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-extrabold">-17%</span></button>
          </div>
        </div>
        
        <div className="text-center mb-2">
           <span className={`text-6xl font-extrabold text-slate-900 tracking-tighter ${outfit.className}`}>${billingInterval === 'month' ? '50' : '500'}</span>
           <span className="text-slate-500 text-sm font-bold tracking-wide uppercase">/{billingInterval === 'month' ? 'mo' : 'yr'}</span>
        </div>
        <p className="text-xs text-slate-500 text-center mb-8 font-medium">For Washtenaw County locations.</p>

        <ul className="space-y-4 mb-8 border-t-2 border-slate-100 pt-6">
          <li className="flex items-start gap-3 text-sm font-bold text-slate-700"><Icons.Check color="text-emerald-600" /> Unlimited Compliance Queries</li>
          <li className="flex items-start gap-3 text-sm font-bold text-slate-700"><Icons.Check color="text-emerald-600" /> Visual Inspections (Image Mode)</li>
          <li className="flex items-start gap-3 text-sm font-bold text-slate-700"><Icons.Check color="text-emerald-600" /> Washtenaw Database Access</li>
        </ul>

        <button 
          onClick={() => handleCheckout(billingInterval === 'month' ? STRIPE_PRICE_ID_MONTHLY : STRIPE_PRICE_ID_ANNUAL, 'protocollm')} 
          disabled={loading !== null} 
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-lg text-sm uppercase tracking-[0.15em] transition-all shadow-xl disabled:opacity-50"
        >
          {loading === 'protocollm' ? 'Processing...' : 'Start 7-Day Free Trial'}
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-4">One prevented fine pays for the year.</p>
      </div>
    </div>
  )
}

// ==========================================
// CORE APP
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [activeMode, setActiveMode] = useState('chat')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  
  // ONE-SHOT FREE TRIAL LOGIC
  const [freeUsage, setFreeUsage] = useState({ image: false, chat: false })

  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  // 1. Load Session & Free Usage History
  useEffect(() => {
    // Check local storage for free usage
    const usage = localStorage.getItem('protocol_usage')
    if (usage) setFreeUsage(JSON.parse(usage))

    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      if (s) {
        const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', s.user.id).in('status', ['active', 'trialing']).maybeSingle()
        if (s.user.email === ADMIN_EMAIL || sub) setHasActiveSubscription(true)
      }
      setIsLoading(false)
    }
    init()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session) {
         // Re-check sub logic on auth change
         const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', session.user.id).in('status', ['active', 'trialing']).maybeSingle()
         if (session.user.email === ADMIN_EMAIL || sub) setHasActiveSubscription(true)
         else { setHasActiveSubscription(false); setShowPricingModal(true); }
      } else {
         setHasActiveSubscription(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2. Trigger Mode (Handles "One Free Try")
  const triggerMode = (mode) => {
    setActiveMode(mode)
    
    // IF NO SESSION and ALREADY USED FREE TRY -> Block
    if (!session && freeUsage[mode]) {
      setAuthModalMessage('Free trial used. Sign in to continue.')
      setShowAuthModal(true)
      return
    }

    // Otherwise, allow interaction (Visual inputs)
    if (mode === 'image') fileInputRef.current?.click()
    else inputRef.current?.focus()
  }

  // 3. Handle Send (The Gatekeeper)
  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    // CHECK GATES
    if (!session) {
      if ((selectedImage && freeUsage.image) || (!selectedImage && freeUsage.chat)) {
        setAuthModalMessage('Limit reached. Start free trial to continue.')
        setShowAuthModal(true)
        return
      }
      // If allowed, mark as used
      const newUsage = { ...freeUsage, [selectedImage ? 'image' : 'chat']: true }
      setFreeUsage(newUsage)
      localStorage.setItem('protocol_usage', JSON.stringify(newUsage))
    } else if (!hasActiveSubscription) {
      setShowPricingModal(true)
      return
    }

    let finalInput = input
    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages((p) => [...p, newMsg])
    setInput('')
    const img = selectedImage
    setSelectedImage(null)
    setIsSending(true)
    setMessages((p) => [...p, { role: 'assistant', content: '' }])

    try {
      // If we are logged in, we save history. If not, we just hit the API anonymously.
      const payload = { messages: [...messages, { ...newMsg, content: finalInput }], image: img, mode: activeMode }
      // Pass ID if session exists
      if (session) {
         // Logic to create chat ID if needed... (simplified for brevity)
      }

      const res = await fetch('/api/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      })
      
      const data = await res.json()
      setMessages((p) => { const u = [...p]; u[u.length - 1].content = data.message || 'Error.'; return u })
      
      // If this was a free try, trigger the "Hook" modal after response
      if (!session) {
         setTimeout(() => {
            setAuthModalMessage('Unlock full report history & unlimited use.')
            setShowAuthModal(true)
         }, 5000)
      }

    } catch (err) { 
       setMessages((p) => { const u = [...p]; u[u.length - 1].content = 'Network error.'; return u }) 
    } finally { 
       setIsSending(false) 
    }
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const compressed = await compressImage(file); setSelectedImage(compressed); setActiveMode('image'); } catch (error) { console.error(error) }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; }
  
  const handleCheckout = async (priceId, planName) => { 
    setCheckoutLoading(planName); 
    try { 
      const { data: { session: currentSession } } = await supabase.auth.getSession(); 
      if (!currentSession) throw new Error('Session expired'); 
      const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ priceId }) }); 
      const data = await res.json(); 
      if (data.url) window.location.href = data.url; 
    } catch (e) { alert('Checkout failed'); } finally { setCheckoutLoading(null); } 
  }

  if (isLoading) return <div className="fixed inset-0 bg-[#F3F4F6]" />;

  return (
    <>
      <GlobalStyles />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />
      {showPricingModal && <FullScreenPricing handleCheckout={handleCheckout} loading={checkoutLoading} onSignOut={handleSignOut} />}
      
      <div className="relative min-h-screen w-full overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <div className="fixed inset-0 z-0 bg-[#F3F4F6] tech-grid pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col h-[100dvh]">
          
          {/* HEADER */}
          <header className="flex items-center justify-between px-6 py-4 border-b-2 border-slate-200 bg-white/80 backdrop-blur-sm">
             <div className={`font-extrabold text-xl ${outfit.className} text-slate-900 tracking-tight`}>
                protocol<span className="text-emerald-600">LM</span>
                <span className={`ml-3 text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200 ${mono.className}`}>V2.0</span>
             </div>
             
             <div className="flex gap-3">
                {!session ? (
                  <>
                    <button onClick={() => setShowAuthModal(true)} className="btn-rect bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 shadow-sm">Login / Trial</button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => {setMessages([]); setInput(''); setSelectedImage(null);}} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-md"><Icons.Plus /></button>
                    <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{session.user.email[0].toUpperCase()}</button>
                    {showUserMenu && (<div className="absolute top-16 right-6 w-48 bg-white border-2 border-slate-200 rounded-lg shadow-xl overflow-hidden"><button onClick={() => setShowPricingModal(true)} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-100">Subscription</button><button onClick={handleSignOut} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50">Log Out</button></div>)}
                  </div>
                )}
             </div>
          </header>

          <main className="flex-1 flex flex-col px-4 pb-0 overflow-y-auto">
             {/* 
                IF NO MESSAGES AND NO IMAGE SELECTED -> SHOW DASHBOARD 
                (This acts as the "Home Screen")
             */}
             {messages.length === 0 && !selectedImage ? (
                <div className="w-full max-w-5xl mx-auto pt-12 md:pt-20 pb-24 px-4 relative z-10">
                    
                    {/* HERO */}
                    <div className="text-center mb-16 space-y-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 bg-white border border-emerald-200 rounded-md shadow-sm mb-4`}>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest text-slate-600 ${mono.className}`}>System Online • Washtenaw County</span>
                      </div>
                      
                      <h1 className={`text-4xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-none ${outfit.className}`}>
                        Never fail a<br/>health inspection.
                      </h1>
                      <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
                        Instant photo analysis and code-backed answers. <br className="hidden md:block"/>
                        <span className="text-slate-900 font-bold">Try it once for free. No login required.</span>
                      </p>
                    </div>

                    {/* THE MODULES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {/* MODULE 1 */}
                        <div 
                          onClick={() => triggerMode('image')}
                          className="group bg-white border-2 border-slate-200 rounded-xl p-1 shadow-sm hover:border-emerald-500 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1"
                        >
                           <div className="h-full bg-slate-50/50 rounded-lg p-6 flex flex-col">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform"><Icons.Camera /></div>
                                 <span className={`text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-1 rounded ${mono.className}`}>Visual Mode</span>
                              </div>
                              <h3 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>Scan Kitchen</h3>
                              <p className="text-sm text-slate-500 mb-8 flex-1">Upload a photo. We detect Priority violations instantly.</p>
                              <div className="w-full py-3 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-md text-center group-hover:bg-emerald-700">Start Scan</div>
                           </div>
                        </div>

                        {/* MODULE 2 */}
                        <div 
                          onClick={() => triggerMode('chat')}
                          className="group bg-white border-2 border-slate-200 rounded-xl p-1 shadow-sm hover:border-blue-500 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1"
                        >
                           <div className="h-full bg-slate-50/50 rounded-lg p-6 flex flex-col">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform"><Icons.Zap /></div>
                                 <span className={`text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-800 px-2 py-1 rounded ${mono.className}`}>Consultant</span>
                              </div>
                              <h3 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>Ask a Question</h3>
                              <p className="text-sm text-slate-500 mb-8 flex-1">Get answers grounded in Washtenaw & FDA code.</p>
                              <div className="w-full py-3 bg-white border-2 border-slate-200 text-slate-900 font-bold text-xs uppercase tracking-widest rounded-md text-center group-hover:border-blue-500 group-hover:text-blue-600">Start Chat</div>
                           </div>
                        </div>
                    </div>
                    
                    <div className="mt-16 border-t border-slate-200 pt-8 text-center">
                       <p className={`text-xs text-slate-400 font-bold uppercase tracking-widest mb-4 ${mono.className}`}>Trusted By Modern Kitchens</p>
                       <div className="flex justify-center gap-8 opacity-40 grayscale">
                          {/* Placeholders for logos if you had them */}
                          <div className="h-8 w-24 bg-slate-300 rounded"></div>
                          <div className="h-8 w-24 bg-slate-300 rounded"></div>
                          <div className="h-8 w-24 bg-slate-300 rounded"></div>
                       </div>
                    </div>
                </div>
             ) : (
                /* CHAT INTERFACE */
                <>
                  <div className="flex-1 overflow-y-auto w-full py-6" ref={scrollRef}>
                      <div className="flex flex-col w-full max-w-3xl mx-auto gap-6">
                        {messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-5 rounded-lg text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                              {msg.image && <img src={msg.image} alt="Upload" className="rounded-md mb-3 border border-white/20" />}
                              {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? <div className="loader" /> : <div className="whitespace-pre-wrap">{msg.content}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                </>
             )}
          </main>
          
          {/* INPUT AREA (Always visible if chat active or image selected) */}
          {(messages.length > 0 || selectedImage || (inputRef.current && document.activeElement === inputRef.current)) && (
             <div className="shrink-0 pb-6 w-full max-w-3xl mx-auto px-4 z-20">
                {selectedImage && (<div className="mb-2 mx-1 p-2 bg-white border border-slate-200 rounded-md inline-flex items-center gap-2 shadow-sm"><span className="text-xs text-slate-700 font-bold flex items-center gap-2"><Icons.Camera /> Analyzing...</span><button onClick={() => { setSelectedImage(null); }} className="text-slate-400 hover:text-slate-900"><Icons.X /></button></div>)}
                <div className="relative flex items-end w-full bg-white border-2 border-slate-200 rounded-lg shadow-lg focus-within:border-emerald-500 transition-all p-2">
                  <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" className="hidden" />
                  <div className="relative flex-shrink-0" ref={userMenuRef}>
                      <button type="button" onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100"><Icons.Plus /></button>
                       {showUserMenu && (
                          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 p-1">
                              <button type="button" onClick={() => {setActiveMode('chat'); setShowUserMenu(false); inputRef.current?.focus()}} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-md text-left text-slate-600 hover:bg-slate-50"><Icons.Book /> Chat Mode</button>
                              <button type="button" onClick={() => {setActiveMode('image'); setShowUserMenu(false); fileInputRef.current?.click()}} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-md text-left text-slate-600 hover:bg-slate-50"><Icons.Camera /> Upload Photo</button>
                          </div>
                      )}
                  </div>
                  <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }} placeholder="Describe the issue..." className="flex-1 max-h-[150px] min-h-[40px] py-2 px-3 bg-transparent border-none focus:ring-0 outline-none resize-none text-slate-900 placeholder-slate-400 text-sm font-medium" rows={1} style={{ height: 'auto' }} />
                  <button onClick={handleSend} disabled={(!input.trim() && !selectedImage) || isSending} className="w-10 h-10 rounded-md flex items-center justify-center bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-50">{isSending ? <div className="loader" /> : <Icons.ArrowUp />}</button>
                </div>
             </div>
          )}

        </div>
      </div>
    </>
  )
}
