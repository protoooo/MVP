'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const DOCUMENTS = [
  { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
  { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
  { title: 'Cooling Foods', filename: 'Cooling Foods.pdf' },
  { title: 'Cross Contamination', filename: 'Cross contamination.pdf' },
  { title: 'Enforcement Action Guide', filename: 'Enforcement Action | Washtenaw County, MI.pdf' },
  { title: 'Food Allergy Info', filename: 'Food Allergy Information | Washtenaw County, MI.pdf' },
  { title: 'Inspection Program', filename: 'Food Service Inspection Program | Washtenaw County, MI.pdf' },
  { title: 'Foodborne Illness Guide', filename: 'Food borne illness guide.pdf' },
  { title: 'Norovirus Cleaning', filename: 'NorovirusEnvironCleaning.pdf' },
  { title: 'Admin Procedures', filename: 'PROCEDURES_FOR_THE_ADMINISTRATION_AND_ENFORCEMENT_OF_THE_WASHTENAW_COUNTY_FOOD_SERVICE_REGULATION.pdf' },
  { title: 'Cooking Temps Chart', filename: 'Summary Chart for Minimum Cooking Food Temperatures.pdf' },
  { title: 'USDA Safe Minimums', filename: 'USDA_Safe_Minimum_Internal_Temperature_Chart.pdf' },
  { title: 'Violation Types', filename: 'Violation Types | Washtenaw County, MI.pdf' },
  { title: 'MCL Act 92 (2000)', filename: 'mcl_act_92_of_2000.pdf' },
  { title: 'Emergency Action Plan', filename: 'retail_food_establishments_emergency_action_plan.pdf' }
]

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(DOCUMENTS[0])
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Protocol Online. I am ready to assist with Washtenaw County Food Safety regulations.' }
  ])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewingPdf, setViewingPdf] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) { router.push('/pricing'); return }

      setSession(session)
    }
    checkAccess()
  }, [supabase, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // --- FIXED SIGN OUT FUNCTION ---
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh() // Clears server-side cache
    router.push('/') // Redirects to home
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !image) return

    const userMessage = { role: 'user', content: input, image: image }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImage(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: input }], 
          image: userMessage.image,
          docContext: selectedDoc.filename 
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-[#0f1117] text-white font-sans overflow-hidden relative">
      
      {/* PDF MODAL */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-5xl h-full bg-[#161b22] rounded-xl border border-gray-700 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-[#0d1117] rounded-t-xl">
              <h3 className="text-sm font-semibold text-white truncate">{viewingPdf.title}</h3>
              <button onClick={() => setViewingPdf(null)} className="text-gray-400 hover:text-white px-3 py-1 rounded hover:bg-gray-800">Close X</button>
            </div>
            <iframe src={`/documents/${viewingPdf.filename}`} className="flex-1 w-full h-full rounded-b-xl bg-white" />
          </div>
        </div>
      )}

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-[#161b22] p-4 flex justify-between items-center z-50 border-b border-gray-800">
        <span className="font-bold tracking-wider text-sm">PROTOCOL</span>
        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-72 bg-[#161b22] border-r border-gray-800 flex flex-col z-40 pt-16 md:pt-0 shadow-2xl`}>
        <div className="p-5 hidden md:block border-b border-gray-800 bg-[#161b22]">
          <h1 className="text-lg font-bold text-white tracking-wide">PROTOCOL</h1>
          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Active Context:</div>
          <div className="text-xs text-indigo-400 font-mono mt-1 truncate">{selectedDoc.title}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-2">Library</div>
          <div className="space-y-1">
            {DOCUMENTS.map((doc, idx) => (
              <div key={idx} className={`group flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs transition-all duration-200 ${selectedDoc.filename === doc.filename ? 'bg-indigo-900/20 border border-indigo-500/30' : 'hover:bg-gray-800'}`}>
                <button onClick={() => { setSelectedDoc(doc); setIsSidebarOpen(false); }} className="flex-1 text-left flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${selectedDoc.filename === doc.filename ? 'bg-indigo-500' : 'bg-gray-600 group-hover:bg-gray-500'}`}></div>
                  <span className={`truncate ${selectedDoc.filename === doc.filename ? 'text-indigo-200' : 'text-gray-400 group-hover:text-gray-200'}`}>{doc.title}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setViewingPdf(doc); }} className="ml-2 text-gray-600 hover:text-indigo-400 p-1 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
              </div>
            ))}
          </div>
        </div>

        {/* SIGN OUT BUTTON FIX IS HERE */}
        <div className="p-4 border-t border-gray-800">
          <button onClick={handleSignOut} className="w-full py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-800 transition">Sign Out</button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative bg-[#0f1117] pt-16 md:pt-0">
        <div className="p-4 border-b border-gray-800 bg-[#161b22] flex items-center justify-between shadow-sm">
          <div><h2 className="font-bold text-white text-sm">AI Compliance Assistant</h2><p className="text-xs text-gray-500">Using: <span className="text-indigo-400">{selectedDoc.title}</span></p></div>
          <div className="flex items-center space-x-2"><span className="text-[10px] text-gray-500 font-mono">GEMINI 1.5 FLASH</span><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                {msg.image && <img src={msg.image} alt="Analysis Target" className="max-w-[250px] rounded-lg border border-gray-700 shadow-md" />}
                <div className={`p-4 rounded-2xl text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-900/20' : 'bg-[#1e232b] border border-gray-800 text-gray-200 rounded-bl-none shadow-sm'}`}>{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && <div className="flex justify-start"><div className="bg-[#1e232b] px-4 py-2 rounded-full border border-gray-800 text-xs text-gray-400 flex items-center gap-2">Processing...</div></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-[#0f1117] border-t border-gray-800">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-[#161b22] p-2 rounded-xl border border-gray-700 focus-within:border-indigo-500 transition-colors shadow-lg">
            <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}} placeholder={image ? "Image attached. Add context..." : "Ask about Washtenaw County codes..."} className="flex-1 bg-transparent text-white text-sm md:text-base max-h-32 py-3 focus:outline-none resize-none" rows="1" />
            <button type="submit" disabled={isLoading || (!input.trim() && !image)} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition"><svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            {image && <div className="absolute -top-12 left-0 bg-[#1e232b] border border-gray-700 px-3 py-1.5 rounded-lg flex items-center shadow-lg"><span className="text-xs text-gray-200 font-bold mr-2">IMAGE READY</span><button onClick={() => setImage(null)} className="text-gray-400 hover:text-white ml-2">✕</button></div>}
          </form>
        </div>
      </div>
    </div>
  )
}
