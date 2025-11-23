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

export default function DocumentsPage() {
  const [session, setSession] = useState(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [userCounty, setUserCounty] = useState('washtenaw')
  const [showCountySelector, setShowCountySelector] = useState(false)
  const [isUpdatingCounty, setIsUpdatingCounty] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)
  
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [canSend, setCanSend] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewingPdf, setViewingPdf] = useState(null)
  const [loadingChats, setLoadingChats] = useState(true)
  const [savingChat, setSavingChat] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `System ready. Database loaded for ${COUNTY_NAMES[userCounty]}.`,
          citations: []
        }
      ])
    }
  }, [userCounty])

  useEffect(() => {
    if (session) {
      loadChatHistory()
    }
  }, [session])

  const loadChatHistory = async () => {
    try {
      setLoadingChats(true)
      const response = await fetch('/api/chat-history', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.chats || [])
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    } finally {
      setLoadingChats(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    router.push('/')
  }

  const handleManageSubscription = async () => {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/create-portal-session', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!res.ok) {
        throw new Error('Failed to access billing portal')
      }
      
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Could not access billing portal.')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Error loading billing portal.')
    } finally {
      setLoadingPortal(false)
    }
  }

  const saveCurrentChat = async () => {
    if (!session || messages.length <= 1 || savingChat) return

    clearTimeout(saveTimeoutRef.current)
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSavingChat(true)
        const chatTitle = messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New Chat'
        
        const response = await fetch('/api/chat-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId: currentChatId,
            title: chatTitle,
            messages: messages,
            county: userCounty
          })
        })

        if (response.ok) {
          const data = await response.json()
          setCurrentChatId(data.chat.id)
          
          setChatHistory(prev => {
            const existing = prev.findIndex(c => c.id === data.chat.id)
            if (existing >= 0) {
              const updated = [...prev]
              updated[existing] = data.chat
              return updated
            } else {
              return [data.chat, ...prev].slice(0, 50)
            }
          })
        }
      } catch (error) {
        console.error('Error saving chat:', error)
      } finally {
        setSavingChat(false)
      }
    }, 1000)
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
        content: `System ready. Database loaded for ${COUNTY_NAMES[userCounty]}.`,
        citations: []
      }
    ])
    setCurrentChatId(null)
    setIsSidebarOpen(false)
  }

  const deleteChat = async (chatId, e) => {
    e.stopPropagation()
    
    try {
      const response = await fetch(`/api/chat-history?chatId=${chatId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setChatHistory(prev => prev.filter(c => c.id !== chatId))
        if (currentChatId === chatId) {
          startNewChat()
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
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
        .eq('id', session.user.id)
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

  useEffect(() => {
    if (messages.length > 1) {
      saveCurrentChat()
    }
  }, [messages])

  const handleCountyChange = async (newCounty) => {
    if (!['washtenaw', 'wayne', 'oakland'].includes(newCounty)) {
      console.error('Invalid county selected')
      return
    }
    
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
        content: `County updated to ${COUNTY_NAMES[newCounty]}.`,
        citations: []
      }
    ])
  }

  const handleCitationClick = (citation) => {
    if (!citation || typeof citation !== 'object') return
    
    const docName = citation.document || ''
    const pageMatch = citation.pages?.toString().match(/\d+/)
    const pageNum = pageMatch ? parseInt(pageMatch[0]) : 1

    if (!['washtenaw', 'wayne', 'oakland'].includes(userCounty)) {
      console.error('Invalid county')
      return
    }

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
              className="inline-flex items-center bg-slate-100 border border-slate-200 text-[#022c22] hover:border-[#022c22] px-2 py-1 rounded text-xs font-bold transition-colors mx-1 cursor-pointer"
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
    
    const sanitizedInput = input.trim()
    if (sanitizedInput.length > 5000) {
      alert('Message too long. Please keep messages under 5000 characters.')
      return
    }

    setCanSend(false)

    const userMessage = { 
      role: 'user', 
      content: sanitizedInput, 
      image, 
      citations: [] 
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImage(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: sanitizedInput }],
          image: userMessage.image,
          county: userCounty
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 429) {
          throw new Error(errorData.error || 'Too many requests. Please wait a moment.')
        } else if (response.status === 401) {
          throw new Error('Session expired. Please sign in again.')
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request.')
        } else {
          throw new Error(errorData.error || 'An error occurred.')
        }
      }

      const data = await response.json()

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
    } catch (err) {
      console.error('💥 Chat error:', err)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Error: ${err.message}`,
        citations: []
      }])
    } finally {
      setIsLoading(false)
      setTimeout(() => setCanSend(true), 1000)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are allowed')
      e.target.value = ''
      return
    }
    
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image must be smaller than 5MB')
      e.target.value = ''
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        setImage(result)
      } else {
        alert('Invalid image format')
        e.target.value = ''
      }
    }
    reader.onerror = () => {
      alert('Error reading file')
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  if (!session) return null

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden font-sans">
      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Select Jurisdiction</h3>
              <button 
                onClick={() => setShowCountySelector(false)} 
                className="text-slate-400 hover:text-slate-900 transition"
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
                className="w-full text-left p-4 border border-slate-200 rounded-none mb-2 hover:border-[#022c22] hover:bg-slate-50 transition-all text-slate-700 font-bold disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0">
            <div>
              <h3 className="font-bold text-slate-900">{viewingPdf.title}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {viewingPdf.targetPage && `Page ${viewingPdf.targetPage}`}
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
            sandbox="allow-same-origin" 
            title="PDF Viewer"
          />
        </div>
      )}

      {/* --- SIDEBAR (Dark Teal - Matching Landing) --- */}
      <div className={`${isSidebarOpen ? 'fixed' : 'hidden'} md:relative md:block inset-y-0 left-0 w-full sm:w-72 bg-[#022c22] border-r border-teal-900 text-teal-100 flex flex-col z-40 relative overflow-hidden`}>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-6 flex-shrink-0 border-b border-teal-900">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">protocol<span className="font-normal text-teal-500">LM</span></h1>
                <div className="h-[1px] w-16 bg-teal-500/30 mt-1"></div>
              </div>
              <button className="md:hidden text-teal-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>✕</button>
            </div>

            <button
              onClick={() => setShowCountySelector(true)}
              className="w-full bg-teal-900/40 hover:bg-teal-900/60 text-white p-3 rounded-none border border-teal-800/50 mb-4 flex items-center justify-between transition-colors"
            >
              <span className="text-xs font-bold uppercase tracking-wide truncate">{COUNTY_NAMES[userCounty]}</span>
              <svg className="w-4 h-4 text-teal-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <button
              onClick={startNewChat}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold p-3 rounded-none transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-md"
            >
              <span>+</span> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar pt-4">
            {loadingChats ? (
              <div className="text-center text-teal-500 text-xs mt-4 uppercase tracking-wider">Loading...</div>
            ) : chatHistory.length === 0 ? (
              <p className="text-teal-500 text-xs text-center mt-4">No history.</p>
            ) : (
              chatHistory.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => loadChat(chat)}
                  className="p-3 bg-teal-900/20 hover:bg-teal-900/40 border border-transparent hover:border-teal-800 rounded-none mb-2 group cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-xs text-teal-200 truncate pr-2 flex-1 group-hover:text-white">{chat.title}</p>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="text-teal-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[10px] text-teal-600 mt-1 font-mono">
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-teal-900 bg-[#022c22] flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center text-[#022c22] font-bold text-xs bg-teal-500 rounded-sm">
                {session?.user?.email ? session.user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {session?.user?.email}
                </p>
                <p className="text-[10px] text-teal-400 font-medium capitalize">
                  {subscriptionInfo?.plan === 'enterprise' ? 'Enterprise' : 'Pro'} Plan
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="text-[10px] font-bold text-teal-200 hover:text-white bg-teal-900/30 border border-teal-800 hover:border-teal-700 py-2 rounded-none transition-all disabled:opacity-50 uppercase tracking-wide"
              >
                Manage
              </button>
              <button 
                onClick={handleSignOut}
                className="text-[10px] font-bold text-teal-200 hover:text-red-400 bg-teal-900/30 border border-teal-800 hover:border-red-900/50 py-2 rounded-none transition-all uppercase tracking-wide"
              >
                Sign Out
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <a href="/contact" className="text-[10px] text-teal-600 hover:text-teal-400 font-bold uppercase tracking-widest transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CHAT AREA (White/Clean) --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-white border-b border-slate-200 text-slate-900 flex justify-between items-center shadow-sm z-30 flex-shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-center flex-1 mx-4 min-w-0">
            <span className="font-bold text-lg text-slate-900">protocol<span className="font-normal text-teal-600">LM</span></span>
            <div className="text-xs text-slate-500 truncate">{COUNTY_NAMES[userCounty]}</div>
          </div>
          <div className="w-6"></div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-5 rounded-lg max-w-[85%] lg:max-w-[75%] text-sm leading-relaxed shadow-sm break-words ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'bg-[#022c22] text-white' 
                }`}
              >
                {msg.image && (
                  <div className="mb-3 rounded overflow-hidden border border-white/20">
                    <img 
                      src={msg.image} 
                      alt="Uploaded evidence" 
                      className="max-w-full h-auto max-h-64 object-cover" 
                    />
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">protocolLM</span>
                  </div>
                )}
                
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                   <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">protocolLM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 md:p-6 border-t border-slate-200 bg-white">
          {image && (
            <div className="max-w-4xl mx-auto mb-3 px-1">
              <div className="relative inline-block">
                <img src={image} alt="Preview" className="h-16 w-auto rounded border border-slate-200 shadow-sm" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-[#022c22] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:bg-teal-900"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 md:gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={isLoading}
                className={`p-3 rounded-none border transition-all flex-shrink-0 ${
                  image 
                    ? 'bg-teal-50 border-teal-300 text-[#022c22]' 
                    : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-[#022c22]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              </button>

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={image ? "Ask about this image..." : "Type your compliance question..."}
                className="flex-1 min-w-0 p-3.5 bg-white border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-[#022c22] focus:border-[#022c22] transition-all text-sm text-slate-900 placeholder-slate-400"
                disabled={isLoading}
                maxLength={5000}
              />

              <button
                type="submit"
                disabled={isLoading || !canSend}
                className="h-[48px] px-6 bg-[#022c22] hover:bg-teal-900 text-white font-bold rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 text-xs uppercase tracking-widest"
              >
                SEND
              </button>
            </div>
            <div className="text-center mt-2 flex items-center justify-center gap-2">
              <p className="text-[10px] text-slate-400 font-medium">AI can make mistakes. Verify with cited documents.</p>
              {savingChat && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="animate-pulse">Saving...</span>
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
