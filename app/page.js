'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import Image from 'next/image'
import SessionGuard from '@/components/SessionGuard'

// ==========================================
// 0. DATA CONSTANTS (Preserved)
// ==========================================

const COUNTY_LABELS = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const COUNTY_STATUS = {
  washtenaw: 'Regulatory Intelligence active for Washtenaw County.',
  wayne: 'Regulatory Intelligence active for Wayne County.',
  oakland: 'Regulatory Intelligence active for Oakland County.'
}

const COUNTY_SUGGESTIONS = {
  washtenaw: [
    'What happens if my walk-in is at 48°F during an inspection?',
    'How fast do I have to cool chili from 135°F to 41°F?',
    'What is considered an imminent health hazard in Washtenaw?',
    'Do I have to throw away food if an employee vomits in the kitchen?'
  ]
}

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
      { id: 'hand_antiseptic', label: 'Hand antiseptic used properly (after washing)', critical: false },
      { id: 'no_bare_hand', label: 'No bare hand contact with ready-to-eat foods', critical: true },
      { id: 'hair_restraints', label: 'Hair restraints worn properly', critical: false },
      { id: 'jewelry', label: 'No jewelry on hands/arms (except plain band)', critical: false }
    ]
  },
  {
    category: 'Cross Contamination',
    items: [
      { id: 'storage_separation', label: 'Raw meats stored below ready-to-eat foods', critical: true },
      { id: 'cutting_boards', label: 'Color-coded cutting boards used correctly', critical: false },
      { id: 'wiping_cloths', label: 'Wiping cloths stored in sanitizer (200ppm chlorine)', critical: false },
      { id: 'equipment_cleaning', label: 'Food contact surfaces cleaned and sanitized', critical: true }
    ]
  },
  {
    category: 'Facility & Equipment',
    items: [
      { id: 'three_comp_sink', label: '3-compartment sink setup correct (wash-rinse-sanitize)', critical: true },
      { id: 'dishwasher', label: 'Dish machine reaching proper temps (150°F wash, 180°F rinse)', critical: true },
      { id: 'water_pressure', label: 'Adequate water pressure and hot water supply', critical: true },
      { id: 'floors_walls', label: 'Floors, walls, ceilings clean and in good repair', critical: false },
      { id: 'pest_control', label: 'No evidence of pests, pest control logs available', critical: true }
    ]
  },
  {
    category: 'Food Safety Management',
    items: [
      { id: 'certified_manager', label: 'Certified Food Safety Manager on staff', critical: true },
      { id: 'date_marking', label: 'Ready-to-eat PHF foods properly date marked', critical: true },
      { id: 'allergen_awareness', label: 'Allergen procedures documented and followed', critical: false },
      { id: 'employee_illness', label: 'Employee illness policy posted and enforced', critical: true },
      { id: 'haccp_logs', label: 'Temperature logs, cleaning logs maintained', critical: false }
    ]
  }
]

function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

