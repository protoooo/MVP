'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

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

  const [activeCounty, setActiveCounty] = useState('washtenaw')
  const [systemStatus, setSystemStatus] = useState(
    'System ready. Regulatory Intelligence active for Washtenaw County.'
  )

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [queryCount, setQueryCount] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

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

  async function handleSend(e) {
    if (e) e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const newUserMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, newUserMessage])
    setInput('')
    setIsSending(true)

    // Add empty assistant message for thinking animation
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
    <div className="h-screen w-full bg-[#F8FAFB] text-slate-900 flex overflow-hidden font-sans">
      {/* LEFT SIDEBAR */}
      <aside className="hidden lg:flex lg:flex-col w-80 border-r border-slate-200 bg-white shadow-sm">
        {/* Logo */}
        <div className="px-8 py-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                protocol<span className="text-blue-600">LM</span>
              </div>
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                Compliance Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Jurisdictions */}
        <div className="px-6 py-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Active Jurisdiction
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Live</span>
            </div>
          </div>
          <div className="space-y-2">
            {['washtenaw', 'wayne', 'oakland'].map((county) => {
              const isActive = activeCounty === county
              return (
                <button
                  key={county}
                  onClick={() => setActiveCounty(county)}
                  className={classNames(
                    'w-full text-left px-4 py-3 rounded-lg text-sm font-semibold border-2 transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{COUNTY_LABELS[county]}</span>
                    {isActive && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* History */}
        <div className="px-6 py-6 flex-1 overflow-hidden">
          <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-4">
            Query History
          </p>
          <div className="text-xs text-slate-600">
            {messages.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="text-slate-500 text-xs block font-medium">No queries yet</span>
                <span className="text-slate-400 text-[10px] block mt-1">Begin consultation below</span>
              </div>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto custom-scroll pr-2">
                {messages
                  .filter((m) => m.role === 'user')
                  .slice(-10)
                  .reverse()
                  .map((m, idx) => (
                    <li
                      key={idx}
                      className="cursor-pointer bg-white border border-slate-200 hover:border-blue-300 rounded-lg px-3.5 py-2.5 transition-all duration-150 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-[10px] text-slate-400 mt-1">●</span>
                        <span className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed flex-1">
                          {m.content}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom User */}
        <div className="mt-auto border-t border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Operator
                </p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {loadingUser ? 'Loading…' : userEmail || 'Unknown user'}
                </p>
                {queryCount !== null && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {queryCount} queries used
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[10px] font-bold text-slate-500 hover:text-red-600 transition-colors uppercase tracking-wider px-2.5 py-1.5 rounded-md hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="w-full border-b border-slate-200 bg-white px-6 lg:px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-base font-bold text-slate-900">
                  protocol<span className="text-blue-600">LM</span>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900">
                    {COUNTY_LABELS[activeCounty]}
                  </h1>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                      System Active
                    </span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 font-medium">
                  AI-Powered Regulatory Intelligence Platform
                </p>
              </div>
            </div>

            {/* Mobile county selector */}
            <div className="lg:hidden flex items-center gap-1.5">
              {['washtenaw', 'wayne', 'oakland'].map((county) => {
                const isActive = activeCounty === county
                return (
                  <button
                    key={county}
                    onClick={() => setActiveCounty(county)}
                    className={classNames(
                      'px-2.5 py-1.5 rounded-md text-[10px] font-bold border-2 transition-all uppercase tracking-wide',
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    )}
                  >
                    {COUNTY_LABELS[county].split(' ')[0]}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <section className="flex-1 flex flex-col px-4 lg:px-8 py-4 gap-3 overflow-hidden min-h-0">
          {/* CHAT PANEL */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col min-h-0">
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4 custom-scroll min-h-0"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 mb-5 rounded-xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-slate-900 mb-2">
                    Compliance Intelligence Ready
                  </p>
                  <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Ask questions about regulations, get instant compliance guidance, and ensure your operations meet all requirements.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.role === 'user'
                  const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1 && isSending
                  
                  return (
                    <div
                      key={idx}
                      className={classNames(
                        'flex animate-fadeIn',
                        isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={classNames(
                          'max-w-[80%] rounded-xl px-5 py-3.5 text-sm leading-relaxed shadow-sm',
                          isUser
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-slate-50 text-slate-900 rounded-bl-sm border border-slate-200'
                        )}
                      >
                        {isLastAssistant && msg.content === '' ? (
                          <div className="flex items-center gap-2.5">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{animationDelay: '0s'}} />
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{animationDelay: '0.2s'}} />
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{animationDelay: '0.4s'}} />
                            </div>
                            <span className="text-slate-600 text-xs font-medium">Analyzing regulatory data...</span>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* INPUT BAR */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 lg:px-6 py-3 flex-shrink-0">
              {/* Suggestion tiles - above input */}
              {messages.length === 0 && (
                <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-4xl mx-auto">
                  {suggestions.map((text, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(text)}
                      className="group text-left bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-start gap-2"
                    >
                      <span className="mt-0.5 text-slate-300 group-hover:text-blue-600 transition-colors text-sm font-bold">
                        →
                      </span>
                      <span className="leading-relaxed group-hover:text-slate-900 line-clamp-2">{text}</span>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="max-w-5xl mx-auto flex items-center gap-3 rounded-lg border-2 border-slate-300 bg-white focus-within:border-blue-500 focus-within:shadow-md transition-all h-12 px-3">
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestions[0] || 'What is the correct corrective action for a critical violation?')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all"
                  aria-label="Use example question"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${COUNTY_LABELS[activeCounty]} regulations…`}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400 font-medium h-full px-2"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !input.trim()}
                  className={classNames(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95',
                    input.trim()
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                  aria-label="Send question"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 4l16 8-16 8 3-8-3-8z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 12h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.5);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.6);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
