'use client'
// FORCE UPDATE: 2025-12-05
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit } from 'next/font/google'

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
// ICONS
// ==========================================
const Icons = {
  ArrowUp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>,
  ArrowUpReal: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  Plus: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  Camera: () => <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Book: () => <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>,
  Check: ({ color = 'text-slate-800' }) => <svg className={`w-4 h-4 ${color} shrink-0`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  File: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  Settings: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  MessageSquare: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>,
}

// ==========================================
// STYLES & LAYOUT
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #FAFAFA;
      overscroll-behavior: none;
      height: 100dvh;
      width: 100%;
      max-width: 100dvw;
      overflow: hidden;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .btn-press { transition: transform 0.1s ease; }
    .btn-press:active { transform: scale(0.96); }
    
    @keyframes slideUpFade {
      0% { transform: translateY(100%); opacity: 0; }
      10% { transform: translateY(0); opacity: 1; }
      90% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-100%); opacity: 0; }
    }
    .animate-ticker-item {
      animation: slideUpFade 4s ease-in-out forwards;
    }

    .loader {
      height: 14px;
      aspect-ratio: 2.5;
      --_g: no-repeat radial-gradient(farthest-side,#000 90%,#0000);
      background:var(--_g), var(--_g), var(--_g), var(--_g);
      background-size: 20% 50%;
      animation: l43 1s infinite linear; 
    }
    @keyframes l43 {
      0%     {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
      16.67% {background-position: calc(0*100%/3) 0   ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
      33.33% {background-position: calc(0*100%/3) 100%,calc(1*100%/3) 0   ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
      50%    {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 100%,calc(2*100%/3) 0   ,calc(3*100%/3) 50% }
      66.67% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 100%,calc(3*100%/3) 0   }
      83.33% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 100%}
      100%   {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
  `}</style>
)

const KnowledgeTicker = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TICKER_ITEMS.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="w-fit mx-auto mb-16 h-10 overflow-hidden relative flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-sm px-6">
      <div key={index} className="flex items-center gap-3 animate-ticker-item absolute">
        <Icons.File />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">{TICKER_ITEMS[index]}</span>
      </div>
    </div>
  )
}

const NarrativeJourney = ({ onAction }) => {
  return (
    <div className="w-full max-w-5xl mx-auto pt-8 md:pt-16 pb-24 px-4 relative z-10">
      <div className="text-center mb-10 md:mb-12 space-y-4">
        <h2 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tight ${outfit.className}`}>Choose your protocol.</h2>
        <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed px-4">Two powerful modes. One compliance platform.</p>
      </div>
      <KnowledgeTicker />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 px-2">
        <div className="group relative h-full min-h-[340px] flex flex-col rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-emerald-500/30 overflow-hidden">
           <div className="relative p-8 md:p-10 z-10 h-full flex flex-col justify-between text-left">
              <div>
                <div className="w-full flex justify-between items-start mb-8">
                   <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Visual Inspection</h3>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Detection Mode</p>
                      </div>
                   </div>
                   <div className="text-emerald-600"><Icons.Camera /></div>
                </div>
                <p className="text-slate-600 text-base leading-7 font-normal">Upload a photo of your kitchen, prep area, or storage. Our vision model instantly identifies <span className="font-semibold text-slate-900">Priority (P)</span>, <span className="font-semibold text-slate-900">Priority Foundation (Pf)</span>, and <span className="font-semibold text-slate-900">Core</span> violations.</p>
              </div>
              <button onClick={() => onAction('image')} className="w-full py-3.5 mt-8 rounded-lg border border-slate-200 text-slate-900 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group-hover:bg-emerald-50 group-hover:text-emerald-800 group-hover:border-emerald-200 cursor-pointer">Start Inspection <Icons.ArrowUp /></button>
           </div>
        </div>
        <div className="group relative h-full min-h-[340px] flex flex-col rounded-xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-blue-500/30 overflow-hidden">
           <div className="relative p-8 md:p-10 z-10 h-full flex flex-col justify-between text-left">
              <div>
                <div className="w-full flex justify-between items-start mb-8">
                   <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Regulatory Consultant</h3>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Chat Mode</p>
                      </div>
                   </div>
                   <div className="text-blue-600"><Icons.Book /></div>
                </div>
                <p className="text-slate-600 text-base leading-7 font-normal">Navigates enforcement hierarchy: <span className="font-semibold text-slate-900">Washtenaw County</span> &rarr; <span className="font-semibold text-slate-900">Michigan Code</span> &rarr; <span className="font-semibold text-slate-900">FDA</span>. Ask specific questions like <em>"What is the required cooling curve for large beef roasts?"</em></p>
              </div>
              <button onClick={() => onAction('chat')} className="w-full py-3.5 mt-8 rounded-lg border border-slate-200 text-slate-900 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group-hover:bg-blue-50 group-hover:text-blue-800 group-hover:border-blue-200 cursor-pointer">Start Chat <Icons.ArrowUp /></button>
           </div>
        </div>
      </div>
    </div>
  )
}

const InputBox = ({ input, setInput, handleSend, handleImage, isSending, fileInputRef, selectedImage, setSelectedImage, inputRef, activeMode, setActiveMode, session }) => {
  const [showMenu, setShowMenu] = useState(false); const menuRef = useRef(null); const handleModeClick = (mode) => { setActiveMode(mode); setShowMenu(false); if (mode === 'image' && session) fileInputRef.current?.click() }; useEffect(() => { function handleClickOutside(event) { if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false) } document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside) }, [])
  return (
    <div className="w-full max-w-4xl mx-auto px-2 md:px-4 pb-6 md:pb-0 z-20 relative">
      {selectedImage && (<div className="mb-2 mx-1 p-2 bg-white/80 backdrop-blur-xl rounded-xl inline-flex items-center gap-2 border border-slate-200 shadow-sm animate-pop-in"><span className="text-xs text-black font-medium flex items-center gap-1"><Icons.Camera /> Analyzing Image</span><button onClick={() => { setSelectedImage(null); setActiveMode('chat') }} className="text-slate-500 hover:text-black"><Icons.X /></button></div>)}
      <form onSubmit={handleSend} className="relative flex items-end w-full p-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-slate-100 focus-within:border-slate-300 transition-all">
        <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" className="hidden" />
        <div className="relative flex-shrink-0 mb-1 ml-1" ref={menuRef}><button type="button" onClick={() => setShowMenu(!showMenu)} className={`w-10 h-10 flex items-center justify-center rounded-xl btn-press transition-colors ${showMenu ? 'bg-slate-900 text-white rotate-45' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}><Icons.Plus /></button>{showMenu && (<div className="absolute bottom-full left-0 mb-2 w-[160px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 p-1 animate-in slide-in-from-bottom-2 fade-in"><div className="space-y-0.5">{['chat', 'image'].map(m => (<button key={m} type="button" onClick={() => handleModeClick(m)} className={`w-full flex items-center gap-3 px-3 py-2 text-xs md:text-sm font-medium rounded-lg transition-colors ${activeMode === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{m === 'chat' && <Icons.MessageSquare />}{m === 'image' && <Icons.Camera />}<span className="capitalize">{m === 'chat' ? 'Consult' : 'Inspect'}</span></button>))}</div></div>)}</div>
        <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }} placeholder={activeMode === 'chat' ? 'Ask about enforcement protocols...' : activeMode === 'image' ? 'Upload photo for instant audit...' : 'Enter audit parameters...'} className="flex-1 max-h=[200px] min-h-[44px] py-2.5 px-3 bg-transparent border-none focus:ring-0 focus:outline-none appearance-none outline-none resize-none text-slate-900 placeholder-slate-400 text-[15px] leading-6 font-medium" rows={1} style={{ height: 'auto', overflowY: 'hidden', outline: 'none', boxShadow: 'none', WebkitAppearance: 'none' }} />
        <button type="submit" disabled={(!input.trim() && !selectedImage) || isSending} className={`w-10 h-10 rounded-xl flex items-center justify-center btn-press flex-shrink-0 mb-1 mr-1 transition-all ${(!input.trim() && !selectedImage) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : `bg-slate-900 text-white cursor-pointer shadow-md hover:bg-slate-800`}`}>{isSending ? <div className="loader" /> : <Icons.ArrowUpReal />}</button>
      </form>
    </div>
  )
}

