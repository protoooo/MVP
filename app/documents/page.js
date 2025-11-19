'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// Full Document List
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
  
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Protocol Online. Upload a photo or ask a question to search all documents.' }
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
          image: userMessage.image
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

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  if (!session) return null

  return (
    <div className="fixed inset-0 flex bg-[#0f1117] text-white font-sans overflow-hidden">
      
      {/* --- PDF MODAL --- */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
          <div className="flex justify-between items-center p-4 bg-[#0d1117] border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white truncate">{viewingPdf.title}</h3>
            <button onClick={() => setViewingPdf(null)} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition">Close</button>
          </div>
          
          <div className="flex-1 w-full relative bg-gray-800 overflow-hidden">
            <iframe 
              src={`/documents/${viewingPdf.filename}`} 
              className="absolute inset-0 w-full h-full border-none" 
              title="Document Viewer"
            />
          </div>
        </div>
      )}

      {/* MOBILE HEADER - Fixed at top */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#161b22] p-4 flex justify-between items-center z-50 border-b border-gray-800">
        <span className="font-bold tracking-wider text-sm">PROTOCOL</span>
        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-72 bg-[#161b22] border-r border-gray-800 flex flex-col z-40 shadow-2xl`}>
        
        {/* Close button for mobile */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <div className="p-5 hidden md:block border-b border-gray-800 bg-[#161b22]">
          <h1 className="text-lg font-bold text-white tracking-wide">PROTOCOL</h1>
          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Washtenaw Compliance</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 mt-16 md:mt-0">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-2">Library</div>
          <div className="space-y-1">
            {DOCUMENTS.map((doc, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs hover:bg-gray-800 transition-colors cursor-pointer" 
                onClick={() => { setViewingPdf(doc); setIsSidebarOpen(false); }}
              >
                 <div className="flex items-center overflow-hidden">
                    <svg className="w-4 h-4 mr-3 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="truncate text-gray-300">{doc.title}</span>
                 </div>
                 <span className="text-[10px] text-gray-600 ml-2 group-hover:text-gray-400">VIEW</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="w-full py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-800 transition">Sign Out</button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* CHAT AREA - Full height with proper spacing */}
      <div className="flex-1 flex flex-col h-full relative bg-[#0f1117]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-[#161b22] flex items-center justify-between shadow-sm mt-16 md:mt-0">
          <div><h2 className="font-bold text-white text-sm">AI Compliance Assistant</h2><p className="text-xs text-gray-500">Searching <span className="text-indigo-400">All Documents</span></p></div>
          <div className="flex items-center space-x-2"><span className="text-[10px] text-gray-500 font-mono">GEMINI 2.0 FLASH</span><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div></div>
        </div>
        
        {/* Messages - Flexible height that fills available space */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                {msg.image && <img src={msg.image} alt="Analysis Target" className="max-w-[250px] rounded-lg border border-gray-700 shadow-md" />}
                <div className={`p-4 rounded-2xl text-sm md:text-base leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-900/20' : 'bg-[#1e232b] border border-gray-800 text-gray-200 rounded-bl-none shadow-sm'}`}>{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && <div className="flex justify-start"><div className="bg-[#1e232b] px-4 py-2 rounded-full border border-gray-800 text-xs text-gray-400 flex items-center gap-2">Searching documents...</div></div>}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input - Fixed at bottom with safe area for mobile */}
        <div className="p-4 bg-[#0f1117] border-t border-gray-800 pb-safe">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-[#161b22] p-2 rounded-xl border border-gray-700 focus-within:border-indigo-500 transition-colors shadow-lg">
            <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}} 
              placeholder={image ? "Image attached. Add context..." : "Ask about regulations..."} 
              className="flex-1 bg-transparent text-white text-sm md:text-base max-h-32 py-3 focus:outline-none resize-none" 
              rows="1"
            />
            <button type="submit" disabled={isLoading || (!input.trim() && !image)} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0">
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
            {image && <div className="absolute -top-12 left-0 bg-[#1e232b] border border-gray-700 px-3 py-1.5 rounded-lg flex items-center shadow-lg"><span className="text-xs text-gray-200 font-bold mr-2">IMAGE READY</span><button onClick={() => setImage(null)} className="text-gray-400 hover:text-white ml-2">✕</button></div>}
          </form>
        </div>
      </div>
    </div>
  )
}
