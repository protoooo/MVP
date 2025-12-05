'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit } from 'next/font/google'
import { motion } from 'framer-motion'

// Outfit font for modern, clean typography
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ==========================================
// CONFIG & DATA
// ==========================================
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
// ANIMATION VARIANTS (The "Drawing" Effect)
// ==========================================
const drawVariant = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: i * 0.1, type: "spring", duration: 1.5, bounce: 0 },
      opacity: { delay: i * 0.1, duration: 0.01 }
    }
  })
}

// ==========================================
// ICONS
// ==========================================
const Icons = {
  Menu: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
  ArrowRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  ArrowUp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  Plus: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  Camera: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Book: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>,
  Check: ({ color = 'text-slate-800' }) => <svg className={`w-4 h-4 ${color} shrink-0`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  File: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  Settings: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
}

// ==========================================
// ILLUSTRATION COMPONENTS (CLAUDE STYLE)
// ==========================================

const ConsultantIllustration = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.circle cx="300" cy="100" r="60" fill="#E7C698" opacity="0.3" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }} />
    
    {/* Floating Docs */}
    <motion.g animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
      <motion.rect x="260" y="60" width="50" height="70" rx="4" fill="white" stroke="#3A3836" strokeWidth="2.5" initial="hidden" animate="visible" custom={1} variants={drawVariant} />
      <motion.line x1="270" y1="80" x2="300" y2="80" stroke="#3A3836" strokeWidth="2.5" strokeLinecap="round" initial="hidden" animate="visible" custom={1.2} variants={drawVariant} />
      <motion.line x1="270" y1="95" x2="300" y2="95" stroke="#3A3836" strokeWidth="2.5" strokeLinecap="round" initial="hidden" animate="visible" custom={1.4} variants={drawVariant} />
    </motion.g>

    {/* Person */}
    <motion.circle cx="140" cy="140" r="35" stroke="#3A3836" strokeWidth="3" fill="#F9F8F6" initial="hidden" animate="visible" custom={0} variants={drawVariant} />
    <motion.path d="M140 175 Q140 260 60 280" stroke="#3A3836" strokeWidth="3" fill="none" strokeLinecap="round" initial="hidden" animate="visible" custom={0.5} variants={drawVariant} />
    <motion.path d="M140 175 Q140 260 220 280" stroke="#3A3836" strokeWidth="3" fill="none" strokeLinecap="round" initial="hidden" animate="visible" custom={0.5} variants={drawVariant} />
    <motion.path d="M180 230 Q220 230 240 200" stroke="#3A3836" strokeWidth="3" strokeLinecap="round" initial="hidden" animate="visible" custom={0.8} variants={drawVariant} />

    {/* Tablet */}
    <motion.g transformOrigin="240 180" initial={{ rotate: -10 }} whileHover={{ rotate: 0, scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
      <rect x="220" y="150" width="60" height="80" rx="6" fill="white" stroke="#3A3836" strokeWidth="2.5" transform="rotate(-10 240 180)" />
      <g transform="rotate(-10 240 180)">
         <motion.path d="M235 170 H265 V190 H245 L235 200 V170 Z" fill="#4F8D88" stroke="#3A3836" strokeWidth="2" strokeLinejoin="round" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 }} />
      </g>
    </motion.g>

    {/* Motion Lines */}
    <motion.path d="M290 150 Q300 140 310 150" stroke="#DA7756" strokeWidth="2.5" fill="none" strokeLinecap="round" initial={{ opacity: 0 }} whileHover={{ opacity: 1, d: ["M290 150 Q300 140 310 150", "M290 145 Q300 135 310 145", "M290 150 Q300 140 310 150"] }} transition={{ duration: 1, repeat: Infinity }} />
  </svg>
)

