'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import Image from 'next/image'
import SessionGuard from '@/components/SessionGuard'

// --- CONSTANTS & DATA ---
const SUGGESTIONS = [
  { heading: 'Cold Storage', text: 'What happens if my walk-in is at 48°F?' },
  { heading: 'Cooling Process', text: 'How fast must I cool chili from 135°F to 41°F?' },
  { heading: 'Emergency', text: 'What is considered an imminent health hazard?' },
  { heading: 'Illness Policy', text: 'Protocol for employee vomiting in kitchen?' },
]

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
      { id: 'handwashing', label: 'Handwashing sinks accessible and stocked', critical: true },
      { id: 'hand_antiseptic', label: 'Hand antiseptic used properly', critical: false },
      { id: 'no_bare_hand', label: 'No bare hand contact with RTE foods', critical: true }
    ]
  },
  {
    category: 'Facility & Equipment',
    items: [
      { id: 'three_comp_sink', label: '3-compartment sink setup correct', critical: true },
      { id: 'pest_control', label: 'No evidence of pests', critical: true }
    ]
  }
]

function classNames(...parts) { return parts.filter(Boolean).join(' ') }

// ==========================================
// 1. THE LANDING PAGE (Logged Out)
// ==========================================

const LandingPage = ({ onAuth }) => {
  // -- MARKETING DEMO STATE --
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef(null)

  // Auto-typing logic for the demo
  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(35)
    }
    
    const runDemo = async () => {
      const sequence = [
        { text: "We received a 'Chronic Violation' notice. Implications?", response: "ACTION REQUIRED: A Chronic Violation triggers an Administrative Conference. Failure to submit a Risk Control Plan results in license limitation." },
        { text: "Can I serve a rare burger to a 10-year-old?", response: "VIOLATION: No. Michigan Modified Food Code strictly prohibits serving undercooked ground beef to Highly Susceptible Populations (children)." }
      ]

      while(isMounted) {
        for (const step of sequence) {
          if(!isMounted) return
          setInputValue(''); await wait(1000)
          for (const char of step.text) { if(!isMounted) return; await typeChar(char) }
          await wait(400)
          setMessages(p => [...p, {role: 'user', content: step.text}])
          setInputValue('')
          setIsThinking(true); await wait(2000); setIsThinking(false)
          setMessages(p => [...p, {role: 'assistant', content: step.response}])
          await wait(4000)
        }
        setMessages(prev => prev.slice(-2))
      }
    }
    runDemo()
    return () => { isMounted = false }
  }, [])

  // Auto-scroll demo
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages, isThinking])

  // Demo Formatting
  const formatDemo = (text) => {
    if (text.includes('ACTION REQUIRED')) return <span><span className="text-red-500 font-bold">ACTION REQUIRED</span>{text.replace('ACTION REQUIRED', '')}</span>
    if (text.includes('VIOLATION')) return <span><span className="text-red-500 font-bold">VIOLATION</span>{text.replace('VIOLATION', '')}</span>
    return text
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[#121212] text-[#ECECEC]">
       <nav className="fixed top-0 w-full h-16 border-b border-[#2C2C2C] bg-[#121212]/80 backdrop-blur z-50 flex items-center justify-between px-6">
         <div className="text-lg font-bold tracking-tight">protocol<span className="text-blue-600">LM</span></div>
         <div className="hidden md:flex gap-6 items-center">
           <a href="/pricing" className="text-xs font-bold text-neutral-500 hover:text-white uppercase tracking-wider">Pricing</a>
           <button onClick={() => onAuth('login')} className="text-xs font-bold text-neutral-500 hover:text-white uppercase tracking-wider">Log In</button>
           <button onClick={() => onAuth('signup')} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wider shadow-lg">Start Free Trial</button>
         </div>
         <button onClick={() => onAuth('login')} className="md:hidden text-xs font-bold text-blue-500">Log In</button>
       </nav>

       <div className="flex-1 flex flex-col items-center pt-24 px-4 pb-12 z-10">
          <div className="w-full max-w-5xl text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight leading-tight mb-3 md:whitespace-nowrap">
              Train your team before the inspector arrives
            </h1>
            <p className="text-[14px] text-[#888] leading-relaxed max-w-3xl mx-auto">
              Instant answers from <strong>Washtenaw County</strong> regulations, <strong>Michigan Food Law</strong>, and <strong>FDA Code</strong>.
            </p>
          </div>

          {/* THE DEMO BOX */}
          <div className="w-full max-w-5xl h-[500px] bg-[#1C1C1C] border border-[#2C2C2C] rounded-xl shadow-2xl overflow-hidden flex flex-col">
             <div className="h-10 bg-[#232323] border-b border-[#2C2C2C] flex items-center justify-between px-4">
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-mono">Protocol_LM // Preview</span>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div><span className="text-[10px] text-green-500 font-bold uppercase">Live</span></div>
             </div>
             <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto custom-scroll space-y-4">
                {messages.map((m,i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] p-3.5 text-sm leading-relaxed rounded-xl ${m.role==='user'?'bg-[#252525] text-white border border-[#333]':'text-[#DDD]'}`}>
                        {m.role === 'assistant' ? formatDemo(m.content) : m.content}
                     </div>
                  </div>
                ))}
                {isThinking && <div className="pl-2"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{width:'30px',height:'30px'}} /></div>}
             </div>
             <div className="p-4 bg-[#232323] border-t border-[#2C2C2C]">
                <div className="flex items-center gap-3 bg-[#161616] border border-[#333] px-4 py-3 rounded-lg">
                  <span className="text-blue-600 text-xs font-mono">{'>'}</span>
                  <div className="flex-1 text-sm text-[#CCC] relative min-h-[20px]">{inputValue}{isTyping&&<span className="inline-block w-1.5 h-4 bg-blue-600 ml-1 align-middle animate-pulse"/>}</div>
                </div>
             </div>
          </div>

          {/* Mobile Only CTA */}
          <div className="mt-8 md:hidden w-full flex justify-center">
            <button onClick={() => onAuth('signup')} className="bg-blue-600 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg w-full max-w-xs">Start Free Trial</button>
          </div>
       </div>

       <footer className="py-8 border-t border-[#2C2C2C] text-center text-xs text-[#666] relative z-10 mt-auto">
         <div className="flex justify-center gap-6 items-center">
           <a href="/terms" className="hover:text-white">Terms</a>
           <a href="/privacy" className="hover:text-white">Privacy</a>
           <span>|</span>
           <span className="uppercase tracking-widest">© 2025 protocolLM</span>
         </div>
       </footer>
    </div>
  )
}


// ==========================================
// 2. THE DASHBOARD (Logged In - Real App)
// ==========================================
const Dashboard = ({ user, signOut }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Audit State
  const [auditResults, setAuditResults] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})

  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  
  // Mock subscription check
  const userPlan = 'pro' 

  // --- Real Chat Logic ---
  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(prev => [...prev, newMsg])
    setInput(''); const img = selectedImage; setSelectedImage(null); setIsSending(true)

    try {
      // Call your actual API route
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ messages: [...messages, newMsg], image: img, county: 'washtenaw' })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message || "No response." }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to server." }])
    } finally {
      setIsSending(false)
    }
  }

  const handleImage = (e) => {
    if(e.target.files?.[0]) {
      const r = new FileReader(); 
      r.onloadend = () => setSelectedImage(r.result)
      r.readAsDataURL(e.target.files[0])
    }
  }

  // --- Dashboard JSX ---
  return (
    <div className="flex h-screen bg-[#121212] text-[#ECECEC] overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* SIDEBAR (ChatGPT Style) */}
      <div className={`fixed inset-y-0 left-0 w-[260px] bg-[#171717] border-r border-[#333] z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="h-14 flex items-center px-4 border-b border-[#333]">
           <div className="font-bold tracking-tight text-white">protocol<span className="text-blue-500">LM</span></div>
         </div>
         <div className="p-3 flex-1 overflow-y-auto">
           <div className="text-[10px] font-bold text-[#666] mb-2 px-2 uppercase tracking-wider">History</div>
           {messages.length === 0 && <div className="px-2 text-xs text-[#444]">No history</div>}
           {messages.filter(m => m.role === 'user').map((m, i) => (
             <button key={i} className="w-full text-left px-3 py-2 text-sm text-[#AAA] hover:bg-[#222] rounded truncate transition-colors">{m.content || 'Image Query'}</button>
           ))}
         </div>
         <div className="p-3 border-t border-[#333] bg-[#171717]">
            <div className="flex items-center gap-3 px-2 py-2 hover:bg-[#222] rounded cursor-pointer">
               <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{user.email}</div>
                  <button onClick={signOut} className="text-[10px] text-red-400 hover:text-red-300">Log Out</button>
               </div>
            </div>
         </div>
      </div>
      
      {/* MOBILE OVERLAY */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col relative">
         {/* Mobile Header */}
         <header className="h-14 border-b border-[#333] bg-[#121212]/90 flex items-center justify-between px-4 lg:px-8 z-20 sticky top-0">
            <div className="flex items-center gap-3">
               <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#888]"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg></button>
               <div className="flex bg-[#222] p-1 rounded">
                  <button onClick={() => setActiveTab('chat')} className={`px-3 py-1 text-xs font-bold rounded ${activeTab === 'chat' ? 'bg-[#333] text-white shadow' : 'text-[#888]'}`}>Chat</button>
                  <button onClick={() => setActiveTab('audit')} className={`px-3 py-1 text-xs font-bold rounded ${activeTab === 'audit' ? 'bg-[#333] text-white shadow' : 'text-[#888]'}`}>Audit</button>
               </div>
            </div>
         </header>

         {/* CONTENT */}
         {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col relative overflow-hidden">
               <div className="flex-1 overflow-y-auto p-4 lg:p-0 lg:w-full lg:max-w-3xl lg:mx-auto pt-6">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                       <div className="w-12 h-12 bg-[#1F1F1F] rounded-full flex items-center justify-center mb-4 shadow-lg border border-[#333]"><span className="text-xl">⚡️</span></div>
                       <h2 className="text-white font-bold text-xl">ProtocolLM</h2>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl mt-8">
                          {SUGGESTIONS.map((s, i) => (
                             <button key={i} onClick={() => setInput(s.text)} className="p-4 bg-[#18181B] border border-[#333] hover:bg-[#222] rounded-xl text-left transition-colors">
                                <div className="text-xs font-bold text-gray-400 mb-1">{s.heading}</div>
                                <div className="text-xs text-gray-200 truncate">{s.text}</div>
                             </button>
                          ))}
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-6 pb-12">
                       {messages.map((msg, i) => (
                          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/50 flex items-center justify-center shrink-0"><div className="w-4 h-4 bg-green-500 rounded-sm"/></div>}
                             <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#2F2F2F] text-white' : 'text-gray-100'}`}>
                                {msg.image && <img src={msg.image} className="mb-3 rounded-lg border border-[#444]" />}
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                             </div>
                          </div>
                       ))}
                       {isSending && <div className="pl-12"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '30px', height: '30px' }} /></div>}
                    </div>
                  )}
               </div>
               <div className="p-4 pb-8 w-full flex justify-center bg-[#121212]">
                  <div className="w-full max-w-3xl relative bg-[#1E1E1E] border border-[#333] rounded-2xl focus-within:border-gray-500 shadow-lg flex flex-col">
                     {selectedImage && <div className="p-2 border-b border-[#333]"><div className="relative inline-block"><img src={selectedImage} className="h-12 rounded" /><button onClick={removeImage} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 text-xs border border-[#333]">✕</button></div></div>}
                     <div className="flex items-end p-3 gap-3">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImage} />
                        <button onClick={() => fileInputRef.current.click()} className="text-[#888] hover:text-white p-2 rounded-lg hover:bg-[#333]">+</button>
                        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend(e)}}} placeholder="Ask anything..." className="flex-1 bg-transparent text-white outline-none resize-none py-2 max-h-[200px] text-sm" rows={1} />
                        <button onClick={handleSend} disabled={!input && !selectedImage} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>
                     </div>
                  </div>
               </div>
            </div>
         ) : (
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
               <div className="max-w-3xl mx-auto">
                 <h2 className="text-2xl font-bold text-white mb-4">Compliance Checklist</h2>
                 {AUDIT_CHECKLIST.map((cat) => (
                    <div key={cat.category} className="mb-4 border border-[#333] rounded-lg overflow-hidden bg-[#18181B]">
                       <button onClick={() => setExpandedCategories(p => ({...p, [cat.category]: !p[cat.category]}))} className="w-full px-4 py-3 flex justify-between text-sm font-bold text-gray-200 hover:bg-[#222]">{cat.category}</button>
                       {expandedCategories[cat.category] !== false && (
                          <div className="p-2 space-y-1 border-t border-[#333]">
                             {cat.items.map(item => (
                               <div key={item.id} className="p-2 hover:bg-[#222] rounded flex justify-between items-center">
                                 <span className="text-xs text-gray-400">{item.label}</span>
                                 <div className="flex gap-1"><button className="px-2 py-1 bg-green-900/30 text-green-500 text-[10px] rounded border border-green-900">Pass</button><button className="px-2 py-1 bg-red-900/30 text-red-500 text-[10px] rounded border border-red-900">Fail</button></div>
                               </div>
                             ))}
                          </div>
                       )}
                    </div>
                 ))}
               </div>
            </div>
         )}
      </div>
    </div>
  )
}

