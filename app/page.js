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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  
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
    <div className="flex h-screen w-screen bg-[#121212] text-[#EDEDED] overflow-hidden fixed inset-0">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-50 flex flex-col w-64 border-r border-[#2C2C2C] bg-[#0A0A0A] transition-transform duration-200`}>
         <div className="h-14 flex items-center px-6 border-b border-[#2C2C2C]">
            <span className="text-sm font-bold tracking-tight text-white">PROTOCOL<span className="text-[#3ECF8E]">LM</span></span>
         </div>
         <div className="flex-1 p-4 overflow-y-auto custom-scroll space-y-6">
            <div>
               <div className="px-2 mb-3 text-[9px] font-bold text-[#555] uppercase tracking-[0.15em]">Jurisdiction</div>
               <div className="bg-[#151515] border border-[#2C2C2C] p-3 rounded text-[13px] font-medium text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full"></div>
                    Washtenaw County
                  </div>
                  <svg className="w-3 h-3 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
               </div>
            </div>
            <div>
               <div className="px-2 mb-3 text-[9px] font-bold text-[#555] uppercase tracking-[0.15em]">Recent Queries</div>
               <div className="space-y-1">
                 {messages.filter(m=>m.role==='user').slice(-5).map((m, i) => (
                    <button key={i} className="w-full text-left px-3 py-2 rounded hover:bg-[#151515] text-[11px] text-[#999] truncate transition-colors border border-transparent hover:border-[#2C2C2C]">
                      {m.content || '📷 Image Analysis'}
                    </button>
                 ))}
                 {messages.filter(m=>m.role==='user').length === 0 && (
                   <div className="text-[11px] text-[#555] px-3 py-2">No queries yet</div>
                 )}
               </div>
            </div>
         </div>
         <div className="p-4 border-t border-[#2C2C2C] bg-[#0A0A0A]">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                 <div className="w-7 h-7 rounded-full bg-[#2C2C2C] flex items-center justify-center text-[10px] font-bold text-white">
                   {user.email[0].toUpperCase()}
                 </div>
                 <span className="text-[11px] font-medium text-white truncate max-w-[120px]">{user.email}</span>
               </div>
            </div>
            <button onClick={onSignOut} className="w-full text-[10px] text-[#999] hover:text-white py-2 px-3 rounded border border-[#2C2C2C] hover:border-[#3C3C3C] transition-colors">
              Sign Out
            </button>
         </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#121212]">
         <header className="h-14 flex items-center justify-between px-4 border-b border-[#2C2C2C] bg-[#0A0A0A] z-10 shrink-0">
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => setSidebarOpen(!sidebarOpen)}
                 className="lg:hidden p-2 hover:bg-[#2C2C2C] rounded-md transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                 </svg>
               </button>
               <div className="text-sm font-bold tracking-tight text-white">PROTOCOL<span className="text-[#3ECF8E]">LM</span></div>
             </div>
             <div className="flex bg-[#151515] p-0.5 rounded-lg border border-[#2C2C2C]">
                <button onClick={()=>setActiveTab('chat')} className={`px-5 py-1.5 text-[11px] font-bold rounded-md transition-all ${activeTab==='chat' ? 'bg-[#2C2C2C] text-white' : 'text-[#666] hover:text-white'}`}>
                  Chat
                </button>
                <button onClick={()=>setActiveTab('audit')} className={`px-5 py-1.5 text-[11px] font-bold rounded-md transition-all ${activeTab==='audit' ? 'bg-[#2C2C2C] text-white' : 'text-[#666] hover:text-white'}`}>
                  Audit
                </button>
             </div>
         </header>
         
         {activeTab === 'chat' ? (
             <>
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:px-24 custom-scroll pb-36">
                  {messages.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="mb-6 w-16 h-16 rounded-full bg-[#151515] border border-[#2C2C2C] flex items-center justify-center">
                          <svg className="w-8 h-8 text-[#3ECF8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h2 className="text-lg font-bold text-white mb-2">Ready for Compliance Analysis</h2>
                        <p className="text-[13px] text-[#777] max-w-md leading-relaxed">
                          Upload inspection photos, ask regulatory questions, or run mock audits to prepare your team.
                        </p>
                     </div>
                  )}
                  {messages.map((m,i) => (
                     <div key={i} className={`flex mb-6 ${m.role==='user'?'justify-end':'justify-start'}`}>
                        <div className={`max-w-[85%] ${m.role==='user'?'bg-[#151515] border border-[#2C2C2C] p-4 rounded-xl':'border-l-2 border-[#3ECF8E] pl-4 py-2'}`}>
                           {m.image && <img src={m.image} alt="Uploaded" className="mb-3 max-h-64 rounded-lg border border-[#2C2C2C]" />}
                           <div className={`text-[13px] leading-relaxed whitespace-pre-wrap ${m.role==='user'?'text-white':'text-[#DDD]'}`}>
                             {m.content}
                           </div>
                        </div>
                     </div>
                  ))}
                  {isSending && (
                    <div className="flex items-center gap-2 text-[#777] text-[13px] pl-4">
                      <dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '32px', height: '32px' }} />
                      <span>Analyzing compliance data...</span>
                    </div>
                  )}
               </div>

               <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent pt-10 z-20">
                  <div className="max-w-3xl mx-auto bg-[#0A0A0A] border border-[#2C2C2C] rounded-xl flex items-center shadow-2xl p-1.5 relative">
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImage}/>
                     
                     {/* Plus Button with Dropdown */}
                     <div className="relative">
                       <button 
                         type="button" 
                         onClick={() => setShowUploadMenu(!showUploadMenu)}
                         className="p-2.5 text-[#999] hover:text-[#3ECF8E] hover:bg-[#151515] rounded-lg transition-colors"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                         </svg>
                       </button>
                       
                       {/* Dropdown Menu */}
                       {showUploadMenu && (
                         <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0A0A0A] border border-[#2C2C2C] rounded-lg shadow-2xl overflow-hidden">
                           <button
                             onClick={() => {
                               fileInputRef.current.click()
                               setShowUploadMenu(false)
                             }}
                             className="w-full px-4 py-3 text-left hover:bg-[#151515] transition-colors flex items-center gap-3 border-b border-[#2C2C2C]"
                           >
                             <div className="w-8 h-8 rounded-lg bg-[#151515] flex items-center justify-center">
                               <svg className="w-4 h-4 text-[#3ECF8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                               </svg>
                             </div>
                             <div>
                               <div className="text-[13px] font-bold text-white">Image Analysis</div>
                               <div className="text-[10px] text-[#777]">Upload facility photos</div>
                             </div>
                           </button>
                           <button
                             onClick={() => {
                               setActiveTab('audit')
                               setShowUploadMenu(false)
                             }}
                             className="w-full px-4 py-3 text-left hover:bg-[#151515] transition-colors flex items-center gap-3"
                           >
                             <div className="w-8 h-8 rounded-lg bg-[#151515] flex items-center justify-center">
                               <svg className="w-4 h-4 text-[#3ECF8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                               </svg>
                             </div>
                             <div>
                               <div className="text-[13px] font-bold text-white">Mock Audit</div>
                               <div className="text-[10px] text-[#777]">Run compliance checklist</div>
                             </div>
                           </button>
                         </div>
                       )}
                     </div>
                     
                     <input 
                       value={input} 
                       onChange={e=>setInput(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                       className="flex-1 bg-transparent px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555]" 
                       placeholder="Ask a compliance question..." 
                     />
                     <button 
                       onClick={handleSend} 
                       disabled={(!input.trim() && !selectedImage) || isSending}
                       className="p-2.5 bg-[#3ECF8E] hover:bg-[#2ECC71] text-black rounded-lg transition-colors disabled:opacity-30 disabled:bg-[#2C2C2C] disabled:text-[#555] disabled:cursor-not-allowed"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
                       </svg>
                     </button>
                  </div>
                  {selectedImage && (
                    <div className="max-w-3xl mx-auto mt-2 p-2 bg-[#151515] border border-[#2C2C2C] rounded-lg flex items-center gap-2">
                      <img src={selectedImage} alt="Preview" className="w-12 h-12 rounded object-cover" />
                      <span className="text-[11px] text-[#999] flex-1">Image ready for analysis</span>
                      <button onClick={() => setSelectedImage(null)} className="text-[#999] hover:text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
               </div>
             </>
         ) : (
             /* AUDIT VIEW */
             <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scroll">
                <div className="max-w-3xl mx-auto mb-10">
                   <div className="flex justify-between items-end mb-8 pb-6 border-b border-[#2C2C2C]">
                      <div>
                         <h2 className="text-xl font-bold text-white mb-1">Mock Inspection Audit</h2>
                         <p className="text-[11px] text-[#777] uppercase tracking-[0.1em]">Washtenaw County Standards</p>
                      </div>
                      <div className="text-right">
                         <div className="text-3xl font-bold text-[#3ECF8E] mb-1">{Math.round((passed/total)*100)}%</div>
                         <div className="text-[10px] text-[#777] uppercase tracking-wider">Compliance</div>
                      </div>
                   </div>
                   
                   {AUDIT_CHECKLIST.map((cat) => (
                      <div key={cat.category} className="mb-6 bg-[#0A0A0A] border border-[#2C2C2C] rounded-xl overflow-hidden">
                         <div className="px-5 py-3 bg-[#151515] text-[11px] font-bold text-white uppercase tracking-[0.1em] border-b border-[#2C2C2C]">
                           {cat.category}
                         </div>
                         <div className="divide-y divide-[#2C2C2C]">
                            {cat.items.map((item) => {
                               const status = auditResults[item.id]
                               return (
                                  <div key={item.id} className="p-5 hover:bg-[#0F0F0F] transition-colors">
                                     <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                           <p className="text-[13px] text-white font-medium mb-1 leading-relaxed">{item.label}</p>
                                           {item.critical && (
                                             <div className="inline-flex items-center gap-1.5 mt-1">
                                               <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                                               <span className="text-[9px] text-red-400 uppercase font-bold tracking-wider">Priority Violation</span>
                                             </div>
                                           )}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                           <button 
                                             onClick={()=>handleAuditChange(item.id, 'pass')} 
                                             className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all ${
                                               status==='pass'
                                                 ?'bg-[#3ECF8E]/10 border-[#3ECF8E] text-[#3ECF8E]'
                                                 :'bg-[#0A0A0A] border-[#2C2C2C] text-[#666] hover:border-[#3C3C3C] hover:text-white'
                                             }`}
                                           >
                                             Pass
                                           </button>
                                           <button 
                                             onClick={()=>handleAuditChange(item.id, 'fail')} 
                                             className={`px-4 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all ${
                                               status==='fail'
                                                 ?'bg-red-900/20 border-red-800 text-red-400'
                                                 :'bg-[#0A0A0A] border-[#2C2C2C] text-[#666] hover:border-[#3C3C3C] hover:text-white'
                                             }`}
                                           >
                                             Fail
                                           </button>
                                        </div>
                                     </div>
                                  </div>
                               )
                            })}
                         </div>
                      </div>
                   ))}
                   
                   <div className="mt-8 p-6 bg-[#0A0A0A] border border-[#2C2C2C] rounded-xl">
                     <div className="text-[11px] font-bold text-[#777] uppercase tracking-[0.1em] mb-3">Actions</div>
                     <div className="flex flex-col sm:flex-row gap-3">
                       <button className="flex-1 bg-[#3ECF8E] hover:bg-[#2ECC71] text-black text-[12px] font-bold py-3 px-4 rounded-lg transition-colors uppercase tracking-wide">
                         Export Report
                       </button>
                       <button className="flex-1 bg-[#151515] hover:bg-[#1F1F1F] border border-[#2C2C2C] text-white text-[12px] font-bold py-3 px-4 rounded-lg transition-colors uppercase tracking-wide">
                         Reset Audit
                       </button>
                     </div>
                   </div>
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
