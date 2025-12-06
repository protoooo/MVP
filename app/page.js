'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit } from 'next/font/google'

// Using Outfit but styling it to look more technical/clean
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const STRIPE_PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
const STRIPE_PRICE_ID_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL

const DOC_MAPPING = {
  "3compsink.pdf": "Sanitizing Protocols",
  "Violation Types.pdf": "Violation Classifications",
  "Enforcement Action.pdf": "Enforcement Guidelines",
  "FDA_FOOD_CODE_2022.pdf": "FDA Food Code (2022)",
  "MI_MODIFIED.pdf": "Michigan Modified Law",
  "Cooking_Temps.pdf": "Critical Temperatures",
  "Cooling Foods.pdf": "Cooling Procedures",
  "Cross contamination.pdf": "Cross-Contamination",
  "food_labeling.pdf": "Labeling Standards",
  "Norovirus.pdf": "Biohazard Cleanup",
  "Allergy Info.pdf": "Allergen Control",
  "Emergency_Plan.pdf": "Emergency Plans",
  "Date_Marking.pdf": "Date Marking Rules"
}
const TICKER_ITEMS = Object.values(DOC_MAPPING)

// ==========================================
// 1. TECHNICAL BACKGROUND (Dot Grid)
// ==========================================
const TechnicalBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none bg-[#F8F9FA]">
    {/* Subtle Dot Pattern for Engineering/Blueprint feel */}
    <div className="absolute inset-0" style={{ 
      backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', 
      backgroundSize: '24px 24px',
      opacity: 0.4 
    }}></div>
    {/* Fade out at bottom */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#F8F9FA]"></div>
  </div>
)

// ==========================================
// 2. REFINED ICONOGRAPHY (1.5px Stroke)
// ==========================================
const Icons = {
  Camera: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  ),
  Book: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  ),
  ArrowRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  Check: ({ color = 'text-slate-600' }) => <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Shield: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  Database: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
  Plus: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  User: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Settings: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  MessageSquare: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
}

