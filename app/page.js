'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

// --- DATA CONSTANTS (Logic preserved, Selection UI removed) ---
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

// ==========================================
// 1. ICONS (Supabase/Lucide Style)
// ==========================================
const Icons = {
  Menu: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Chat: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Clipboard: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  Upload: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Send: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  X: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>,
  Check: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
}

// ==========================================
// 2. DASHBOARD INTERFACE (LOGGED IN)
// ==========================================
const DashboardInterface = ({ user, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  // Audit State
  const [auditResults, setAuditResults] = useState({})
  const passed = Object.values(auditResults).filter(s => s === 'pass').length
  const totalItems = AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)

  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(p => [...p, newMsg])
    setInput('')
    const img = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    // Optimistic UI
    setMessages(p => [...p, { role: 'assistant', content: 'Processing compliance query...' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], image: img })
      })
      const data = await res.json()
      setMessages(p => {
        const u = [...p]
        u[u.length - 1].content = data.message || 'Error processing request.'
        return u
      })
    } catch (err) {
      setMessages(p => {
        const u = [...p]
        u[u.length - 1].content = 'Network error. Please try again.'
        return u
      })
    } finally { setIsSending(false) }
  }

  const handleImage = (e) => {
    if (e.target.files?.[0]) {
      const r = new FileReader()
      r.onloadend = () => setSelectedImage(r.result)
      r.readAsDataURL(e.target.files[0])
    }
  }

  const toggleAudit = (id, status) => setAuditResults(prev => ({ ...prev, [id]: status }))

  return (
    <div className="flex h-[100dvh] w-screen bg-[#1C1C1C] text-[#EDEDED] overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Supabase Style */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#161616] border-r border-[#2A2A2A] transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Logo Area */}
        <div className="h-14 flex items-center px-5 border-b border-[#2A2A2A]">
          <div className="font-mono text-sm font-bold tracking-tight text-[#EDEDED]">
            protocol<span className="text-[#3ECF8E]">LM</span>
          </div>
          {/* Close button mobile */}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-[#888]">
            <Icons.X />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button 
            onClick={() => { setActiveTab('chat'); setSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group ${activeTab === 'chat' ? 'bg-[#232323] text-white' : 'text-[#888] hover:bg-[#1C1C1C] hover:text-[#EDEDED]'}`}
          >
            <span className={activeTab === 'chat' ? 'text-[#3ECF8E]' : 'text-[#666] group-hover:text-[#EDEDED]'}><Icons.Chat /></span>
            Compliance Chat
          </button>
          <button 
            onClick={() => { setActiveTab('audit'); setSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group ${activeTab === 'audit' ? 'bg-[#232323] text-white' : 'text-[#888] hover:bg-[#1C1C1C] hover:text-[#EDEDED]'}`}
          >
            <span className={activeTab === 'audit' ? 'text-[#3ECF8E]' : 'text-[#666] group-hover:text-[#EDEDED]'}><Icons.Clipboard /></span>
            Mock Audit
          </button>
        </div>

        {/* User / Footer */}
        <div className="p-4 border-t border-[#2A2A2A] bg-[#161616]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#3ECF8E] flex items-center justify-center text-black font-bold text-xs">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.email}</p>
              <p className="text-[10px] text-[#666] truncate">Pro Plan</p>
            </div>
          </div>
          <button 
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-[#333] hover:border-[#555] bg-[#1C1C1C] hover:bg-[#232323] text-xs text-[#888] hover:text-white transition-all"
          >
            <Icons.SignOut />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#1C1C1C]">
        
        {/* Header */}
        <header className="h-14 border-b border-[#2A2A2A] flex items-center justify-between px-4 lg:px-6 bg-[#1C1C1C] shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#888] hover:text-white">
              <Icons.Menu />
            </button>
            <h1 className="text-sm font-medium text-[#EDEDED]">{activeTab === 'chat' ? 'AI Compliance Assistant' : 'Self-Inspection Audit'}</h1>
          </div>
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse"></div>
            <span className="text-[10px] font-mono text-[#666] uppercase">System Operational</span>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {activeTab === 'chat' ? (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 select-none">
                    <div className="w-12 h-12 mb-4 text-[#333]"><Icons.Chat /></div>
                    <p className="text-sm text-[#888]">Ask about food code violations, temperatures,<br/>or upload a photo for analysis.</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role !== 'user' && (
                      <div className="w-8 h-8 rounded bg-[#232323] border border-[#333] flex items-center justify-center shrink-0 text-[#3ECF8E] text-xs font-mono">AI</div>
                    )}
                    <div className={`space-y-2 max-w-[85%] lg:max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {msg.image && (
                        <img src={msg.image} alt="Upload" className="rounded-md border border-[#333] max-h-60 object-contain bg-black/50" />
                      )}
                      <div className={`text-sm leading-relaxed p-3 rounded-lg border ${
                        msg.role === 'user' 
                          ? 'bg-[#232323] border-[#333] text-[#EDEDED]' 
                          : 'bg-transparent border-transparent text-[#CCC] pl-0 pt-1'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-[#2A2A2A] bg-[#1C1C1C]">
                <div className="max-w-3xl mx-auto relative">
                  {selectedImage && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 bg-[#232323] border border-[#333] rounded-md flex items-center gap-2">
                      <span className="text-xs text-[#888]">Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="text-white hover:text-red-400"><Icons.X /></button>
                    </div>
                  )}
                  <form onSubmit={handleSend} className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 rounded-md border border-[#333] hover:border-[#555] hover:bg-[#232323] text-[#888] hover:text-white transition-colors"
                    >
                      <Icons.Upload />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImage} 
                    />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask a question..."
                      className="flex-1 bg-[#161616] border border-[#333] rounded-md px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E] transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!input && !selectedImage}
                      className="px-4 rounded-md bg-[#3ECF8E] hover:bg-[#34D399] text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                    >
                      <Icons.Send />
                    </button>
                  </form>
                  <p className="text-[10px] text-[#444] mt-2 text-center">AI can make mistakes. Verify critical code violations.</p>
                </div>
              </div>
            </>
          ) : (
            /* Audit Tab */
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-end mb-6 pb-6 border-b border-[#2A2A2A]">
                  <div>
                    <h2 className="text-lg font-medium text-white">Inspection Audit</h2>
                    <p className="text-xs text-[#666] mt-1">Washtenaw County Standards</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#3ECF8E]">{Math.round((passed / (totalItems || 1)) * 100)}%</div>
                    <div className="text-[10px] text-[#666] uppercase tracking-wider">Score</div>
                  </div>
                </div>

                <div className="space-y-8 pb-20">
                  {AUDIT_CHECKLIST.map((cat) => (
                    <div key={cat.category} className="space-y-3">
                      <h3 className="text-xs font-bold text-[#666] uppercase tracking-widest pl-1">{cat.category}</h3>
                      <div className="bg-[#161616] border border-[#2A2A2A] rounded-lg overflow-hidden divide-y divide-[#2A2A2A]">
                        {cat.items.map((item) => {
                          const status = auditResults[item.id]
                          return (
                            <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#1A1A1A] transition-colors">
                              <div className="flex-1">
                                <p className="text-sm text-[#EDEDED]">{item.label}</p>
                                {item.critical && <span className="text-[10px] text-red-400 font-mono mt-1 block">PRIORITY VIOLATION</span>}
                              </div>
                              <div className="flex items-center bg-[#111] rounded-md border border-[#333] p-1">
                                <button 
                                  onClick={() => toggleAudit(item.id, 'pass')}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${status === 'pass' ? 'bg-[#3ECF8E] text-black shadow-sm' : 'text-[#666] hover:text-white'}`}
                                >
                                  Pass
                                </button>
                                <div className="w-px h-3 bg-[#333] mx-1"></div>
                                <button 
                                  onClick={() => toggleAudit(item.id, 'fail')}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${status === 'fail' ? 'bg-red-500 text-white shadow-sm' : 'text-[#666] hover:text-white'}`}
                                >
                                  Fail
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ==========================================
// 3. LANDING PAGE (LOGGED OUT)
// ==========================================
const DemoChatContent = () => {
  // Static demo for visual purposes
  const [typed, setTyped] = useState('')
  const fullText = "Is 48°F acceptable for a walk-in cooler holding raw chicken?"
  
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setTyped(fullText.slice(0, i))
      i++
      if(i > fullText.length) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto h-[500px] bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="h-10 bg-[#161616] border-b border-[#2A2A2A] flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
        <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
      </div>
      <div className="flex-1 p-6 space-y-6 bg-[#1C1C1C] font-mono text-sm overflow-hidden">
        <div className="flex gap-4">
          <div className="text-[#3ECF8E] shrink-0">{'>'}</div>
          <div className="text-[#EDEDED]">{typed}<span className="animate-pulse">_</span></div>
        </div>
        {typed.length === fullText.length && (
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="text-[#3ECF8E] shrink-0">AI</div>
            <div className="text-[#999] space-y-2">
              <p><span className="text-red-400 font-bold">VIOLATION:</span> NO.</p>
              <p>Per Michigan Modified Food Code (3-501.16), TCS foods must be held at <span className="text-[#EDEDED] font-bold">41°F or below</span>.</p>
              <p>Action Required: Discard if time unknown, or rapid chill immediately.</p>
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
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  const triggerAuth = () => router.push('/auth')

  if (isLoading) return (
    <div className="h-screen w-screen bg-[#1C1C1C] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  if (session) return <DashboardInterface user={session.user} onSignOut={() => supabase.auth.signOut()} />

  return (
    <div className="min-h-screen bg-[#1C1C1C] text-[#EDEDED] flex flex-col font-sans selection:bg-[#3ECF8E] selection:text-black">
      <nav className="fixed top-0 w-full h-16 bg-[#1C1C1C]/80 backdrop-blur border-b border-[#2A2A2A] z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="font-mono font-bold text-lg tracking-tight">protocol<span className="text-[#3ECF8E]">LM</span></div>
        <div className="flex gap-4 items-center">
          <button onClick={triggerAuth} className="text-sm text-[#888] hover:text-white transition-colors">Log In</button>
          <button onClick={triggerAuth} className="bg-[#EDEDED] hover:bg-white text-black px-4 py-2 rounded-md text-sm font-medium transition-colors">Get Started</button>
        </div>
      </nav>

      <main className="flex-1 pt-32 px-4 flex flex-col items-center justify-center text-center pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#333] bg-[#232323] text-xs text-[#888] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E]"></span>
          Updated for 2025 Food Code
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold text-white mb-6 tracking-tight max-w-3xl">
          AI Compliance Officer <br/> <span className="text-[#888]">for your kitchen.</span>
        </h1>
        <p className="text-[#666] text-lg mb-12 max-w-xl">
          Prevent violations before the health inspector arrives. Instant answers, mock audits, and image analysis.
        </p>
        
        <DemoChatContent />
      </main>
    </div>
  )
}
