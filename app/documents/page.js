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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  
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
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data: profile } = await supabase.from('user_profiles').select('is_subscribed, requests_used, images_used, county').eq('id', session.user.id).single()
      if (!profile?.is_subscribed) { router.push('/pricing'); return }
      setUserCounty(profile.county || 'washtenaw')
      setSession(session)
      setSubscriptionInfo({ requestsUsed: profile?.requests_used || 0 })
    }
    checkAccess()
  }, [supabase, router])

  useEffect(() => { if (session) loadChatHistory() }, [session])

  const loadChatHistory = async () => {
    try {
      setLoadingChats(true)
      const response = await fetch('/api/chat-history', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.chats || [])
      }
    } catch (error) { console.error(error) } finally { setLoadingChats(false) }
  }

  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([{ 
        role: 'assistant', 
        content: `System ready. Regulatory Intelligence active for ${COUNTY_NAMES[userCounty]}.`,
        citations: []
      }])
    }
  }, [userCounty])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (messages.length > 1) saveCurrentChat() }, [messages])

  const saveCurrentChat = async () => {
    if (!session || messages.length <= 1 || savingChat) return
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSavingChat(true)
        const chatTitle = messages.find(m => m.role === 'user')?.content.substring(0, 40) || 'New Chat'
        const response = await fetch('/api/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ chatId: currentChatId, title: chatTitle, messages, county: userCounty })
        })
        if (response.ok) {
          const data = await response.json()
          if (data.chat) {
            setCurrentChatId(data.chat.id)
            setChatHistory(prev => {
              const idx = prev.findIndex(c => c.id === data.chat.id)
              if (idx >= 0) { const up = [...prev]; up[idx] = data.chat; return up }
              return [data.chat, ...prev].slice(0, 50)
            })
          }
        }
      } catch (error) { console.error(error) } finally { setSavingChat(false) }
    }, 2000)
  }

  const loadChat = (chat) => {
    setMessages(chat.messages)
    setUserCounty(chat.county)
    setCurrentChatId(chat.id)
    setIsSidebarOpen(false)
  }

  const startNewChat = () => {
    if (currentChatId && messages.length > 1) saveCurrentChat()
    setMessages([{ role: 'assistant', content: `System ready. Regulatory Intelligence active for ${COUNTY_NAMES[userCounty]}.`, citations: [] }])
    setCurrentChatId(null)
    setIsSidebarOpen(false)
  }

  const deleteChat = async (chatId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this record?')) return
    setChatHistory(prev => prev.filter(c => c.id !== chatId))
    if (currentChatId === chatId) startNewChat()
    try { await fetch(`/api/chat-history?chatId=${chatId}`, { method: 'DELETE', credentials: 'include' }) } 
    catch (error) { loadChatHistory() }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = '/'
  }

  const handleManageSubscription = async () => {
    if (loadingPortal) return
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      window.location.href = data.url
    } catch (error) { alert(error.message) } finally { setLoadingPortal(false) }
  }

  const handleCountyChange = async (newCounty) => {
    setIsUpdatingCounty(true)
    try {
      const { error } = await supabase.from('user_profiles').update({ county: newCounty }).eq('id', session.user.id)
      if (error) throw error
      setUserCounty(newCounty)
      setShowCountySelector(false)
      startNewChat()
    } catch (error) { alert('Failed to update jurisdiction.') } finally { setIsUpdatingCounty(false) }
  }

  const handleCitationClick = (citation) => {
    if (!citation?.document) return
    const pageMatch = citation.pages?.toString().match(/\d+/)
    setViewingPdf({ title: citation.document, filename: `${citation.document}.pdf`, county: userCounty, targetPage: pageMatch ? parseInt(pageMatch[0]) : 1 })
  }

  const renderMessageContent = (msg) => {
    const content = msg.content || ''
    const parts = []
    let lastIndex = 0
    const citationRegex = /\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]/g
    let match
    while ((match = citationRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
      parts.push({ type: 'citation', document: match[1], pages: match[2] })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) parts.push({ type: 'text', content: content.slice(lastIndex) })

    return (
      <div className="whitespace-pre-wrap font-mono text-slate-700 text-sm leading-relaxed">
        {parts.map((part, i) =>
          part.type === 'text' ? <span key={i}>{part.content}</span> : (
            <button key={i} onClick={() => handleCitationClick(part)} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 hover:border-[#6b85a3] hover:text-[#6b85a3] px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors mx-1 -translate-y-0.5 cursor-pointer uppercase tracking-wide shadow-sm">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {part.document} <span className="opacity-50">| P.{part.pages}</span>
            </button>
          )
        )}
      </div>
    )
  }

  const handleSendMessage = async (e, overrideInput = null) => {
    if (e) e.preventDefault()
    const textToSend = overrideInput || input
    if (!textToSend.trim() && !image) return
    if (!canSend || isLoading) return
    if (textToSend.length > 5000) { alert('Message too long.'); return }

    setCanSend(false)
    const userMessage = { role: 'user', content: textToSend, image, citations: [] }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImage(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: textToSend }], image: userMessage.image, county: userCounty })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'System error')
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, citations: data.citations }])
      if (subscriptionInfo) setSubscriptionInfo(prev => ({ ...prev, requestsUsed: prev.requestsUsed + 1 }))
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
      setTimeout(() => setCanSend(true), 500)
    }
  }

  const runMockAudit = () => {
    startNewChat()
    setTimeout(() => {
      handleSendMessage(null, "Conduct a formal Mock Health Inspection based on the FDA Food Code. \n\nOutput the results as a structured Markdown Table with these columns: \n| Area | Observation/Question | Priority (P/Pf/C) | Corrective Action |\n\nCheck these 5 critical areas:\n1. Handwashing & Personal Hygiene\n2. Time/Temperature Control (Cold Holding)\n3. Cross-Contamination & Storage\n4. Chemical Storage & Labeling\n5. Dishwashing & Sanitization\n\nAt the end, calculate a projected score out of 100 based on standard deductions.")
    }, 500)
  }

  const generateMemo = () => handleSendMessage(null, "Generate a formal Staff Memo based on our conversation. Format it with: DATE, TO: All Staff, FROM: Management, SUBJECT: Corrective Actions Required. List each violation discussed, the specific code section it violates, why it matters, and the required corrective action.")
  const handlePrint = () => window.print()
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) { alert('Image too large (Max 5MB)'); return }
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result)
    reader.readAsDataURL(file)
  }

  if (!session) return <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs text-slate-400">LOADING SYSTEM...</div>

  return (
    <div className="fixed inset-0 flex bg-[#f8fafc] text-slate-900 overflow-hidden font-mono">
      
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .chat-container, .chat-container * { visibility: visible; }
          .chat-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; background: white !important; }
          .no-print, form, .p-4.border-t, .bg-white\/80 { display: none !important; }
          .bg-\[\#6b85a3\] { background-color: white !important; color: black !important; border: 1px solid #000; font-weight: bold; }
          .text-white { color: black !important; }
          .text-slate-800 { color: black !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
        }
      `}</style>

      {/* MODALS */}
      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white shadow-2xl max-w-md w-full p-6 border border-slate-200 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Select Jurisdiction</h3>
              <button onClick={() => setShowCountySelector(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <div className="space-y-2">
              {Object.entries(COUNTY_NAMES).map(([key, name]) => (
                <button key={key} onClick={() => handleCountyChange(key)} disabled={isUpdatingCounty} className={`w-full text-left p-4 border transition-all font-bold text-xs uppercase tracking-wide flex items-center justify-between rounded-xl ${userCounty === key ? 'border-[#6b85a3] bg-slate-50 text-[#6b85a3]' : 'border-slate-200 hover:border-slate-400 text-slate-500'}`}>
                  {name} {userCounty === key && <span>●</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 no-print">
          <div className="bg-white w-full h-full max-w-6xl overflow-hidden shadow-2xl flex flex-col rounded-2xl">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{viewingPdf.title}</h3>
                <p className="text-xs text-slate-500 font-mono">Page {viewingPdf.targetPage}</p>
              </div>
              <button onClick={() => setViewingPdf(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl">Close</button>
            </div>
            <iframe src={`/documents/${userCounty}/${viewingPdf.filename}${viewingPdf.targetPage ? `#page=${viewingPdf.targetPage}` : ''}`} className="flex-1 w-full bg-slate-50" title="PDF Viewer" />
          </div>
        </div>
      )}

      {showSuccessMessage && <div className="fixed top-0 left-0 right-0 z-[70] bg-[#6b85a3] text-white px-6 py-4 shadow-lg flex justify-center no-print"><span className="text-xs font-bold uppercase tracking-widest">Account Active. Welcome to protocolLM.</span></div>}

      {/* SIDEBAR - Rounded & Softer */}
      <div className={`${isSidebarOpen ? 'fixed' : 'hidden'} md:relative md:flex inset-y-0 left-0 w-full md:w-72 bg-[#f1f5f9] border-r border-slate-200 text-slate-600 flex-col z-40 overflow-hidden no-print h-full`}>
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-lg font-bold tracking-tighter text-slate-900">protocol<span style={{ color: '#6b85a3' }}>LM</span></h1>
            <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>✕</button>
          </div>

          <button onClick={() => setShowCountySelector(true)} className="w-full bg-white hover:border-[#6b85a3] text-slate-700 p-3 border border-slate-300 mb-3 flex items-center justify-between transition-colors group rounded-xl">
            <div className="flex flex-col items-start">
              <span className="text-[9px] text-[#6b85a3] uppercase tracking-widest font-bold">Jurisdiction</span>
              <span className="text-xs font-bold truncate">{COUNTY_NAMES[userCounty]}</span>
            </div>
            <svg className="w-4 h-4 text-[#6b85a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>

          <button onClick={startNewChat} className="w-full text-white font-bold p-3 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest rounded-xl shadow-sm hover:opacity-90 mb-3" style={{ backgroundColor: '#6b85a3' }}>
            <span>+</span> New Inquiry
          </button>

          <button onClick={runMockAudit} className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 font-bold p-3 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest rounded-xl hover:border-[#6b85a3] hover:text-[#6b85a3]">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
             Run Mock Audit
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Record History</div>
          {loadingChats ? <div className="space-y-3 px-2 opacity-50"><div className="h-8 bg-slate-200 rounded-xl w-3/4 animate-pulse"></div></div> : 
            chatHistory.map(chat => (
              <div key={chat.id} onClick={() => loadChat(chat)} className={`p-3 mb-1 cursor-pointer transition-all relative group rounded-xl ${currentChatId === chat.id ? 'bg-white border border-slate-200 shadow-sm text-slate-900' : 'hover:bg-slate-200 text-slate-500'}`}>
                <div className="pr-6">
                  <p className="font-medium text-xs truncate font-mono">{chat.title}</p>
                  <p className="text-[9px] opacity-50 mt-1 uppercase tracking-wider">{new Date(chat.updated_at).toLocaleDateString()}</p>
                </div>
                <button onClick={(e) => deleteChat(chat.id, e)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">✕</button>
              </div>
            ))
          }
        </div>

        <div className="p-4 border-t border-slate-200 bg-[#f1f5f9] flex-shrink-0 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center text-white font-bold text-xs rounded-full" style={{ backgroundColor: '#6b85a3' }}>{session?.user?.email ? session.user.email[0].toUpperCase() : 'U'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate font-mono">{session?.user?.email}</p>
              <p className="text-[9px] text-[#6b85a3] font-medium uppercase tracking-wider">{subscriptionInfo?.requestsUsed} Queries Used</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleManageSubscription} className="text-[9px] font-bold text-slate-500 hover:text-[#6b85a3] bg-white border border-slate-300 py-2 transition-all rounded-xl uppercase tracking-wide">Billing</button>
            <button onClick={handleSignOut} className="text-[9px] font-bold text-slate-500 hover:text-red-500 bg-white border border-slate-300 py-2 transition-all rounded-xl uppercase tracking-wide">Log Out</button>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] relative chat-container">
        <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-slate-200 text-slate-900 flex justify-between items-center z-30 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div className="md:hidden font-bold text-slate-900 tracking-tight">protocol<span style={{ color: '#6b85a3' }}>LM</span></div>
          </div>
          <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{COUNTY_NAMES[userCounty]} Database // Active</div>
          <div className="flex items-center gap-2">
             <button onClick={generateMemo} className="hidden sm:flex bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider items-center gap-2 transition-colors shadow-sm">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                Generate Staff Memo
             </button>
             <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                Print / Save PDF
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-8 pt-8 space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] lg:max-w-[80%] ${msg.role === 'assistant' ? 'w-full' : ''}`}>
                <div className={`px-5 py-3 shadow-sm ${msg.role === 'user' ? 'bg-[#6b85a3] text-white rounded-2xl rounded-tr-sm float-right' : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm'}`}>
                  {msg.image && <img src={msg.image} alt="Analysis" className="mb-3 rounded-xl border border-white/20 max-w-sm w-full h-auto" />}
                  {msg.role === 'assistant' && <div className="flex items-center gap-2 mb-2 no-print"><div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: '#6b85a3' }}>AI</div><span className="font-bold text-xs text-slate-900 font-mono uppercase tracking-wide">Protocol_LM</span></div>}
                  {msg.role === 'user' ? <p className="whitespace-pre-wrap leading-relaxed text-sm font-mono">{msg.content}</p> : renderMessageContent(msg)}
                </div>
              </div>
            </div>
          ))}
          {isLoading && <div className="flex items-center gap-2 mb-2 no-print"><div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: '#6b85a3' }}>AI</div><span className="font-bold text-xs text-slate-400 font-mono uppercase tracking-wide animate-pulse">Processing...</span></div>}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <div className="flex-shrink-0 p-6 bg-white border-t border-slate-200 z-20 no-print">
          {image && <div className="max-w-4xl mx-auto mb-3 px-1"><div className="relative inline-block group"><img src={image} alt="Preview" className="h-16 w-auto rounded-xl border border-slate-300 shadow-sm" /><button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div></div>}
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 focus-within:border-[#6b85a3] focus-within:ring-1 focus-within:ring-[#6b85a3] transition-all rounded-2xl shadow-sm">
              <input type="file" ref={fileInputRef} accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-2.5 text-slate-400 hover:text-[#6b85a3] transition-colors flex-shrink-0 rounded-xl hover:bg-slate-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder={image ? "Analyze this image..." : "Enter regulatory query..."} className="flex-1 min-w-0 py-3 bg-transparent border-none focus:ring-0 text-slate-900 placeholder-slate-400 font-mono text-sm" disabled={isLoading} />
              <button type="submit" disabled={isLoading || (!input.trim() && !image) || !canSend} className={`p-2.5 font-bold transition-all flex-shrink-0 rounded-xl ${isLoading || (!input.trim() && !image) ? 'text-slate-300' : 'text-white bg-[#6b85a3] hover:opacity-90 shadow-md'}`}>
                {isLoading ? <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center uppercase tracking-wider">ProtocolLM generates regulatory guidance. Verify with official county documents.</p>
          </form>
        </div>
      </div>
    </div>
  )
}
