'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
// Removing SessionGuard import if the user doesn't have the file, but previous code implies they do. 
// Assuming SessionGuard is in '@/components/SessionGuard'
// If they deleted their documents folder, they still need the component file. 
// I'll include a dummy internal SessionGuard just in case, or assume imports work. 
// User said: "I want to go ahead and just emulate how..." implies keeping current capability.
// I'll stick to their imports.
import SessionGuard from '@/components/SessionGuard' 
import Script from 'next/script'
import Image from 'next/image'

// --- CONSTANTS ---
const COUNTY_LABELS = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const COUNTY_SUGGESTIONS = {
  washtenaw: [
    'What happens if my walk-in is at 48°F during an inspection?',
    'How fast do I have to cool chili from 135°F to 41°F?',
    'What is considered an imminent health hazard?',
    'Protocol for employee vomiting in kitchen?'
  ]
}

const AUDIT_CHECKLIST = [
  {
    category: 'Temperature Control',
    items: [
      { id: 'cold_holding', label: 'Cold holding at 41°F or below', critical: true },
      { id: 'hot_holding', label: 'Hot holding at 135°F or above', critical: true },
      { id: 'cooking_temps', label: 'Proper cooking temperatures documented', critical: true },
      { id: 'cooling', label: 'Cooling procedures (135°F to 70°F in 2hrs)', critical: true },
      { id: 'thermometers', label: 'Calibrated thermometers available', critical: false }
    ]
  },
  {
    category: 'Personal Hygiene',
    items: [
      { id: 'handwashing', label: 'Handwashing sinks accessible', critical: true },
      { id: 'no_bare_hand', label: 'No bare hand contact with RTE foods', critical: true }
    ]
  },
  {
    category: 'Facility',
    items: [
      { id: 'three_comp_sink', label: '3-comp sink setup correct', critical: true },
      { id: 'pest_control', label: 'No evidence of pests', critical: true }
    ]
  }
]

function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

