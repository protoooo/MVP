'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [userCounty, setUserCounty] = useState('washtenaw')
  const [showCountySelector, setShowCountySelector] = useState(false)
  const [isUpdatingCounty, setIsUpdatingCounty] = useState(false)
  
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [canSend, setCanSend] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewingPdf, setViewingPdf] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}. Upload a photo or ask a question about your local food safety regulations. I'll cite specific documents and pages in my responses.`,
          citations: []
        }
      ])
    }
  }, [userCounty])

  useEffect(() => {
    if (session) {
      const stored = localStorage.getItem(`chat_history_${session.user.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setChatHistory(parsed)
        } catch (e) {
          console.error('Failed to parse saved history:', e)
          localStorage.removeItem(`chat_history_${session.user.id}`)
        }
      }
    }
  }, [session])

  const saveCurrentChat = () => {
    if (!session || messages.length <= 1) return

    const chatTitle = messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New Chat'
    const chat = {
      id: currentChatId || Date.now().toString(),
      title: chatTitle,
      messages,
      timestamp: Date.now(),
      county: userCounty
    }

    const existingIndex = chatHistory.findIndex(c => c.id === chat.id)
    let newHistory = [...chatHistory]

    if (existingIndex >= 0) newHistory[existingIndex] = chat
    else newHistory = [chat, ...newHistory].slice(0, 50)

    try {
      localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))
      setChatHistory(newHistory)
      setCurrentChatId(chat.id)
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('⚠️ Storage quota exceeded, removing old chats')
        newHistory = newHistory.slice(0, 25)
        try {
          localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))
          setChatHistory(newHistory)
          setCurrentChatId(chat.id)
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError)
        }
      }
    }
  }

  const loadChat = (chat) => {
    setMessages(chat.messages)
    setUserCounty(chat.county)
    setCurrentChatId(chat.id)
    setIsSidebarOpen(false)
  }

  const startNewChat = () => {
    saveCurrentChat()
    setMessages([
      { 
        role: 'assistant',
        content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}. Upload a photo or ask a question about your local food safety regulations.`,
        citations: []
      }
    ])
    setCurrentChatId(null)
    setIsSidebarOpen(false)
  }

  const deleteChat = (chatId, e) => {
    e.stopPropagation()
    const newHistory = chatHistory.filter(c => c.id !== chatId)
    setChatHistory(newHistory)
    localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))

    if (currentChatId === chatId) startNewChat()
  }

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed, requests_used, images_used, county')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) return router.push('/pricing')

      setUserCounty(profile.county || 'washtenaw')

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status, trial_end, current_period_end')
        .eq('user_id', session.user.id)
        .single()

      const limits = subscription?.plan === 'enterprise'
        ? { requests: 5000, images: 500 }
        : { requests: 500, images: 50 }

      setSession(session)
      setSubscriptionInfo({
        plan: subscription?.plan || 'pro',
        status: subscription?.status || 'active',
        requestsUsed: profile?.requests_used || 0,
        imagesUsed: profile?.images_used || 0,
        requestLimit: limits.requests,
        imageLimit: limits.images,
        trialEnd: subscription?.trial_end ? new Date(subscription.trial_end) : null,
        currentPeriodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end) : null
      })
    }
    checkAccess()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCountyChange = async (newCounty) => {
    setIsUpdatingCounty(true)
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ county: newCounty })
      .eq('id', session.user.id)

    if (error) {
      alert('Error updating county.')
      setIsUpdatingCounty(false)
      return
    }

    setUserCounty(newCounty)
    setShowCountySelector(false)
    setIsUpdatingCounty(false)

    setMessages([
      { 
        role: 'assistant',
        content: `County updated to ${COUNTY_NAMES[newCounty]}. I now have access to ${COUNTY_NAMES[newCounty]}-specific documents.`,
        citations: []
      }
    ])
  }

  const handleCitationClick = (citation) => {
    const docName = citation.document
    const pageMatch = citation.pages.match(/\d+/)
    const pageNum = pageMatch ? parseInt(pageMatch[0]) : 1

    setViewingPdf({
      title: docName,
      filename: `${docName}.pdf`,
      county: userCounty,
      targetPage: pageNum
    })
  }

  const renderMessageContent = (msg) => {
    if (!msg.citations?.length) return msg.content

    const parts = []
    let lastIndex = 0
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match

    while ((match = citationRegex.exec(msg.content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: msg.content.slice(lastIndex, match.index) })
      }
      parts.push({
        type: 'citation',
        document: match[1],
        pages: match[2]
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < msg.content.length) {
      parts.push({ type: 'text', content: msg.content.slice(lastIndex) })
    }

    return (
      <>
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.content}</span>
          ) : (
            <button
              key={i}
              onClick={() => handleCitationClick(part)}
              className="inline-flex items-center bg-white border border-[#4F759B] text-[#4F759B] hover:bg-slate-50 px-2 py-1 rounded text-xs font-bold transition-colors mx-1 cursor-pointer shadow-sm"
            >
              {part.document}, Page {part.pages}
            </button>
          )
        )}
      </>
    )
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !image) return
    if (!canSend) return

    setCanSend(false)

    const userMessage = { role: 'user', content: input, image, citations: [] }
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
          county: userCounty
        })
      })

      const data = await response.json()

      if (response.status === 403) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ ' + data.error }])
        return router.push('/pricing')
      }

      if (response.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ ' + data.error }])
        return
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message, citations: data.citations }
      ])

      if (subscriptionInfo) {
        setSubscriptionInfo(prev => ({
          ...prev,
          requestsUsed: prev.requestsUsed + 1,
          imagesUsed: image ? prev.imagesUsed + 1 : prev.imagesUsed
        }))
      }

      setTimeout(saveCurrentChat, 200)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
      setTimeout(() => setCanSend(true), 1000)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image too large. Please use images under 5MB.')
      e.target.value = ''
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    return () => {
      if (viewingPdf) {
        setViewingPdf(null)
      }
    }
  }, [viewingPdf])

  if (!session) return null

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900">

      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Select Your County</h3>
              <button 
                onClick={() => setShowCountySelector(false)} 
                className="text-slate-400 hover:text-slate-900"
                disabled={isUpdatingCounty}
              >
                ✕
              </button>
            </div>
            {Object.entries(COUNTY_NAMES).map(([key, name]) => (
              <button
                key={key}
                onClick={() => handleCountyChange(key)}
                disabled={isUpdatingCounty}
                className="w-full text-left p-4 border-2 border-slate-100 rounded-xl mb-2 hover:border-[#4F759B] hover:bg-slate-50 transition-all text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {name}
              </button>
            ))}
            {isUpdatingCounty && (
              <p className="text-center text-sm text-slate-500 mt-4">Updating...</p>
            )}
          </div>
        </div>
      )}

      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-white flex-shrink-0">
            <div>
              <h3 className="font-bold text-slate-900">{viewingPdf.title}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {viewingPdf.targetPage && `Starting at Page ${viewingPdf.targetPage}`}
              </p>
            </div>
            <button 
              onClick={() => setViewingPdf(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              Close
            </button>
          </div>
          <iframe
            src={`/documents/${userCounty}/${viewingPdf.filename}${viewingPdf.targetPage ? `#page=${viewingPdf.targetPage}` : ''}`}
            className="flex-1 w-full"
          />
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'fixed' : 'hidden'} md:relative md:block inset-y-0 left-0 w-80 bg-slate-900 text-white flex flex-col z-40`}>
        <div className="p-6 flex-shrink-0 border-b border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight">protocol<span className="font-normal">LM</span></h1>
              <div className="h-1 w-full bg-[#4F759B] rounded-full mt-1"></div>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>✕</button>
          </div>

          <button
            onClick={() => setShowCountySelector(true)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl mb-6 flex items-center justify-between transition-colors border border-slate-700"
          >
            <span className="text-sm font-medium truncate">{COUNTY_NAMES[userCounty]}</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>

          <button
            className="w-full bg-[#4F759B] hover:bg-[#3e5c7a] text-white p-3 mb-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            onClick={startNewChat}
          >
            <span>+</span> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {chatHistory.length === 0 && (
            <p className="text-slate-500 text-sm text-center mt-4">No chat history yet.</p>
          )}

          {chatHistory.map(chat => (
            <div
              key={chat.id}
              onClick={() => loadChat(chat)}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl mb-2 group cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm text-slate-200 truncate pr-2">{chat.title}</p>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="text-slate-500 hover:text-[#4F759B] opacity-0 group-hover:opacity-100 transition-all"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(chat.timestamp).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT - Fixed height container */}
      <div className="flex-1 flex flex-col">

        {/* Mobile header */}
        <div className="md:hidden p-4 bg-slate-900 text-white flex justify-between items-center shadow-md z-30 flex-shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-center">
            <span className="font-bold text-lg">protocol<span className="font-normal">LM</span></span>
            <div className="text-xs text-slate-400">{COUNTY_NAMES[userCounty]}</div>
          </div>
          <div className="w-6"></div>
        </div>

        {/* Messages - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-4 rounded-2xl max-w-[85%] lg:max-w-[75%] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'bg-[#4F759B] text-white'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                    <div className="w-5 h-5 rounded-full bg-[#4F759B] flex items-center justify-center text-[10px] text-white font-bold">
                      LM
                    </div>
                    <span className="font-semibold text-xs text-slate-500">protocolLM</span>
                  </div>
                )}
                
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                  <div className="w-5 h-5 rounded-full bg-[#4F759B] flex items-center justify-center text-[10px] text-white font-bold">
                    LM
                  </div>
                  <span className="font-semibold text-xs text-slate-500">protocolLM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#4F759B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-[#4F759B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-[#4F759B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Always visible at bottom */}
        <div className="flex-shrink-0 p-4 md:p-6 border-t border-slate-100 bg-white">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 md:gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                  image 
                    ? 'bg-[#4F759B] text-white shadow-md' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              </button>

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={image ? "Ask about this image..." : "Ask a question..."}
                className="flex-1 min-w-0 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F759B]/20 focus:border-[#4F759B] transition-all text-sm"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={isLoading || !canSend}
                className="px-5 py-3.5 bg-[#4F759B] hover:bg-[#3e5c7a] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all text-sm flex-shrink-0"
              >
                Send
              </button>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-slate-400">System can make mistakes. Verify with cited documents.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