// ==========================================
// 4. ROOT COMPONENT
// ==========================================

export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState(null) // 'login' or 'signup'
  const supabase = createClient()

  useEffect(() => {
    createClient().auth.getSession().then(({data}) => {
      setSession(data.session)
      setIsLoading(false)
    })
  }, [])

  const AuthModal = () => {
     const [email, setEmail] = useState('')
     const [password, setPassword] = useState('')
     
     const handleOAuth = async () => { await supabase.auth.signInWithOAuth({provider: 'google', options:{redirectTo:`${window.location.origin}/auth/callback`}}) }
     const handleSubmit = async (e) => { e.preventDefault(); authMode === 'signup' ? await supabase.auth.signUp({email, password}) : await supabase.auth.signInWithPassword({email, password}) }
     
     if(!authMode) return null
     
     return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-[#18181B] border border-[#333] p-6 rounded-lg w-full max-w-sm">
              <button onClick={() => setAuthMode(null)} className="absolute top-4 right-4 text-gray-500">✕</button>
              <h2 className="text-white font-bold text-lg mb-6 text-center">{authMode==='login' ? 'Welcome Back' : 'Create Account'}</h2>
              <button onClick={handleOAuth} className="w-full bg-white text-black font-bold py-3 rounded-lg text-sm mb-4 flex justify-center gap-2">Google</button>
              <form onSubmit={handleSubmit} className="space-y-4">
                 <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-3 bg-[#111] border border-[#333] rounded text-white text-sm outline-none focus:border-blue-600"/>
                 <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-3 bg-[#111] border border-[#333] rounded text-white text-sm outline-none focus:border-blue-600"/>
                 <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-sm">{authMode==='login'?'Log In':'Sign Up'}</button>
              </form>
              <div className="mt-4 text-center text-xs text-gray-500 cursor-pointer" onClick={() => setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?"Don't have an account?":"Already have one?"}</div>
           </div>
        </div>
     )
  }

  if(isLoading) return <div className="min-h-screen bg-[#121212]"></div>
  
  // *** ROUTING LOGIC ***
  // If Session -> Dashboard
  if(session) {
    return <Dashboard user={session.user} signOut={async () => { await supabase.auth.signOut(); setSession(null) }} />
  }

  // If No Session -> Landing Page
  return (
    <>
       <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js" type="module" strategy="afterInteractive" />
       <LandingPage onAuth={(mode) => setAuthMode(mode)} />
       <AuthModal />
    </>
  )
}
