'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// --- CONFIGURATION ---
const COUNTY_NAMES: Record<string, string> = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

// --- ICONS ---
const Icons = {
  Chat: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      />
    </svg>
  ),
  Image: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  Audit: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Globe: () => (
    <svg
      className="w-5 h-5 text-[#0077B6]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

// --- THINKING INDICATOR (SUBTLE / PROFESSIONAL) ---
const ThinkingIndicator = () => (
  <div className="flex items-center gap-3">
    <div className="flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0077B6] animate-bounce [animation-delay:-0.2s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#0077B6]/80 animate-bounce" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#0077B6]/60 animate-bounce [animation-delay:0.2s]" />
    </div>
    <span className="text-xs md:text-sm text-slate-500">
      Reviewing local regulations&hellip;
    </span>
  </div>
)

// --- MODE SELECTOR COMPONENT ---
const ModeSelector = ({
  currentMode,
  onSelect,
  onClose
}: {
  currentMode: string
  onSelect: (mode: string) => void
  onClose: () => void
}) => {
  const modes = [
    { id: 'chat', label: 'Standard Query', icon: <Icons.Chat /> },
    { id: 'image', label: 'Image Analysis', icon: <Icons.Image /> },
    { id: 'audit', label: 'Mock Audit Protocol', icon: <Icons.Audit /> }
  ]

  return (
    <div className="absolute bottom-16 left-0 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2">
        Select Mode
      </div>
      <div className="space-y-1">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              onSelect(mode.id)
              onClose()
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
              currentMode === mode.id
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={
                  currentMode === mode.id
                    ? 'text-[#0077B6]'
                    : 'text-slate-400 group-hover:text-slate-600'
                }
              >
                {mode.icon}
              </div>
              {mode.label}
            </div>
            {currentMode === mode.id && <div className="w-2 h-2 rounded-full bg-[#0077B6]" />}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const [session, setSession] = useState<any>(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ requestsUsed: number } | null>(null)
  const [userCounty, setUserCounty] = useState<string>('washtenaw')
  const [isChecking, setIsChecking] = useState(true)
  const [showCountySelector, setShowCountySelector] = useState(false)
  const [isUpdatingCounty, setIsUpdatingCounty] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  const [messages, setMessages] = useState<any[]>([])
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [canSend, setCanSend] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewingPdf, setViewingPdf] = useState<any>(null)
  const [loadingChats, setLoadingChats] = useState(true)
  const [savingChat, setSavingChat] = useState(false)
  const [activeMode, setActiveMode] = useState<'chat' | 'image' | 'audit'>('chat')
  const [showModeMenu, setShowModeMenu] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const saveTimeoutRef = useRef<any>(null)
  const supabase = createClient()
  const router = useRouter()

  // --- AUTH / ACCESS ---
  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed, requests_used, images_used, county')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) {
        router.push('/pricing')
        return
      }

      const countyKey = profile.county ? profile.county.toLowerCase() : 'washtenaw'

      setUserCounty(countyKey)
      setSession(session)
      setSubscriptionInfo({ requestsUsed: profile?.requests_used || 0 })
      setIsChecking(false)
    }
    checkAccess()
  }, [supabase, router])

  useEffect(() => {
    if (session) loadChatHistory()
  }, [session])

  const loadChatHistory = async () => {
    try {
      setLoadingChats(true)
      const response = await fetch('/api/chat-history', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.chats || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingChats(false)
    }
  }

  // --- INITIAL SYSTEM MESSAGE ---
  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `System ready. Regulatory Intelligence active for ${COUNTY_NAMES[userCounty]}.`,
          citations: []
        }
      ])
    }
  }, [userCounty])

  // --- SCROLL TO BOTTOM ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // --- AUTO-SAVE CHAT ---
  useEffect(() => {
    if (messages.length > 1) saveCurrentChat()
  }, [messages])

  const saveCurrentChat = async () => {
    if (!session || messages.length <= 1 || savingChat) return
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSavingChat(true)
        const chatTitle =
          messages.find((m) => m.role === 'user')?.content.substring(0, 40) || 'New Chat'
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
            setChatHistory((prev) => {
              const idx = prev.findIndex((c: any) => c.id === data.chat.id)
              if (idx >= 0) {
                const up = [...prev]
                up[idx] = data.chat
                return up
              }
              return [data.chat, ...prev].slice(0, 50)
            })
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setSavingChat(false)
      }
    }, 2000)
  }

  // --- CHAT MANAGEMENT ---
  const loadChat = (chat: any) => {
    setMessages(chat.messages)
    setUserCounty(chat.county)
    setCurrentChatId(chat.id)
    setIsSidebarOpen(false)
  }

  const startNewChat = () => {
    if (currentChatId && messages.length > 1) saveCurrentChat()
    setMessages([
      {
        role: 'assistant',
        content: `System ready. Regulatory Intelligence active for ${COUNTY_NAMES[userCounty]}.`,
        citations: []
      }
    ])
    setCurrentChatId(null)
    setIsSidebarOpen(false)
  }

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this record?')) return
    setChatHistory((prev) => prev.filter((c: any) => c.id !== chatId))
    if (currentChatId === chatId) startNewChat()
    try {
      await fetch(`/api/chat-history?chatId=${chatId}`, { method: 'DELETE', credentials: 'include' })
    } catch (error) {
      loadChatHistory()
    }
  }

  // --- AUTH CONTROLS ---
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = '/'
  }

  const handleManageSubscription = async () => {
    if (loadingPortal) return
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      window.location.href = data.url
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoadingPortal(false)
    }
  }

  // --- COUNTY CHANGE ---
  const handleCountyChange = async (newCounty: string) => {
    setIsUpdatingCounty(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ county: newCounty })
        .eq('id', session.user.id)
      if (error) throw error
      setUserCounty(newCounty)
      setShowCountySelector(false)
      setMessages([
        {
          role: 'assistant',
          content: `System ready. Regulatory Intelligence active for ${COUNTY_NAMES[newCounty]}.`,
          citations: []
        }
      ])
      setCurrentChatId(null)
    } catch (error) {
      alert('Failed to update jurisdiction.')
    } finally {
      setIsUpdatingCounty(false)
    }
  }

  // --- CITATIONS / PDF VIEWER ---
  const handleCitationClick = (citation: any) => {
    if (!citation?.document) return
    const pageMatch = citation.pages?.toString().match(/\d+/)
    setViewingPdf({
      title: citation.document,
      filename: `${citation.document}.pdf`,
      county: userCounty,
      targetPage: pageMatch ? parseInt(pageMatch[0]) : 1
    })
  }

  const renderMessageContent = (msg: any) => {
    const content = msg.content || ''
    const parts: { type: 'text' | 'citation'; content?: string; document?: string; pages?: string }[] = []
    let lastIndex = 0
    const citationRegex = /\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]/g
    let match
    while ((match = citationRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'citation', document: match[1], pages: match[2] })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) })
    }

    return (
      <div className="whitespace-pre-wrap font-sans text-slate-700 text-[15px] leading-7">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.content}</span>
          ) : (
            <button
              key={i}
              onClick={() => handleCitationClick(part)}
              className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all mx-1 -translate-y-0.5 cursor-pointer uppercase tracking-wide"
            >
              {part.document} <span className="opacity-60">P.{part.pages}</span>
            </button>
          )
        )}
      </div>
    )
  }

  // --- SEND MESSAGE ---
  const handleSendMessage = async (e?: React.FormEvent, overrideInput: string | null = null) => {
    if (e) e.preventDefault()
    const textToSend = overrideInput ?? input
    if (!textToSend.trim() && !image) return
    if (!canSend || isLoading) return
    if (textToSend.length > 5000) {
      alert('Message too long.')
      return
    }

    setCanSend(false)
    const userMessage = { role: 'user', content: textToSend, image, citations: [] }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setImage(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: textToSend }],
          image: userMessage.image,
          county: userCounty
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'System error')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, citations: data.citations }
      ])
      if (subscriptionInfo) {
        setSubscriptionInfo((prev) =>
          prev ? { ...prev, requestsUsed: prev.requestsUsed + 1 } : prev
        )
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}` }
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => setCanSend(true), 500)
    }
  }

  // --- MOCK AUDIT SHORTCUT ---
  const runMockAudit = () => {
    startNewChat()
    setTimeout(() => {
      handleSendMessage(
        undefined,
        'Conduct a formal Mock Health Inspection based on the FDA Food Code. \n\nOutput the results as a structured Markdown Table with these columns: \n| Area | Observation/Question | Priority (P/Pf/C) | Corrective Action |\n\nCheck these 5 critical areas:\n1. Handwashing & Personal Hygiene\n2. Time/Temperature Control (Cold Holding)\n3. Cross-Contamination & Storage\n4. Chemical Storage & Labeling\n5. Dishwashing & Sanitization\n\nAt the end, calculate a projected score out of 100 based on standard deductions.'
      )
    }, 500)
  }

  // --- MODE MENU HANDLERS ---
  const handleMenuSelection = (mode: 'chat' | 'image' | 'audit') => {
    setActiveMode(mode)
    if (mode === 'audit') runMockAudit()
    else if (mode === 'image') fileInputRef.current?.click()
  }

  // --- IMAGE HANDLER ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image too large (Max 5MB)')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  // --- LOADING GATE ---
  if (isChecking || !session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-sm text-slate-400 flex-col gap-4">
        <div className="w-8 h-8 border-2 border-slate-100 border-t-[#0077B6] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden font-sans selection:bg-blue-100">
      {/* --- PRINT / SCROLLBAR STYLES --- */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .chat-container,
          .chat-container * {
            visibility: visible;
          }
          .chat-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
            background: white !important;
          }
          .no-print,
          form,
          .input-bar {
            display: none !important;
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      {/* --- COUNTY SELECTOR MODAL --- */}
      {showCountySelector && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white shadow-2xl max-w-sm w-full p-6 border border-slate-100 rounded-3xl ring-1 ring-slate-900/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-slate-900">Select Jurisdiction</h3>
              <button
                onClick={() => setShowCountySelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(COUNTY_NAMES).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => handleCountyChange(key)}
                  disabled={isUpdatingCounty}
                  className={`w-full text-left p-4 transition-all font-medium text-sm flex items-center justify-between rounded-2xl ${
                    userCounty === key
                      ? 'bg-[#0077B6] text-white shadow-md transform scale-[1.02]'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {name}{' '}
                  {userCounty === key && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      ACTIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- PDF VIEWER MODAL --- */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 no-print">
          <div className="bg-white w-full h-full max-w-5xl shadow-2xl flex flex-col rounded-2xl ring-1 ring-slate-900/5">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900">{viewingPdf.title}</h3>
                <p className="text-xs text-slate-500">Page {viewingPdf.targetPage}</p>
              </div>
              <button
                onClick={() => setViewingPdf(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
            <iframe
              src={`/documents/${userCounty}/${viewingPdf.filename}${
                viewingPdf.targetPage ? `#page=${viewingPdf.targetPage}` : ''
              }`}
              className="flex-1 w-full bg-slate-50"
              title="PDF Viewer"
            />
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative w-72 h-full bg-slate-50 border-r border-slate-200 z-40 transition-transform duration-300 ease-in-out flex flex-col no-print`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <span className="font-bold text-lg text-slate-800 tracking-tight">
                protocol<span className="text-[#0077B6]">LM</span>
              </span>
            </div>
            <button
              className="md:hidden text-slate-400 hover:text-slate-600"
              onClick={() => setIsSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          <button
            onClick={startNewChat}
            className="w-full bg-white hover:shadow-md text-slate-700 font-medium p-3 border border-slate-200 rounded-xl flex items-center gap-3 transition-all duration-200 group active:scale-95 mb-6"
          >
            <div className="bg-slate-100 text-slate-500 group-hover:bg-[#0077B6] group-hover:text-white rounded-lg p-1.5 transition-colors">
              <Icons.Plus />
            </div>
            <span className="text-sm">New Inquiry</span>
          </button>

          <div className="flex flex-col gap-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
              Jurisdiction
            </div>
            <button
              onClick={() => setShowCountySelector(true)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-200/50 transition-colors text-left group"
            >
              <span className="text-sm font-semibold text-slate-700">
                {COUNTY_NAMES[userCounty]}
              </span>
              <span className="text-xs text-[#0077B6] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Change
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 mt-2">
            History
          </div>
          {loadingChats ? (
            <div className="space-y-3 px-2 opacity-50">
              <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
            </div>
          ) : (
            chatHistory.map((chat: any) => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all mb-0.5 ${
                  currentChatId === chat.id
                    ? 'bg-[#0077B6]/10 text-[#0077B6]'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <p className="text-sm truncate w-48 font-medium">{chat.title}</p>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-md transition-all"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="mb-4 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Signed in
            </p>
            <p className="text-xs font-bold text-slate-900 break-all">
              {session?.user?.email}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {subscriptionInfo?.requestsUsed ?? 0} queries used
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleManageSubscription}
              className="text-xs font-medium text-slate-600 hover:text-[#0077B6] hover:bg-white p-2 rounded-lg transition-all text-center"
            >
              Billing
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-white p-2 rounded-lg transition-all text-center"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col relative bg-white chat-container">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md z-30 no-print sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-900"
            >
              <Icons.Menu />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">
                {COUNTY_NAMES[userCounty]}
              </span>
              <span className="text-[10px] font-medium text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Database Active
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-48 pt-4 md:pt-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[100%] sm:max-w-[85%] bg-[#0077B6] text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-md">
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Uploaded content"
                        className="mb-4 rounded-xl border border-white/20 max-w-sm"
                      />
                    )}
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="flex items-start gap-3 max-w-[100%] sm:max-w-[85%]">
                    <div className="mt-1 flex-shrink-0">
                      <Icons.Globe />
                    </div>
                    <div className="bg-white text-slate-800 px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Uploaded content"
                          className="mb-4 rounded-xl border border-slate-100 max-w-sm"
                        />
                      )}
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                </div>
              )
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[100%] sm:max-w-[85%]">
                  <div className="mt-1 flex-shrink-0">
                    <Icons.Globe />
                  </div>
                  <div className="bg-white/80 border border-slate-100 px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <ThinkingIndicator />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-4 left-0 right-0 px-3 md:px-4 flex justify-center z-20 input-bar">
          <div className="w-full max-w-3xl flex flex-col items-center">
            {messages.length < 2 && !image && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                  onClick={() => setInput('Can I cool chili from 135F to 70F in 3 hours?')}
                  className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-600 text-xs px-4 py-3 rounded-xl border border-slate-200 shadow-sm transition-all text-left flex items-center gap-2"
                >
                  Cooling Requirements
                </button>
                <button
                  onClick={() => setInput('Employee has a sore throat and fever. Exclusion?')}
                  className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-600 text-xs px-4 py-3 rounded-xl border border-slate-200 shadow-sm transition-all text-left flex items-center gap-2"
                >
                  Employee Health
                </button>
                <button
                  onClick={() => setInput('Found mouse droppings in dry storage.')}
                  className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-600 text-xs px-4 py-3 rounded-xl border border-slate-200 shadow-sm transition-all text-left flex items-center gap-2"
                >
                  Pest Control Action
                </button>
                <button
                  onClick={() =>
                    setInput('What foods require date marking? 7 day rule?')
                  }
                  className="bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-600 text-xs px-4 py-3 rounded-xl border border-slate-200 shadow-sm transition-all text-left flex items-center gap-2"
                >
                  Date Marking Rules
                </button>
              </div>
            )}

            {image && (
              <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-100 mb-2 flex items-center gap-3">
                <img src={image} className="h-10 w-10 rounded-lg object-cover" />
                <span className="text-xs text-slate-500">Image attached</span>
                <button
                  onClick={() => setImage(null)}
                  className="text-slate-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            )}

            <form
              onSubmit={handleSendMessage}
              className="w-full relative shadow-2xl rounded-3xl bg-white border border-slate-200 hover:border-blue-300 transition-colors group"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />

              <div className="flex items-center px-3 py-2 w-full gap-1 md:gap-2">
                {/* Mode button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModeMenu(!showModeMenu)}
                    className="p-3 rounded-full hover:bg-slate-100 text-slate-400 hover:text-[#0077B6] transition-all"
                  >
                    <Icons.Plus />
                  </button>
                  {showModeMenu && (
                    <ModeSelector
                      currentMode={activeMode}
                      onSelect={handleMenuSelection}
                      onClose={() => setShowModeMenu(false)}
                    />
                  )}
                </div>

                {/* Input */}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    activeMode === 'image'
                      ? 'Upload an image...'
                      : `Ask anything about ${COUNTY_NAMES[userCounty]} regulations...`
                  }
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-[15px] h-12 min-w-0 px-1"
                  disabled={isLoading}
                />

                {/* Send */}
                <button
                  type="submit"
                  disabled={!input.trim() && !image}
                  className={`p-2.5 shrink-0 rounded-full transition-all duration-200 ml-1 md:ml-2 ${
                    input.trim() || image
                      ? 'bg-[#0077B6] text-white shadow-md hover:scale-105 active:scale-95'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Icons.Send />
                </button>
              </div>
            </form>

            <p className="text-[10px] text-slate-400 mt-3 font-medium text-center">
              AI generated content. Verify with official {COUNTY_NAMES[userCounty]} documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
