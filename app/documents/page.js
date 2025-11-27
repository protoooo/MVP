'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import SessionGuard from '@/components/SessionGuard' // <--- 1. IMPORT ADDED

// --- CONSTANTS (Unchanged) ---
const COUNTY_LABELS = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const COUNTY_STATUS = {
  washtenaw: 'Regulatory Intelligence active for Washtenaw County.',
  wayne: 'Regulatory Intelligence active for Wayne County.',
  oakland: 'Regulatory Intelligence active for Oakland County.'
}

const COUNTY_SUGGESTIONS = {
  washtenaw: [
    'What happens if my walk-in is at 48°F during an inspection?',
    'How fast do I have to cool chili from 135°F to 41°F?',
    'What is considered an imminent health hazard in Washtenaw?',
    'Do I have to throw away food if an employee vomits in the kitchen?'
  ],
  wayne: [
    'What are Wayne County rules for power outages during service?',
    'When do I have to report a suspected foodborne illness to the health department?',
    'How often do I need to test my dish machine sanitizer?',
    'What are the requirements for employee illness exclusions?'
  ],
  oakland: [
    'What are the cooling requirements for cooked rice in Oakland County?',
    'What do I do if sewage backs up in the dish room?',
    'What are the date-marking rules for ready-to-eat foods?',
    'Can I use time instead of temperature for holding pizza on the line?'
  ]
}

