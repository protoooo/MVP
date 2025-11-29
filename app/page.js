'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Script from 'next/script'

import SessionGuard from '@/components/SessionGuard'

// --- 1. CONSTANTS & DATA ---
// Reduced to basics as requested. No sample questions.
const COUNTY_LABELS = { washtenaw: 'Washtenaw County' }
const AUDIT_CHECKLIST = [
  {
    category: 'Temperature Control',
    items: [
      { id: 'cold_holding', label: 'Cold holding at 41°F or below', critical: true },
      { id: 'hot_holding', label: 'Hot holding at 135°F or above', critical: true },
      { id: 'cooking_temps', label: 'Proper cooking temperatures documented', critical: true }
    ]
  },
  {
    category: 'Sanitation',
    items: [
      { id: 'three_comp', label: '3-compartment sink setup verified', critical: true },
      { id: 'surfaces', label: 'Food contact surfaces sanitized', critical: true }
    ]
  }
]

// ==========================================
// 2. MAIN PAGE LOGIC
// ==========================================
export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  
  // Auth State
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // App State
  const [activeTab, setActiveTab] = useState('chat')
  const [viewMode, setViewMode] = useState('hero') // 'hero' | 'chat'
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  
  // Mock Audit
  const [auditResults, setAuditResults] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})

  // Refs
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  // 1. INITIALIZE SESSION
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      
      // If they are logged in, we stay in 'hero' mode until they interact, 
      // OR we could auto-load history here. For now, mimicking ChatGPT: start fresh.
      setIsLoading(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isSending])


  // 2. CORE HANDLERS
  
  // Handle submitting a question
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() && !selectedImage) return

    // --- GATING LOGIC ---
    if (!session) {
      // User is NOT logged in. Redirect to Pricing immediately.
      router.push('/pricing')
      return
    }

    // --- LOGGED IN LOGIC ---
    // 1. Switch view mode to chat
    setViewMode('chat')
    
    // 2. Add user message
    const newMsg = { role: 'user', content: input, image: selectedImage }
    const updatedMessages = [...messages, newMsg]
    setMessages(updatedMessages)
    
    // 3. Reset input
    const queryText = input
    setInput('')
    setSelectedImage(null)
    setIsSending(true)

    // 4. Fire API Request
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages, 
          county: 'washtenaw' 
        })
      })
      
      if (!res.ok) {
         setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Please try again." }])
         return
      }
      
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message || "No response received." }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Please verify connection." }])
    } finally {
      setIsSending(false)
    }
  }

  const handleImageSelect = (e) => {
    if (!session) { router.push('/pricing'); return }
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setSelectedImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  // Render formatting for AI responses
  const formatContent = (text) => {
    if (text.includes('ACTION REQUIRED')) {
       const parts = text.split('ACTION REQUIRED')
       return (<span><span className="text-[#F87171] font-bold">ACTION REQUIRED</span>{parts[1]}</span>)
    }
    if (text.includes('VIOLATION')) {
       const parts = text.split('VIOLATION')
       return (<span><span className="text-[#F87171] font-bold">VIOLATION</span>{parts[1]}</span>)
    }
    return text
  }


  if (isLoading) return <div className="min-h-screen bg-[#121212]"/>

  // ==============================================================
  // UI RENDER
  // ==============================================================
  return (
    <div className="min-h-screen w-full bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3B82F6] selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Required Scripts */}
      <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js" type="module" strategy="afterInteractive" />

      {/* --- HEADER (Minimalist Top Anchors) --- */}
      <div className="fixed top-0 left-0 w-full px-6 py-4 flex justify-between items-center z-50 pointer-events-none">
         {/* Logo */}
         <div className="pointer-events-auto cursor-pointer" onClick={() => { setViewMode('hero'); setMessages([]); }}>
            <span className="text-base font-bold tracking-tight text-white">
               protocol<span className="text-[#3B82F6]">LM</span>
            </span>
         </div>
         {/* Auth Actions */}
         {!session && (
           <div className="pointer-events-auto flex gap-6">
              <button onClick={() => router.push('/auth/login')} className="text-xs font-medium text-[#888] hover:text-white transition-colors">Log in</button>
              <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-[#3B82F6] hover:text-white transition-colors uppercase tracking-wide">Pricing</button>
           </div>
         )}
         {session && (
           <div className="pointer-events-auto flex gap-6">
             <button onClick={() => setActiveTab(activeTab === 'chat' ? 'audit' : 'chat')} className="text-xs font-medium text-[#888] hover:text-white">
               {activeTab === 'chat' ? 'Switch to Audit' : 'Back to Chat'}
             </button>
           </div>
         )}
      </div>

      {/* --- BACKGROUND (Subtle Grid) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>


      {/* --- VIEW STATE 1: HERO / EMPTY CHAT --- */}
      {viewMode === 'hero' && activeTab === 'chat' && (
         <div className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-3xl mx-auto z-10 animate-in fade-in duration-700 relative">
            
            {/* Faint Value Prop (Middle of Screen) */}
            <div className="text-center mb-8 opacity-50 select-none pointer-events-none">
               <h1 className="text-xl md:text-2xl font-medium text-[#666] mb-2 tracking-tight">
                 Washtenaw County Food Safety Intelligence
               </h1>
               <p className="text-[10px] md:text-xs text-[#444] uppercase tracking-widest">
                 Trained on 1000+ Local Enforcement Documents
               </p>
            </div>

            {/* The "Long Thin Pill" Search Bar */}
            <form onSubmit={handleSubmit} className="w-full max-w-2xl relative group">
               {/* Input */}
               <div className="relative flex items-center w-full bg-[#18181B] border border-[#333] rounded-full shadow-2xl transition-all duration-300 group-hover:border-[#3B82F6] focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6]/30">
                  {/* Plus Icon (Image) */}
                  <div className="pl-3">
                     <button 
                       type="button" 
                       onClick={() => !session ? router.push('/pricing') : fileInputRef.current?.click()} 
                       className="p-2 text-[#555] hover:text-[#EAEAEA] transition-colors bg-[#222] hover:bg-[#333] rounded-full"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     </button>
                     <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </div>

                  <input 
                     type="text"
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     className="flex-1 bg-transparent border-none outline-none text-white placeholder-[#444] text-base py-4 px-3 h-[52px]"
                     placeholder={session ? "Message protocolLM..." : "Ask a compliance question..."}
                     autoFocus
                  />

                  {/* Send Arrow */}
                  <div className="pr-2">
                     <button 
                       type="submit"
                       disabled={!input}
                       className={`p-2 rounded-full transition-all ${input ? 'bg-[#3B82F6] text-black' : 'bg-[#252525] text-[#444]'}`}
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                     </button>
                  </div>
               </div>
               
               {/* Login Gating Message */}
               {!session && (
                  <div className="absolute top-full left-0 right-0 text-center mt-4">
                     <p className="text-[10px] text-[#333] hover:text-[#3B82F6] transition-colors cursor-pointer" onClick={() => router.push('/pricing')}>
                        Login required for detailed regulatory analysis.
                     </p>
                  </div>
               )}
            </form>
         </div>
      )}


      {/* --- VIEW STATE 2: ACTIVE CONSOLE --- */}
      {/* Only visible if we switch to 'chat' mode or 'audit' tab */}
      {(viewMode === 'chat' || activeTab === 'audit') && (
        <div className="flex-1 flex h-screen w-full z-20 pt-14 pb-safe">
          
          {/* SIDEBAR (Desktop only, appears in active mode) */}
          <div className="hidden md:flex flex-col w-64 bg-[#0D0D0D] border-r border-[#222] shrink-0">
             <div className="flex-1 p-4">
                <div className="text-[10px] font-bold text-[#444] mb-3 uppercase tracking-wider">Session</div>
                <div className="space-y-1">
                   {messages.filter(m=>m.role==='user').map((m,i) => (
                      <div key={i} className="px-3 py-2 text-xs text-[#888] bg-[#18181B] rounded truncate border border-transparent hover:border-[#333]">{m.content || 'Image'}</div>
                   ))}
                   {activeTab === 'chat' && messages.length > 0 && <button onClick={()=>{setMessages([]);setViewMode('hero')}} className="w-full text-left text-[10px] text-blue-500 hover:underline pt-2 pl-1">+ New Session</button>}
                </div>
             </div>
             <div className="p-4 border-t border-[#222] flex justify-between items-center">
                <span className="text-xs text-[#666] truncate max-w-[120px]">{session?.user?.email}</span>
                <button onClick={async ()=>{await supabase.auth.signOut(); window.location.href='/'}} className="text-[10px] text-[#F87171]">LOGOUT</button>
             </div>
          </div>

          {/* MAIN PANEL */}
          <div className="flex-1 flex flex-col bg-[#121212] relative overflow-hidden">
             
             {activeTab === 'chat' ? (
                /* CHAT MODE */
                <>
                   <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 pt-4 pb-10 custom-scroll space-y-6">
                      {messages.map((msg, i) => (
                         <div key={i} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
                            <div className={`max-w-[90%] md:max-w-[80%] p-4 text-[14px] leading-relaxed whitespace-pre-wrap rounded-2xl ${
                               msg.role==='user' ? 'bg-[#252525] text-white border border-[#333]' : 'bg-transparent text-[#EEE] pl-0'
                            }`}>
                               {msg.image && <img src={msg.image} alt="user-upload" className="mb-2 rounded border border-[#333] h-32" />}
                               {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                            </div>
                         </div>
                      ))}
                      {isSending && (
                         <div className="pl-1 py-2 flex items-center gap-3">
                           <dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '35px', height: '35px' }} />
                           <span className="text-xs text-[#444] animate-pulse">Checking Database...</span>
                         </div>
                      )}
                   </div>

                   {/* Floating Input for Active Chat */}
                   <div className="p-4 bg-[#121212] w-full max-w-3xl mx-auto">
                      <form onSubmit={handleSubmit} className="relative bg-[#18181B] border border-[#333] rounded-2xl flex items-center shadow-lg">
                         <button type="button" className="p-3 text-[#666] hover:text-white"><span className="text-lg">+</span></button>
                         <input 
                            className="flex-1 bg-transparent p-3 text-sm text-white outline-none"
                            value={input}
                            onChange={e=>setInput(e.target.value)}
                            placeholder="Ask a follow up..."
                            autoFocus
                         />
                         <button type="submit" disabled={!input} className={`p-2 mr-1 rounded-lg ${input ? 'bg-blue-600 text-white' : 'bg-[#222] text-[#444]'}`}>↑</button>
                      </form>
                   </div>
                </>
             ) : (
                /* AUDIT MODE (Kept functionality as requested) */
                <div className="flex-1 overflow-y-auto p-6">
                   <div className="max-w-2xl mx-auto">
                      <h2 className="text-xl font-bold text-white mb-4">Audit Protocol</h2>
                      <div className="space-y-3">
                         {AUDIT_CHECKLIST.map(cat => (
                            <div key={cat.category} className="border border-[#333] bg-[#18181B] rounded-lg">
                               <div className="p-3 border-b border-[#252525] text-xs font-bold text-[#AAA] uppercase">{cat.category}</div>
                               <div className="p-2">
                                  {cat.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-2 hover:bg-[#222] rounded">
                                       <span className="text-xs text-gray-300">{item.label}</span>
                                       <div className="flex gap-2">
                                          <button className="px-3 py-1 text-[10px] bg-[#222] hover:bg-green-900 text-gray-400 hover:text-green-200 rounded">Pass</button>
                                          <button className="px-3 py-1 text-[10px] bg-[#222] hover:bg-red-900 text-gray-400 hover:text-red-200 rounded">Fail</button>
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
          </div>
        </div>
      )}
      
      {/* Footer Links (Visible on Hero Only) */}
      {viewMode === 'hero' && (
        <div className="fixed bottom-6 w-full text-center pointer-events-auto">
           <div className="flex justify-center gap-6 text-[10px] text-[#444]">
             <a href="/terms" className="hover:text-[#666]">Terms</a>
             <a href="/privacy" className="hover:text-[#666]">Privacy</a>
             <span>© 2025 protocolLM</span>
           </div>
        </div>
      )}
      
      <style jsx global>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .custom-scroll::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </div>
  )
}