// --- AUTH MODAL ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)
  const supabase = createClient()

  useEffect(() => {
    setView(defaultView)
    setMessage(null)
  }, [isOpen, defaultView])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      })
      if (error) throw error
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { county: 'washtenaw' }
          }
        })
        if (error) throw error
        if (data?.user && !data?.session) {
          setMessage({ type: 'success', text: 'Check email for link.' })
        } else if (data?.session) {
          window.location.href = '/'
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/'
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-[#1C1C1C] border border-[#333] shadow-2xl p-8 rounded-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#666] hover:text-white">✕</button>
        <h2 className="text-lg font-bold text-white mb-6 text-center uppercase tracking-wide">
          {view === 'signup' ? 'Initialize Account' : 'Secure Login'}
        </h2>
        <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 p-3 bg-[#222] border border-[#333] hover:border-[#3ECF8E] hover:text-[#3ECF8E] text-[#CCC] rounded-lg transition-all mb-6 font-mono text-xs font-bold">
           <span>CONTINUE WITH GOOGLE</span>
        </button>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-[#111] border border-[#333] rounded-lg text-white text-sm outline-none focus:border-[#3ECF8E]" placeholder="Operator Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 bg-[#111] border border-[#333] rounded-lg text-white text-sm outline-none focus:border-[#3ECF8E]" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#3ECF8E] hover:bg-[#34D399] text-[#000] font-bold py-3 rounded-lg text-sm uppercase tracking-wide disabled:opacity-50">
            {loading ? 'Authenticating...' : view === 'signup' ? 'Create ID' : 'Enter System'}
          </button>
        </form>
        {message && <p className={`mt-4 text-xs text-center ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>}
        <div className="mt-6 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-[#666] hover:text-white transition-colors">
            {view === 'signup' ? 'Existing User? Login' : 'Need Access? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- COMPLIANCE CONSOLE (Merged Layout) ---
const ComplianceConsole = ({ onRequireAuth }) => {
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [userPlan, setUserPlan] = useState('starter')
  const [activeCounty, setActiveCounty] = useState('washtenaw')
  
  // "Started" state tracks if user has asked first question
  const [hasStarted, setHasStarted] = useState(false)

  // Audit State
  const [activeTab, setActiveTab] = useState('chat')
  const [auditResults, setAuditResults] = useState({})
  const [auditNotes, setAuditNotes] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null) // Chat Input Ref

  useEffect(() => {
     createClient().auth.getSession().then(({data}) => {
       setSession(data.session)
       // If we have a session, maybe fetch previous chats here later
     })
  }, [])

  useEffect(() => {
    if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, hasStarted])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() && !selectedImage) return
    
    // Trigger the layout shift immediately
    if (!hasStarted) setHasStarted(true)

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(p => [...p, newMsg])
    setInput(''); const img = selectedImage; setSelectedImage(null); setIsSending(true)
    setMessages(p => [...p, { role: 'assistant', content: '' }]) // Loading placeholder

    try {
       // Real API Call
       const res = await fetch('/api/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
            messages: [...messages, newMsg], 
            image: img, 
            county: activeCounty 
         })
       })
       
       if (res.status === 401 || res.status === 403) {
          setMessages(p => {
            const u = [...p]; u.pop(); // Remove placeholder
            u.push({ role: 'assistant', content: "Please log in to continue analyzing compliance regulations." })
            return u
          })
          if (onRequireAuth) onRequireAuth()
       } else {
          const data = await res.json()
          setMessages(p => {
            const u = [...p]; 
            u[u.length -1] = { role: 'assistant', content: data.message || "Error." }
            return u
          })
       }
    } catch (err) {
       console.error(err)
       setMessages(p => {
          const u = [...p]; u[u.length -1].content = "Network error."
          return u
       })
    } finally {
       setIsSending(false)
    }
  }

  const handleSuggestionClick = (text) => {
    setHasStarted(true)
    setInput(text)
    // In a real scenario we might auto-send here, or just populate
    // Let's populate and focus
    if (inputRef.current) {
        inputRef.current.value = text;
        inputRef.current.focus();
    }
  }

  // Audit logic ...
  const handleAuditChange = (id, val) => setAuditResults(p => ({...p, [id]: val}))
  const toggleCategory = (cat) => setExpandedCategories(p => ({...p, [cat]: !p[cat]}))
  
  return (
    <div className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full h-full">
       {/* HEADERS (CONDITIONAL) */}
       
       {/* Landing State Header - Disappears on interaction */}
       {!hasStarted && (
         <div className="flex-shrink-0 flex flex-col items-center text-center mb-8 transition-all duration-500 pt-24 px-4">
           <h1 className="text-4xl md:text-5xl font-medium text-white mb-4 tracking-tight">
             Train your team before the inspector arrives
           </h1>
           <div className="flex flex-col gap-2 text-[#888] text-sm max-w-2xl">
              <p>Instant answers from <strong className="text-white">Washtenaw County</strong> regulations.</p>
              <p className="text-xs opacity-70">Trained on 1000+ local enforcement docs.</p>
           </div>
         </div>
       )}

       {/* Active State - Fill Screen */}
       <div className={classNames(
           "flex-1 bg-[#1C1C1C] border border-[#2C2C2C] rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-700 ease-in-out",
           hasStarted ? "h-full" : "h-auto min-h-[400px]"
       )}>
          
          {/* Tool Header (Visible only when started OR if we want a constant bar) */}
          {hasStarted && (
             <div className="h-12 bg-[#232323] border-b border-[#2C2C2C] flex items-center px-4 justify-between flex-shrink-0">
                 <span className="text-xs font-bold text-[#3ECF8E]">ProtocolLM Active</span>
                 <button 
                    onClick={() => setHasStarted(false)} // Temporary reset for demo
                    className="text-[10px] text-[#666] hover:text-white uppercase"
                 >
                    Clear Session
                 </button>
             </div>
          )}

          {/* Main Content Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scroll relative bg-[#1C1C1C]">
              
              {!hasStarted ? (
                 /* EMPTY STATE - SUGGESTIONS */
                 <div className="h-full flex flex-col items-center justify-center pb-10">
                    <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3 px-2">
                        {COUNTY_SUGGESTIONS.washtenaw.map((s, i) => (
                           <button 
                             key={i} 
                             onClick={() => handleSuggestionClick(s)}
                             className="text-left p-4 rounded-xl border border-[#333] hover:border-[#3ECF8E] bg-[#18181B] hover:bg-[#222] transition-all text-sm text-[#DDD] group"
                           >
                              <span className="text-[#666] text-[10px] block mb-1 font-bold group-hover:text-[#3ECF8E]">{i===0?'STORAGE':i===1?'COOLING':i===2?'CRITICAL':i===3?'SICKNESS':''}</span>
                              {s}
                           </button>
                        ))}
                    </div>
                 </div>
              ) : (
                 /* MESSAGES */
                 <div className="space-y-6 max-w-3xl mx-auto pt-4">
                    {messages.map((msg, i) => (
                      <div key={i} className={classNames("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                         {msg.role === 'assistant' && <div className="w-8 h-8 bg-[#333] rounded flex items-center justify-center shrink-0"><div className="w-4 h-4 bg-[#3ECF8E] rounded-sm"/></div>}
                         <div className={classNames("p-4 rounded-xl text-sm leading-relaxed max-w-[85%]", 
                            msg.role === 'user' 
                              ? "bg-[#333] text-white" 
                              : "bg-transparent text-[#CCC] pl-0 pt-2"
                         )}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                         </div>
                      </div>
                    ))}
                    {isSending && <div className="pl-11 text-[#666] text-xs font-mono animate-pulse">Analyzing codes...</div>}
                 </div>
              )}

          </div>

          {/* INPUT AREA */}
          <div className="p-4 bg-[#18181B] border-t border-[#2C2C2C]">
             <form onSubmit={handleSend} className="relative max-w-3xl mx-auto">
                 <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)}
                    ref={inputRef}
                    placeholder={hasStarted ? "Reply..." : "Ask anything..."}
                    className="w-full bg-[#111] text-white p-4 pr-12 rounded-xl border border-[#333] focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E] transition-all outline-none text-sm shadow-inner"
                 />
                 <button 
                    type="submit" 
                    disabled={!input.trim() || isSending}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-[#3ECF8E] text-black rounded-lg flex items-center justify-center hover:bg-[#2ecc71] disabled:bg-[#222] disabled:text-[#444]"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                 </button>
             </form>
             {!hasStarted && <p className="text-center text-[#444] text-[10px] mt-3 font-mono uppercase tracking-widest">Secure / Encrypted / Validated</p>}
          </div>

       </div>
    </div>
  )
}


// ==========================================
// MAIN LAYOUT & LOGIC
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
     const init = async () => {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
        setIsLoading(false)
     }
     init()
     const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
     return () => l.subscription.unsubscribe()
  }, [supabase])

  const triggerAuth = () => setShowAuth(true)

  if (isLoading) return <div className="min-h-screen bg-[#121212]" />

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-[#ECECEC] font-sans selection:bg-[#3ECF8E] selection:text-[#121212]">
      {session && <SessionGuard userId={session.user.id} />}
      
      {/* Global Navbar */}
      <nav className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-b border-[#2C2C2C] bg-[#121212] sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <span className="font-bold tracking-tight text-lg">protocol<span className="text-[#3ECF8E]">LM</span></span>
        </div>
        <div className="flex gap-4 items-center">
          {session ? (
            <>
             <span className="hidden md:block text-xs font-mono text-[#666]">{session.user.email}</span>
             <button onClick={() => supabase.auth.signOut()} className="text-xs text-red-400 hover:text-white border border-red-900/30 bg-red-900/10 px-3 py-1.5 rounded">Log Out</button>
            </>
          ) : (
            <>
             <button onClick={() => { setAuthView('login'); triggerAuth() }} className="text-xs font-bold text-[#888] hover:text-white">Log In</button>
             <button onClick={() => { setAuthView('signup'); triggerAuth() }} className="bg-[#3ECF8E] hover:bg-[#34b27b] text-[#151515] px-4 py-1.5 rounded-md text-xs font-bold shadow-[0_0_15px_-3px_rgba(62,207,142,0.3)]">Start Trial</button>
            </>
          )}
        </div>
      </nav>

      {/* Main App Body */}
      <div className="flex-1 flex flex-col pt-0 pb-4 px-4">
         {/* 
            If User is LOGGED IN -> They go straight to the chat.
            If User is GUEST -> They see the landing copy + the chat.
         */}
         <ComplianceConsole onRequireAuth={triggerAuth} />
      </div>

      {/* Bottom Links (Footer) - Hidden if deep in chat maybe? Or kept. Keeping for compliance. */}
      <footer className="py-4 text-center border-t border-[#2C2C2C] mt-auto">
         <div className="flex justify-center gap-6 text-[10px] text-[#666] font-bold uppercase tracking-widest">
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
         </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      {/* Globals */}
      <style jsx global>{`
        /* Replaces your global css if needed */
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  )
}