// ==========================================
// STYLES & LAYOUT
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #F8F9FA;
      color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    /* Clean, rectangular buttons */
    .btn-rect {
      border-radius: 6px; 
      transition: all 0.2s ease;
    }
    .btn-rect:active { transform: translateY(1px); }
    
    /* Vertical Ticker Animation */
    @keyframes slideUpFade {
      0% { transform: translateY(100%); opacity: 0; }
      10% { transform: translateY(0); opacity: 1; }
      90% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-100%); opacity: 0; }
    }
    .animate-ticker-item {
      animation: slideUpFade 4s ease-in-out forwards;
    }

    .loader { height: 16px; aspect-ratio: 2.5; --_g: no-repeat radial-gradient(farthest-side,#000 90%,#0000); background:var(--_g), var(--_g), var(--_g), var(--_g); background-size: 20% 50%; animation: l43 1s infinite linear; }
    @keyframes l43 { 0% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } 16.67% {background-position: calc(0*100%/3) 0 ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } 33.33% {background-position: calc(0*100%/3) 100%,calc(1*100%/3) 0 ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } 50% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 100%,calc(2*100%/3) 0 ,calc(3*100%/3) 50% } 66.67% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 100%,calc(3*100%/3) 0 } 83.33% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 100%} 100% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } }
  `}</style>
)

// ==========================================
// 3. COVERAGE BAR (Formerly Ticker)
// ==========================================
const CoverageBar = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => { setIndex((prev) => (prev + 1) % TICKER_ITEMS.length); }, 4000); 
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="w-full border-y border-slate-200 bg-white/50 backdrop-blur-sm py-2 mb-12">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-3 text-xs font-medium text-slate-500">
        <span className="hidden sm:inline uppercase tracking-widest font-bold text-slate-400">Database Coverage:</span>
        <div className="h-5 overflow-hidden relative min-w-[200px]">
          <div key={index} className="flex items-center gap-2 animate-ticker-item absolute top-0 left-0 w-full">
            <Icons.Database />
            <span className="font-semibold text-slate-700">{TICKER_ITEMS[index]}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const LandingPage = ({ onAction }) => {
  return (
    <div className="w-full">
      {/* HERO SECTION */}
      <div className="max-w-5xl mx-auto pt-16 md:pt-24 pb-12 px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Left: Copy */}
          <div className="text-left space-y-6">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
               Washtenaw County • Food Service
             </div>
             <h1 className={`text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-[1.1] ${outfit.className}`}>
               See violations before<br/> your inspector does.
             </h1>
             <p className="text-lg text-slate-600 font-normal leading-relaxed max-w-md">
               Instant photo analysis and code-backed answers. Built specifically for Washtenaw County health regulations.
             </p>
             <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => onAction('image')}
                  className="btn-rect bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-sm font-bold shadow-sm flex items-center gap-2"
                >
                  Start Inspection <Icons.ArrowRight />
                </button>
             </div>
             <p className="text-xs text-slate-400 font-medium">No credit card required for trial.</p>
          </div>

          {/* Right: The Tools (Mockup Style) */}
          <div className="relative">
             {/* Visual Inspection Module (Hero) */}
             <div className="bg-white rounded-lg border-l-4 border-l-emerald-500 border-y border-r border-slate-200 shadow-sm p-6 mb-4 hover:shadow-md transition-shadow cursor-default">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-md text-emerald-700"><Icons.Camera /></div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Visual Inspection</h3>
                        <p className="text-xs text-emerald-700 font-bold uppercase tracking-wide">Recommended</p>
                      </div>
                   </div>
                </div>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Take a photo of your kitchen. Our vision model highlights Priority (P) violations instantly based on local code.
                </p>
                <div className="bg-slate-50 rounded border border-slate-100 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                    <Icons.Check color="text-emerald-600" /> <span>Detects 90+ violation types</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Icons.Check color="text-emerald-600" /> <span>Instant audit report generation</span>
                  </div>
                </div>
             </div>

             {/* Regulatory Chat Module */}
             <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 ml-8 opacity-90 hover:opacity-100 transition-opacity cursor-default">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-md text-blue-700"><Icons.Book /></div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">Regulatory Chat</h3>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Reference Tool</p>
                      </div>
                   </div>
                </div>
                <p className="text-slate-600 text-sm">
                  Ask questions about enforcement. We cite Washtenaw & Michigan codes directly.
                </p>
             </div>
          </div>

        </div>
      </div>

      <CoverageBar />

    </div>
  )
}

// ==========================================
// AUTH MODAL & PRICING (Clean Versions)
// ==========================================

const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [googleLoading, setGoogleLoading] = useState(false); const [statusMessage, setStatusMessage] = useState(''); const supabase = createClient();
  const getRedirectUrl = () => { const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin; return `${baseUrl}/auth/callback` }; const handleEmailAuth = async (e) => { e.preventDefault(); setLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: getRedirectUrl() } }); if (error) setStatusMessage('Error: ' + error.message); else setStatusMessage('✓ Check your email for the login link.'); setLoading(false) }; const handleGoogleAuth = async () => { setGoogleLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getRedirectUrl(), queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) { setStatusMessage('Error: ' + error.message); setGoogleLoading(false) } }
  if (!isOpen) return null; 
  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900">Sign in to protocolLM</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><Icons.X /></button>
        </div>
        <button onClick={handleGoogleAuth} disabled={googleLoading || loading} className="w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-medium py-2.5 px-4 rounded-md flex items-center justify-center gap-3 mb-4 text-sm transition-all">
          {googleLoading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" /> : "Continue with Google"}
        </button>
        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400 uppercase tracking-wider">or email</span></div></div>
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@restaurant.com" required className="w-full bg-white border border-slate-300 rounded-md px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all" />
          <button type="submit" disabled={loading || googleLoading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-md text-sm transition-all">{loading ? 'Sending...' : 'Continue with Email'}</button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-4">By continuing, you agree to our Terms & Privacy Policy.</p>
        {statusMessage && <div className="mt-4 p-3 rounded-md text-xs bg-slate-50 border border-slate-200 text-slate-600">{statusMessage}</div>}
      </div>
    </div>
  )
}

const FullScreenPricing = ({ handleCheckout, loading, onSignOut }) => {
  const [billingInterval, setBillingInterval] = useState('month')
  return (
    <div className="fixed inset-0 z-[1000] bg-white/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-lg p-8 shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onSignOut} className="absolute top-4 right-4 text-slate-400 hover:text-black"><Icons.X /></button>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Subscription</h3>
        <div className="flex justify-center mb-6">
          <div className="bg-slate-100 p-1 rounded-md flex border border-slate-200">
            <button onClick={() => setBillingInterval('month')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${billingInterval === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Monthly</button>
            <button onClick={() => setBillingInterval('year')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${billingInterval === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Yearly <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">-17%</span></button>
          </div>
        </div>
        <div className="text-center mb-6">
           <span className="text-5xl font-bold text-slate-900 tracking-tight">${billingInterval === 'month' ? '50' : '500'}</span>
           <span className="text-slate-500 text-sm font-medium">/{billingInterval === 'month' ? 'mo' : 'yr'}</span>
        </div>
        <ul className="space-y-3 mb-8 border-t border-slate-100 pt-6">
          <li className="flex gap-3 text-sm text-slate-700"><Icons.Check color="text-emerald-600" /> Unlimited Queries</li>
          <li className="flex gap-3 text-sm text-slate-700"><Icons.Check color="text-emerald-600" /> Visual Inspection Mode</li>
          <li className="flex gap-3 text-sm text-slate-700"><Icons.Check color="text-emerald-600" /> Washtenaw County Database</li>
        </ul>
        <button onClick={() => handleCheckout(billingInterval === 'month' ? STRIPE_PRICE_ID_MONTHLY : STRIPE_PRICE_ID_ANNUAL, 'protocollm')} disabled={loading !== null} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-md text-sm uppercase tracking-wide shadow-sm disabled:opacity-50">{loading === 'protocollm' ? 'Processing...' : 'Start 7-Day Free Trial'}</button>
      </div>
    </div>
  )
}

const InputBox = ({ input, setInput, handleSend, handleImage, isSending, fileInputRef, selectedImage, setSelectedImage, inputRef, activeMode, setActiveMode, session }) => {
  const [showMenu, setShowMenu] = useState(false); const menuRef = useRef(null); const handleModeClick = (mode) => { setActiveMode(mode); setShowMenu(false); if (mode === 'image' && session) fileInputRef.current?.click() }; useEffect(() => { function handleClickOutside(event) { if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false) } document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside) }, [])
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 z-20 relative">
      {selectedImage && (<div className="mb-2 mx-1 p-2 bg-white border border-slate-200 rounded-md inline-flex items-center gap-2 shadow-sm"><span className="text-xs text-slate-700 font-bold flex items-center gap-2"><Icons.Camera /> Analyzing Image...</span><button onClick={() => { setSelectedImage(null); setActiveMode('chat') }} className="text-slate-400 hover:text-slate-900"><Icons.X /></button></div>)}
      <form onSubmit={handleSend} className="relative flex items-end w-full p-1.5 bg-white border border-slate-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-400 transition-all">
        <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" className="hidden" />
        <div className="relative flex-shrink-0" ref={menuRef}>
            <button type="button" onClick={() => setShowMenu(!showMenu)} className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${showMenu ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><Icons.Plus /></button>
            {showMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 p-1">
                    <button type="button" onClick={() => handleModeClick('chat')} className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-md text-left ${activeMode === 'chat' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Icons.Book /> Regulatory Chat</button>
                    <button type="button" onClick={() => handleModeClick('image')} className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-md text-left ${activeMode === 'image' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}><Icons.Camera /> Visual Inspection</button>
                </div>
            )}
        </div>
        <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }} placeholder={activeMode === 'chat' ? 'Ask a regulatory question...' : activeMode === 'image' ? 'Upload a photo for analysis...' : '...'} className="flex-1 max-h-[150px] min-h-[24px] py-2 px-3 bg-transparent border-none focus:ring-0 outline-none resize-none text-slate-900 placeholder-slate-400 text-sm font-medium" rows={1} style={{ height: 'auto' }} />
        <button type="submit" disabled={(!input.trim() && !selectedImage) || isSending} className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${(!input.trim() && !selectedImage) ? 'bg-slate-50 text-slate-300' : `bg-slate-900 text-white hover:bg-slate-800 shadow-sm`}`}>{isSending ? <div className="loader" /> : <Icons.ArrowUp />}</button>
      </form>
    </div>
  )
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(true); const [session, setSession] = useState(null); const [profile, setProfile] = useState(null); const [sidebarOpen, setSidebarOpen] = useState(false); const [hasActiveSubscription, setHasActiveSubscription] = useState(false); const [chatHistory, setChatHistory] = useState([]); const [currentChatId, setCurrentChatId] = useState(null); const [messages, setMessages] = useState([]); const [input, setInput] = useState(''); const [isSending, setIsSending] = useState(false); const [showAuthModal, setShowAuthModal] = useState(false); const [authModalMessage, setAuthModalMessage] = useState(''); const [selectedImage, setSelectedImage] = useState(null); const [showUserMenu, setShowUserMenu] = useState(false); const [activeMode, setActiveMode] = useState('chat'); const [showPricingModal, setShowPricingModal] = useState(false); const [checkoutLoading, setCheckoutLoading] = useState(null); const fileInputRef = useRef(null); const scrollRef = useRef(null); const inputRef = useRef(null); const userMenuRef = useRef(null); const [supabase] = useState(() => createClient()); const router = useRouter();
  
  const handleNewChat = () => { setMessages([]); setInput(''); setSelectedImage(null); setCurrentChatId(null); setActiveMode('chat'); };
  const triggerMode = (mode) => { if (!session) { setAuthModalMessage('Sign in to access this tool'); setShowAuthModal(true); return; } setActiveMode(mode); if (mode === 'image') { fileInputRef.current?.click(); } else { inputRef.current?.focus(); } };
  const handleSignOut = async (e) => { if (e && e.preventDefault) e.preventDefault(); await supabase.auth.signOut(); window.location.href = '/'; };
  const handleCheckout = async (priceId, planName) => { setCheckoutLoading(planName); try { const { data: { session: currentSession } } = await supabase.auth.getSession(); if (!currentSession) throw new Error('Session expired'); const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ priceId }) }); const data = await res.json(); if (data.url) window.location.href = data.url; } catch (e) { alert('Checkout failed'); } finally { setCheckoutLoading(null); } };

  const handleSend = async (e) => { if (e) e.preventDefault(); if ((!input.trim() && !selectedImage) || isSending) return; if (!session) { setAuthModalMessage('Start trial to chat'); setShowAuthModal(true); return; } if (!hasActiveSubscription) { setShowPricingModal(true); return; } let finalInput = input; const newMsg = { role: 'user', content: input, image: selectedImage }; setMessages((p) => [...p, newMsg]); setInput(''); const img = selectedImage; setSelectedImage(null); setIsSending(true); setMessages((p) => [...p, { role: 'assistant', content: '' }]); let activeChatId = currentChatId; try { if (!activeChatId) { const { data: newChat } = await supabase.from('chats').insert({ user_id: session.user.id, title: input.slice(0, 30) + '...' }).select().single(); if (newChat) { activeChatId = newChat.id; setCurrentChatId(newChat.id); } } const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, { ...newMsg, content: finalInput }], image: img, chatId: activeChatId, mode: activeMode }) }); const data = await res.json(); setMessages((p) => { const u = [...p]; u[u.length - 1].content = data.message || 'Error.'; return u; }); } catch (err) { setMessages((p) => { const u = [...p]; u[u.length - 1].content = 'Network error.'; return u; }); } finally { setIsSending(false); } };
  const handleImage = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file); setSelectedImage(compressed); setActiveMode('image'); } catch (error) { console.error(error); } };

  useEffect(() => { const init = async () => { const { data: { session: s } } = await supabase.auth.getSession(); setSession(s); if (s) { const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', s.user.id).in('status', ['active', 'trialing']).maybeSingle(); if (s.user.email === ADMIN_EMAIL || sub) setHasActiveSubscription(true); } setIsLoading(false); }; init(); }, []);

  if (isLoading) return <div className="fixed inset-0 bg-[#FAFAFA]" />;

  return (
    <>
      <GlobalStyles />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />
      {showPricingModal && <FullScreenPricing handleCheckout={handleCheckout} loading={checkoutLoading} onSignOut={handleSignOut} />}
      
      <div className="relative min-h-screen w-full overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <TechnicalBackground />
        
        <div className="relative z-10 flex flex-col h-[100dvh]">
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
             <div className={`font-bold text-xl ${outfit.className} text-slate-900`}>protocol<span className="text-emerald-600">LM</span></div>
             <div className="flex gap-3">
                {!session ? (
                  <>
                    <button onClick={() => setShowPricingModal(true)} className="text-xs font-bold text-slate-500 hover:text-slate-900 hidden sm:block">Pricing</button>
                    <button onClick={() => setShowAuthModal(true)} className="btn-rect bg-slate-900 text-white text-xs font-bold px-4 py-2">Start Free Trial</button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleNewChat} className="p-2 text-slate-400 hover:text-slate-900"><Icons.Plus /></button>
                    <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">{session.user.email[0].toUpperCase()}</button>
                    {showUserMenu && (<div className="absolute top-14 right-4 w-40 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"><button onClick={() => setShowPricingModal(true)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Subscription</button><button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Log Out</button></div>)}
                  </div>
                )}
             </div>
          </header>

          <main className="flex-1 flex flex-col px-4 pb-0 overflow-y-auto">
             {!session ? (
                <NarrativeJourney onAction={(mode) => { triggerMode(mode); }} />
             ) : (
                <>
                  <div className="flex-1 overflow-y-auto w-full py-6" ref={scrollRef}>
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                        <div className={`mb-6 p-4 rounded-lg border ${activeMode === 'image' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                          {activeMode === 'image' ? <Icons.Camera /> : <Icons.Book />}
                        </div>
                        <h1 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>
                          {activeMode === 'image' ? 'Visual Inspection Mode' : 'Regulatory Consultant Mode'}
                        </h1>
                        <p className="text-slate-500 text-sm max-w-sm">
                          {activeMode === 'image' ? 'Upload a photo to detect Priority (P) violations.' : 'Ask questions about Washtenaw County food code.'}
                        </p>
                      </div>
                    ) : (
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
                    )}
                  </div>
                  <div className="shrink-0 pb-6">
                    <InputBox input={input} setInput={setInput} handleSend={handleSend} handleImage={handleImage} isSending={isSending} fileInputRef={fileInputRef} selectedImage={selectedImage} setSelectedImage={setSelectedImage} inputRef={inputRef} activeMode={activeMode} setActiveMode={setActiveMode} session={session} />
                  </div>
                </>
             )}
          </main>
        </div>
      </div>
    </>
  )
}
