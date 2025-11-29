'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import SessionGuard from '@/components/SessionGuard'

// --- DATA CONSTANTS ---
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
    'Do I have to throw away food if an employee vomits?'
  ],
  wayne: [],
  oakland: []
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

// ==========================================
// 1. MARKETING DEMO (LOGGED OUT)
// ==========================================
const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, inputValue, isThinking])

  // Sequence logic
  const SEQUENCE = [
    { text: "We received a notice for a 'Chronic Violation' in Washtenaw County. What does that mean?", response: "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2)." },
    { text: 'Our certified manager quit yesterday. Do we have to close the kitchen?', response: "NO. Michigan Food Law (Sec 289.2129) allows a 3-month grace period. However, you must notify the Washtenaw County Health Department immediately." },
    { text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?", response: 'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children).' }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    
    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(Math.random() * 35 + 25)
    }
    
    const runSimulation = async () => {
      setHasStarted(true) 
      while (isMounted) {
        for (const step of SEQUENCE) {
          if (!isMounted) return
          setIsTyping(true); await wait(900)
          for (const char of step.text) { if (!isMounted) return; await typeChar(char) }
          await wait(400)
          setMessages(p => [...p, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false); setIsThinking(true); await wait(2100)
          setIsThinking(false)
          setMessages(p => [...p, { role: 'assistant', content: step.response }])
          await wait(4500)
        }
        await wait(1200)
        setMessages(p => p.slice(-4))
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text) => {
    if (text.includes('ACTION REQUIRED')) return <span><span className="text-[#F87171] font-bold">ACTION REQUIRED</span>{text.split('ACTION REQUIRED')[1]}</span>
    if (text.includes('VIOLATION')) return <span><span className="text-[#F87171] font-bold">VIOLATION</span>{text.split('VIOLATION')[1]}</span>
    if (text.startsWith('NO.')) return <span><span className="text-[#3ECF8E] font-bold">COMPLIANT: NO.</span>{text.substring(3)}</span>
    return text
  }

  return (
    <div className="flex flex-col h-full bg-[#1C1C1C] border border-[#2C2C2C] rounded-md shadow-2xl overflow-hidden">
       {/* Header */}
       <div className="h-10 border-b border-[#2C2C2C] flex items-center justify-between px-4 bg-[#232323] shrink-0">
          <span className="text-[11px] text-[#888] tracking-widest uppercase font-mono">protocol_LM</span>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full animate-pulse"></div><span className="text-[10px] text-[#3ECF8E] uppercase tracking-wide font-bold">Live</span></div>
       </div>
       {/* Chat */}
       <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
          {!hasStarted && <div className="h-full flex items-center justify-center opacity-30 text-[11px] font-mono text-[#888] uppercase tracking-widest">System Initializing...</div>}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed rounded-md border ${msg.role === 'user' ? 'bg-[#2C2C2C] text-[#EDEDED] border-[#3C3C3C]' : 'bg-[#1C1C1C] text-[#C2C2C2] border-transparent pl-0'}`}>
                 {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {isThinking && <div className="pl-0 py-2"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '40px', height: '40px' }} /></div>}
       </div>
       {/* Input */}
       <div className="p-4 bg-[#232323] border-t border-[#2C2C2C] shrink-0">
         <div className="w-full bg-[#161616] border border-[#333] rounded-md px-3 py-2.5 flex gap-3 items-center">
            <span className="text-[#3ECF8E] text-xs font-mono">{'>'}</span>
            <div className="flex-1 text-[13px] text-[#EDEDED] font-mono min-h-[20px] flex items-center relative">
               {inputValue}{isTyping && <span className="inline-block w-1.5 h-4 bg-[#3ECF8E] ml-0.5 animate-pulse"/>}
               {!inputValue && !isTyping && <span className="text-[#555] text-xs">Run compliance query...</span>}
            </div>
         </div>
       </div>
    </div>
  )
}


// ==========================================
// 2. DASHBOARD INTERFACE (LOGGED IN)
// ==========================================
const DashboardInterface = ({ user, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  
  // Audit
  const [auditResults, setAuditResults] = useState({})
  const [auditNotes, setAuditNotes] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})
  const [auditImageItem, setAuditImageItem] = useState(null)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const auditImageRef = useRef(null)

  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages])

  const handleSend = async (e) => {
     if(e) e.preventDefault()
     if((!input.trim() && !selectedImage) || isSending) return
     
     const newMsg = { role: 'user', content: input, image: selectedImage }
     setMessages(p => [...p, newMsg])
     setInput(''); const img = selectedImage; setSelectedImage(null); setIsSending(true)
     
     // Optimistic UI
     setMessages(p => [...p, { role: 'assistant', content: '' }]) // Placeholder

     try {
       const res = await fetch('/api/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ messages: [...messages, newMsg], image: img, county: 'washtenaw' })
       })
       const data = await res.json()
       setMessages(p => {
          const u = [...p]; u[u.length-1].content = data.message || 'Error from server.';
          return u
       })
     } catch (err) { console.error(err) }
     finally { setIsSending(false) }
  }

  const handleImage = (e) => {
     if (e.target.files?.[0]) {
        const r = new FileReader()
        r.onloadend = () => setSelectedImage(r.result)
        r.readAsDataURL(e.target.files[0])
     }
  }
  
  // Audit Logic
  const handleAuditChange = (id, status) => setAuditResults(p => ({...p, [id]: status}))
  const handleAuditNote = (id, note) => setAuditNotes(p => ({...p, [id]: note}))
  
  // Calculate Score
  const passed = Object.values(auditResults).filter(s => s === 'pass').length
  const total = AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)
  
  return (
    <div className="flex h-full w-full bg-[#121212] text-[#EDEDED]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[#2C2C2C] bg-[#161616] z-30">
         <div className="h-16 flex items-center px-6 border-b border-[#2C2C2C]">
            <span className="font-bold tracking-tight text-lg">protocol<span className="text-[#3ECF8E]">LM</span></span>
         </div>
         <div className="flex-1 p-4 overflow-y-auto custom-scroll space-y-6">
            <div>
               <div className="px-2 mb-2 text-[10px] font-bold text-[#666] uppercase tracking-wider">Scope</div>
               <div className="bg-[#222] border border-[#333] p-2 rounded text-xs font-medium text-white flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full shadow"></div> Washtenaw County
               </div>
            </div>
            <div>
               <div className="px-2 mb-2 text-[10px] font-bold text-[#666] uppercase tracking-wider">History</div>
               {messages.filter(m=>m.role==='user').map((m, i) => (
                  <button key={i} className="w-full text-left px-3 py-2 rounded hover:bg-[#222] text-xs text-[#AAA] truncate">{m.content || 'Image Upload'}</button>
               ))}
            </div>
         </div>
         <div className="p-4 border-t border-[#2C2C2C]">
            <div className="flex justify-between items-center">
               <span className="text-xs font-bold truncate max-w-[120px]">{user.email}</span>
               <button onClick={onSignOut} className="text-[10px] text-red-400 hover:text-white">Log Out</button>
            </div>
         </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full bg-[#121212]">
         <header className="h-14 flex items-center justify-between px-4 border-b border-[#2C2C2C] bg-[#121212]/90 backdrop-blur z-10">
             <div className="lg:hidden font-bold">protocol<span className="text-[#3ECF8E]">LM</span></div>
             <div className="flex bg-[#222] p-1 rounded border border-[#333]">
                <button onClick={()=>setActiveTab('chat')} className={`px-4 py-1 text-xs font-bold rounded ${activeTab==='chat' ? 'bg-[#333] text-white shadow' : 'text-[#666]'}`}>Chat</button>
                <button onClick={()=>setActiveTab('audit')} className={`px-4 py-1 text-xs font-bold rounded ${activeTab==='audit' ? 'bg-[#333] text-white shadow' : 'text-[#666]'}`}>Audit</button>
             </div>
         </header>
         
         {activeTab === 'chat' ? (
             <>
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:px-24 custom-scroll pb-36">
                  {messages.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <h2 className="text-xl font-bold text-white mb-4">Command Center Active</h2>
                        <p className="text-sm text-[#888] max-w-md">Upload an image of a violation or ask a regulatory question.</p>
                     </div>
                  )}
                  {messages.map((m,i) => (
                     <div key={i} className={`flex mb-4 ${m.role==='user'?'justify-end':'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 text-sm rounded-lg border ${m.role==='user'?'bg-[#2C2C2C] text-white border-[#333]':'bg-transparent text-[#DDD] border-l-2 border-[#3ECF8E] pl-4 border-t-0 border-r-0 border-b-0'}`}>
                           {m.image && <img src={m.image} className="mb-2 max-h-48 rounded border border-[#444]" />}
                           <div className="whitespace-pre-wrap">{m.content}</div>
                        </div>
                     </div>
                  ))}
                  {isSending && <div className="pl-4"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '35px', height: '35px' }} /></div>}
               </div>

               <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent pt-10 z-20">
                  <div className="max-w-3xl mx-auto bg-[#1E1E1E] border border-[#333] rounded-2xl flex items-center shadow-xl p-2">
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImage}/>
                     <button type="button" onClick={()=>fileInputRef.current.click()} className="p-2 text-[#666] hover:text-[#3ECF8E] hover:bg-[#333] rounded-lg">+</button>
                     <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 bg-transparent px-3 text-sm text-white outline-none" placeholder="Query database..." />
                     <button onClick={handleSend} disabled={!input&&!selectedImage} className="p-2 bg-[#3ECF8E] hover:bg-[#2ECC71] text-black rounded-lg disabled:opacity-50 disabled:bg-[#333] disabled:text-[#555]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                  </div>
               </div>
             </>
         ) : (
             /* AUDIT VIEW */
             <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scroll">
                <div className="max-w-3xl mx-auto mb-10">
                   <div className="flex justify-between items-end mb-6 pb-4 border-b border-[#333]">
                      <div>
                         <h2 className="text-2xl font-bold text-white">Compliance Audit</h2>
                         <p className="text-xs text-[#666] mt-1">WASHTENAW COUNTY STANDARDS</p>
                      </div>
                      <div className="text-right">
                         <div className="text-2xl font-bold text-[#3ECF8E]">{Math.round((passed/total)*100)}%</div>
                         <div className="text-[9px] text-[#888] uppercase">Score</div>
                      </div>
                   </div>
                   
                   {AUDIT_CHECKLIST.map((cat) => (
                      <div key={cat.category} className="mb-6 bg-[#1C1C1C] border border-[#333] rounded-lg overflow-hidden">
                         <div className="px-4 py-3 bg-[#222] text-xs font-bold text-[#CCC] uppercase tracking-wider">{cat.category}</div>
                         <div className="divide-y divide-[#2C2C2C]">
                            {cat.items.map((item) => {
                               const status = auditResults[item.id]
                               return (
                                  <div key={item.id} className="p-4">
                                     <div className="flex justify-between items-start mb-2">
                                        <div>
                                           <p className="text-sm text-[#E4E4E7] font-medium">{item.label}</p>
                                           {item.critical && <span className="text-[10px] text-red-400 uppercase font-bold">Critical</span>}
                                        </div>
                                        <div className="flex gap-1">
                                           <button onClick={()=>handleAuditChange(item.id, 'pass')} className={`px-3 py-1 rounded border text-[10px] font-bold uppercase ${status==='pass'?'bg-green-900/30 border-green-800 text-green-400':'bg-[#111] border-[#333] text-[#555]'}`}>Pass</button>
                                           <button onClick={()=>handleAuditChange(item.id, 'fail')} className={`px-3 py-1 rounded border text-[10px] font-bold uppercase ${status==='fail'?'bg-red-900/30 border-red-800 text-red-400':'bg-[#111] border-[#333] text-[#555]'}`}>Fail</button>
                                        </div>
                                     </div>
                                  </div>
                               )
                            })}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
         )}
      </main>
    </div>
  )
}

