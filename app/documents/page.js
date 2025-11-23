'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
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
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `System ready. Consultant active for ${COUNTY_NAMES[userCounty]}.`,
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
    if (loadingPortal) return
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
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to access billing portal')
      }
      
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Unable to load the billing portal. Please try refreshing the page or contacting support.')
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
        const chatTitle = messages.find(m => m.role === 'user')?.content.substring(0, 40) || 'New Chat'
        
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
    }, 2000)
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
        content: `System ready. Consultant active for ${COUNTY_NAMES[userCounty]}.`,
        citations: []
      }
    ])
    setCurrentChatId(null)
    setIsSidebarOpen(false)
  }

  const deleteChat = async (chatId, e) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this chat?')) return

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

  useEffect(() => {
    if (messages.length > 1) {
      saveCurrentChat()
    }
  }, [messages])

  const handleCountyChange = async (newCounty) => {
    if (!['washtenaw', 'wayne', 'oakland'].includes(newCounty)) return
    
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
    
    startNewChat()
  }

  const handleCitationClick = (citation) => {
    if (!citation || typeof citation !== 'object') return
    
    const docName = citation.document || ''
    const pageMatch = citation.pages?.toString().match(/\d+/)
    const pageNum = pageMatch ? parseInt(pageMatch[0]) : 1

    setViewingPdf({
      title: docName,
      filename: `${docName}.pdf`,
      county: userCounty,
      targetPage: pageNum
    })
  }

  const renderMessageContent = (msg) => {
    const content = msg.content || ''
    const parts = []
    let lastIndex = 0
    
    const citationRegex = /\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]/g
    let match

    while ((match = citationRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
      }
      
      parts.push({
        type: 'citation',
        document: match[1],
        pages: match[2]
      })
      
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) })
    }

    return (
      <div className="whitespace-pre-wrap font-normal text-slate-800 leading-7">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.content}</span>
          ) : (
            <button
              key={i}
              onClick={() => handleCitationClick(part)}
              className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 hover:border-teal-300 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors mx-1 -translate-y-0.5 cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {part.document} <span className="opacity-60">| p.{part.pages}</span>
            </button>
          )
        )}
      </div>
    )
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!input.trim() && !image) return
    if (!canSend) return
    
    const sanitizedInput = input.trim()
    if (sanitizedInput.length > 5000) {
      alert('Message too long.')
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
          throw new Error('Rate limit reached. Please wait a moment.')
        } else {
          throw new Error(errorData.error || 'Network error occurred.')
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
      console.error('Chat error:', err)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error: ${err.message}. Please try again.`,
        citations: []
      }])
    } finally {
      setIsLoading(false)
      setTimeout(() => setCanSend(true), 500)
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
      setImage(result)
    }
    reader.readAsDataURL(file)
  }

  if (!session) return null

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden font-sans">
      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Select Jurisdiction</h3>
              <button 
                onClick={() => setShowCountySelector(false)} 
                className="text-slate-400 hover:text-slate-900 transition bg-slate-100 rounded-full p-1"
                disabled={isUpdatingCounty}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(COUNTY_NAMES).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => handleCountyChange(key)}
                  disabled={isUpdatingCounty}
                  className={`w-full text-left p-4 border rounded-lg transition-all font-semibold flex items-center justify-between ${
                    userCounty === key 
                      ? 'border-[#022c22] bg-teal-50 text-[#022c22]' 
                      : 'border-slate-200 hover:border-teal-600 hover:bg-white text-slate-600'
                  }`}
                >
                  {name}
                  {userCounty === key && <span className="text-teal-700">●</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-white w-full h-full max-w-6xl rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{viewingPdf.title}</h3>
                <p className="text-sm text-slate-500">
                  {viewingPdf.targetPage && `Jumped to Page ${viewingPdf.targetPage}`}
                </p>
              </div>
              <button 
                onClick={() => setViewingPdf(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold transition"
              >
                Close Document
              </button>
            </div>
            <iframe
              src={`/documents/${userCounty}/${viewingPdf.filename}${viewingPdf.targetPage ? `#page=${viewingPdf.targetPage}` : ''}`}
              className="flex-1 w-full bg-slate-50"
              title="PDF Viewer"
            />
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'fixed' : 'hidden'} md:relative md:block inset-y-0 left-0 w-full sm:w-72 bg-[#022c22] border-r border-teal-900 text-teal-100 flex flex-col z-40 relative overflow-hidden transition-all duration-300`}>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-6 flex-shrink-0 border-b border-teal-900/50">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">protocol<span className="font-light text-teal-400">LM</span></h1>
              </div>
              <button className="md:hidden text-teal-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>✕</button>
            </div>

            <button
              onClick={() => setShowCountySelector(true)}
              className="w-full bg-teal-900/40 hover:bg-teal-900/60 text-white p-3 rounded-lg border border-teal-800/50 mb-3 flex items-center justify-between transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold">Jurisdiction</span>
                <span className="text-xs font-bold truncate">{COUNTY_NAMES[userCounty]}</span>
              </div>
              <svg className="w-4 h-4 text-teal-500 group-hover:text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <button
              onClick={startNewChat}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold p-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-teal-900/20"
            >
              <span>+</span> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
            <div className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-3 px-2">History</div>
            {loadingChats ? (
              <div className="space-y-3 px-2">
                <div className="h-8 bg-teal-900/30 rounded w-3/4 animate-pulse"></div>
                <div className="h-8 bg-teal-900/30 rounded w-1/2 animate-pulse"></div>
              </div>
            ) : chatHistory.length === 0 ? (
              <p className="text-teal-600 text-xs px-2 italic">No chat history yet.</p>
            ) : (
              chatHistory.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => loadChat(chat)}
                  className={`p-3 rounded-lg mb-1 group cursor-pointer transition-all relative ${
                    currentChatId === chat.id ? 'bg-teal-800/50 text-white' : 'hover:bg-teal-900/30 text-teal-200'
                  }`}
                >
                  <div className="pr-6">
                    <p className="font-medium text-xs truncate">{chat.title}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                    title="Delete chat"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-teal-900 bg-[#01251d] flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center text-[#022c22] font-bold text-xs bg-teal-400 rounded-full">
                {session?.user?.email ? session.user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {session?.user?.email}
                </p>
                <p className="text-[10px] text-teal-400 font-medium capitalize flex items-center gap-1">
                  {subscriptionInfo?.plan === 'enterprise' ? 'Enterprise' : 'Pro'} Plan
                  {loadingPortal && <span className="animate-spin inline-block w-2 h-2 border-2 border-teal-400 border-t-transparent rounded-full ml-1"></span>}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="text-[10px] font-bold text-teal-200 hover:text-white bg-teal-900/40 border border-teal-800 hover:border-teal-600 py-2 rounded transition-all disabled:opacity-50"
              >
                Billing
              </button>
              <button 
                onClick={handleSignOut}
                className="text-[10px] font-bold text-teal-200 hover:text-red-400 bg-teal-900/40 border border-teal-800 hover:border-red-900/50 py-2 rounded transition-all"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* Header */}
        <div className="p-4 bg-white/90 backdrop-blur-sm border-b border-slate-100 text-slate-900 flex justify-between items-center z-30 absolute top-0 left-0 right-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-600 hover:text-slate-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="md:hidden font-bold text-slate-900">protocol<span className="font-normal text-teal-600">LM</span></div>
          </div>
          <div className="hidden md:block text-xs font-medium text-slate-400 uppercase tracking-wider">
            {COUNTY_NAMES[userCounty]} Compliance Database
          </div>
          <div className="w-6"></div> 
        </div>

        {/* Messages */}
        {/* CHANGED: increased pt-20 to pt-28 to allow header clearance */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-28 space-y-8">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] lg:max-w-[80%] ${
                  msg.role === 'assistant' ? 'w-full' : ''
                }`}
              >
                <div className={`
                  ${msg.role === 'user' 
                    ? 'bg-[#022c22] text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-md inline-block float-right' 
                    : 'text-slate-800 pl-0' 
                  }
                `}>
                  {msg.image && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-white/20 max-w-sm">
                      <img 
                        src={msg.image} 
                        alt="Analysis subject" 
                        className="w-full h-auto" 
                      />
                    </div>
                  )}

                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                      <span className="font-bold text-sm text-slate-900">ProtocolLM</span>
                    </div>
                  )}
                  
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    renderMessageContent(msg)
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start w-full">
               <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                   <span className="font-bold text-sm text-slate-900">Thinking...</span>
                </div>
                <div className="flex items-center gap-1 ml-8">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 md:p-6 bg-white/80 backdrop-blur border-t border-slate-200 z-20">
          {image && (
            <div className="max-w-4xl mx-auto mb-3 px-1">
              <div className="relative inline-block group">
                <img src={image} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm object-cover" />
                <div className="absolute inset-0 bg-black/20 rounded-lg hidden group-hover:flex items-center justify-center transition-all">
                   <button 
                    onClick={() => setImage(null)}
                    className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <div className="flex items-end gap-2 bg-white border border-slate-300 rounded-2xl shadow-sm p-2 focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600 transition-all">
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
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  image 
                    ? 'bg-teal-100 text-teal-700' 
                    : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                }`}
                title="Upload Image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={image ? "Ask a question about this image..." : "Type your question here..."}
                className="flex-1 min-w-0 py-3 bg-transparent border-none focus:ring-0 text-slate-900 placeholder-slate-400"
                disabled={isLoading}
                maxLength={5000}
              />

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !image)}
                className={`p-2.5 rounded-xl font-bold transition-all flex-shrink-0 ${
                  isLoading || (!input.trim() && !image)
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-[#022c22] text-white hover:bg-teal-900 shadow-md'
                }`}
              >
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
            
            <div className="text-center mt-2">
              <p className="text-[10px] text-slate-400">
                AI can make mistakes. Please verify with cited documents.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