// ==========================================
// 1. LANDING PAGE: DEMO CONTENT (Marketing)
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
      response: 'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.'
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
          await wait(900)
          for (const char of step.text) {
            if (!isMounted) return
            await typeChar(char)
          }
          await wait(450)
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false)
          setIsThinking(true)
          await wait(2100)
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
            await wait(30)
          }
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
    if (text.includes('ACTION REQUIRED')) {
       const parts = text.split('ACTION REQUIRED')
       return (<span><span className="text-[#F87171] font-bold">ACTION REQUIRED</span>{parts[1]}</span>)
    }
    if (text.includes('VIOLATION')) {
       const parts = text.split('VIOLATION')
       return (<span><span className="text-[#F87171] font-bold">VIOLATION</span>{parts[1]}</span>)
    }
    if (text.includes('COMPLIANT')) {
       const parts = text.split('COMPLIANT')
       return (<span><span className="text-[#3ECF8E] font-bold">COMPLIANT</span>{parts[1]}</span>)
    }
    return text
  }

  return (
    <div className="relative w-full max-w-5xl group mx-auto">
      <div className="flex flex-col h-[400px] md:h-[550px] w-full bg-[#1C1C1C] border border-[#2C2C2C] rounded-md relative z-10 overflow-hidden shadow-2xl">
        <div className="h-10 border-b border-[#2C2C2C] flex items-center px-4 justify-between bg-[#232323] shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="font-sans text-[11px] font-medium text-[#EDEDED] tracking-wide opacity-80">
              protocol<span className="text-[#3B82F6]">LM</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full animate-pulse shadow-[0_0_8px_rgba(62,207,142,0.4)]"></div>
             <span className="text-[10px] font-medium text-[#3ECF8E] uppercase tracking-wide">Live</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll bg-[#1C1C1C]">
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
              <div className="w-12 h-12 border border-[#3C3C3C] rounded-md flex items-center justify-center border-dashed">
                 <div className="w-4 h-4 bg-[#3C3C3C] rounded-sm animate-pulse"/>
              </div>
              <p className="text-[11px] font-medium text-[#888888] tracking-widest uppercase">Washtenaw DB Initialized</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed rounded-md border ${msg.role === 'user' ? 'bg-[#2C2C2C] text-[#EDEDED] border-[#3C3C3C]' : 'bg-[#1C1C1C] text-[#C2C2C2] border-transparent pl-0' }`}>
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in pl-0">
              <div className="px-0 py-2 flex items-center"><div className="loader"></div></div>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#232323] border-t border-[#2C2C2C] shrink-0">
          <div className="w-full bg-[#161616] border border-[#333333] rounded-md px-3 py-2.5 flex items-center gap-3 transition-all focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6]/20">
            <span className="text-[#3B82F6] text-xs font-mono">{'>'}</span>
            <div className="flex-1 text-[13px] text-[#EDEDED] font-mono min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && <span className="inline-block w-1.5 h-4 bg-[#3B82F6] ml-0.5 animate-pulse" />}
              {!inputValue && !isTyping && <span className="text-[#555] text-xs">Run compliance query...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 2. AUTH MODAL
// ==========================================
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)
  const supabase = createClient()

  useEffect(() => { setView(defaultView); setMessage(null) }, [isOpen, defaultView])

  const handleGoogleSignIn = async () => {
    setLoading(true); setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } }
      })
      if (error) throw error
    } catch (error) { setMessage({ type: 'error', text: error.message }); setLoading(false) }
  }

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true); setMessage(null)
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { county: 'washtenaw' } } })
        if (error) throw error
        if (data?.user && !data?.session) setMessage({ type: 'success', text: 'Check your email.' })
        else if (data?.session) window.location.href = '/accept-terms'
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: profile } = await supabase.from('user_profiles').select('is_subscribed, accepted_terms, accepted_privacy').eq('id', data.session.user.id).single()
        if (!profile?.accepted_terms || !profile?.accepted_privacy) window.location.href = '/accept-terms'
        else if (profile?.is_subscribed) window.location.href = '/documents'
        else window.location.href = '/pricing'
      }
    } catch (error) { setMessage({ type: 'error', text: error.message }) } 
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
      <div className="w-full max-w-[380px] bg-[#1C1C1C] border border-[#2C2C2C] shadow-2xl p-8 rounded-md relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="text-center mb-8"><h2 className="text-lg font-medium text-[#EDEDED] tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2></div>
        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-2.5 bg-[#232323] text-[#EDEDED] border border-[#333333] hover:bg-[#2C2C2C] hover:border-[#444] transition-all disabled:opacity-50 mb-6 rounded-md"><svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span className="text-sm font-medium">Google</span></button>
        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2C2C2C]" /></div><div className="relative flex justify-center text-xs"><span className="px-2 bg-[#1C1C1C] text-[#666]">Or</span></div></div>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2.5 bg-[#161616] border border-[#333333] focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/20 outline-none text-[#EDEDED] text-sm rounded-md transition-all placeholder-[#555]" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-2.5 bg-[#161616] border border-[#333333] focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/20 outline-none text-[#EDEDED] text-sm rounded-md transition-all placeholder-[#555]" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#3ECF8E] hover:bg-[#34b27b] text-[#151515] font-semibold py-2.5 rounded-md text-sm transition-all disabled:opacity-50 mt-2 shadow-[0_0_10px_rgba(62,207,142,0.2)]">{loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}</button>
        </form>
        <div className="mt-6 pt-6 border-t border-[#2C2C2C] text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-[#888] hover:text-[#3ECF8E] transition-colors">{view === 'signup' ? 'Have an account? Sign in' : 'No account? Sign up'}</button></div>
      </div>
    </div>
  )
}


// ==========================================
// 3. DASHBOARD INTERFACE (LOGGED IN)
// ==========================================
const DashboardInterface = ({ user, onSignOut }) => {
  // ALL ORIGINAL FUNCTIONALITY PRESERVED HERE
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('chat')
  const [activeCounty, setActiveCounty] = useState('washtenaw')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [userPlan, setUserPlan] = useState('starter')
  
  const [auditResults, setAuditResults] = useState({})
  const [auditNotes, setAuditNotes] = useState({})
  const [auditImages, setAuditImages] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})
  const [currentAuditImageItem, setCurrentAuditImageItem] = useState(null)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const auditImageInputRef = useRef(null)
  const supabase = createClient()

  useEffect(() => {
     async function checkPlan() {
        const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
        if(sub?.plan) setUserPlan(sub.plan)
     }
     checkPlan()
  }, [supabase, user.id])

  // -- HANDLERS (FROM YOUR DOCUMENTS/PAGE.JS) --

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
       const reader = new FileReader()
       reader.onloadend = () => setSelectedImage(reader.result)
       reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeImage = () => setSelectedImage(null)

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(prev => [...prev, newMsg])
    setInput(''); const imageToSend = selectedImage; setSelectedImage(null); setIsSending(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], image: imageToSend, county: activeCounty })
      })
      if(!res.ok) throw new Error('Error')
      const data = await res.json()
      setMessages(prev => {
         const upd = [...prev]
         upd[upd.length -1] = { role: 'assistant', content: data.message }
         return upd
      })
    } catch (err) {
      setMessages(prev => {
         const upd = [...prev]
         upd[upd.length -1] = { role: 'assistant', content: "Connection error. Please check your network." }
         return upd
      })
    } finally { setIsSending(false) }
  }

  // --- AUDIT HANDLERS ---
  const handleAuditChange = (itemId, status) => setAuditResults(p => ({...p, [itemId]: status}))
  const handleNoteChange = (itemId, note) => setAuditNotes(p => ({...p, [itemId]: note}))
  const toggleCategory = (cat) => setExpandedCategories(p => ({...p, [cat]: !p[cat]}))

  const handleAuditImageSelect = (e) => {
    const file = e.target.files[0]
    if (file && currentAuditImageItem) {
      const reader = new FileReader()
      reader.onloadend = () => setAuditImages(p => ({...p, [currentAuditImageItem]: reader.result}))
      reader.readAsDataURL(file)
    }
    e.target.value = ''; setCurrentAuditImageItem(null)
  }

  const triggerAuditImageUpload = (id) => { setCurrentAuditImageItem(id); auditImageInputRef.current?.click() }
  const removeAuditImage = (id) => setAuditImages(p => { const n = {...p}; delete n[id]; return n })

  const generateAuditReport = () => {
    const completed = Object.keys(auditResults).length
    const total = AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)
    const passed = Object.values(auditResults).filter(v => v === 'pass').length
    const failed = Object.values(auditResults).filter(v => v === 'fail').length
    const report = `MOCK AUDIT REPORT - WASHTENAW\nGenerated: ${new Date().toLocaleString()}\nPassed: ${passed}\nFailed: ${failed}\nTotal Checked: ${completed}/${total}`
    const blob = new Blob([report], {type:'text/plain'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'audit-report.txt'; a.click()
  }

  const clearAudit = () => {
    if(confirm('Reset audit?')) { setAuditResults({}); setAuditNotes({}); setAuditImages({}) }
  }

  const hasMockAuditAccess = userPlan === 'pro' || userPlan === 'enterprise'

  return (
    <div className="flex h-full w-full bg-[#121212] text-[#EDEDED] font-sans selection:bg-[#3ECF8E] selection:text-black">
       
       {/* --- SIDEBAR --- */}
       <aside className="hidden lg:flex lg:flex-col w-72 bg-[#1C1C1C] border-r border-[#2C2C2C] z-30">
          <div className="h-16 flex items-center px-6 border-b border-[#2C2C2C]">
             <div className="text-lg font-bold tracking-tight text-white">protocol<span className="text-[#3ECF8E]">LM</span></div>
          </div>
          <div className="flex-1 p-4 space-y-8 overflow-y-auto custom-scroll">
             <div>
               <div className="px-2 mb-3 text-[10px] font-semibold text-[#888] uppercase tracking-wider">Jurisdiction</div>
               <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium bg-[#252525] border border-[#3ECF8E]/30 text-white shadow-sm cursor-default">
                 <span>WASHTENAW</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] shadow-[0_0_8px_rgba(62,207,142,0.6)]"></div>
               </button>
             </div>
             <div className="flex-1">
                <div className="px-2 mb-3 text-[10px] font-semibold text-[#888] uppercase tracking-wider">Recent</div>
                <div className="space-y-1">
                   {messages.filter(m=>m.role==='user').slice(-5).reverse().map((m,i) => (
                     <div key={i} className="px-3 py-2.5 rounded-md hover:bg-[#252525] cursor-default text-[11px] text-[#AAA] truncate">{m.content || 'Image'}</div>
                   ))}
                </div>
             </div>
          </div>
          <div className="p-4 border-t border-[#2C2C2C]">
             <div className="flex items-center justify-between p-2"><div className="text-xs font-bold truncate">{user.email}</div><button onClick={onSignOut} className="text-xs text-[#666] hover:text-white">Sign Out</button></div>
          </div>
       </aside>

       {/* --- MAIN AREA --- */}
       <main className="flex-1 flex flex-col h-full relative overflow-hidden">
         <header className="h-16 shrink-0 bg-[#121212]/80 backdrop-blur-md border-b border-[#2C2C2C] flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="text-sm font-bold text-white">COMMAND CENTER</div>
         </header>

         <div className="flex border-b border-[#2C2C2C] px-6">
            <button onClick={() => setActiveTab('chat')} className={`px-6 py-3 text-xs font-bold transition-colors uppercase tracking-wider border-b-2 ${activeTab === 'chat' ? 'text-[#3ECF8E] border-[#3ECF8E]' : 'text-[#666] border-transparent hover:text-white'}`}>Assistant</button>
            <button onClick={() => setActiveTab('audit')} className={`px-6 py-3 text-xs font-bold transition-colors uppercase tracking-wider border-b-2 ${activeTab === 'audit' ? 'text-[#3ECF8E] border-[#3ECF8E]' : 'text-[#666] border-transparent hover:text-white'}`}>Mock Audit</button>
         </div>

         <div className="flex-1 flex flex-col overflow-hidden relative bg-[#121212]">
           {activeTab === 'chat' ? (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 lg:px-20 py-8 custom-scroll space-y-6">
                  {messages.length===0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
                       <div className="w-12 h-12 border border-[#333] rounded flex items-center justify-center mb-4"><span className="text-2xl">🛡️</span></div>
                       <h3 className="text-sm font-bold text-white">Secure Session Initialized</h3>
                    </div>
                  )}
                  {messages.map((msg,i) => (
                     <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-5 py-3.5 text-sm rounded-md border ${msg.role === 'user' ? 'bg-[#2C2C2C] text-[#EDEDED] border-[#333]' : 'bg-[#161616] text-[#CCC] border-[#222]'}`}>
                           {msg.image && <img src={msg.image} className="max-h-48 rounded mb-2" />}
                           <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                     </div>
                  ))}
                  {isSending && <div className="pl-2"><div className="loader"></div></div>}
                </div>

                <div className="p-4 bg-[#18181B] border-t border-[#2C2C2C] px-4 lg:px-20 pb-safe">
                  <div className="max-w-4xl mx-auto relative">
                     {selectedImage && <div className="absolute -top-16 p-2 bg-[#222] border border-[#333] rounded"><img src={selectedImage} className="h-10 rounded"/></div>}
                     <form onSubmit={handleSend} className="flex gap-3">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/>
                        <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 bg-[#222] text-[#888] hover:text-white rounded border border-[#333]">+</button>
                        <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 bg-[#161616] border border-[#333] rounded px-4 text-sm text-[#EDEDED] focus:outline-none focus:border-[#3ECF8E]" placeholder="Query Washtenaw Database..."/>
                        <button type="submit" disabled={isSending} className="px-5 bg-[#3ECF8E] hover:bg-[#2ECC71] text-black font-bold text-xs rounded uppercase">SEND</button>
                     </form>
                  </div>
                </div>
              </>
           ) : (
              <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                {!hasMockAuditAccess ? (
                   <div className="max-w-xl mx-auto mt-20 p-8 bg-[#1C1C1C] border border-[#333] rounded text-center">
                      <h3 className="text-white font-bold">LOCKED FEATURE</h3>
                      <p className="text-[#888] text-xs mt-2 mb-6">Mock Audit Protocol is reserved for Pro/Enterprise.</p>
                      <button onClick={() => router.push('/pricing')} className="bg-[#3ECF8E] text-black px-4 py-2 rounded font-bold text-xs">Upgrade</button>
                   </div>
                ) : (
                   <div className="max-w-4xl mx-auto">
                      <div className="flex justify-between items-center mb-6 p-4 bg-[#1C1C1C] border border-[#333] rounded">
                         <div><h2 className="text-lg font-bold text-white">Mock Audit</h2><p className="text-xs text-[#666]">Self-Assessment Checklist</p></div>
                         <div className="flex gap-2"><button onClick={generateAuditReport} className="bg-[#3ECF8E] text-black px-4 py-2 rounded text-xs font-bold">Export</button><button onClick={clearAudit} className="border border-[#333] text-[#CCC] px-4 py-2 rounded text-xs font-bold">Clear</button></div>
                      </div>
                      
                      <input type="file" ref={auditImageInputRef} className="hidden" accept="image/*" onChange={handleAuditImageSelect} />
                      
                      <div className="space-y-3">
                         {AUDIT_CHECKLIST.map(cat => (
                            <div key={cat.category} className="bg-[#1C1C1C] border border-[#333] rounded overflow-hidden">
                               <button onClick={() => toggleCategory(cat.category)} className="w-full px-4 py-3 flex justify-between items-center bg-[#222] hover:bg-[#262626] text-sm font-bold text-[#EDEDED]">
                                  {cat.category}
                               </button>
                               {expandedCategories[cat.category] !== false && (
                                 <div className="divide-y divide-[#2C2C2C]">
                                   {cat.items.map(item => {
                                      const st = auditResults[item.id]; const nt = auditNotes[item.id]||''; const img = auditImages[item.id];
                                      return (
                                         <div key={item.id} className="p-4 bg-[#18181B]">
                                            <div className="flex justify-between mb-3">
                                               <div><div className="text-xs text-[#DDD] mb-1">{item.label}</div>{item.critical && <span className="text-[9px] text-red-400 uppercase border border-red-900 px-1 rounded">Critical</span>}</div>
                                               <div className="flex gap-1">
                                                  <button onClick={() => handleAuditChange(item.id, 'pass')} className={`px-3 py-1 text-[9px] font-bold rounded border ${st === 'pass' ? 'bg-green-900 text-green-200 border-green-700' : 'bg-[#222] border-[#333]'}`}>Pass</button>
                                                  <button onClick={() => handleAuditChange(item.id, 'fail')} className={`px-3 py-1 text-[9px] font-bold rounded border ${st === 'fail' ? 'bg-red-900 text-red-200 border-red-700' : 'bg-[#222] border-[#333]'}`}>Fail</button>
                                               </div>
                                            </div>
                                            {st && st !== 'na' && (
                                               <div className="mt-2 flex gap-2">
                                                  <input value={nt} onChange={e => handleNoteChange(item.id, e.target.value)} placeholder="Add note..." className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"/>
                                                  <button onClick={() => triggerAuditImageUpload(item.id)} className="text-[9px] text-[#888] border border-[#333] px-2 rounded bg-[#222]">{img ? 'Replace Pic' : '+ Pic'}</button>
                                               </div>
                                            )}
                                         </div>
                                      )
                                   })}
                                 </div>
                               )}
                            </div>
                         ))}
                      </div>
                   </div>
                )}
              </div>
           )}
         </div>
       </main>
    </div>
  )
}

