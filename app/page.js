'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter, JetBrains_Mono } from 'next/font/google'

// FONTS: Outfit for Headings, Inter for UI, JetBrains Mono for Technical Data
const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const STRIPE_PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
const STRIPE_PRICE_ID_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL

// DATA
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
  "Emergency_Plan.pdf": "Emergency Plans"
}
const TICKER_ITEMS = Object.values(DOC_MAPPING)

// ==========================================
// TECHNICAL ICONS (1.5px Stroke, Slate-900)
// ==========================================
const Icons = {
  Camera: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Book: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  ArrowRight: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Check: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  Database: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Shield: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Zap: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  X: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Settings: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></path></svg>
}

// ==========================================
// STYLES
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #F8FAFC; /* Slate-50 */
      color: #0F172A; /* Slate-900 */
      -webkit-font-smoothing: antialiased;
    }
    
    /* Technical Grid Background */
    .bg-grid {
      background-size: 40px 40px;
      background-image: linear-gradient(to right, #E2E8F0 1px, transparent 1px),
                        linear-gradient(to bottom, #E2E8F0 1px, transparent 1px);
      mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

    /* Ticker Animation */
    @keyframes slideUpFade {
      0%, 10% { transform: translateY(100%); opacity: 0; }
      20%, 80% { transform: translateY(0); opacity: 1; }
      90%, 100% { transform: translateY(-100%); opacity: 0; }
    }
    .animate-ticker-item {
      animation: slideUpFade 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }
    
    .loader { height: 14px; aspect-ratio: 2.5; --_g: no-repeat radial-gradient(farthest-side,#000 90%,#0000); background:var(--_g), var(--_g), var(--_g), var(--_g); background-size: 20% 50%; animation: l43 1s infinite linear; }
    @keyframes l43 { 0% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } 16.67% {background-position: calc(0*100%/3) 0 ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } 33.33% {background-position: calc(0*100%/3) 100%,calc(1*100%/3) 0 ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } 50% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 100%,calc(2*100%/3) 0 ,calc(3*100%/3) 50% } 66.67% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 100%,calc(3*100%/3) 0 } 83.33% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 100%} 100% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% } }
  `}</style>
)

// ==========================================
// COMPONENTS
// ==========================================

const DatabaseStatus = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => { setIndex((prev) => (prev + 1) % TICKER_ITEMS.length); }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 py-2 px-4 bg-white border border-slate-200 rounded-full shadow-sm max-w-fit">
      <div className="flex items-center gap-2 text-emerald-600">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${mono.className}`}>System Active</span>
      </div>
      <div className="h-4 w-px bg-slate-200"></div>
      <div className="h-5 overflow-hidden relative w-[200px]">
        <div key={index} className="flex items-center gap-2 animate-ticker-item absolute top-0 left-0">
          <Icons.Database />
          <span className={`text-xs font-medium text-slate-600 ${inter.className}`}>{TICKER_ITEMS[index]}</span>
        </div>
      </div>
    </div>
  )
}

