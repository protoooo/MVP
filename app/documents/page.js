'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ready to inspect. Upload a photo or ask about Washtenaw County food codes.' }
  ])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null) // Stores base64 image
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
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

      // Check Subscription Status
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed')
        .eq('id', session.user.id)
        .single()

      // If not subscribed (and not our test user), go to pricing
      if (!profile?.is_subscribed) {
        router.push('/pricing')
        return
      }

      setSession(session)
    }
    checkAccess()
  }, [supabase, router])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle Image Selection
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

    // Optimistic UI update
    const userMessage = { 
      role: 'user', 
      content: input,
      image: image 
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImage(null) // Clear image after sending
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: input }], // Send history text
          image: userMessage.image // Send image if exists
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error connecting to the intelligence database." }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-[#0f1117] text-white font-sans overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full bg-[#161b22] p-4 flex justify-between items-center z-50 border-b border-gray-800">
        <span className="font-bold tracking-wider">PROTOCOL</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* SIDEBAR (Library Context) */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-64 bg-[#161b22] border-r border-gray-800 flex flex-col z-40 pt-16 md:pt-0`}>
        <div className="p-5 hidden md:block border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-wide">PROTOCOL</h1>
          <p className="text-xs text-gray-500 mt-1">Washtenaw County Intelligence</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Active Regulations</div>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>FDA Food Code 2022</li>
            <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>MI Modified Food Code</li>
            <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Enforcement Action Guide</li>
            <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Allergy Information</li>
            <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Cooling & Temps</li>
          </ul>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
            className="w-full py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded hover:bg-gray-800 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full pt-16 md:pt-0 relative bg-[#0f1117]">
        
        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                
                {/* User Image Display */}
                {msg.image && (
                  <img src={msg.image} alt="Upload" className="max-w-xs rounded-lg border border-gray-700 mb-2" />
                )}

                <div className={`p-4 rounded-2xl text-sm md:text-base leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-[#1e232b] text-gray-200 border border-gray-800 rounded-bl-none shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-[#1e232b] px-4 py-3 rounded-2xl rounded-bl-none border border-gray-800 text-gray-400 text-sm">
                Analyzing compliance data...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-[#0f1117] border-t border-gray-800">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-[#161b22] p-2 rounded-xl border border-gray-700 focus-within:border-indigo-500 transition-colors">
            
            {/* Image Upload Button */}
            <button 
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
              title="Upload Image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageSelect}
            />

            {/* Text Input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}}
              placeholder={image ? "Image attached. Add context..." : "Ask about Washtenaw food codes..."}
              className="flex-1 bg-transparent text-white text-sm md:text-base max-h-32 py-2 focus:outline-none resize-none"
              rows="1"
            />

            {/* Send Button */}
            <button 
              type="submit"
              disabled={isLoading || (!input.trim() && !image)}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>

            {/* Image Preview Indicator */}
            {image && (
              <div className="absolute -top-16 left-0 bg-[#161b22] border border-gray-700 p-2 rounded-lg flex items-center shadow-lg">
                <span className="text-xs text-green-400 font-bold mr-2">IMAGE ATTACHED</span>
                <button onClick={() => setImage(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>
            )}

          </form>
          <div className="text-center mt-2 text-[10px] text-gray-600">
            Protocol AI uses Washtenaw County Health Department data. Verify critical issues with an official inspector.
          </div>
        </div>

      </div>
    </div>
  )
}
