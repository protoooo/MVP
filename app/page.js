'use client'

// --- IMPORTS ---
import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import Image from 'next/image'
import SessionGuard from '@/components/SessionGuard'

// --- DATA & CONSTANTS ---
const AUDIT_CHECKLIST = [
  {
    category: 'Temperature Control',
    items: [
      { id: 'cold_holding', label: 'Cold holding at 41°F or below', critical: true },
      { id: 'hot_holding', label: 'Hot holding at 135°F or above', critical: true },
      { id: 'cooking_temps', label: 'Proper cooking temperatures documented', critical: true },
      { id: 'cooling', label: 'Cooling procedures (135°F to 70°F in 2hrs, 70°F to 41°F in 4hrs)', critical: true },
      { id: 'thermometers', label: 'Calibrated thermometers available and used', critical: false }
    ]
  },
  {
    category: 'Personal Hygiene',
    items: [
      { id: 'handwashing', label: 'Handwashing sinks accessible and stocked', critical: true },
      { id: 'hand_antiseptic', label: 'Hand antiseptic used properly', critical: false },
      { id: 'no_bare_hand', label: 'No bare hand contact with RTE foods', critical: true },
      { id: 'hair_restraints', label: 'Hair restraints worn properly', critical: false }
    ]
  },
  {
    category: 'Cross Contamination',
    items: [
      { id: 'storage_separation', label: 'Raw meats stored below RTE foods', critical: true },
      { id: 'cutting_boards', label: 'Color-coded cutting boards used correctly', critical: false },
      { id: 'equipment_cleaning', label: 'Food contact surfaces sanitized', critical: true }
    ]
  },
  {
    category: 'Facility',
    items: [
      { id: 'three_comp_sink', label: '3-compartment sink setup correct', critical: true },
      { id: 'pest_control', label: 'No evidence of pests', critical: true }
    ]
  }
]

// ==========================================
// 1. LANDING PAGE COMPONENTS (Marketing)
// ==========================================