const DashboardLanding = ({ onAction }) => {
  return (
    <div className={`w-full min-h-screen flex flex-col ${inter.className}`}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 bg-grid pointer-events-none"></div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto w-full px-6 pt-20 pb-24">
        
        {/* HERO SECTION - Left Aligned, Authoritative */}
        <div className="flex flex-col md:flex-row gap-12 items-center mb-24">
          <div className="flex-1 space-y-8 text-left">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-md">
              <Icons.Shield />
              <span className={`text-[11px] font-bold uppercase tracking-[0.15em] text-slate-600 ${mono.className}`}>Washtenaw County Compliant</span>
            </div>

            <div className="space-y-4">
              <h1 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] ${outfit.className}`}>
                See violations before<br/>your inspector does.
              </h1>
              <p className="text-lg text-slate-600 max-w-lg font-normal leading-relaxed">
                Instant photo analysis and code-backed answers for food service operators. 
                Replace hours of PDF reading with 10-second checks.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => onAction('image')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-lg font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
              >
                Start Inspection <Icons.ArrowRight />
              </button>
              <button 
                onClick={() => onAction('chat')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
              >
                Ask a Question
              </button>
            </div>

            <DatabaseStatus />
          </div>

          {/* Right Side - Abstract UI Preview (CSS only) */}
          <div className="flex-1 w-full max-w-md relative hidden md:block">
             <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/30 to-blue-100/30 rounded-full blur-3xl"></div>
             <div className="relative bg-white border border-slate-200 rounded-xl shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                   <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-emerald-600"><Icons.Camera /></div>
                   <div>
                      <div className="h-2.5 w-24 bg-slate-900 rounded-full mb-2"></div>
                      <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                   </div>
                   <div className="ml-auto px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded">Priority (P)</div>
                </div>
                <div className="space-y-2">
                   <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                   <div className="h-2 w-5/6 bg-slate-100 rounded-full"></div>
                   <div className="h-2 w-4/6 bg-slate-100 rounded-full"></div>
                </div>
                <div className="pt-2">
                   <div className="p-3 bg-slate-50 rounded border border-slate-100 flex items-start gap-3">
                      <div className="mt-0.5 text-slate-400"><Icons.Book /></div>
                      <div className="space-y-1 flex-1">
                         <div className="h-2 w-1/3 bg-slate-300 rounded-full"></div>
                         <div className="h-2 w-full bg-slate-200 rounded-full"></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="border-b border-slate-200 mb-16"></div>

        {/* 2. TOOLS SECTION - Grid Layout */}
        <div className="mb-24">
          <div className="mb-10">
            <h3 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>Compliance Tools</h3>
            <p className="text-slate-500">Select a module to begin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* MODULE 1: INSPECTION (Primary) */}
            <div className="bg-white rounded-lg border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              {/* Header Bar */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="text-emerald-600"><Icons.Camera /></div>
                    <span className="font-bold text-slate-900">Visual Inspection</span>
                 </div>
                 <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded">Recommended</span>
              </div>
              {/* Body */}
              <div className="p-6">
                 <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                   Upload a photo. Our model identifies <strong className="text-slate-900">Priority (P)</strong>, <strong className="text-slate-900">Priority Foundation (Pf)</strong>, and <strong className="text-slate-900">Core</strong> violations instantly.
                 </p>
                 <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-xs font-medium text-slate-600"><Icons.Check color="text-emerald-600"/> <span>Pre-inspection walkthroughs</span></li>
                    <li className="flex items-center gap-3 text-xs font-medium text-slate-600"><Icons.Check color="text-emerald-600"/> <span>Equipment condition checks</span></li>
                    <li className="flex items-center gap-3 text-xs font-medium text-slate-600"><Icons.Check color="text-emerald-600"/> <span>Storage & labeling audit</span></li>
                 </ul>
                 <button onClick={() => onAction('image')} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold uppercase tracking-widest transition-all">
                   Launch Tool
                 </button>
              </div>
            </div>

            {/* MODULE 2: CONSULTANT (Secondary) */}
            <div className="bg-white rounded-lg border border-slate-200 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              {/* Header Bar */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="text-blue-600"><Icons.Book /></div>
                    <span className="font-bold text-slate-900">Regulatory Chat</span>
                 </div>
                 <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded">Reference</span>
              </div>
              {/* Body */}
              <div className="p-6">
                 <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                   Query the official code database. Answers strictly grounded in <strong className="text-slate-900">Washtenaw County</strong> and <strong className="text-slate-900">FDA</strong> regulations.
                 </p>
                 <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-xs font-medium text-slate-600"><Icons.Check color="text-blue-600"/> <span>Cooling & heating curves</span></li>
                    <li className="flex items-center gap-3 text-xs font-medium text-slate-600"><Icons.Check color="text-blue-600"/> <span>Enforcement timelines</span></li>
                    <li className="flex items-center gap-3 text-xs font-medium text-slate-600"><Icons.Check color="text-blue-600"/> <span>Specific citation lookups</span></li>
                 </ul>
                 <button onClick={() => onAction('chat')} className="w-full py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md text-xs font-bold uppercase tracking-widest transition-all">
                   Open Chat
                 </button>
              </div>
            </div>

          </div>
        </div>

        {/* 3. COMPARISON SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 bg-white border border-slate-200 rounded-xl overflow-hidden mb-24">
           <div className="p-8 md:p-12 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
              <h4 className={`text-lg font-bold text-slate-900 mb-6 ${outfit.className}`}>Current Process</h4>
              <ul className="space-y-4">
                 <li className="flex gap-3 text-sm text-slate-500"><Icons.X /> <span>Digging through 400-page PDF binders</span></li>
                 <li className="flex gap-3 text-sm text-slate-500"><Icons.X /> <span>Guessing if equipment is compliant</span></li>
                 <li className="flex gap-3 text-sm text-slate-500"><Icons.X /> <span>Stress when the inspector arrives</span></li>
              </ul>
           </div>
           <div className="p-8 md:p-12">
              <h4 className={`text-lg font-bold text-emerald-800 mb-6 ${outfit.className}`}>With protocolLM</h4>
              <ul className="space-y-4">
                 <li className="flex gap-3 text-sm text-slate-700 font-medium"><div className="text-emerald-600"><Icons.Check color="text-emerald-600"/></div> <span>Instant answers via photo or text</span></li>
                 <li className="flex gap-3 text-sm text-slate-700 font-medium"><div className="text-emerald-600"><Icons.Check color="text-emerald-600"/></div> <span>Pre-validated compliance checks</span></li>
                 <li className="flex gap-3 text-sm text-slate-700 font-medium"><div className="text-emerald-600"><Icons.Check color="text-emerald-600"/></div> <span>Confidence in your daily operations</span></li>
              </ul>
           </div>
        </div>

        {/* 4. PRICING (Clean Box) */}
        <div className="max-w-2xl mx-auto text-center">
           <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
              <h3 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>Simple, Transparent Pricing</h3>
              <p className="text-slate-500 mb-8">One prevented fine pays for the entire year.</p>
              
              <div className="flex items-baseline justify-center gap-1 mb-8">
                 <span className="text-5xl font-bold text-slate-900 tracking-tight">$50</span>
                 <span className="text-slate-500 font-medium">/month</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto mb-8 text-sm text-slate-600">
                 <div className="flex gap-2"><Icons.Check color="text-slate-900"/> Unlimited Use</div>
                 <div className="flex gap-2"><Icons.Check color="text-slate-900"/> Both Modes</div>
                 <div className="flex gap-2"><Icons.Check color="text-slate-900"/> Mobile Access</div>
                 <div className="flex gap-2"><Icons.Check color="text-slate-900"/> Cancel Anytime</div>
              </div>

              <button onClick={() => onAction('chat')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-md font-bold text-sm uppercase tracking-widest transition-all shadow-sm w-full md:w-auto">
                 Start 7-Day Free Trial
              </button>
           </div>
           <p className="text-xs text-slate-400 mt-6">Secure payment via Stripe. No commitment required.</p>
        </div>

      </div>
    </div>
  )
}

// ==========================================
// AUTH & APP WRAPPERS
// ==========================================

const InputBox = ({ input, setInput, handleSend, handleImage, isSending, fileInputRef, selectedImage, setSelectedImage, inputRef, activeMode, setActiveMode, session }) => {
  const [showMenu, setShowMenu] = useState(false); const menuRef = useRef(null); const handleModeClick = (mode) => { setActiveMode(mode); setShowMenu(false); if (mode === 'image' && session) fileInputRef.current?.click() }; useEffect(() => { function handleClickOutside(event) { if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false) } document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside) }, [])
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-8 z-20 relative">
      {selectedImage && (<div className="mb-2 mx-1 p-2 bg-white border border-slate-200 rounded-md inline-flex items-center gap-2 shadow-sm"><span className="text-xs text-slate-700 font-bold flex items-center gap-2"><Icons.Camera /> Analyzing Image...</span><button onClick={() => { setSelectedImage(null); setActiveMode('chat') }} className="text-slate-400 hover:text-slate-900"><Icons.X /></button></div>)}
      <div className="relative flex items-end w-full bg-white border border-slate-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-400 transition-all p-1.5">
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
        <button onClick={handleSend} disabled={(!input.trim() && !selectedImage) || isSending} className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${(!input.trim() && !selectedImage) ? 'bg-slate-50 text-slate-300' : `bg-slate-900 text-white hover:bg-slate-800 shadow-sm`}`}>{isSending ? <div className="loader" /> : <Icons.ArrowRight />}</button>
      </div>
    </div>
  )
}