const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [googleLoading, setGoogleLoading] = useState(false); const [statusMessage, setStatusMessage] = useState(''); const supabase = createClient();
  const getRedirectUrl = () => { const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin; return `${baseUrl}/auth/callback` }; const handleEmailAuth = async (e) => { e.preventDefault(); setLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: getRedirectUrl() } }); if (error) setStatusMessage('Error: ' + error.message); else setStatusMessage('✓ Check your email for the login link.'); setLoading(false) }; const handleGoogleAuth = async () => { setGoogleLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getRedirectUrl(), queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) { setStatusMessage('Error: ' + error.message); setGoogleLoading(false) } }
  if (!isOpen) return null; return (<div className="fixed inset-0 z-[999] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}><div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-start mb-6"><div><h2 className="text-xl font-bold text-slate-900 mb-1">{message || 'Welcome to protocolLM'}</h2><p className="text-sm text-slate-500">Sign in to continue your session</p></div><button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors"><Icons.X /></button></div><button onClick={handleGoogleAuth} disabled={googleLoading || loading} className="w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-3 mb-4">{googleLoading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" /> : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" /><path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" /><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" /><path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" /></svg>} Continue with Google</button><div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">OR</span></div></div><form onSubmit={handleEmailAuth} className="space-y-4"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-all" /><button type="submit" disabled={loading || googleLoading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-full transition-colors">{loading ? 'Sending...' : 'Continue with Email'}</button></form>{statusMessage && <div className={`mt-4 p-3 rounded-lg text-sm border ${statusMessage.includes('Error') ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>{statusMessage}</div>}</div></div>)
}