const InspectionIllustration = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="250" r="80" fill="#DA7756" opacity="0.1" />
    
    {/* Shelf */}
    <g transform="translate(50, 60)">
      <motion.rect x="0" y="0" width="140" height="200" rx="4" stroke="#3A3836" strokeWidth="3" fill="none" initial="hidden" animate="visible" custom={0} variants={drawVariant} />
      <motion.line x1="0" y1="50" x2="140" y2="50" stroke="#3A3836" strokeWidth="2" initial="hidden" animate="visible" custom={0.5} variants={drawVariant} />
      <motion.line x1="0" y1="100" x2="140" y2="100" stroke="#3A3836" strokeWidth="2" initial="hidden" animate="visible" custom={0.7} variants={drawVariant} />
      
      {/* Items */}
      <motion.circle cx="30" cy="35" r="10" stroke="#3A3836" strokeWidth="2" fill="#E7C698" initial="hidden" animate="visible" custom={1} variants={drawVariant} />
      <motion.rect x="60" y="20" width="20" height="30" stroke="#3A3836" strokeWidth="2" initial="hidden" animate="visible" custom={1.2} variants={drawVariant} />
      
      {/* Flashing Violation */}
      <motion.rect x="30" y="120" width="40" height="20" stroke="#DA7756" strokeWidth="2.5" fill="#FDF2F0" animate={{ stroke: ["#DA7756", "#3A3836", "#DA7756"] }} transition={{ duration: 2, repeat: Infinity }} />
    </g>

    {/* Phone */}
    <motion.g transform="translate(220, 100) rotate(5)" whileHover={{ y: -5 }}>
      <rect x="0" y="0" width="90" height="150" rx="10" fill="white" stroke="#3A3836" strokeWidth="3" />
      <rect x="10" y="15" width="70" height="100" fill="#F2F0ED" />
      
      {/* Scanning Box */}
      <motion.rect x="20" y="55" width="30" height="15" stroke="#DA7756" strokeWidth="2" fill="none" strokeDasharray="4 2" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
      <motion.circle cx="65" cy="25" r="8" fill="#DA7756" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
    </motion.g>

    {/* Scan Lines */}
    <motion.g opacity="0.6">
      <motion.line x1="220" y1="120" x2="190" y2="110" stroke="#4F8D88" strokeWidth="2" strokeDasharray="4 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 2, duration: 1 }} />
      <motion.line x1="220" y1="180" x2="190" y2="200" stroke="#4F8D88" strokeWidth="2" strokeDasharray="4 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 2.2, duration: 1 }} />
    </motion.g>
  </svg>
)