const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [googleLoading, setGoogleLoading] = useState(false); const [statusMessage, setStatusMessage] = useState(''); const supabase = createClient();
  const getRedirectUrl = () => { const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin; return `${baseUrl}/auth/callback` }; const handleEmailAuth = async (e) => { e.preventDefault(); setLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: getRedirectUrl() } }); if (error) setStatusMessage('Error: ' + error.message); else setStatusMessage('✓ Check your email for the login link.'); setLoading(false) }; const handleGoogleAuth = async () => { setGoogleLoading(true); setStatusMessage(''); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getRedirectUrl(), queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) { setStatusMessage('Error: ' + error.message); setGoogleLoading(false) } }
  if (!isOpen) return null; return (<div className="fixed inset-0 z-[999] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}><div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-slate-900">Sign in to protocolLM</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-900"><Icons.X /></button></div><button onClick={handleGoogleAuth} disabled={googleLoading || loading} className="w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-medium py-2.5 px-4 rounded-md flex items-center justify-center gap-3 mb-4 text-sm transition-all">{googleLoading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" /> : "Continue with Google"}</button><div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400 uppercase tracking-wider">or email</span></div></div><form onSubmit={handleEmailAuth} className="space-y-4"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@restaurant.com" required className="w-full bg-white border border-slate-300 rounded-md px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all" /><button type="submit" disabled={loading || googleLoading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-md text-sm transition-all">{loading ? 'Sending...' : 'Continue with Email'}</button></form><p className="text-[10px] text-slate-400 text-center mt-4">By continuing, you agree to our Terms & Privacy Policy.</p>{statusMessage && <div className="mt-4 p-3 rounded-md text-xs bg-slate-50 border border-slate-200 text-slate-600">{statusMessage}</div>}</div></div>)
}

