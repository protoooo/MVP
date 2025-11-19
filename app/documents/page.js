'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// Hardcoded list to match your public/documents folder
const DOCUMENTS = [
  { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
  { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
  { title: 'Cooling Foods', filename: 'Cooling Foods.pdf' },
  { title: 'Cross Contamination', filename: 'Cross contamination.pdf' },
  { title: 'Enforcement Action', filename: 'Enforcement Action | Washtenaw County, MI.pdf' },
  { title: 'Food Allergy Info', filename: 'Food Allergy Information | Washtenaw County, MI.pdf' },
  { title: 'Food Inspection Program', filename: 'Food Service Inspection Program | Washtenaw County, MI.pdf' },
  { title: 'Foodborne Illness Guide', filename: 'Food borne illness guide.pdf' },
  { title: 'Norovirus Cleaning', filename: 'NorovirusEnvironCleaning.pdf' },
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
    { role: 'assistant', content: 'Hello! I am your AI Compliance Assistant. Select a document on the left and ask me anything.' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const messagesEndRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/')
      else setSession(session)
    }
    getSession()
  }, [supabase, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          docContext: selectedDoc.filename 
        }),
      })

      if (!response.ok) throw new Error('Network response was not ok')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the AI right now." }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-[#0f1117] text-white overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <div className="w-72 bg-[#161b22] border-r border-gray-800 flex flex-col shadow-xl z-20">
        <div className="p-5 border-b border-gray-800 bg-[#161b22]">
          <h1 className="text-lg font-bold text-white tracking-wide">PROTOCOL</h1>
          <div className="text-xs text-gray-500 mt-1 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Online • {session.user.email}
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-2">Library</div>
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            {DOCUMENTS.map((doc, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center group ${
                  selectedDoc.filename === doc.filename 
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`}
              >
                <svg className={`w-4 h-4 mr-3 flex-shrink-0 ${selectedDoc.filename === doc.filename ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{doc.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-gray-800">
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
            className="w-full flex items-center justify-center py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col md:flex-row h-full relative">
        
        {/* PDF VIEWER */}
        <div className="flex-1 bg-[#0d1117] relative h-full">
          {selectedDoc ? (
            <iframe 
              src={`/documents/${selectedDoc.filename}#toolbar=0`} 
              className="w-full h-full border-none" 
              title="Document Viewer"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">Select a document</div>
          )}
        </div>

        {/* CHAT INTERFACE */}
        <div className="w-full md:w-[400px] bg-[#161b22] border-l border-gray-800 flex flex-col h-full shadow-2xl">
          <div className="p-4 border-b border-gray-800 bg-[#161b22] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white text-sm">AI Compliance Assistant</h2>
              <p className="text-xs text-indigo-400 truncate max-w-[200px]">{selectedDoc.title}</p>
            </div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-bl-none flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-[#161b22]">
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this document..."
                className="w-full bg-[#0d1117] text-white text-sm rounded-xl pl-4 pr-12 py-3.5 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-gray-600 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1.5 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
