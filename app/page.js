'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import Image from 'next/image'
// Imports previously used in DocumentsPage
import SessionGuard from '@/components/SessionGuard' 

// ------------------------------------------------------------------
// CONFIG & DATA (Merged from Dashboard)
// ------------------------------------------------------------------

const COUNTY_LABELS = {
  washtenaw: 'Washtenaw County',
}

const COUNTY_SUGGESTIONS = {
  washtenaw: [
    'What happens if my walk-in is at 48°F during an inspection?',
    'How fast do I have to cool chili from 135°F to 41°F?',
    'What is considered an imminent health hazard?',
    'Do I have to throw away food if an employee vomits?'
  ]
}

// --- AUDIT CHECKLIST DATA ---
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
  // ... Add other categories from your dashboard here ...
]


// ------------------------------------------------------------------
// 1. DEMO CHAT (For Non-LoggedIn Users - The Marketing Teaser)
// ------------------------------------------------------------------
const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, inputValue, isThinking])

  const SEQUENCE = [
    {
      text: "We received a notice for a 'Chronic Violation' in Washtenaw County. What does that mean?",
      response: "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2) and must submit a Risk Control Plan."
    },
    {
      text: 'Our certified manager quit yesterday. Do we have to close the kitchen?',
      response: "NO. Michigan Food Law (Sec 289.2129) allows a 3-month grace period to replace a Certified Food Service Manager. However, you must notify the Washtenaw County Health Department immediately to avoid penalties."
    },
    {
      text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?",
      response: 'VIOLATION: Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.'
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(Math.random() * 35 + 25)
    }

    const runSimulation = async () => {
      setHasStarted(true) 
      while (isMounted) {
        for (const step of SEQUENCE) {
          if (!isMounted) return
          setIsTyping(true)
          setInputValue('')
          await wait(800)
          for (const char of step.text) {
            if (!isMounted) return
            await typeChar(char)
          }
          await wait(400)
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false)
          setIsThinking(true)
          await wait(1800)
          setIsThinking(false)
          let currentResponse = ''
          const words = step.response.split(' ')
          setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
          for (let i = 0; i < words.length; i++) {
            if (!isMounted) return
            currentResponse += (i === 0 ? '' : ' ') + words[i]
            setMessages((prev) => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].content = currentResponse
              return newMsgs
            })
            await wait(25)
          }
          await wait(3500)
        }
        await wait(1200)
        setMessages((prev) => prev.slice(-4))
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text) => {
    if (text.includes('ACTION REQUIRED')) return (<span><span className="text-[#F87171] font-bold">ACTION REQUIRED</span>{text.split('ACTION REQUIRED')[1]}</span>)
    if (text.includes('VIOLATION')) return (<span><span className="text-[#F87171] font-bold">VIOLATION</span>{text.split('VIOLATION')[1]}</span>)
    if (text.includes('NO.')) return (<span><span className="text-[#3ECF8E] font-bold">COMPLIANT: NO.</span>{text.split('NO.')[1]}</span>)
    return text
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-[#888] font-mono text-xs tracking-widest">INITIALIZING...</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed rounded-md border ${msg.role === 'user' ? 'bg-[#2C2C2C] text-[#EDEDED] border-[#3C3C3C]' : 'bg-[#1C1C1C] text-[#C2C2C2] border-transparent pl-0'}`}>
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {isThinking && <div className="pl-4"><dotlottie-wc src="https://lottie.host/75998d8b-95ab-4f51-82e3-7d3247321436/2itIM9PrZa.lottie" autoplay loop style={{ width: '40px', height: '40px' }} /></div>}
      </div>
      <div className="p-4 border-t border-[#2C2C2C] bg-[#232323]">
         <div className="flex items-center gap-2 opacity-50">
           <span className="text-[#3ECF8E] text-xs font-mono">{'>'}</span>
           <span className="text-xs text-[#EDEDED]">{inputValue}</span>
           {isTyping && <span className="w-1.5 h-4 bg-[#3ECF8E] animate-pulse"></span>}
         </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// 2. FULL DASHBOARD COMPONENT (Formerly DocumentsPage)
// ------------------------------------------------------------------
const DashboardInterface = ({ user, onSignOut, onUpgrade }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [activeCounty, setActiveCounty] = useState('washtenaw')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  
  // Get user tier info from supabase or prop
  const userTier = 'pro' // Example: replace with real fetching logic inside

  const handleSend = async (e) => {
     if (e) e.preventDefault()
     if (!input.trim() && !selectedImage) return
     const userMsg = { role: 'user', content: input, image: selectedImage }
     setMessages(prev => [...prev, userMsg])
     setInput(''); setSelectedImage(null); setIsSending(true);
     
     try {
       const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ messages: [...messages, userMsg], county: activeCounty })
       })
       const data = await res.json()
       setMessages(prev => [...prev, { role: 'assistant', content: data.message || "Error fetching response." }])
     } catch (e) { console.error(e); } 
     finally { setIsSending(false) }
  }
  
  return (
    <div className="flex-1 flex h-full w-full max-w-7xl mx-auto pt-20 pb-6 px-4">
       {/* Sidebar (Desktop) */}
       <div className="hidden md:flex w-64 flex-col border-r border-[#2C2C2C] pr-6 mr-6">
          <h2 className="text-[#888] text-[10px] font-mono uppercase tracking-wider mb-4">Active Session</h2>
          <div className="p-3 bg-[#1C1C1C] rounded border border-[#333] mb-6">
             <div className="text-xs text-white font-bold">{user.email}</div>
             <button onClick={onSignOut} className="text-[10px] text-[#F87171] hover:underline mt-1">Sign Out</button>
          </div>
          <h2 className="text-[#888] text-[10px] font-mono uppercase tracking-wider mb-2">Jurisdiction</h2>
          <div className="p-2 bg-[#1C1C1C] border border-[#3ECF8E] text-[#3ECF8E] text-xs font-bold rounded text-center mb-6">Washtenaw (Live)</div>
       </div>

       {/* Main Chat Interface */}
       <div className="flex-1 flex flex-col bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden shadow-2xl h-[80vh]">
          {/* Header */}
          <div className="h-12 border-b border-[#2C2C2C] bg-[#232323] flex items-center px-6 justify-between">
             <div className="text-xs font-mono font-bold text-[#EDEDED]">Command Center</div>
             <div className="text-[10px] text-[#3ECF8E] animate-pulse">● SECURE LINK</div>
          </div>

          {/* Chat Output */}
          <div className="flex-1 p-6 overflow-y-auto custom-scroll">
             {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <div className="text-4xl mb-4">🛡️</div>
                  <p className="text-sm font-medium text-center">What regulations can I clarify for you today?</p>
               </div>
             ) : (
               messages.map((m, i) => (
                 <div key={i} className={`mb-4 p-3 rounded ${m.role === 'user' ? 'bg-[#2C2C2C] ml-12' : 'bg-transparent border-l-2 border-[#3ECF8E] pl-4'}`}>
                    <div className="text-[13px] text-[#E4E4E7] whitespace-pre-wrap">{m.content}</div>
                 </div>
               ))
             )}
             {isSending && <div className="text-xs text-[#666] pl-4 font-mono">... Analyzing compliance docs</div>}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#232323] border-t border-[#2C2C2C]">
             <form onSubmit={handleSend} className="flex gap-2">
               <input 
                  className="flex-1 bg-[#161616] border border-[#333] rounded p-3 text-sm text-white focus:outline-none focus:border-[#3ECF8E]" 
                  placeholder="Ask protocol_LM..." 
                  value={input} 
                  onChange={e => setInput(e.target.value)}
               />
               <button type="submit" className="bg-[#3ECF8E] text-[#111] px-6 font-bold text-xs rounded hover:bg-[#34D399]">SEND</button>
             </form>
          </div>
       </div>
    </div>
  )
}

