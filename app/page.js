'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'

// ==========================================
// CONFIG & DATA
// ==========================================
const SOURCE_DOCUMENTS = [
  'Washtenaw Enforcement Actions', 'Sanitizing Protocols', 'FDA Food Code 2022',
  'Michigan Modified Food Code', 'Emergency Action Plans', 'Norovirus Cleaning Guidelines',
  'Fats, Oils, & Grease (FOG) Protocol', 'Cross-Contamination Prevention',
  'Consumer Advisory Guidelines', 'Allergen Awareness Standards', 'Time & Temp Control (TCS)',
  'Food Labeling Guide', 'Date Marking Guide', 'USDA Safe Minimum Temps'
]

// ==========================================
// STYLES (Perplexity/Monochrome Aesthetic)
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #0A0A0A !important;
      background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      overscroll-behavior: none;
      height: 100dvh;
      width: 100%;
      max-width: 100dvw;
      overflow: hidden;
      color: #EDEDED;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .loader {
      height: 20px; aspect-ratio: 2.5;
      --_g: no-repeat radial-gradient(farthest-side, #ffffff 90%, #0000);
      background: var(--_g), var(--_g), var(--_g), var(--_g);
      background-size: 20% 50%; animation: l43 1s infinite linear;
    }
    @keyframes l43 {
      0% { background-position: calc(0*100%/3) 50%, calc(1*100%/3) 50%, calc(2*100%/3) 50%, calc(3*100%/3) 50% }
      16.67% { background-position: calc(0*100%/3) 0, calc(1*100%/3) 50%, calc(2*100%/3) 50%, calc(3*100%/3) 50% }
      33.33% { background-position: calc(0*100%/3) 100%, calc(1*100%/3) 0, calc(2*100%/3) 50%, calc(3*100%/3) 50% }
      50% { background-position: calc(0*100%/3) 50%, calc(1*100%/3) 100%, calc(2*100%/3) 0, calc(3*100%/3) 50% }
      66.67% { background-position: calc(0*100%/3) 50%, calc(1*100%/3) 50%, calc(2*100%/3) 100%, calc(3*100%/3) 0 }
      83.33% { background-position: calc(0*100%/3) 50%, calc(1*100%/3) 50%, calc(2*100%/3) 50%, calc(3*100%/3) 100% }
      100% { background-position: calc(0*100%/3) 50%, calc(1*100%/3) 50%, calc(2*100%/3) 50%, calc(3*100%/3) 50% }
    }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
    .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(5px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-5px); } }
    .animate-source-ticker { animation: slideUpFade 3s ease-in-out forwards; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
)

// ==========================================
// ICONS
// ==========================================
const Icons = {
  Menu: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
  Send: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{transform:'rotate(45deg)'}}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  Plus: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  Trash: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Upload: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>,
  Settings: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  ChatBubble: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>,
  Book: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>,
  MessageSquare: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  Camera: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  ClipboardCheck: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  Alert: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  Check: ({ color = 'text-white' }) => <svg className={`w-4 h-4 ${color} shrink-0`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
}

// ==========================================
// COMPONENTS
// ==========================================
const SourceTicker = () => {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setIndex(p => (p + 1) % SOURCE_DOCUMENTS.length), 3000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className="flex justify-center mt-3">
      <div className="flex items-center justify-center px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md shadow-sm">
        <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse mr-3"></div>
        <div className="w-[260px] md:w-[310px] text-center overflow-hidden h-5 relative">
          <div key={index} className="absolute inset-0 flex items-center justify-center text-xs md:text-sm text-gray-400 font-mono tracking-wide animate-source-ticker uppercase truncate">
            {SOURCE_DOCUMENTS[index]}
          </div>
        </div>
      </div>
    </div>
  )
}