const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isThinking])

  const SEQUENCE = [
    { text: "We received a notice for a 'Chronic Violation' in Washtenaw County. What does that mean?", response: "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2) and must submit a Risk Control Plan." },
    { text: 'Our certified manager quit yesterday. Do we have to close the kitchen?', response: "COMPLIANT: No. Michigan Food Law (Sec 289.2129) allows a 3-month grace period. However, you must notify the Washtenaw County Health Department immediately." },
    { text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?", response: 'VIOLATION: Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.' }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    const runSimulation = async () => {
      setHasStarted(true) 
      while (isMounted) {
        for (const step of SEQUENCE) {
          if (!isMounted) return
          setIsTyping(true); await wait(900)
          setIsTyping(false)
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setIsThinking(true); await wait(1800)
          setIsThinking(false)
          setMessages((prev) => [...prev, { role: 'assistant', content: step.response }])
          await wait(4500)
        }
        await wait(1200)
        setMessages((prev) => prev.slice(-4))
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text) => {
    if (text.includes('ACTION REQUIRED')) return (<span><span className="text-[#EF4444] font-bold">ACTION REQUIRED</span>{text.split('ACTION REQUIRED')[1]}</span>)
    if (text.includes('VIOLATION')) return (<span><span className="text-[#EF4444] font-bold">VIOLATION</span>{text.split('VIOLATION')[1]}</span>)
    if (text.includes('COMPLIANT')) return (<span><span className="text-[#3ECF8E] font-bold">COMPLIANT</span>{text.split('COMPLIANT')[1]}</span>)
    return text
  }

  return (
    <div className="flex flex-col h-full bg-[#1C1C1C] border border-[#2C2C2C] rounded-md overflow-hidden shadow-2xl">
       {/* Header */}
       <div className="h-10 border-b border-[#2C2C2C] bg-[#232323] flex items-center justify-between px-4 shrink-0">
         <div className="flex gap-3 items-center"><span className="font-sans text-[11px] font-medium text-[#EDEDED] opacity-80">protocol<span className="text-[#3B82F6]">LM</span></span></div>
         <div className="flex gap-2 items-center"><div className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full animate-pulse"></div><span className="text-[10px] font-medium text-[#3ECF8E] tracking-wide">LIVE</span></div>
       </div>
       {/* Feed */}
       <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#1C1C1C] custom-scroll">
         {!hasStarted && <div className="h-full flex items-center justify-center text-[#888] text-xs uppercase tracking-widest">Washtenaw DB Initialized</div>}
         {messages.map((msg, i) => (
           <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
             <div className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed rounded-md border ${msg.role === 'user' ? 'bg-[#2C2C2C] text-[#EDEDED] border-[#3C3C3C]' : 'bg-[#1C1C1C] text-[#C2C2C2] border-transparent pl-0'}`}>
               {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
             </div>
           </div>
         ))}
         {(isThinking) && <div className="pl-0"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '40px', height: '40px' }} /></div>}
       </div>
       {/* Fake Input */}
       <div className="p-4 bg-[#232323] border-t border-[#2C2C2C]"><div className="w-full bg-[#161616] border border-[#333] rounded-md px-3 py-2.5 flex gap-3"><span className="text-[#3B82F6] text-xs">{'>'}</span><div className="flex-1 text-[13px] text-[#EDEDED]">{isTyping && <span className="inline-block w-1.5 h-4 bg-[#3B82F6] animate-pulse"/>}</div></div></div>
    </div>
  )
}


// ==========================================
// 2. REAL DASHBOARD COMPONENTS (Authenticated)
// ==========================================

const DashboardLayout = ({ user, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  
  // Audit State
  const [auditResults, setAuditResults] = useState({})
  const [auditNotes, setAuditNotes] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  // Scroll chat
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    const text = input.trim()
    if (!text && !selectedImage) return

    const newMsg = { role: 'user', content: text, image: selectedImage }
    setMessages(p => [...p, newMsg])
    setInput(''); setSelectedImage(null); setIsSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], county: 'washtenaw' }) // Locked to Washtenaw
      })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.message || 'Error connecting.' }])
    } catch (e) { console.error(e) } 
    finally { setIsSending(false) }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
       const reader = new FileReader()
       reader.onloadend = () => setSelectedImage(reader.result)
       reader.readAsDataURL(file)
    }
  }

  const toggleAudit = (id, status) => {
    setAuditResults(prev => ({ ...prev, [id]: status }))
  }

  // Calculate Audit Score
  const passed = Object.values(auditResults).filter(s => s === 'pass').length
  const total = AUDIT_CHECKLIST.reduce((a,b) => a + b.items.length, 0)

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-[#EDEDED] font-sans">
       {/* Nav */}
       <nav className="h-16 border-b border-[#2C2C2C] bg-[#121212] flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="text-lg font-bold text-white">protocol<span className="text-[#3B82F6]">LM</span></div>
          <div className="flex gap-4 items-center">
             <span className="text-xs font-mono text-[#666] uppercase tracking-widest hidden md:block">{user.email}</span>
             <button onClick={onSignOut} className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-3 py-1.5 rounded bg-red-900/10">Sign Out</button>
          </div>
       </nav>

       <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-64 border-r border-[#2C2C2C] bg-[#161616] p-4 gap-4">
             <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest">Modules</div>
             <button onClick={() => setActiveTab('chat')} className={`text-left px-4 py-2 text-xs font-bold rounded border ${activeTab === 'chat' ? 'bg-[#3B82F6] border-[#3B82F6] text-black' : 'bg-[#222] border-[#333] text-[#AAA]'}`}>
                ASSISTANT
             </button>
             <button onClick={() => setActiveTab('audit')} className={`text-left px-4 py-2 text-xs font-bold rounded border ${activeTab === 'audit' ? 'bg-[#3B82F6] border-[#3B82F6] text-black' : 'bg-[#222] border-[#333] text-[#AAA]'}`}>
                AUDIT PROTOCOL
             </button>
          </aside>

          {/* Main View */}
          <main className="flex-1 flex flex-col relative bg-[#121212]">
             {activeTab === 'chat' ? (
               <>
                 <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
                    {messages.length === 0 && (
                       <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                          <h1 className="text-2xl font-bold text-white mb-2">Command Center</h1>
                          <p className="text-sm text-[#888] max-w-md">Connected to Washtenaw County Regulatory Database. Ask a question or upload an image of a violation.</p>
                       </div>
                    )}
                    {messages.map((m, i) => (
                       <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-md text-sm leading-relaxed whitespace-pre-wrap border ${m.role === 'user' ? 'bg-[#252525] border-[#333] text-[#EDEDED]' : 'bg-transparent border-transparent text-[#CCC] pl-0'}`}>
                             {m.image && <img src={m.image} className="mb-2 max-h-64 rounded border border-[#444]" alt="upload" />}
                             {m.content}
                          </div>
                       </div>
                    ))}
                    {isSending && <div className="pl-0 py-2"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '40px', height: '40px' }} /></div>}
                 </div>

                 <div className="p-4 bg-[#18181B] border-t border-[#2C2C2C]">
                   {selectedImage && (
                     <div className="absolute bottom-20 left-4 p-2 bg-[#222] border border-[#333] rounded shadow-lg flex items-start gap-2">
                        <img src={selectedImage} className="h-12 w-auto rounded" />
                        <button onClick={() => setSelectedImage(null)} className="text-xs text-red-400 hover:text-white">Remove</button>
                     </div>
                   )}
                   <form onSubmit={handleSend} className="flex gap-2">
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                     <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 text-[#666] hover:text-[#3B82F6] border border-[#333] rounded bg-[#111]">+</button>
                     <input 
                        className="flex-1 bg-[#111] border border-[#333] rounded px-4 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
                        placeholder="Query database..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                     />
                     <button type="submit" className="px-6 bg-[#3B82F6] hover:bg-[#2563EB] text-black font-bold text-xs rounded uppercase tracking-wide" disabled={isSending}>
                       Run
                     </button>
                   </form>
                 </div>
               </>
             ) : (
               // AUDIT UI
               <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                  <div className="max-w-3xl mx-auto">
                     <div className="mb-8 flex items-center justify-between p-6 bg-[#1C1C1C] border border-[#333] rounded-lg">
                        <div>
                           <h2 className="text-xl font-bold text-white">Mock Inspection Audit</h2>
                           <p className="text-xs text-[#666]">WASHTENAW STANDARDS</p>
                        </div>
                        <div className="text-right">
                           <div className="text-3xl font-bold text-[#3B82F6]">{Math.round((passed / total) * 100)}%</div>
                           <div className="text-[10px] text-[#888] uppercase">Compliance Score</div>
                        </div>
                     </div>
                     <div className="space-y-4">
                        {AUDIT_CHECKLIST.map(cat => (
                           <div key={cat.category} className="bg-[#1C1C1C] border border-[#333] rounded-lg overflow-hidden">
                              <div className="px-4 py-3 bg-[#222] text-sm font-bold text-[#EDEDED] uppercase tracking-wide border-b border-[#333]">
                                 {cat.category}
                              </div>
                              <div className="divide-y divide-[#2C2C2C]">
                                 {cat.items.map(item => (
                                    <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                                       <div>
                                          <p className="text-sm text-[#CCC]">{item.label}</p>
                                          {item.critical && <span className="text-[9px] text-red-400 uppercase font-bold tracking-wider">Critical Item</span>}
                                       </div>
                                       <div className="flex gap-1">
                                          <button 
                                            onClick={() => toggleAudit(item.id, 'pass')}
                                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded border ${auditResults[item.id] === 'pass' ? 'bg-[#064E3B] text-[#6EE7B7] border-[#059669]' : 'bg-[#111] text-[#444] border-[#222]'}`}
                                          >Pass</button>
                                          <button 
                                            onClick={() => toggleAudit(item.id, 'fail')}
                                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded border ${auditResults[item.id] === 'fail' ? 'bg-[#7F1D1D] text-[#FCA5A5] border-[#DC2626]' : 'bg-[#111] text-[#444] border-[#222]'}`}
                                          >Fail</button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
             )}
          </main>
       </div>
       <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: #111; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; }
       `}</style>
    </div>
  )
}


// ==========================================
// 3. THE MAIN EXPORT (Logic Router)
// ==========================================

export default function Page() {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authView, setAuthView] = useState('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // 1. Initial Session Check
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setIsLoading(false)
    }
    init()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setShowAuthModal(false)
    })

    return () => authListener.subscription.unsubscribe()
  }, [supabase])

  // 2. Auth Handlers
  const handleAuth = async (view, email, password) => {
    // Placeholder logic matching your existing modal components
    if (view === 'signup') {
        await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
        alert('Check your email for the confirmation link.')
    } else {
        await supabase.auth.signInWithPassword({ email, password })
    }
  }

  const openAuth = (view) => {
    setAuthView(view)
    setShowAuthModal(true)
  }

  // --- RENDER LOGIC ---

  if (isLoading) return <div className="min-h-screen bg-[#121212]" />

  // A. LOGGED IN USER -> DASHBOARD
  if (session) {
    return (
       <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}>
          <SessionGuard userId={session.user.id} />
          <DashboardInterface user={session.user} onSignOut={() => supabase.auth.signOut()} />
       </Suspense>
    )
  }

  // B. LOGGED OUT USER -> LANDING PAGE
  return (
    <div className="min-h-screen w-full bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3B82F6] selection:text-[#121212] flex flex-col relative overflow-x-hidden">
      <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js" type="module" strategy="afterInteractive" />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-0 border-b border-[#2C2C2C] bg-[#121212]/80 backdrop-blur-md">
        <div className="w-full max-w-6xl flex justify-between items-center h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <span className="text-xl font-bold tracking-tight text-[#EDEDED]">protocol<span className="text-[#3B82F6]">LM</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/pricing')} className="text-xs font-medium text-[#888] hover:text-white transition-colors">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-medium text-[#888] hover:text-white transition-colors">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-[#3B82F6] hover:bg-[#2563eb] text-white px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-[0_0_10px_rgba(62,207,142,0.15)]">Start Free Trial</button>
          </div>
          <button onClick={() => openAuth('login')} className="md:hidden text-xs font-medium text-[#3B82F6]">Log In</button>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-24 flex flex-col items-center relative z-10 min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-5xl text-center mb-6 mt-10 md:mt-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium text-[#EDEDED] tracking-tight leading-tight mb-3 transition-all duration-1000 md:whitespace-nowrap">
            Train your team before the inspector arrives
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px] md:text-[14px] text-[#888] leading-relaxed max-w-3xl mx-auto font-normal">
              Instant answers from <strong className="text-white">Washtenaw County</strong> regulations, <strong className="text-white">Michigan Food Law</strong>, and <strong className="text-white">FDA Code</strong>.
            </p>
          </div>
        </div>

        {/* Demo Box (Slightly taller on Desktop) */}
        <div className="w-full max-w-5xl flex justify-center h-[360px] md:h-[550px]">
           <DemoChatContent />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-[#2C2C2C] bg-[#121212] relative z-10 mt-auto">
         <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 text-xs text-[#666]">
             <div className="flex gap-6">
               <a href="/terms" className="hover:text-[#EDEDED] transition-colors">Terms</a>
               <a href="/privacy" className="hover:text-[#EDEDED] transition-colors">Privacy</a>
             </div>
             <span className="hidden md:inline text-[#333]">|</span>
             <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#2C2C2C] rounded-full px-3 py-1">
               <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
               <span className="text-[10px] font-mono uppercase tracking-wide text-[#888]">Wayne & Oakland: Coming Q1</span>
             </div>
             <span className="hidden md:inline text-[#333]">|</span>
             <span className="text-[#444]">© 2025 protocolLM</span>
         </div>
      </footer>

      {/* Auth Modal Overlay */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      `}</style>
    </div>
  )
}
