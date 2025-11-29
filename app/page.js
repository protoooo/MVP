'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import SessionGuard from '@/components/SessionGuard'

// --- CONSTANTS ---
const COUNTY_LABELS = { washtenaw: 'Washtenaw County' }
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
// 1. DASHBOARD INTERFACE (The Real App)
// ==========================================
const DashboardInterface = ({ user, onSignOut, initialQuery }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Audit State
  const [auditResults, setAuditResults] = useState({})
  const [auditNotes, setAuditNotes] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const auditImageInputRef = useRef(null)

  // Handle initial query from Landing Page
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSend(null, initialQuery)
    }
  }, [])

  useEffect(() => {
    if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isSending])

  const handleSend = async (e, overrideInput = null) => {
    if (e) e.preventDefault()
    const text = overrideInput || input.trim()
    
    if ((!text && !selectedImage) || isSending) return

    const newMsg = { role: 'user', content: text, image: selectedImage }
    setMessages(prev => [...prev, newMsg])
    setInput(''); setSelectedImage(null); setIsSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], image: selectedImage, county: 'washtenaw' })
      })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.message || 'No response.' }])
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: "Connection error." }])
    } finally {
      setIsSending(false)
    }
  }

  const handleImageSelect = (e) => {
    if(e.target.files?.[0]) {
       const r = new FileReader(); 
       r.onloadend = () => setSelectedImage(r.result)
       r.readAsDataURL(e.target.files[0])
    }
    e.target.value = ''
  }

  const toggleAudit = (id, st) => setAuditResults(p=>({...p, [id]: st}))
  
  // Colors for chat
  const formatContent = (text) => {
    if (text.includes('ACTION REQUIRED')) return <span><span className="text-[#F87171] font-bold">ACTION REQUIRED</span>{text.split('ACTION REQUIRED')[1]}</span>
    if (text.includes('VIOLATION')) return <span><span className="text-[#F87171] font-bold">VIOLATION</span>{text.split('VIOLATION')[1]}</span>
    if (text.includes('COMPLIANT')) return <span><span className="text-[#3ECF8E] font-bold">COMPLIANT</span>{text.split('COMPLIANT')[1]}</span>
    return text
  }

  return (
    <div className="flex h-full w-full bg-[#121212] text-[#EDEDED]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-[280px] bg-[#171717] border-r border-[#2C2C2C] z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="h-16 flex items-center px-6 border-b border-[#2C2C2C]">
            <div className="text-lg font-bold tracking-tight text-white">protocol<span className="text-[#3B82F6]">LM</span></div>
         </div>
         <div className="flex-1 p-4 overflow-y-auto custom-scroll space-y-6">
            <div>
               <div className="px-2 mb-2 text-[10px] font-bold text-[#666] uppercase tracking-wider">Jurisdiction</div>
               <div className="bg-[#222] border border-[#333] p-2 rounded text-xs font-medium text-white flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow"></div> Washtenaw County
               </div>
            </div>
            <div>
               <div className="px-2 mb-2 text-[10px] font-bold text-[#666] uppercase tracking-wider">Inquiries</div>
               {messages.filter(m=>m.role==='user').map((m,i)=>(<button key={i} className="w-full text-left px-3 py-2 rounded hover:bg-[#222] text-xs text-[#AAA] truncate">{m.content||'Image'}</button>))}
            </div>
         </div>
         <div className="p-4 border-t border-[#2C2C2C] flex justify-between items-center">
            <span className="text-xs font-bold truncate max-w-[120px]">{user.email}</span>
            <button onClick={onSignOut} className="text-[10px] text-red-400 hover:text-white">Log Out</button>
         </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/80 z-40 lg:hidden" onClick={()=>setSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col relative overflow-hidden h-full bg-[#121212]">
         <header className="h-14 flex items-center justify-between px-4 border-b border-[#2C2C2C] bg-[#121212]/90 backdrop-blur z-10">
             <button onClick={()=>setSidebarOpen(true)} className="lg:hidden text-[#888]"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg></button>
             <div className="flex bg-[#222] p-1 rounded border border-[#333]">
                <button onClick={()=>setActiveTab('chat')} className={`px-4 py-1 text-xs font-bold rounded ${activeTab==='chat' ? 'bg-[#333] text-white shadow' : 'text-[#666]'}`}>Chat</button>
                <button onClick={()=>setActiveTab('audit')} className={`px-4 py-1 text-xs font-bold rounded ${activeTab==='audit' ? 'bg-[#333] text-white shadow' : 'text-[#666]'}`}>Audit</button>
             </div>
         </header>
         
         {activeTab === 'chat' ? (
             <div className="flex-1 flex flex-col relative overflow-hidden">
               <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 lg:px-24 pt-6 pb-36 custom-scroll space-y-6">
                  {messages.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <h2 className="text-xl font-bold text-white mb-4">Protocol Intelligence Active</h2>
                        <p className="text-sm text-[#888]">Washtenaw database connected.</p>
                     </div>
                  )}
                  {messages.map((m,i) => (
                     <div key={i} className={`flex gap-4 ${m.role==='user'?'justify-end':'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 text-sm rounded-xl leading-relaxed border ${m.role==='user'?'bg-[#2C2C2C] text-white border-[#333]':'bg-transparent text-[#DDD] border-l-2 border-[#3B82F6] pl-4 border-t-0 border-r-0 border-b-0'}`}>
                           {m.image && <img src={m.image} className="mb-2 max-h-64 rounded border border-[#444]" />}
                           <div className="whitespace-pre-wrap">{m.role === 'assistant' ? formatContent(m.content) : m.content}</div>
                        </div>
                     </div>
                  ))}
                  {isSending && <div className="pl-4"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '35px', height: '35px' }} /></div>}
               </div>
               <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent pt-10 z-20">
                  <div className="max-w-3xl mx-auto bg-[#1E1E1E] border border-[#333] rounded-full flex items-center shadow-xl p-1.5">
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/>
                     <button type="button" onClick={()=>fileInputRef.current.click()} className="w-10 h-10 rounded-full flex items-center justify-center text-[#666] hover:text-white hover:bg-[#333] transition-colors">+</button>
                     <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend(e)}}} className="flex-1 bg-transparent px-3 text-sm text-white outline-none h-10 placeholder-[#555]" placeholder="Query database..." />
                     <button onClick={handleSend} disabled={!input&&!selectedImage} className="w-10 h-10 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white flex items-center justify-center disabled:opacity-50 disabled:bg-[#333]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                  </div>
               </div>
             </div>
         ) : (
             <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scroll">
                <div className="max-w-3xl mx-auto pb-20">
                   <div className="bg-[#1C1C1C] border border-[#333] rounded-lg p-4 mb-4"><h3 className="text-white font-bold">Audit Checklist</h3><p className="text-xs text-[#666]">Self-Assessment</p></div>
                   {AUDIT_CHECKLIST.map((cat, idx) => (
                      <div key={idx} className="mb-4 bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg overflow-hidden">
                         <div className="px-4 py-3 bg-[#222] text-xs font-bold text-[#CCC] uppercase tracking-wider">{cat.category}</div>
                         <div className="divide-y divide-[#2C2C2C]">{cat.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4">
                               <span className="text-sm text-[#D4D4D8]">{item.label}</span>
                               <div className="flex gap-2">
                                  <button onClick={()=>setAuditResults(p=>({...p,[item.id]:'pass'}))} className="px-3 py-1 text-[10px] font-bold uppercase rounded border bg-[#111] border-[#333] text-[#555] hover:bg-[#222]">Pass</button>
                                  <button onClick={()=>setAuditResults(p=>({...p,[item.id]:'fail'}))} className="px-3 py-1 text-[10px] font-bold uppercase rounded border bg-[#111] border-[#333] text-[#555] hover:bg-[#222]">Fail</button>
                               </div>
                            </div>
                         ))}</div>
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
// 3. ROOT COMPONENT
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('signup') // Default to signup to capture trial intent
  const [landingInput, setLandingInput] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setIsLoading(false)
    }
    init()
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s); if(s) setShowAuth(false)
    })
    return () => l.subscription.unsubscribe()
  }, [])

  // LANDING PAGE HANDLERS
  const handleLandingSubmit = (e) => {
    e.preventDefault()
    if (!landingInput.trim()) return
    // Trigger Auth Modal if they try to chat
    setShowAuth(true)
  }

  const handleOAuth = async () => {
     await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
     })
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    // Get form values safely... simplified for copy-paste:
    const email = e.target.email.value
    const password = e.target.password.value
    
    if (authView === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { county: 'washtenaw' }, emailRedirectTo: `${window.location.origin}/auth/callback` } })
        if (!error) alert('Check your email to confirm account.')
    } else {
        await supabase.auth.signInWithPassword({ email, password })
    }
  }

  if(isLoading) return <div className="min-h-screen bg-[#121212]"/>

  // --- LOGGED IN ---
  if(session) return <DashboardInterface user={session.user} onSignOut={() => supabase.auth.signOut()} initialQuery={landingInput} />

  // --- LOGGED OUT (LANDING) ---
  return (
    <div className="min-h-[100dvh] w-full bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3B82F6] selection:text-[#121212] flex flex-col relative overflow-x-hidden">
      <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js" type="module" strategy="afterInteractive" />
      
      {/* BG */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#121212]">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/80"></div>
      </div>

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 h-16 px-6 flex items-center justify-between bg-[#121212]/80 backdrop-blur-md border-b border-[#2C2C2C]">
        <div className="text-xl font-bold tracking-tight text-white">protocol<span className="text-[#3B82F6]">LM</span></div>
        <div className="flex gap-6 items-center">
          <button onClick={()=>router.push('/pricing')} className="text-xs font-bold text-[#888] hover:text-white uppercase hidden md:block">Pricing</button>
          <button onClick={()=>{setAuthView('login'); setShowAuth(true)}} className="text-xs font-bold text-[#888] hover:text-white uppercase">Log In</button>
          <button onClick={()=>{setAuthView('signup'); setShowAuth(true)}} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-md text-xs font-bold uppercase shadow-lg transition-all active:scale-95">Start Free Trial</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-32 pb-12 z-10 relative w-full max-w-5xl mx-auto">
          
          {/* Headlines */}
          <div className="text-center mb-10 w-full">
             <h1 className="text-4xl md:text-6xl font-medium text-[#EDEDED] tracking-tight leading-[1.05] mb-4">
               Train your team <br className="md:hidden" /> before the inspector arrives
             </h1>
             <div className="flex flex-col md:flex-row justify-center items-center gap-2 text-[13px] text-[#888] font-medium">
               <span className="bg-[#1C1C1C] border border-[#3B82F6]/30 text-[#EDEDED] px-2 py-1 rounded">Washtenaw County</span>
               <span className="bg-[#1C1C1C] border border-[#333] px-2 py-1 rounded">Michigan Food Law</span>
               <span className="bg-[#1C1C1C] border border-[#333] px-2 py-1 rounded">FDA Code</span>
             </div>
          </div>

          {/* The Real Interaction Point (Pill) */}
          <div className="w-full max-w-2xl">
             <form onSubmit={handleLandingSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                   <button type="button" className="p-2 rounded-full bg-[#222] text-[#666] border border-[#333]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                   </button>
                </div>
                <input 
                  value={landingInput}
                  onChange={(e) => setLandingInput(e.target.value)}
                  className="w-full bg-[#1E1E1E] border border-[#333] text-white rounded-full py-4 pl-14 pr-14 shadow-2xl focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/50 outline-none transition-all placeholder-[#555]"
                  placeholder="Ask protocolLM..."
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                   <button type="submit" disabled={!landingInput} className={`p-2 rounded-full transition-all ${landingInput ? 'bg-[#3B82F6] text-white' : 'bg-[#252525] text-[#444]'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7"/></svg>
                   </button>
                </div>
             </form>
             <p className="text-center text-[10px] text-[#444] mt-4 font-mono uppercase tracking-widest">Encrypted & Secure</p>
          </div>

      </div>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-[#2C2C2C] bg-[#121212] z-10 text-[10px] text-[#666] font-bold uppercase tracking-widest">
         <div className="flex justify-center gap-6 mb-2">
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <span>© 2025 protocolLM</span>
         </div>
         <div className="mt-2 flex justify-center gap-2 items-center opacity-50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span> Wayne & Oakland Coming Q1
         </div>
      </footer>

      {/* AUTH MODAL */}
      {showAuth && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#1C1C1C] border border-[#333] p-8 rounded-xl shadow-2xl relative animate-in zoom-in-95">
               <button onClick={()=>setShowAuth(false)} className="absolute top-4 right-4 text-[#666] hover:text-white">✕</button>
               <h2 className="text-center font-bold text-lg text-white mb-6 uppercase tracking-wider border-b border-[#333] pb-4">{authView==='login'?'Member Access':'Start Trial'}</h2>
               
               <button onClick={handleOAuth} className="w-full bg-white text-black font-bold py-3 rounded-lg text-sm mb-4 hover:bg-gray-200 flex justify-center items-center gap-2">
                 <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                 Continue with Google
               </button>
               
               <div className="text-center text-[10px] text-[#444] uppercase my-4">Or use email</div>
               
               <form onSubmit={handleEmailAuth} className="space-y-3">
                 <input name="email" type="email" placeholder="Email" className="w-full p-3 bg-[#111] border border-[#333] rounded text-white text-sm focus:border-[#3B82F6] outline-none" required />
                 <input name="password" type="password" placeholder="Password" className="w-full p-3 bg-[#111] border border-[#333] rounded text-white text-sm focus:border-[#3B82F6] outline-none" required minLength={6} />
                 <button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest mt-2">
                    {authView==='login' ? 'Sign In' : 'Create Account'}
                 </button>
               </form>

               <div className="mt-6 text-center">
                 <button onClick={()=>setAuthView(authView==='login'?'signup':'login')} className="text-xs text-[#666] hover:text-white underline decoration-dotted underline-offset-4">
                   {authView==='login' ? "Need an account?" : "Have an account?"}
                 </button>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
