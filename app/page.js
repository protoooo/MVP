'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- 1. THE LIVING BLUEPRINT (Schematic Animation) ---
const LiveBlueprint = () => {
  const [activeZone, setActiveZone] = useState(0) // 0: Draw, 1: Cooler, 2: Prep, 3: Sink

  useEffect(() => {
    const loop = async () => {
      while (true) {
        // Phase 0: Idle / Draw (Wait for lines to finish)
        setActiveZone(0)
        await new Promise(r => setTimeout(r, 2000))

        // Phase 1: Scan Walk-In
        setActiveZone(1)
        await new Promise(r => setTimeout(r, 4000))
        setActiveZone(0)
        await new Promise(r => setTimeout(r, 800))

        // Phase 2: Scan Prep Table
        setActiveZone(2)
        await new Promise(r => setTimeout(r, 4000))
        setActiveZone(0)
        await new Promise(r => setTimeout(r, 800))

        // Phase 3: Scan Sink
        setActiveZone(3)
        await new Promise(r => setTimeout(r, 4000))
      }
    }
    loop()
  }, [])

  return (
    <div className="relative w-full max-w-lg aspect-square flex items-center justify-center bg-slate-50 rounded-full border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
      
      {/* RADAR GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.05]" 
           style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <style jsx>{`
        .draw-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw 3s ease-out forwards;
        }
        @keyframes draw { to { stroke-dashoffset: 0; } }
        
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        
        .pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform: scale(0.9) translateY(10px); }
        @keyframes pop-in { to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      <svg viewBox="0 0 400 400" className="w-full h-full p-8">
        
        {/* --- ARCHITECTURE (Static Lines) --- */}
        <g stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
           
           {/* Walk-In Cooler (Left) */}
           <path d="M50 120 L130 120 L130 280 M50 280 L50 120" className="draw-path" />
           <path d="M120 180 L120 220" strokeWidth="3" className="draw-path" /> 
           <text x="50" y="110" fontSize="9" fill="#94a3b8" fontFamily="monospace" fontWeight="bold" letterSpacing="1">UNIT: WALK-IN</text>

           {/* Prep Table (Center) */}
           <path d="M160 200 L280 200 L280 210 L160 210 Z" className="draw-path" style={{animationDelay: '0.5s'}} />
           <path d="M170 210 L170 280 M270 210 L270 280" className="draw-path" style={{animationDelay: '0.5s'}} />
           <rect x="200" y="196" width="40" height="4" fill="#cbd5e1" stroke="none" />
           <text x="185" y="295" fontSize="9" fill="#94a3b8" fontFamily="monospace" fontWeight="bold" letterSpacing="1">STATION: PREP</text>

           {/* 3-Comp Sink (Right) */}
           <path d="M300 180 L380 180 L380 220 L300 220 Z" className="draw-path" style={{animationDelay: '1s'}} />
           <path d="M320 180 V160 M360 180 V160" className="draw-path" style={{animationDelay: '1s'}} />
           <path d="M320 160 Q340 130 360 160" className="draw-path" style={{animationDelay: '1s'}} />
           <path d="M310 220 L310 280 M370 220 L370 280" className="draw-path" style={{animationDelay: '1s'}} />
           <text x="310" y="150" fontSize="9" fill="#94a3b8" fontFamily="monospace" fontWeight="bold" letterSpacing="1">UNIT: SINK</text>
        </g>

        {/* --- ACTIVE SCANNERS --- */}
        
        {/* ZONE 1: COOLER VIOLATION (Red) */}
        <g style={{ display: activeZone === 1 ? 'block' : 'none' }}>
           <circle cx="90" cy="200" r="4" fill="#ef4444" />
           <circle cx="90" cy="200" r="4" stroke="#ef4444" strokeWidth="1" fill="none" className="pulse-ring" />
           <path d="M90 200 L90 160 L150 160" stroke="#ef4444" strokeWidth="1" fill="none" strokeDasharray="4" />
           
           <g transform="translate(150, 140)" className="pop-in">
             <rect width="140" height="40" fill="white" stroke="#ef4444" strokeWidth="1" rx="4" filter="drop-shadow(0px 4px 6px rgba(239,68,68,0.2))" />
             <text x="10" y="15" fontSize="8" fill="#ef4444" fontWeight="bold" fontFamily="monospace">⚠ PRIORITY VIOLATION</text>
             <text x="10" y="28" fontSize="8" fill="#334155" fontFamily="sans-serif" fontWeight="bold">Raw chicken above RTE.</text>
           </g>
        </g>

        {/* ZONE 2: PREP VIOLATION (Blue - Protocol) */}
        <g style={{ display: activeZone === 2 ? 'block' : 'none' }}>
           <circle cx="220" cy="195" r="4" fill="#6b85a3" />
           <circle cx="220" cy="195" r="4" stroke="#6b85a3" strokeWidth="1" fill="none" className="pulse-ring" />
           <path d="M220 195 L220 140" stroke="#6b85a3" strokeWidth="1" fill="none" strokeDasharray="4" />
           
           <g transform="translate(150, 100)" className="pop-in">
             <rect width="140" height="40" fill="white" stroke="#6b85a3" strokeWidth="1" rx="4" filter="drop-shadow(0px 4px 6px rgba(107,133,163,0.2))" />
             <text x="10" y="15" fontSize="8" fill="#6b85a3" fontWeight="bold" fontFamily="monospace">ℹ THAWING PROTOCOL</text>
             <text x="10" y="28" fontSize="8" fill="#334155" fontFamily="sans-serif" fontWeight="bold">Use running water &lt;70°F.</text>
           </g>
        </g>

        {/* ZONE 3: SINK VIOLATION (Amber) */}
        <g style={{ display: activeZone === 3 ? 'block' : 'none' }}>
           <circle cx="340" cy="200" r="4" fill="#f59e0b" />
           <circle cx="340" cy="200" r="4" stroke="#f59e0b" strokeWidth="1" fill="none" className="pulse-ring" />
           <path d="M340 200 L340 240 L260 240" stroke="#f59e0b" strokeWidth="1" fill="none" strokeDasharray="4" />
           
           <g transform="translate(120, 220)" className="pop-in">
             <rect width="140" height="40" fill="white" stroke="#f59e0b" strokeWidth="1" rx="4" filter="drop-shadow(0px 4px 6px rgba(245,158,11,0.2))" />
             <text x="10" y="15" fontSize="8" fill="#b45309" fontWeight="bold" fontFamily="monospace">⚠ PRIORITY FOUNDATION</text>
             <text x="10" y="28" fontSize="8" fill="#334155" fontFamily="sans-serif" fontWeight="bold">Quat Sanitizer &lt; 150ppm.</text>
           </g>
        </g>

      </svg>
    </div>
  )
}