// ==========================================
// 4. ROOT COMPONENT
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [authView, setAuthView] = useState('login')
  const [showAuth, setShowAuth] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
     const init = async () => {
       const { data } = await supabase.auth.getSession()
       setSession(data.session)
       setIsLoading(false)
     }
     init()
     const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
       setSession(session)
       if(session) setShowAuth(false)
     })
     return () => listener.subscription.unsubscribe()
  }, [])

  const triggerAuth = (v = 'login') => { setAuthView(v); setShowAuth(true) }
  const handleOAuth = async () => {
     await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
     })
  }
  
  if(isLoading) return <div className="min-h-screen bg-[#121212]"/>

  // --- IF LOGGED IN ---
  if (session) return <DashboardInterface user={session.user} onSignOut={async () => await supabase.auth.signOut()} />

  // --- IF LOGGED OUT (LANDING) ---
  return (
    <div className="min-h-screen bg-[#121212] font-sans text-[#EDEDED] flex flex-col selection:bg-[#3ECF8E] selection:text-black overflow-x-hidden">
      <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js" type="module" strategy="afterInteractive" />

      {/* Nav */}
      <nav className="fixed top-0 w-full h-16 bg-[#121212]/80 backdrop-blur border-b border-[#2C2C2C] flex items-center justify-between px-6 z-50">
        <div className="font-bold text-xl tracking-tight">protocol<span className="text-[#3ECF8E]">LM</span></div>
        <div className="flex gap-4 items-center">
          <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-[#888] hover:text-white uppercase hidden md:block">Pricing</button>
          <button onClick={() => triggerAuth('login')} className="text-xs font-bold text-[#888] hover:text-white uppercase">Log In</button>
          <button onClick={() => triggerAuth('signup')} className="bg-[#3ECF8E] hover:bg-[#34D399] text-black px-4 py-1.5 rounded-md text-xs font-bold uppercase shadow-lg">Start Free Trial</button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center pt-24 pb-24 px-4 relative z-10 min-h-[calc(100vh-64px)]">
        
        <div className="text-center max-w-4xl mb-8 mt-8 md:mt-12">
           <h1 className="text-3xl md:text-5xl font-medium text-white mb-4 tracking-tight">Train your team before the inspector arrives</h1>
           <div className="flex flex-wrap justify-center gap-2 opacity-90">
              <div className="bg-[#222] border border-[#3ECF8E]/40 text-white px-3 py-1 rounded text-[11px] font-bold uppercase flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full"/>Washtenaw</div>
              <div className="bg-[#111] border border-[#333] text-[#888] px-3 py-1 rounded text-[11px] font-bold uppercase">Michigan Food Law</div>
              <div className="bg-[#111] border border-[#333] text-[#888] px-3 py-1 rounded text-[11px] font-bold uppercase">FDA Code</div>
           </div>
        </div>

        {/* Demo Box - Responsive Fixed Height */}
        <div className="w-full max-w-5xl h-[380px] md:h-[550px]">
           <DemoChatContent />
        </div>

      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-[#2C2C2C] text-center z-10 bg-[#121212]">
         <div className="text-xs text-[#666] mb-4">© 2025 protocolLM. All rights reserved.</div>
         <div className="flex justify-center gap-6 text-xs">
            <a href="/terms" className="text-[#888] hover:text-white">Terms</a>
            <a href="/privacy" className="text-[#888] hover:text-white">Privacy</a>
            <a href="/contact" className="text-[#888] hover:text-white">Contact</a>
         </div>
      </footer>
    </div>
  )
}