const InputBox = ({ input, setInput, handleSend, handleImage, isSending, fileInputRef, selectedImage, setSelectedImage, inputRef, activeMode, setActiveMode, session }) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const handleModeClick = (mode) => { 
    setActiveMode(mode)
    setShowMenu(false)
    if (mode === 'image' && session) fileInputRef.current?.click() 
  }
  
  useEffect(() => {
    function handleClickOutside(event) { if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto px-2 md:px-4 pb-6 md:pb-0 z-20 relative">
      {selectedImage && (
        <div className="mb-2 mx-1 p-2 bg-[#27272A] rounded-xl inline-flex items-center gap-2 border border-white/10 animate-pop-in">
          <span className="text-xs text-white font-medium flex items-center gap-1"><Icons.Camera /> Analyzing Image</span>
          <button onClick={() => { setSelectedImage(null); setActiveMode('chat') }} className="text-[#525252] hover:text-white"><Icons.X /></button>
        </div>
      )}

      <form 
        onSubmit={handleSend} 
        className="relative flex items-end w-full p-2 bg-[#18181B] border border-white/10 rounded-[32px] shadow-2xl transition-all duration-300 focus-within:border-white/20" 
      >
        <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" className="hidden" />
        
        {/* Plus Button Container - Added mb-0.5 for alignment */}
        <div className="relative flex-shrink-0 mb-0.5" ref={menuRef}>
            <button 
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                /* Added active:scale-90 for squishy feel */
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${showMenu ? 'bg-white text-black rotate-45' : 'bg-[#27272A] text-[#EDEDED] hover:bg-[#333] hover:text-white border border-white/5'}`}
            >
                <Icons.Plus />
            </button>

            {showMenu && (
                <div className="absolute bottom-full left-0 mb-4 w-[160px] bg-[#1C1C1C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 z-50 p-1">
                    <div className="space-y-0.5">
                        {['chat', 'image', 'audit'].map(m => (
                            <button 
                                key={m}
                                type="button"
                                onClick={() => handleModeClick(m)} 
                                className={`w-full flex items-center gap-3 px-3 py-2 text-xs md:text-sm font-medium rounded-xl transition-colors ${activeMode === m ? 'bg-white text-black' : 'text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white'}`}
                            >
                                {m === 'chat' && <Icons.MessageSquare />}
                                {m === 'image' && <Icons.Camera />}
                                {m === 'audit' && <Icons.ClipboardCheck />}
                                <span className="capitalize">{m}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <textarea 
            ref={inputRef} 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
            placeholder={activeMode === 'chat' ? 'Ask anything...' : activeMode === 'image' ? 'Upload an image...' : 'Describe area to audit...'}
            className="flex-1 max-h=[200px] min-h-[40px] py-2 px-3 bg-transparent border-none focus:ring-0 outline-none resize-none text-white placeholder-[#525252] text-[15px] leading-6" 
            rows={1} 
            style={{ height: 'auto', overflowY: 'hidden' }}
        />

        <button 
          type="submit" 
          disabled={(!input.trim() && !selectedImage) || isSending} 
          /* Added active:scale-90 and mb-0.5 for squish and alignment */
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 mb-0.5 active:scale-90
            ${(!input.trim() && !selectedImage) 
              ? 'bg-[#27272A] text-[#525252] cursor-not-allowed border border-white/5' 
              : 'bg-white text-black hover:bg-gray-200 cursor-pointer border border-transparent'
            }`}
        >
          {isSending ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Icons.Send />}
        </button>
      </form>
    </div>
  )
}

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
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div><h2 className="text-xl font-semibold text-white mb-1">{message || 'Welcome to protocolLM'}</h2><p className="text-sm text-[#888888]">Sign in to continue your session</p></div>
          <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors"><Icons.X /></button>
        </div>
        <button onClick={handleGoogleAuth} disabled={googleLoading || loading} className="w-full bg-white hover:bg-gray-200 text-black font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-3 mb-4">
          {googleLoading ? <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin" /> : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" /><path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" /><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" /><path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" /></svg>}
          Continue with Google
        </button>
        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2E2E2E]" /></div><div className="relative flex justify-center text-xs"><span className="bg-[#121212] px-3 text-[#888888]">OR</span></div></div>
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#666666] focus:outline-none focus:border-white transition-all" />
          <button type="submit" disabled={loading || googleLoading} className="w-full bg-white hover:bg-gray-200 text-black font-medium py-2.5 rounded-full transition-colors">{loading ? 'Sending...' : 'Continue with Email'}</button>
        </form>
        {statusMessage && <div className={`mt-4 p-3 rounded-lg text-sm border ${statusMessage.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>{statusMessage}</div>}
      </div>
    </div>
  )
}

const FullScreenPricing = ({ handleCheckout, loading, onSignOut }) => {
  const [billingInterval, setBillingInterval] = useState('month')
  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="relative w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-pop-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onSignOut} className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"><Icons.X /></button>
        <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-4 mt-2 text-center">protocolLM</h3>
        
        <div className="flex justify-center mb-8">
          <div className="bg-black/40 p-1 rounded-full flex relative border border-white/10">
            <button onClick={() => setBillingInterval('month')} className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 ${billingInterval === 'month' ? 'bg-white text-black shadow-lg' : 'text-white/50 hover:text-white'}`}>Monthly</button>
            <button onClick={() => setBillingInterval('year')} className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2 ${billingInterval === 'year' ? 'bg-white text-black shadow-lg' : 'text-white/50 hover:text-white'}`}>Annual <span className="bg-white text-black text-[9px] px-1.5 py-0.5 rounded font-extrabold tracking-wide">SAVE $400</span></button>
          </div>
        </div>
        
        <div className="flex items-baseline text-white justify-center mb-2"><span className="text-6xl font-bold tracking-tighter font-sans no-underline decoration-0" style={{ textDecoration: 'none' }}>{billingInterval === 'month' ? '$200' : '$2,000'}</span><span className="ml-2 text-white/40 text-sm font-bold uppercase tracking-wide">/{billingInterval === 'month' ? 'month' : 'year'}</span></div>
        <p className="text-sm text-white/60 text-center mb-8 leading-relaxed px-4">Enterprise-grade compliance infrastructure for Washtenaw County food service establishments.<br/><span className="text-white font-medium mt-2 block">Protect your license. Avoid fines.</span></p>

        <ul className="space-y-4 mb-8 flex-1 border-t border-white/10 pt-6">
          <li className="flex items-start gap-3 text-sm font-medium text-white/90"><Icons.Check color="text-white" /> Unlimited Compliance Queries</li>
          <li className="flex items-start gap-3 text-sm font-medium text-white/90"><Icons.Check color="text-white" /> AI Visual Inspections (Image Mode)</li>
          <li className="flex items-start gap-3 text-sm font-medium text-white/90"><Icons.Check color="text-white" /> Full Washtenaw & FDA Database</li>
          <li className="flex items-start gap-3 text-sm font-medium text-white/90"><Icons.Check color="text-white" /> Mock Audit Workflow</li>
          <li className="flex items-start gap-3 text-sm font-medium text-white/90"><Icons.Check color="text-white" /> <span className="text-white">Location License</span> (Unlimited Users)</li>
        </ul>

        <button onClick={() => handleCheckout(billingInterval === 'month' ? 'price_1SZi73DlSrKA3nbAzpQSbn5F' : 'price_1SZi9UDlSrKA3nbANUVnhH2D', 'protocollm')} disabled={loading !== null} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-full text-sm uppercase tracking-[0.15em] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border border-white/10">{loading === 'protocollm' ? 'Processing...' : 'Start 7-Day Free Trial'}</button>
      </div>
    </div>
  )
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
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
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('auth')) {
        setAuthModalMessage(params.get('auth') === 'signup' ? 'Create an account to subscribe' : 'Sign in to continue')
        setShowAuthModal(true)
        window.history.replaceState({}, '', '/')
      }
    }

    const init = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)

        if (currentSession) {
          const { data: activeSub } = await supabase.from('subscriptions').select('status, current_period_end, plan, stripe_subscription_id').eq('user_id', currentSession.user.id).in('status', ['active', 'trialing']).maybeSingle()
          
          if (currentSession.user.email === 'austinrnorthrop@gmail.com') {
            setHasActiveSubscription(true); setShowPricingModal(false); loadChatHistory(); setIsLoading(false); return
          }

          if (!activeSub || !activeSub.current_period_end) {
            setHasActiveSubscription(false); setShowPricingModal(true); setIsLoading(false); return
          }
          const periodEnd = new Date(activeSub.current_period_end)
          if (periodEnd < new Date()) {
            await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('user_id', currentSession.user.id).eq('stripe_subscription_id', activeSub.stripe_subscription_id)
            setHasActiveSubscription(false); setShowPricingModal(true); setIsLoading(false); return
          }
          const { data: userProfile } = await supabase.from('user_profiles').select('*').eq('id', currentSession.user.id).single()
          setProfile(userProfile)
          if (userProfile?.accepted_terms && userProfile?.accepted_privacy) {
            setHasActiveSubscription(true); setShowPricingModal(false); loadChatHistory()
          } else {
            console.log('⚠️ Terms not accepted'); router.push('/accept-terms')
          }
        }
      } catch (e) { console.error(e) } finally { setIsLoading(false) }
    }
    init()

    const safetyTimer = setTimeout(() => setIsLoading(false), 2000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session) {
        if (session.user.email === 'austinrnorthrop@gmail.com') {
            setHasActiveSubscription(true); setShowPricingModal(false); loadChatHistory(); return
        }
        const { data: activeSub } = await supabase.from('subscriptions').select('status, current_period_end, plan, stripe_subscription_id').eq('user_id', session.user.id).in('status', ['active', 'trialing']).maybeSingle()
        if (activeSub && activeSub.current_period_end && new Date(activeSub.current_period_end) >= new Date()) {
          setHasActiveSubscription(true); setShowPricingModal(false)
          const { data: userProfile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
          setProfile(userProfile)
          if (!userProfile?.accepted_terms) router.push('/accept-terms'); else loadChatHistory()
        } else {
          setHasActiveSubscription(false); setShowPricingModal(true)
        }
      } else {
        setProfile(null); setChatHistory([]); setHasActiveSubscription(false); setShowPricingModal(false)
      }
    })
    return () => { subscription.unsubscribe(); clearTimeout(safetyTimer) }
  }, [])

  const loadChatHistory = async () => { const { data: chats } = await supabase.from('chats').select('id, title, created_at').order('created_at', { ascending: false }); if (chats) setChatHistory(chats) }
  const loadChat = async (chatId) => { setIsLoading(true); setCurrentChatId(chatId); setSidebarOpen(false); const { data: msgs } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }); if (msgs) setMessages(msgs.map((m) => ({ role: m.role, content: m.content, image: m.image }))); setIsLoading(false) }
  const deleteChat = async (e, chatId) => { e.stopPropagation(); if (!confirm('Delete chat?')) return; setChatHistory((prev) => prev.filter((c) => c.id !== chatId)); if (currentChatId === chatId) handleNewChat(); await supabase.from('chats').delete().eq('id', chatId); loadChatHistory() }
  const handleSignOut = async (e) => { if (e && e.preventDefault) e.preventDefault(); setSession(null); setProfile(null); setMessages([]); setChatHistory([]); setShowUserMenu(false); try { await supabase.auth.signOut() } catch (error) { console.error(error) } finally { router.refresh(); window.location.href = '/' } }
  
  const handleCheckout = async (priceId, planName) => {
    console.log('🛒 Checkout:', { priceId, planName }); const checkoutTimeout = setTimeout(() => { setCheckoutLoading(null); alert("Connection timeout. Please try again.") }, 15000); setCheckoutLoading(planName)
    if (!session) { clearTimeout(checkoutTimeout); setShowPricingModal(false); setAuthModalMessage('Create an account to subscribe'); setShowAuthModal(true); setCheckoutLoading(null); return }
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) { clearTimeout(checkoutTimeout); alert('Session expired.'); return }
      const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentSession.access_token}` }, body: JSON.stringify({ priceId }) })
      if (!res.ok) throw new Error((await res.json()).error || 'API Error')
      const data = await res.json()
      if (data.url) { clearTimeout(checkoutTimeout); window.location.href = data.url } else throw new Error('No URL returned')
    } catch (error) { clearTimeout(checkoutTimeout); alert(`Checkout failed: ${error.message}`) } finally { setCheckoutLoading(null) }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault(); if ((!input.trim() && !selectedImage) || isSending) return
    if (!session) { setAuthModalMessage('Start trial to chat'); setShowAuthModal(true); return }
    if (!hasActiveSubscription) { setShowPricingModal(true); return }
    let finalInput = input
    if (activeMode === 'audit') finalInput = `[MOCK AUDIT MODE] Perform a strict mock health inspection audit based on this input: ${input}`
    
    const newMsg = { role: 'user', content: input, image: selectedImage }; setMessages((p) => [...p, newMsg]); setInput(''); const img = selectedImage; setSelectedImage(null); setIsSending(true); setMessages((p) => [...p, { role: 'assistant', content: '' }])
    let activeChatId = currentChatId
    try {
      if (!activeChatId) { const { data: newChat } = await supabase.from('chats').insert({ user_id: session.user.id, title: input.slice(0, 30) + '...' }).select().single(); if (newChat) { activeChatId = newChat.id; setCurrentChatId(newChat.id); loadChatHistory() } }
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, { ...newMsg, content: finalInput }], image: img, chatId: activeChatId, mode: activeMode }) })
      if (res.status === 401) { setAuthModalMessage('Sign in to continue'); setShowAuthModal(true); setMessages((p) => p.slice(0, -2)); return }
      if (res.status === 402) { setShowPricingModal(true); setMessages((p) => p.slice(0, -2)); return }
      if (res.status === 403) { router.push('/accept-terms'); setMessages((p) => p.slice(0, -2)); return }
      const data = await res.json()
      setMessages((p) => { const u = [...p]; u[u.length - 1].content = data.message || (data.error ? `Error: ${data.error}` : 'Error.'); return u })
    } catch (err) { setMessages((p) => { const u = [...p]; u[u.length - 1].content = 'Network error.'; return u }) } finally { setIsSending(false) }
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; if (!session) { setAuthModalMessage('Login required'); setShowAuthModal(true); return }
    if (file.size > 10 * 1024 * 1024) { alert('Image too large'); return }; if (!file.type.startsWith('image/')) { alert('Images only'); return }
    try { const compressed = await compressImage(file); setSelectedImage(compressed); setActiveMode('image') } catch (error) { alert('Image error'); console.error(error) }
  }
  const handleNewChat = () => { setMessages([]); setInput(''); setSelectedImage(null); setCurrentChatId(null); setSidebarOpen(false); setActiveMode('chat') }

  useEffect(() => { function handleClickOutside(event) { if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false) } document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside) }, [])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages])
  useEffect(() => { if (messages.length > 0 && inputRef.current && !isSending) inputRef.current.focus() }, [messages.length, isSending])

  if (isLoading) return <div className="fixed inset-0 bg-[#0A0A0A] text-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>
  if (session && !hasActiveSubscription) return <><GlobalStyles /><FullScreenPricing handleCheckout={handleCheckout} loading={checkoutLoading} onSignOut={handleSignOut} /></>

  return (
    <>
      <GlobalStyles />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />
      {showPricingModal && <FullScreenPricing handleCheckout={handleCheckout} loading={checkoutLoading} onSignOut={handleSignOut} />}
      <div className="fixed inset-0 w-full bg-[#0A0A0A] text-white overflow-hidden font-sans flex" style={{ height: '100dvh' }}>
        {session && sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        {session && (
          <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0A0A0A] border-r border-white/10 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
            <div className="p-3"><button onClick={handleNewChat} className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-[#EDEDED] bg-transparent border border-white/10 hover:bg-[#1C1C1C] rounded-full transition-colors group"><span className="flex items-center gap-2"><Icons.Plus /> New chat</span></button></div>
            <div className="flex-1 overflow-y-auto px-2"><div className="text-xs text-[#525252] font-medium px-2 py-4 uppercase tracking-wider">Recent</div><div className="space-y-1">{chatHistory.map((chat) => (<button key={chat.id} onClick={() => loadChat(chat.id)} className={`group w-full text-left px-3 py-2 text-sm rounded-lg truncate transition-colors flex items-center justify-between ${currentChatId === chat.id ? 'bg-[#1C1C1C] text-white border border-transparent' : 'text-[#888] hover:text-[#EDEDED] hover:bg-[#111] border border-transparent'}`}><div className="flex items-center gap-2 overflow-hidden"><Icons.ChatBubble /><span className="truncate">{chat.title || 'New Chat'}</span></div><div onClick={(e) => deleteChat(e, chat.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#525252] hover:text-red-400 transition-all"><Icons.Trash /></div></button>))}</div></div>
            {session && (<div className="p-3 border-t border-white/10"><div className="relative" ref={userMenuRef}><button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-[#1C1C1C] rounded-lg transition-colors text-left border border-transparent hover:border-white/10"><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-black">{session.user.email[0].toUpperCase()}</div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-white truncate">{session.user.email}</div></div></button>{showUserMenu && (<div className="absolute bottom-full left-0 w-full mb-2 bg-[#1C1C1C] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200"><button onClick={() => setShowPricingModal(true)} className="w-full px-4 py-3 text-left text-sm text-[#A1A1AA] hover:text-white hover:bg-[#262626] flex items-center gap-2"><Icons.Settings /> Subscription</button><div className="h-px bg-white/10 mx-0" /><button onClick={(e) => handleSignOut(e)} className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-[#262626] flex items-center gap-2"><Icons.SignOut /> Log out</button></div>)}</div></div>)}
          </aside>
        )}
        <main className="flex-1 flex flex-col relative min-w-0 bg-[#0A0A0A]">
          {session && (
            <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between p-3 bg-[#0A0A0A] border-b border-white/10 text-white">
              <button onClick={() => setSidebarOpen(true)} className="p-1 text-[#A1A1AA] hover:text-white"><Icons.Menu /></button><span className="font-semibold text-sm">protocolLM v.1</span><button onClick={handleNewChat} className="p-1 text-[#A1A1AA] hover:text-white"><Icons.Plus /></button>
            </div>
          )}
          {!session ? (
            <div className="flex flex-col h-full w-full">
              <header className="flex items-center justify-between px-4 py-4 md:px-6 md:py-6 z-20 shrink-0">
                <div className="font-semibold tracking-tight text-lg md:text-xl text-white">protocol<span className="text-white/60">LM</span><span className="hidden md:inline text-white ml-3 font-normal text-sm md:text-base border-l border-white pl-3">Trained on Washtenaw County Food Safety Protocols</span></div>
                <div className="flex items-center gap-2 md:gap-4">
                  <button onClick={() => setShowAuthModal(true)} className="bg-[#EDEDED] hover:bg-white text-black px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-transform active:scale-95 shadow-sm whitespace-nowrap">Start Free Trial</button>
                  <button onClick={() => setShowPricingModal(true)} className="text-xs md:text-sm font-medium text-[#A1A1AA] hover:text-white transition-transform active:scale-95 hidden sm:block">Pricing</button>
                  <button onClick={() => setShowAuthModal(true)} className="text-xs md:text-sm font-medium text-white hover:text-gray-300 transition-transform active:scale-95 whitespace-nowrap border border-white/20 px-4 py-2 rounded-full">Sign In</button>
                </div>
              </header>
              <div className="flex-1 flex flex-col items-center justify-center px-4 w-full pb-20 md:pb-0">
                <div className="w-full max-w-2xl mt-4 md:mt-0 px-2 md:px-0 mx-auto">
                  <InputBox input={input} setInput={setInput} handleSend={handleSend} handleImage={handleImage} isSending={isSending} fileInputRef={fileInputRef} selectedImage={selectedImage} setSelectedImage={setSelectedImage} inputRef={inputRef} activeMode={activeMode} setActiveMode={setActiveMode} session={session} />
                </div>
                {!session && <SourceTicker />}
                <div className="flex gap-3 md:gap-4 mt-8 md:mt-12 text-[10px] md:text-xs text-[#525252] absolute md:fixed bottom-4 md:bottom-6"><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-4 text-center"><h1 className="text-3xl font-medium text-white/90 mb-2">What do you want to know?</h1></div>
                ) : (
                  <div className="flex flex-col w-full max-w-3xl mx-auto py-6 px-4 gap-6">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-white px-2' : 'text-[#EDEDED] px-2'}`}>
                          {msg.image && <img src={msg.image} alt="Upload" className="rounded-xl mb-3 max-h-60 object-contain border border-white/10" />}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? <div className="loader my-1" /> : <div className="text-[16px] leading-7 whitespace-pre-wrap">{msg.content}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-full bg-[#0A0A0A] pt-2 pb-6 shrink-0 z-20">
                <InputBox input={input} setInput={setInput} handleSend={handleSend} handleImage={handleImage} isSending={isSending} fileInputRef={fileInputRef} selectedImage={selectedImage} setSelectedImage={setSelectedImage} inputRef={inputRef} activeMode={activeMode} setActiveMode={setActiveMode} session={session} />
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