// ==========================================
// STYLES & LAYOUT
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #F9F8F6; /* WARM PAPER BACKGROUND */
      color: #3A3836; /* CHARCOAL INK */
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overscroll-behavior: none;
    }
    .text-ink { color: #3A3836; }
    .text-clay { color: #DA7756; }
    .text-teal { color: #4F8D88; }
    
    .btn-press { transition: transform 0.1s ease; }
    .btn-press:active { transform: scale(0.96); }

    /* Custom Ticker Animation */
    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-scroll { animation: scroll 40s linear infinite; }
    
    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(58, 56, 54, 0.15); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(58, 56, 54, 0.25); }
  `}</style>
)

const KnowledgeTicker = () => {
  return (
    <div className="w-full max-w-5xl mx-auto mb-12 overflow-hidden relative">
      <div 
        className="flex w-full animate-scroll hover:pause"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
        }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <div key={i} className="flex-shrink-0 mx-3">
            <div className="flex items-center gap-2 bg-white/50 border border-[#E5E0D8] px-3 py-1.5 rounded-md text-[11px] font-bold text-[#6B665F] uppercase tracking-wider shadow-sm">
                <Icons.File />
                <span>{item}</span>
            </div>
          </div>
        ))}
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
        <div className="mb-2 mx-1 p-2 bg-white rounded-lg border border-[#E5E0D8] inline-flex items-center gap-2 shadow-sm animate-in slide-in-from-bottom-2 fade-in">
          <span className="text-xs text-[#3A3836] font-medium flex items-center gap-1"><Icons.Camera /> Analyzing Image</span>
          <button onClick={() => { setSelectedImage(null); setActiveMode('chat') }} className="text-[#6B665F] hover:text-[#DA7756]"><Icons.X /></button>
        </div>
      )}

      <form 
        onSubmit={handleSend} 
        className="relative flex items-end w-full p-2 bg-white border border-[#E5E0D8] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-[#DA7756]/20 transition-all" 
      >
        <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" className="hidden" />
        
        <div className="relative flex-shrink-0 mb-1 ml-1" ref={menuRef}>
            <button 
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg btn-press transition-colors ${showMenu ? 'bg-[#3A3836] text-white rotate-45' : 'bg-[#F2F0ED] text-[#3A3836] hover:bg-[#E5E0D8]'}`}
            >
                <Icons.Plus />
            </button>

            {showMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-[160px] bg-white border border-[#E5E0D8] rounded-lg shadow-lg overflow-hidden z-50 p-1 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="space-y-0.5">
                        {['chat', 'image'].map(m => (
                            <button 
                                key={m}
                                type="button"
                                onClick={() => handleModeClick(m)} 
                                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${activeMode === m ? 'bg-[#F2F0ED] text-[#3A3836]' : 'text-[#6B665F] hover:bg-[#F9F8F6]'}`}
                            >
                                {m === 'chat' && <Icons.MessageSquare />}
                                {m === 'image' && <Icons.Camera />}
                                <span className="capitalize">{m === 'chat' ? 'Consult' : 'Inspect'}</span>
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
            placeholder={activeMode === 'chat' ? 'Ask a question...' : activeMode === 'image' ? 'Upload photo...' : 'Message...'}
            className="flex-1 max-h=[200px] min-h-[44px] py-2.5 px-3 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-[#3A3836] placeholder-[#9D9993] text-[15px] font-medium" 
            rows={1} 
            style={{ height: 'auto', overflowY: 'hidden' }}
        />

        <button 
          type="submit" 
          disabled={(!input.trim() && !selectedImage) || isSending} 
          className={`w-9 h-9 rounded-lg flex items-center justify-center btn-press flex-shrink-0 mb-1 mr-1 transition-all
            ${(!input.trim() && !selectedImage) 
              ? 'bg-[#F2F0ED] text-[#9D9993] cursor-not-allowed' 
              : 'bg-[#3A3836] text-white hover:bg-[#DA7756] cursor-pointer shadow-sm'
            }`}
        >
          {isSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icons.ArrowUp />}
        </button>
      </form>
    </div>
  )
}

const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const supabase = createClient()

  const handleEmailAuth = async (e) => { e.preventDefault(); setLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } }); if (error) setStatusMessage('Error: ' + error.message); else setStatusMessage('✓ Check your email for the login link.'); setLoading(false) }
  const handleGoogleAuth = async () => { const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) console.error(error) }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[999] bg-[#3A3836]/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white border border-[#E5E0D8] rounded-xl w-full max-w-md p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div><h2 className="text-xl font-bold text-[#3A3836] mb-1">{message || 'Welcome'}</h2><p className="text-sm text-[#6B665F]">Sign in to continue</p></div>
          <button onClick={onClose} className="text-[#9D9993] hover:text-[#3A3836]"><Icons.X /></button>
        </div>
        <button onClick={handleGoogleAuth} className="w-full bg-white hover:bg-[#F9F8F6] text-[#3A3836] border border-[#E5E0D8] font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 mb-4 shadow-sm">
          Continue with Google
        </button>
        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E0D8]" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-[#9D9993]">OR</span></div></div>
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full bg-[#F9F8F6] border border-[#E5E0D8] rounded-lg px-4 py-2.5 text-sm text-[#3A3836] focus:outline-none focus:border-[#3A3836] transition-all" />
          <button type="submit" disabled={loading} className="w-full bg-[#3A3836] hover:bg-[#DA7756] text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm">{loading ? 'Sending...' : 'Continue with Email'}</button>
        </form>
        {statusMessage && <div className="mt-4 p-3 rounded-lg text-sm bg-[#F2F0ED] text-[#3A3836]">{statusMessage}</div>}
      </div>
    </div>
  )
}

// ==========================================
// MAIN PAGE LOGIC
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [activeMode, setActiveMode] = useState('chat')
  
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      setIsLoading(false)
    }
    init()
  }, [])

  const handleAction = (mode) => {
    if (!session) {
      setAuthModalMessage('Sign up to start free trial')
      setShowAuthModal(true)
      return
    }
    setActiveMode(mode)
    if (mode === 'image') fileInputRef.current?.click()
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault(); 
    if ((!input.trim() && !selectedImage) || isSending) return
    if (!session) { setAuthModalMessage('Sign in to chat'); setShowAuthModal(true); return }

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(p => [...p, newMsg])
    setInput(''); setSelectedImage(null); setIsSending(true)
    setMessages(p => [...p, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ messages: [...messages, newMsg], mode: activeMode }) 
      })
      const data = await res.json()
      setMessages(p => { const u = [...p]; u[u.length - 1].content = data.message || 'Error'; return u })
    } catch (e) {
      setMessages(p => { const u = [...p]; u[u.length - 1].content = 'Network error.'; return u })
    } finally {
      setIsSending(false)
    }
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!session) { setAuthModalMessage('Login required'); setShowAuthModal(true); return }
    try { const compressed = await compressImage(file); setSelectedImage(compressed); setActiveMode('image') } catch (error) { console.error(error) }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages])

  if (isLoading) return <div className="fixed inset-0 bg-[#F9F8F6] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#3A3836] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <>
      <GlobalStyles />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />
      
      <div className="flex flex-col h-[100dvh]">
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8] bg-[#F9F8F6]/80 backdrop-blur-md sticky top-0 z-50">
           <div className={`text-xl font-bold tracking-tight text-[#3A3836] ${outfit.className}`}>
             protocol<span className="text-[#DA7756]">LM</span>
           </div>
           <div className="flex gap-4">
              {!session ? (
                  <>
                      <button onClick={() => setShowAuthModal(true)} className="text-sm font-semibold text-[#3A3836] hover:text-[#DA7756] transition-colors">Log in</button>
                      <button onClick={() => setShowAuthModal(true)} className="bg-[#3A3836] text-[#F9F8F6] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#DA7756] transition-colors btn-press shadow-sm">
                          Start Free Trial
                      </button>
                  </>
              ) : (
                  <button onClick={handleSignOut} className="text-sm text-[#6B665F] hover:text-[#DA7756] flex items-center gap-2"><Icons.SignOut /> Sign Out</button>
              )}
           </div>
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col relative w-full max-w-6xl mx-auto">
          {/* LANDING PAGE (Logged Out or Empty Chat) */}
          {!session || (session && messages.length === 0) ? (
             <div className="flex-1 flex flex-col items-center justify-center pt-10 pb-20 px-4">
                <div className="text-center mb-10 max-w-2xl">
                    <h1 className={`text-4xl md:text-6xl font-bold text-[#3A3836] mb-4 tracking-tight leading-[1.1] ${outfit.className}`}>
                        {session ? `Welcome back.` : `Choose your protocol.`}
                    </h1>
                    <p className="text-lg text-[#6B665F] font-medium">
                        {session ? "Select a mode to begin." : "Two ways to stay inspection-ready."}
                    </p>
                </div>

                {!session && <KnowledgeTicker />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                    <div 
                        onClick={() => handleAction('chat')}
                        className="group relative bg-white rounded-xl border border-[#E5E0D8] p-8 aspect-[4/3] flex flex-col cursor-pointer transition-all hover:border-[#DA7756] hover:shadow-[0_8px_30px_rgba(218,119,86,0.1)] overflow-hidden"
                    >
                        <div className="flex-1 w-full relative mb-4"><ConsultantIllustration /></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-2xl font-bold text-[#3A3836] group-hover:text-[#DA7756] transition-colors">Regulatory Consultant</h3>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300 text-[#DA7756]"><Icons.ArrowRight /></div>
                            </div>
                            <p className="text-[#6B665F] font-medium leading-snug">Type a question and get an answer grounded in your local food code.</p>
                        </div>
                    </div>

                    <div 
                        onClick={() => handleAction('image')}
                        className="group relative bg-white rounded-xl border border-[#E5E0D8] p-8 aspect-[4/3] flex flex-col cursor-pointer transition-all hover:border-[#4F8D88] hover:shadow-[0_8px_30px_rgba(79,141,136,0.1)] overflow-hidden"
                    >
                        <div className="flex-1 w-full relative mb-4"><InspectionIllustration /></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-2xl font-bold text-[#3A3836] group-hover:text-[#4F8D88] transition-colors">Visual Inspection</h3>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300 text-[#4F8D88]"><Icons.ArrowRight /></div>
                            </div>
                            <p className="text-[#6B665F] font-medium leading-snug">Take a picture of your line or prep area and get instant feedback.</p>
                        </div>
                    </div>
                </div>
             </div>
          ) : (
             // CHAT INTERFACE (Logged In & Active)
             <div className="flex-1 w-full max-w-3xl mx-auto py-6 px-4 flex flex-col gap-6" ref={scrollRef}>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-sm border ${msg.role === 'user' ? 'bg-[#3A3836] text-white border-transparent' : 'bg-white text-[#3A3836] border-[#E5E0D8]'}`}>
                      {msg.image && <img src={msg.image} alt="Upload" className="rounded-lg mb-3 max-h-60 object-contain border border-white/20" />}
                      <div className="text-[16px] leading-7 whitespace-pre-wrap font-medium">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {isSending && <div className="flex justify-start"><div className="bg-white border border-[#E5E0D8] px-5 py-4 rounded-2xl"><div className="w-2 h-2 bg-[#6B665F] rounded-full animate-bounce" /></div></div>}
             </div>
          )}
        </main>

        {session && (
            <div className="w-full border-t border-[#E5E0D8] bg-[#F9F8F6] pt-4 pb-6">
                <InputBox input={input} setInput={setInput} handleSend={handleSend} handleImage={handleImage} isSending={isSending} fileInputRef={fileInputRef} selectedImage={selectedImage} setSelectedImage={setSelectedImage} inputRef={inputRef} activeMode={activeMode} setActiveMode={setActiveMode} session={session} />
            </div>
        )}
      </div>
    </>
  )
}