const FullScreenPricing = ({ handleCheckout, loading, onSignOut }) => {
  const [billingInterval, setBillingInterval] = useState('month')
  return (
    <div className="fixed inset-0 z-[1000] bg-white/90 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl animate-pop-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onSignOut} className="absolute top-5 right-5 text-slate-500 hover:text-black transition-colors"><Icons.X /></button>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 mt-2 text-center">protocolLM</h3>
        <div className="flex justify-center mb-6"><div className="bg-slate-100 p-1 rounded-full flex relative border border-slate-200"><button onClick={() => setBillingInterval('month')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 ${billingInterval === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Monthly</button><button onClick={() => setBillingInterval('year')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center gap-1 ${billingInterval === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Annual <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1 py-0.5 rounded font-extrabold tracking-wide">SAVE $100</span></button></div></div>
        <div className="flex items-baseline text-slate-900 justify-center mb-2"><span className="text-5xl font-bold tracking-tighter font-sans no-underline decoration-0" style={{ textDecoration: 'none' }}>{billingInterval === 'month' ? '$50' : '$500'}</span><span className="ml-2 text-slate-500 text-sm font-bold uppercase tracking-wide">/{billingInterval === 'month' ? 'month' : 'year'}</span></div>
        <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed px-4">Enterprise-grade compliance infrastructure for <span className="font-semibold text-slate-900">Washtenaw County</span> food service.<br/><span className="text-slate-900 font-medium mt-1 block">Protect your license.</span></p>
        <ul className="space-y-3 mb-8 flex-1 border-t border-slate-100 pt-5"><li className="flex items-start gap-2 text-xs font-medium text-slate-700"><Icons.Check color="text-slate-900" /> Unlimited Compliance Queries</li><li className="flex items-start gap-2 text-xs font-medium text-slate-700"><Icons.Check color="text-slate-900" /> Visual Inspections (Image Mode)</li><li className="flex items-start gap-2 text-xs font-medium text-slate-700"><Icons.Check color="text-slate-900" /> Washtenaw & FDA Database</li></ul>
        <button onClick={() => handleCheckout(billingInterval === 'month' ? STRIPE_PRICE_ID_MONTHLY : STRIPE_PRICE_ID_ANNUAL, 'protocollm')} disabled={loading !== null} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-full text-xs uppercase tracking-[0.15em] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">{loading === 'protocollm' ? 'Processing...' : 'Start 7-Day Free Trial'}</button>
      </div>
    </div>
  )
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(true); const [session, setSession] = useState(null); const [profile, setProfile] = useState(null); const [sidebarOpen, setSidebarOpen] = useState(false); const [hasActiveSubscription, setHasActiveSubscription] = useState(false); const [chatHistory, setChatHistory] = useState([]); const [currentChatId, setCurrentChatId] = useState(null); const [messages, setMessages] = useState([]); const [input, setInput] = useState(''); const [isSending, setIsSending] = useState(false); const [showAuthModal, setShowAuthModal] = useState(false); const [authModalMessage, setAuthModalMessage] = useState(''); const [selectedImage, setSelectedImage] = useState(null); const [showUserMenu, setShowUserMenu] = useState(false); const [activeMode, setActiveMode] = useState('chat'); const [showPricingModal, setShowPricingModal] = useState(false); const [checkoutLoading, setCheckoutLoading] = useState(null); const fileInputRef = useRef(null); const scrollRef = useRef(null); const inputRef = useRef(null); const userMenuRef = useRef(null); const [supabase] = useState(() => createClient()); const router = useRouter();
  const triggerMode = (mode) => { if (!session) { setAuthModalMessage('Sign in to use this tool'); setShowAuthModal(true); return; } setActiveMode(mode); if (mode === 'image') { fileInputRef.current?.click(); } else { inputRef.current?.focus(); } };
  useEffect(() => { if (typeof window !== 'undefined') { const params = new URLSearchParams(window.location.search); if (params.get('auth')) { setAuthModalMessage(params.get('auth') === 'signup' ? 'Create an account to subscribe' : 'Sign in to continue'); setShowAuthModal(true); window.history.replaceState({}, '', '/'); } } const init = async () => { try { const { data: { session: currentSession } } = await supabase.auth.getSession(); setSession(currentSession); if (currentSession) { const { data: activeSub } = await supabase.from('subscriptions').select('status, current_period_end, plan, stripe_subscription_id').eq('user_id', currentSession.user.id).in('status', ['active', 'trialing']).maybeSingle(); if (currentSession.user.email === ADMIN_EMAIL) { setHasActiveSubscription(true); setShowPricingModal(false); loadChatHistory(); setIsLoading(false); return; } if (!activeSub || !activeSub.current_period_end) { setHasActiveSubscription(false); setShowPricingModal(true); setIsLoading(false); return; } const periodEnd = new Date(activeSub.current_period_end); if (periodEnd < new Date()) { await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('user_id', currentSession.user.id).eq('stripe_subscription_id', activeSub.stripe_subscription_id).select(); setHasActiveSubscription(false); setShowPricingModal(true); setIsLoading(false); return; } const { data: userProfile } = await supabase.from('user_profiles').select('*').eq('id', currentSession.user.id).single(); setProfile(userProfile); if (userProfile?.accepted_terms && userProfile?.accepted_privacy) { setHasActiveSubscription(true); setShowPricingModal(false); loadChatHistory(); } else { router.push('/accept-terms'); } } } catch (e) { console.error(e) } finally { setIsLoading(false) } }; init(); const safetyTimer = setTimeout(() => setIsLoading(false), 2000); const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => { setSession(session); if (session) { if (session.user.email === ADMIN_EMAIL) { setHasActiveSubscription(true); setShowPricingModal(false); loadChatHistory(); return; } const { data: activeSub } = await supabase.from('subscriptions').select('status, current_period_end, plan, stripe_subscription_id').eq('user_id', session.user.id).in('status', ['active', 'trialing']).maybeSingle(); if (activeSub && activeSub.current_period_end && new Date(activeSub.current_period_end) >= new Date()) { setHasActiveSubscription(true); setShowPricingModal(false); const { data: userProfile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single(); setProfile(userProfile); if (!userProfile?.accepted_terms) router.push('/accept-terms'); else loadChatHistory(); } else { setHasActiveSubscription(false); setShowPricingModal(true); } } else { setProfile(null); setChatHistory([]); setHasActiveSubscription(false); setShowPricingModal(false); } }); return () => { subscription.unsubscribe(); clearTimeout(safetyTimer); } }, []);
  const loadChatHistory = async () => { const { data: chats } = await supabase.from('chats').select('id, title, created_at').order('created_at', { ascending: false }); if (chats) setChatHistory(chats); }; const loadChat = async (chatId) => { setIsLoading(true); setCurrentChatId(chatId); setSidebarOpen(false); const { data: msgs } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }); if (msgs) setMessages(msgs.map((m) => ({ role: m.role, content: m.content, image: m.image }))); setIsLoading(false); }; const deleteChat = async (e, chatId) => { e.stopPropagation(); if (!confirm('Delete chat?')) return; setChatHistory((prev) => prev.filter((c) => c.id !== chatId)); if (currentChatId === chatId) handleNewChat(); await supabase.from('chats').delete().eq('id', chatId); loadChatHistory(); }; const handleSignOut = async (e) => { if (e && e.preventDefault) e.preventDefault(); setSession(null); setProfile(null); setMessages([]); setChatHistory([]); setShowUserMenu(false); try { await supabase.auth.signOut(); } catch (error) { console.error(error); } finally { router.refresh(); window.location.href = '/'; } };
  const handleCheckout = async (priceId, planName) => { const checkoutTimeout = setTimeout(() => { setCheckoutLoading(null); alert("Connection timeout. Please try again."); }, 15000); setCheckoutLoading(planName); if (!priceId) { clearTimeout(checkoutTimeout); alert('Error: Price ID missing. Please check configuration.'); setCheckoutLoading(null); return; } if (!session) { clearTimeout(checkoutTimeout); setShowPricingModal(false); setAuthModalMessage('Create an account to subscribe'); setShowAuthModal(true); setCheckoutLoading(null); return; } try { const { data: { session: currentSession } } = await supabase.auth.getSession(); if (!currentSession) { clearTimeout(checkoutTimeout); alert('Session expired.'); return; } const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ priceId }) }); if (!res.ok) throw new Error((await res.json()).error || 'API Error'); const data = await res.json(); if (data.url) { clearTimeout(checkoutTimeout); window.location.href = data.url; } else throw new Error('No URL returned'); } catch (error) { clearTimeout(checkoutTimeout); alert(`Checkout failed: ${error.message}`); } finally { setCheckoutLoading(null); } };
  const handleSend = async (e) => { if (e) e.preventDefault(); if ((!input.trim() && !selectedImage) || isSending) return; if (!session) { setAuthModalMessage('Start trial to chat'); setShowAuthModal(true); return; } if (!hasActiveSubscription) { setShowPricingModal(true); return; } let finalInput = input; const newMsg = { role: 'user', content: input, image: selectedImage }; setMessages((p) => [...p, newMsg]); setInput(''); const img = selectedImage; setSelectedImage(null); setIsSending(true); setMessages((p) => [...p, { role: 'assistant', content: '' }]); let activeChatId = currentChatId; try { if (!activeChatId) { const { data: newChat } = await supabase.from('chats').insert({ user_id: session.user.id, title: input.slice(0, 30) + '...' }).select().single(); if (newChat) { activeChatId = newChat.id; setCurrentChatId(newChat.id); loadChatHistory(); } } const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, { ...newMsg, content: finalInput }], image: img, chatId: activeChatId, mode: activeMode }) }); if (res.status === 401) { setAuthModalMessage('Sign in to continue'); setShowAuthModal(true); setMessages((p) => p.slice(0, -2)); return; } if (res.status === 402) { setShowPricingModal(true); setMessages((p) => p.slice(0, -2)); return; } if (res.status === 403) { router.push('/accept-terms'); setMessages((p) => p.slice(0, -2)); return; } const data = await res.json(); setMessages((p) => { const u = [...p]; u[u.length - 1].content = data.message || (data.error ? `Error: ${data.error}` : 'Error.'); return u; }); } catch (err) { setMessages((p) => { const u = [...p]; u[u.length - 1].content = 'Network error.'; return u; }); } finally { setIsSending(false); } };
  const handleImage = async (e) => { const file = e.target.files?.[0]; if (!file) return; if (!session) { setAuthModalMessage('Login required'); setShowAuthModal(true); return; } if (file.size > 10 * 1024 * 1024) { alert('Image too large'); return; } if (!file.type.startsWith('image/')) { alert('Images only'); return; } try { const compressed = await compressImage(file); setSelectedImage(compressed); setActiveMode('image'); } catch (error) { alert('Image error'); console.error(error); } }; const handleNewChat = () => { setMessages([]); setInput(''); setSelectedImage(null); setCurrentChatId(null); setSidebarOpen(false); setActiveMode('chat'); };
  useEffect(() => { function handleClickOutside(event) { if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false); } document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []); useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]); useEffect(() => { if (messages.length > 0 && inputRef.current && !isSending) inputRef.current.focus(); }, [messages.length, isSending]);
  if (isLoading) return <div className="fixed inset-0 bg-white text-black flex items-center justify-center"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>;
  if (session && !hasActiveSubscription) return <><GlobalStyles /><FullScreenPricing handleCheckout={handleCheckout} loading={checkoutLoading} onSignOut={handleSignOut} /></>;
  return (<><GlobalStyles /><AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />{showPricingModal && <FullScreenPricing handleCheckout={handleCheckout} loading={checkoutLoading} onSignOut={handleSignOut} />}<div className="relative min-h-screen w-full overflow-hidden font-sans selection:bg-orange-100/50"><CssBackground /><div className="relative z-10 flex flex-col h-[100dvh]"><header className={`flex items-center justify-between px-4 py-4 md:px-6 md:py-6 shrink-0 text-slate-900 pt-safe bg-white/10 backdrop-blur-sm border-b border-white/20`}><div className={`font-bold tracking-tight text-xl md:text-2xl ${outfit.className}`}>protocol<span className="text-black">LM</span></div><div className="flex items-center gap-2 md:gap-4">{!session && (<><button onClick={() => setShowAuthModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-transform active:scale-95 shadow-sm whitespace-nowrap">Start Free Trial</button><button onClick={() => setShowPricingModal(true)} className="text-xs md:text-sm font-medium text-slate-900 hover:text-slate-600 transition-transform active:scale-95 hidden sm:block">Pricing</button><button onClick={() => setShowAuthModal(true)} className="text-xs md:text-sm font-medium border border-slate-200 bg-white px-4 py-2 rounded-full text-slate-900 hover:bg-slate-50 transition-transform active:scale-95">Sign In</button></>)}{session && (<div className="flex items-center gap-3"><button onClick={handleNewChat} className="p-2 rounded-full hover:bg-white text-slate-900 transition-colors border border-transparent hover:border-slate-200"><Icons.Plus /></button><div className="relative" ref={userMenuRef}><button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">{session.user.email[0].toUpperCase()}</button>{showUserMenu && (<div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200"><button onClick={() => setShowPricingModal(true)} className="w-full px-4 py-3 text-left text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2"><Icons.Settings /> Subscription</button><div className="h-px bg-slate-100 mx-0" /><button onClick={(e) => handleSignOut(e)} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Icons.SignOut /> Log out</button></div>)}</div></div>)}</div></header><main className="flex-1 flex flex-col items-center justify-start px-4 w-full pb-20 md:pb-0 overflow-y-auto">{!session ? (<div className="w-full h-full flex flex-col items-center"><NarrativeJourney onAction={(mode) => { triggerMode(mode); setShowAuthModal(true); }} /><div className="w-full flex justify-center py-10 border-t border-slate-200 mt-10"><div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-[10px] md:text-xs text-slate-500 font-medium"><div className="flex gap-4"><Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link><Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link></div><span className="hidden md:inline text-slate-300">|</span><span className="text-slate-400">Built in Washtenaw County.</span></div></div></div>) : (<><div className="flex-1 overflow-y-auto w-full" ref={scrollRef}>{messages.length === 0 ? (<div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-900"><div className="mb-6 p-4 rounded-full bg-slate-50 text-slate-400 border border-slate-100">{activeMode === 'image' ? <Icons.Camera /> : <Icons.Book />}</div><h1 className={`text-2xl font-bold mb-2 ${outfit.className}`}>{activeMode === 'image' ? 'Visual Inspection Mode' : 'Regulatory Consultant Mode'}</h1><p className="text-slate-500 text-sm max-w-sm font-medium">{activeMode === 'image' ? 'Upload a photo to detect Priority (P) and Priority Foundation (Pf) violations.' : 'Ask questions about the Michigan Modified Food Code or Washtenaw County enforcement.'}</p></div>) : (<div className="flex flex-col w-full max-w-3xl mx-auto py-6 px-4 gap-6">{messages.map((msg, idx) => (<div key={idx} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-sm' : 'bg-white border border-slate-200 text-slate-800 px-6 py-4 rounded-2xl shadow-sm'}`}>{msg.image && <img src={msg.image} alt="Upload" className="rounded-xl mb-3 max-h-60 object-contain border border-slate-200/20" />}{msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? <div className="loader my-1" /> : <div className="text-[15px] leading-7 whitespace-pre-wrap font-medium">{msg.content}</div>}</div></div>))}</div>)}</div><div className="w-full pt-2 pb-6 shrink-0 z-20"><InputBox input={input} setInput={setInput} handleSend={handleSend} handleImage={handleImage} isSending={isSending} fileInputRef={fileInputRef} selectedImage={selectedImage} setSelectedImage={setSelectedImage} inputRef={inputRef} activeMode={activeMode} setActiveMode={setActiveMode} session={session} /></div></>)}</main></div></div></>)
}