// --- 2. AUTH MODAL ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { setView(defaultView); setMessage(null) }, [isOpen, defaultView])

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true); setMessage(null)
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, data: { county: 'washtenaw' } } })
        if (error) throw error
        if (data.session) window.location.href = '/pricing'
        else setMessage({ type: 'success', text: 'Verification link sent.' })
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: profile } = await supabase.from('user_profiles').select('is_subscribed').eq('id', data.session.user.id).single()
        if (profile?.is_subscribed) window.location.href = '/documents'
        else window.location.href = '/pricing'
      }
    } catch (error) { setMessage({ type: 'error', text: error.message }) } finally { setLoading(false) }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8fafc]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-8 rounded-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">✕</button>
        <h2 className="text-xl font-bold text-slate-900 mb-6 font-mono tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-lg" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-lg" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#6b85a3] hover:bg-[#5a728a] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all font-mono shadow-md">{loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}</button>
        </form>
        {message && <div className={`mt-4 p-3 text-xs font-mono border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-400 hover:text-[#6b85a3] font-mono">{view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}</button></div>
      </div>
    </div>
  )
}

// --- MAIN CONTENT ---
function MainContent() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  const router = useRouter()
  const searchParams = useSearchParams()
   
  useEffect(() => {
    setMounted(true)
    const authParam = searchParams.get('auth')
    if (authParam) { setAuthView(authParam); setShowAuth(true); window.history.replaceState({}, '', '/') }
  }, [searchParams])

  const openAuth = (view) => { setAuthView(view); setShowAuth(true) }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center fixed top-0 left-0 right-0 z-20 bg-[#f8fafc]/95 backdrop-blur-sm">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900">protocol<span style={{ color: '#6b85a3' }}>LM</span></h1>
        </div>
        <div className={`flex gap-6 text-xs font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#6b85a3] border border-[#6b85a3] rounded-lg hover:bg-[#6b85a3] hover:text-white transition-all">Create Account</button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-24 gap-12">
        
        {/* LEFT: TEXT */}
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl md:text-5xl font-mono font-medium text-slate-900 tracking-tight leading-tight mb-8">
            Train Your Team Before the Health Department Does.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0 mb-10">
            Avoid violations and prepare for health inspections with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data, the Michigan Modified Food Law, and the Federal Food Code.
          </p>
          <button onClick={() => openAuth('signup')} className="bg-[#6b85a3] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-[#5a728a] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            Start 30-Day Free Trial
          </button>
        </div>

        {/* RIGHT: THE LIVING BLUEPRINT (No more phone glitching) */}
        <div className={`flex-1 flex justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <LiveBlueprint />
        </div>

      </div>
      
      {/* FOOTER */}
      <div className="w-full py-8 text-center bg-white border-t border-slate-200">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
           <a href="/terms" className="hover:text-[#6b85a3]">Terms</a>
           <span>© 2025 protocolLM</span>
           <a href="/privacy" className="hover:text-[#6b85a3]">Privacy</a>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div></div>}>
      <MainContent />
    </Suspense>
  )
}