function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function DocumentsPage() {
  const router = useRouter()
  const supabase = createClient()

  // --- STATE ---
  const [activeCounty, setActiveCounty] = useState('washtenaw')
  const [systemStatus, setSystemStatus] = useState(
    'System ready. Regulatory Intelligence active for Washtenaw County.'
  )

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  // User State
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState(null) // <--- 2. STATE ADDED
  const [loadingUser, setLoadingUser] = useState(true)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // --- EFFECTS ---
  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/')
          return
        }

        if (!cancelled) {
          setUserEmail(user.email || '')
          setUserId(user.id) // <--- 3. CAPTURE ID HERE
        }
      } catch (err) {
        console.error('Error loading user', err)
      } finally {
        if (!cancelled) setLoadingUser(false)
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  useEffect(() => {
    setSystemStatus(`System ready. ${COUNTY_STATUS[activeCounty] || ''}`)
    setMessages([])
  }, [activeCounty])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // --- HANDLERS (Unchanged) ---
  async function handleSend(e) {
    if (e) e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const newUserMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, newUserMessage])
    setInput('')
    setIsSending(true)

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          county: activeCounty
        })
      })

      if (!res.ok) {
        console.error('Chat API error', await res.text())
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'There was a problem reaching the server. Please verify your connection and try again.'
          }
          return updated
        })
        return
      }

      const data = await res.json()
      const replyText =
        data?.answer ||
        data?.response ||
        data?.message ||
        'Response received, but in an unexpected format.'

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: replyText
        }
        return updated
      })
    } catch (err) {
      console.error('Send error', err)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'There was a network error while processing this question. Please try again.'
        }
        return updated
      })
    } finally {
      setIsSending(false)
    }
  }

  function handleSuggestionClick(text) {
    setInput(text)
    if (inputRef.current) inputRef.current.focus()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = COUNTY_SUGGESTIONS[activeCounty] || []

  return (
    <div className="fixed inset-0 h-full w-full bg-[#F8FAFC] text-slate-900 flex overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 4. ACTIVATE SESSION GUARD (Invisible) */}
      {userId && <SessionGuard userId={userId} />}
      
      {/* --- SIDEBAR (Desktop) --- */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">
        
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
           <div className="text-2xl font-bold text-slate-900 tracking-tight">
              protocol<span className="text-blue-600">LM</span>
           </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scroll">
          
          {/* Jurisdiction Selector */}
          <div>
            <div className="px-2 mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jurisdiction</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">LIVE</span>
            </div>
            <div className="space-y-1">
              {['washtenaw', 'wayne', 'oakland'].map((county) => {
                const isActive = activeCounty === county
                return (
                  <button
                    key={county}
                    onClick={() => setActiveCounty(county)}
                    className={classNames(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border',
                      isActive
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                        : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                    )}
                  >
                    <span>{COUNTY_LABELS[county]}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* History List */}
          <div className="flex-1">
             <div className="px-2 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Queries</span>
             </div>
             {messages.length === 0 ? (
                <div className="px-3 py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                   <span className="text-xs text-slate-400 font-medium">No active session history</span>
                </div>
             ) : (
                <div className="space-y-1">
                  {messages
                    .filter((m) => m.role === 'user')
                    .slice(-6)
                    .reverse()
                    .map((m, idx) => (
                      <div key={idx} className="group relative flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white hover:shadow-sm hover:border-slate-100 border border-transparent transition-all cursor-default">
                         <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors flex-shrink-0"></div>
                         <span className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">{m.content}</span>
                      </div>
                    ))}
                </div>
             )}
          </div>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-0 px-1">
              <p className="text-xs font-bold text-slate-900 truncate">{loadingUser ? 'Loading...' : 'Operator'}</p>
              <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
              title="Sign Out"
            >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white lg:bg-[#F8FAFC]">
        
        {/* Header (Desktop & Mobile) */}
        <header className="h-16 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
             {/* Mobile Logo */}
             <div className="lg:hidden text-lg font-bold text-slate-900 tracking-tight">
                protocol<span className="text-blue-600">LM</span>
             </div>
             
             <div className="hidden lg:block">
                <h1 className="text-sm lg:text-base font-bold text-slate-900 flex items-center gap-2">
                  {COUNTY_LABELS[activeCounty]}
                  <span className="hidden lg:inline-flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">Verified Regulatory Intelligence Platform</p>
             </div>
          </div>

          {/* Mobile County Toggle */}
          <div className="lg:hidden flex bg-slate-100 p-1 rounded-lg">
              {['washtenaw', 'wayne', 'oakland'].map((county) => (
                  <button
                      key={county}
                      onClick={() => setActiveCounty(county)}
                      className={classNames(
                          'w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-all',
                          activeCounty === county ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      )}
                  >
                      {county.charAt(0).toUpperCase()}
                  </button>
              ))}
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Messages Scroll Area */}
          <div 
             ref={scrollRef}
             className="flex-1 overflow-y-auto px-4 lg:px-20 py-6 custom-scroll space-y-6 scroll-smooth"
          >
             {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                   <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Protocol Compliance</h2>
                   <p className="text-sm text-slate-500 max-w-sm text-center mb-8">
                      Authorized documentation loaded for <span className="font-semibold text-slate-700">{COUNTY_LABELS[activeCounty]}</span>. Ask specific regulatory questions.
                   </p>
                   
                   {/* Centered Suggestions */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                      {suggestions.map((text, idx) => (
                         <button
                            key={idx}
                            onClick={() => handleSuggestionClick(text)}
                            className="text-left p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
                         >
                            <span className="block text-[10px] font-bold text-slate-400 group-hover:text-blue-500 mb-1">EXAMPLE QUERY</span>
                            <span className="text-xs text-slate-700 font-medium leading-relaxed">{text}</span>
                         </button>
                      ))}
                   </div>
                </div>
             ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.role === 'user'
                  const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1 && isSending
                  
                  return (
                    <div
                      key={idx}
                      className={classNames(
                        'flex w-full animate-fadeIn',
                        isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div className={classNames("flex flex-col max-w-[85%] lg:max-w-[70%]", isUser ? "items-end" : "items-start")}>
                          <span className="text-[10px] font-bold text-slate-400 mb-1.5 px-1 uppercase tracking-wider">
                             {isUser ? 'You' : 'ProtocolLM'}
                          </span>
                          <div
                            className={classNames(
                              'px-5 py-3.5 text-sm leading-7 shadow-sm',
                              isUser
                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm'
                            )}
                          >
                            {isLastAssistant && msg.content === '' ? (
                              <div className="flex gap-1.5 py-1.5 px-1">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0s'}} />
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}} />
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}} />
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                            )}
                          </div>
                      </div>
                    </div>
                  )
                })
             )}
          </div>

          {/* Fixed Input Bar */}
          <div className="flex-shrink-0 z-20 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 lg:px-20 py-4 pb-safe">
             <div className="max-w-4xl mx-auto relative">
                <form onSubmit={handleSend} className="relative group">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                   </div>
                   
                   <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSending}
                      placeholder={`Ask about ${COUNTY_LABELS[activeCounty]} regulations...`}
                      className="block w-full pl-11 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                   />
                   
                   <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <button
                        type="submit"
                        disabled={isSending || !input.trim()}
                        className={classNames(
                          'p-2 rounded-lg transition-all duration-200 flex items-center justify-center',
                          input.trim()
                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        )}
                      >
                         {isSending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                         ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                         )}
                      </button>
                   </div>
                </form>
             </div>
          </div>
        </div>
      </main>

      {/* Styles */}
      <style jsx global>{`
        .pb-safe {
           padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 999px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}