const FullScreenPricing = ({ handleCheckout, loading, onSignOut }) => {
  const [billingInterval, setBillingInterval] = useState('month')
  return (
    <div className="fixed inset-0 z-[1000] bg-white/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-lg p-8 shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onSignOut} className="absolute top-4 right-4 text-slate-400 hover:text-black"><Icons.X /></button>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Subscription</h3>
        <div className="flex justify-center mb-6"><div className="bg-slate-100 p-1 rounded-md flex border border-slate-200"><button onClick={() => setBillingInterval('month')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${billingInterval === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Monthly</button><button onClick={() => setBillingInterval('year')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${billingInterval === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Yearly <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">-17%</span></button></div></div>
        <div className="text-center mb-6"><span className="text-5xl font-bold text-slate-900 tracking-tight">${billingInterval === 'month' ? '50' : '500'}</span><span className="text-slate-500 text-sm font-medium">/{billingInterval === 'month' ? 'mo' : 'yr'}</span></div>
        <ul className="space-y-3 mb-8 border-t border-slate-100 pt-6"><li className="flex gap-3 text-sm text-slate-700"><Icons.Check color="text-emerald-600" /> Unlimited Queries</li><li className="flex gap-3 text-sm text-slate-700"><Icons.Check color="text-emerald-600" /> Visual Inspection Mode</li><li className="flex gap-3 text-sm text-slate-700"><Icons.Check color="text-emerald-600" /> Washtenaw County Database</li></ul>
        <button onClick={() => handleCheckout(billingInterval === 'month' ? STRIPE_PRICE_ID_MONTHLY : STRIPE_PRICE_ID_ANNUAL, 'protocollm')} disabled={loading !== null} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-md text-sm uppercase tracking-wide shadow-sm disabled:opacity-50">{loading === 'protocollm' ? 'Processing...' : 'Start 7-Day Free Trial'}</button>
      </div>
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
        <div className="fixed inset-0 z-0 bg-[#FAFAFA] bg-grid pointer-events-none"></div>
        <div className="relative z-10 flex flex-col h-[100dvh]">
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
             <div className={`font-bold text-xl ${outfit.className} text-slate-900`}>protocol<span className="text-emerald-600">LM</span></div>
             <div className="flex gap-3">
                {!session ? (<><button onClick={() => setShowPricingModal(true)} className="text-xs font-bold text-slate-500 hover:text-slate-900 hidden sm:block">Pricing</button><button onClick={() => setShowAuthModal(true)} className="btn-rect bg-slate-900 text-white text-xs font-bold px-4 py-2">Start Free Trial</button></>) : (<div className="flex items-center gap-2"><button onClick={handleNewChat} className="p-2 text-slate-400 hover:text-slate-900"><Icons.Plus /></button><button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">{session.user.email[0].toUpperCase()}</button>{showUserMenu && (<div className="absolute top-14 right-4 w-40 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"><button onClick={() => setShowPricingModal(true)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Subscription</button><button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Log Out</button></div>)}</div>)}
             </div>
          </header>
          <main className="flex-1 flex flex-col px-4 pb-0 overflow-y-auto">
             {!session ? (<DashboardLanding onAction={(mode) => { triggerMode(mode); }} />) : (<>
                <div className="flex-1 overflow-y-auto w-full py-6" ref={scrollRef}>
                  {messages.length === 0 ? (<div className="h-full flex flex-col items-center justify-center p-4 text-center"><div className={`mb-6 p-4 rounded-lg border ${activeMode === 'image' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>{activeMode === 'image' ? <Icons.Camera /> : <Icons.Book />}</div><h1 className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}>{activeMode === 'image' ? 'Visual Inspection Mode' : 'Regulatory Consultant Mode'}</h1><p className="text-slate-500 text-sm max-w-sm">{activeMode === 'image' ? 'Upload a photo to detect Priority (P) violations.' : 'Ask questions about Washtenaw County food code.'}</p></div>) : (<div className="flex flex-col w-full max-w-3xl mx-auto gap-6">{messages.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-5 rounded-lg text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{msg.image && <img src={msg.image} alt="Upload" className="rounded-md mb-3 border border-white/20" />}{msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? <div className="loader" /> : <div className="whitespace-pre-wrap">{msg.content}</div>}</div></div>))}</div>)}
                </div>
                <div className="shrink-0 pb-6"><InputBox input={input} setInput={setInput} handleSend={handleSend} handleImage={handleImage} isSending={isSending} fileInputRef={fileInputRef} selectedImage={selectedImage} setSelectedImage={setSelectedImage} inputRef={inputRef} activeMode={activeMode} setActiveMode={setActiveMode} session={session} /></div>
             </>)}
          </main>
        </div>
      </div>
    </>
  )
}