// ------------------------------------------------------------------
// 3. MAIN PAGE CONTROLLER (Orchestrator)
// ------------------------------------------------------------------
export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
       const { data } = await supabase.auth.getSession()
       setSession(data.session)
       setIsLoading(false)
    }
    init()
    
    // Listener for auth state changes (e.g. login modal success)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) setShowAuth(false) // Close modal on success
    })
    return () => authListener.subscription.unsubscribe()
  }, [supabase])

  // Auth Modal Handlers (Reused from your previous code)
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }
  
  // IF LOGGED IN: SHOW DASHBOARD
  if (!isLoading && session) {
    return (
       <div className="min-h-screen bg-[#121212] font-sans text-white">
          <SessionGuard userId={session.user.id} />
          <DashboardInterface user={session.user} onSignOut={() => supabase.auth.signOut()} onUpgrade={() => router.push('/pricing')} />
       </div>
    )
  }

  // IF LOGGED OUT: SHOW MARKETING + DEMO
  return (
    <div className="min-h-[100dvh] w-full bg-[#121212] font-sans text-[#EDEDED] flex flex-col relative overflow-hidden">
      
      <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js" type="module" strategy="afterInteractive" />

      {/* Header/Nav */}
      <nav className="fixed top-0 w-full z-50 px-6 pt-4 flex justify-between max-w-7xl mx-auto left-0 right-0">
         <div className="flex items-center gap-2 text-xl font-bold tracking-tighter cursor-pointer">
           protocol<span className="text-[#3B82F6]">LM</span>
         </div>
         <div className="flex gap-4 items-center">
           <button onClick={() => setShowAuth(true)} className="text-xs font-bold text-[#888] hover:text-white">Log In</button>
           <button onClick={() => setShowAuth(true)} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded text-xs font-bold">Start Free Trial</button>
         </div>
      </nav>

      {/* Landing Hero */}
      <div className="flex-1 flex flex-col items-center pt-24 pb-6 px-4 text-center relative z-10">
         <h1 className="text-4xl md:text-6xl font-medium text-[#EDEDED] mb-4 tracking-tight leading-tight">
            Train your team before the inspector arrives
         </h1>
         <div className="flex flex-col md:flex-row items-center gap-3 mb-12 opacity-80">
            <div className="bg-[#1C1C1C] border border-[#3ECF8E]/30 text-[#EDEDED] px-3 py-1 rounded text-[11px] font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full"></span>Washtenaw
            </div>
            <div className="bg-[#1C1C1C] border border-[#333] text-[#888] px-3 py-1 rounded text-[11px] font-medium">Michigan Food Law</div>
            <div className="bg-[#1C1C1C] border border-[#333] text-[#888] px-3 py-1 rounded text-[11px] font-medium">FDA Code 2022</div>
         </div>

         {/* THE DEMO BOX */}
         <div className="w-full max-w-4xl h-[500px] bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg overflow-hidden shadow-2xl">
            {/* Demo Header */}
            <div className="h-10 border-b border-[#2C2C2C] bg-[#232323] flex items-center justify-between px-4">
               <span className="text-[11px] text-[#EDEDED] opacity-70">protocol_LM</span>
               <span className="text-[10px] text-[#3B82F6] font-bold">LIVE</span>
            </div>
            <DemoChatContent /> {/* Re-used the Marketing Demo logic here */}
         </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-[#2C2C2C] bg-[#121212] text-xs text-[#666]">
         <div className="flex justify-center gap-6 mb-2">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
         </div>
         © 2025 protocolLM
      </footer>

      {/* AUTH MODAL (Simplified for merge) */}
      {showAuth && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#1C1C1C] border border-[#333] p-8 rounded-lg w-full max-w-sm relative">
              <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-[#666]">✕</button>
              <h2 className="text-lg font-bold text-white text-center mb-6">Access Portal</h2>
              <button onClick={handleGoogleSignIn} className="w-full bg-[#252525] border border-[#333] hover:border-white text-white py-3 rounded text-sm font-bold mb-4 flex justify-center gap-2 items-center">
                 Google Sign In
              </button>
              <div className="text-center text-[10px] text-[#555] uppercase tracking-widest mt-4">Secured by Supabase Auth</div>
           </div>
        </div>
      )}

    </div>
  )
}