// ==========================================
// 4. MAIN ROUTER (Switcher)
// ==========================================
export default function HomePage() {
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
    const { data: authListener } = supabase.auth.onAuthStateChange((evt, sess) => {
      setSession(sess)
      if (sess) setShowAuth(false)
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  if (isLoading) return <div className="min-h-screen bg-[#121212]"></div>

  // *** LOGGED IN -> SHOW FULL DASHBOARD ***
  if (session) {
    return <DashboardInterface user={session.user} onSignOut={() => supabase.auth.signOut()} />
  }

  // *** LOGGED OUT -> SHOW LANDING PAGE ***
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` }})
  }
  const handleAuth = async (e) => {
     // Simplified auth placeholder logic (hook up your existing email logic here if needed)
     e.preventDefault()
     await handleGoogleSignIn()
  }

  return (
    <div className="min-h-screen bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3ECF8E] selection:text-[#121212] flex flex-col relative overflow-hidden max-w-[100vw]">
       <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js" type="module" strategy="afterInteractive" />
       
       {/* LANDING BACKGROUND */}
       <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#121212]">
         <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/80"></div>
       </div>

       {/* LANDING NAVBAR */}
       <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-0 border-b border-[#2C2C2C] bg-[#121212]/80 backdrop-blur-md">
         <div className="w-full max-w-6xl flex justify-between items-center h-16">
            <div className="flex items-center gap-3 font-bold text-white text-xl">protocol<span className="text-[#3B82F6]">LM</span></div>
            <div className="hidden md:flex gap-6">
               <button onClick={() => router.push('/pricing')} className="text-xs text-[#888] hover:text-white">Pricing</button>
               <button onClick={() => {setAuthView('login'); setShowAuth(true)}} className="text-xs text-[#888] hover:text-white">Log in</button>
               <button onClick={() => {setAuthView('signup'); setShowAuth(true)}} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded text-xs font-bold">Start Free Trial</button>
            </div>
            <button onClick={() => {setAuthView('login'); setShowAuth(true)}} className="md:hidden text-xs font-bold text-[#3B82F6]">Log In</button>
         </div>
       </nav>

       {/* HERO CONTENT */}
       <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-12 md:pt-16 pb-24 flex flex-col items-center relative z-10 min-h-[calc(100vh-64px)]">
          <div className="w-full max-w-5xl text-center mb-6 mt-12 md:mt-20">
             <h1 className="text-3xl md:text-5xl font-medium text-[#EDEDED] tracking-tight mb-3">Train your team before the inspector arrives</h1>
             <div className="flex justify-center gap-2 text-[#888] text-[13px] max-w-2xl mx-auto leading-relaxed">
                Instant answers from <strong className="text-white">Washtenaw County</strong> regulations, <strong className="text-white">Michigan Food Law</strong>, and <strong className="text-white">FDA Code</strong>.
             </div>
          </div>
          
          {/* MARKETING DEMO (Teaser) */}
          <div className="w-full max-w-5xl flex justify-center h-[360px] md:h-[550px]">
             <DemoChatContent />
          </div>
       </div>

       {/* FOOTER */}
       <footer className="w-full py-8 border-t border-[#2C2C2C] bg-[#121212] z-10 mt-auto relative">
          <div className="flex justify-center gap-6 text-xs text-[#666]">
             <a href="/terms">Terms</a><a href="/privacy">Privacy</a><span>© 2025 protocolLM</span>
          </div>
       </footer>
       
       {/* AUTH MODAL */}
       <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
    </div>
  )
}
