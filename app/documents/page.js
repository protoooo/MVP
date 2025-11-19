'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// FULL LIST matching your GitHub screenshot
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
    { role: 'assistant', content: 'Protocol System Online. Select a document from the sidebar or upload an image for analysis.' }
  ])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Default closed on mobile
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      // Subscription Gate
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) {
        router.push('/pricing')
        return
      }

      setSession(session)
    }
    checkAccess()
  }, [supabase, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !image) return

    const userMessage = { 
      role: 'user', 
      content: input,
      image: image 
    }
    
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
      
      if (data.error) {
        throw new Error(data.error) // Catch API errors
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: `System Error: ${error.message}. Please try again.` }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-[#0f1117] text-white font-sans overflow-hidden">
      
      {/* MOBILE NAV HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-[#161b22] p-4 flex justify-between items-center z-50 border-b border-gray-800">
        <span className="font-bold tracking-wider text-sm">PROTOCOL</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 p-2">
          {/* Hamburger Icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* SIDEBAR - LIBRARY */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-72 bg-[#161b22] border-r border-gray-800 flex flex-col z-40 pt-16 md:pt-0 shadow-2xl`}>
        <div className="p-5 hidden md:block border-b border-gray-800 bg-[#161b22]">
          <h1 className="text-lg font-bold text-white tracking-wide">PROTOCOL</h1>
          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Washtenaw Compliance</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-2">Document Library</div>
          <div className="space-y-1">
            {/* DYNAMICALLY MAP ALL DOCUMENTS HERE */}
            {DOCUMENTS.map((doc, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedDoc(doc); setIsSidebarOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200 flex items-center group ${
                  selectedDoc.filename === doc.filename 
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`}
              >
                <svg className={`w-3 h-3 mr-3 flex-shrink-0 ${selectedDoc.filename === doc.filename ? 'text-indigo-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{doc.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
            className="w-full flex items-center justify-center py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN INTERFACE */}
      <div className="flex-1 flex flex-col md:flex-row h-full relative bg-[#0f1117] pt-16 md:pt-0">
        
        {/* PDF VIEWER (Desktop Only) */}
        <div className="flex-1 bg-[#0d1117] relative border-r border-gray-800 hidden md:block">
          <iframe 
            src={`/documents/${selectedDoc.filename}#toolbar=0`} 
            className="w-full h-full border-none opacity-90" 
            title="Document Viewer"
          />
        </div>

        {/* CHAT INTERFACE */}
        <div className="w-full md:w-[420px] bg-[#161b22] flex flex-col h-full shadow-2xl border-l border-gray-800">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-800 bg-[#161b22] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white text-sm">AI Assistant</h2>
              <p className="text-xs text-indigo-400 truncate max-w-[250px]">{selectedDoc.title}</p>
            </div>
            <div className="flex items-center space-x-2">
               <span className="text-[10px] text-gray-500">Gemini 1.5 Flash</span>
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            </div>
          </div>

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-gray-700">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] space-y-2`}>
                  {msg.image && (
                    <img src={msg.image} alt="Analysis Target" className="max-w-[200px] rounded-lg border border-gray-700" />
                  )}
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-900/20' 
                      : 'bg-[#21262d] border border-gray-700 text-gray-200 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-[#21262d] px-4 py-3 rounded-2xl rounded-bl-none border border-gray-700 text-xs text-gray-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    Processing...
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-[#161b22]">
            <div className="relative flex items-end gap-2">
              {/* Upload Button */}
              <button 
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="p-3 bg-[#21262d] text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl border border-gray-700 transition"
                title="Analyze Image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />

              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={image ? "Image attached. Add question..." : "Ask a food safety question..."}
                  className="w-full bg-[#0d1117] text-white text-sm rounded-xl pl-4 pr-10 py-3 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                />
                {image && (
                  <div className="absolute -top-10 left-0 bg-indigo-900/50 border border-indigo-500/50 px-2 py-1 rounded text-[10px] text-indigo-200 font-bold flex items-center">
                    IMAGE READY
                    <button onClick={() => setImage(null)} className="ml-2 hover:text-white">×</button>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isLoading || (!input.trim() && !image)}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
