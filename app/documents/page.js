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
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'There was a problem reaching the server. Please verify your connection and try again.'
          }
        ])
        return
      }

      const data = await res.json()
      const replyText =
        data?.answer ||
        data?.response ||
        data?.message ||
        'Response received, but in an unexpected format.'

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: replyText
        }
      ])
    } catch (err) {
      console.error('Send error', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'There was a network error while processing this question. Please try again.'
        }
      ])
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

  const suggestions = COUNTY_SUGGESTIONS[activeCounty] || []

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#F0F9FF] via-[#F5FAFF] to-white text-slate-900 flex overflow-hidden font-sans">
      {/* LEFT SIDEBAR */}
      <aside className="hidden lg:flex lg:flex-col w-72 border-r border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-sm">
        {/* Logo */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0077B6] to-[#023E8A] flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <div className="text-xl font-bold tracking-tight text-slate-900">
              protocol<span className="text-[#0077B6]">LM</span>
            </div>
          </div>
        </div>

        {/* Jurisdictions */}
        <div className="px-6 pt-7 pb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              Jurisdiction
            </p>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-2.5">
            {['washtenaw', 'wayne', 'oakland'].map((county) => {
              const isActive = activeCounty === county
              return (
                <button
                  key={county}
                  onClick={() => setActiveCounty(county)}
                  className={classNames(
                    'group w-full text-left px-4 py-3.5 rounded-xl text-sm font-semibold border transition-all duration-300 ease-out relative overflow-hidden',
                    isActive
                      ? 'bg-gradient-to-r from-[#0077B6]/5 to-[#0077B6]/10 border-[#0077B6]/40 text-[#023E8A] shadow-lg shadow-[#0077B6]/5 scale-[1.02]'
                      : 'bg-white/80 border-slate-200/80 text-slate-600 hover:bg-white hover:border-[#90E0EF]/60 hover:text-[#0077B6] hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
                  )}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <span>{COUNTY_LABELS[county]}</span>
                    {isActive && (
                      <svg className="w-4 h-4 text-[#0077B6]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0077B6]/0 via-[#0077B6]/5 to-[#0077B6]/0 animate-shimmer" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* History */}
        <div className="px-6 pt-6 pb-6 flex-1 overflow-hidden">
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-4">
            Recent Activity
          </p>
          <div className="text-xs text-slate-500 leading-relaxed">
            {messages.length === 0 ? (
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="text-slate-400 text-[11px] block">No queries yet</span>
                <span className="text-slate-400 text-[10px] block mt-1">Start a conversation</span>
              </div>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto custom-scroll pr-2">
                {messages
                  .filter((m) => m.role === 'user')
                  .slice(-8)
                  .reverse()
                  .map((m, idx) => (
                    <li
                      key={idx}
                      className="group cursor-pointer bg-white border border-slate-200/60 hover:border-[#90E0EF]/60 rounded-lg px-3.5 py-2.5 transition-all duration-200 hover:shadow-sm hover:bg-slate-50/50"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-slate-400 mt-0.5 group-hover:text-[#0077B6]">●</span>
                        <span className="text-[11px] text-slate-600 group-hover:text-slate-900 line-clamp-2 leading-relaxed">
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
        <div className="mt-auto border-t border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0077B6] to-[#023E8A] flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
                {loadingUser ? '...' : (userEmail[0]?.toUpperCase() || 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-0.5">
                  Account
                </p>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {loadingUser ? 'Loading…' : userEmail || 'Unknown user'}
                </p>
                {queryCount !== null && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {queryCount} queries
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider px-2 py-1 rounded-md hover:bg-rose-50"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="w-full border-b border-slate-200/60 bg-white/95 backdrop-blur-xl px-5 lg:px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0077B6] to-[#023E8A] flex items-center justify-center shadow-sm">
                <span className="text-white text-[10px] font-bold">P</span>
              </div>
              <div className="text-base font-bold tracking-tight text-slate-900">
                protocol<span className="text-[#0077B6]">LM</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-slate-900">
                  {COUNTY_LABELS[activeCounty]}
                </h1>
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-3 py-1.5 border border-emerald-200/60 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.15em]">
                    Live
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                Real-time regulatory intelligence for operational compliance
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
                    'px-3 py-2 rounded-lg text-[10px] font-bold border transition-all uppercase tracking-wide',
                    isActive
                      ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-md'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#90E0EF] active:scale-95'
                  )}
                >
                  {COUNTY_LABELS[county].split(' ')[0]}
                </button>
              )
            })}
          </div>
        </header>

        {/* CONTENT */}
        <section className="flex-1 flex flex-col px-5 lg:px-8 pt-6 pb-5 gap-5 overflow-hidden">
          {/* Status banner */}
          <div className="inline-flex items-center gap-3 bg-white/95 border border-slate-200/60 rounded-2xl px-5 py-3 shadow-md backdrop-blur-sm max-w-2xl hover:shadow-lg transition-all">
            <span
              className={classNames(
                'text-lg',
                isSending ? 'animate-[ruminate_1.6s_ease-in-out_infinite]' : ''
              )}
              aria-hidden="true"
            >
              🌐
            </span>
            <p className="text-sm font-semibold text-slate-700">
              {systemStatus}
            </p>
          </div>

          {/* Suggestion tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl">
            {suggestions.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(text)}
                className="group text-left bg-white/95 border border-slate-200/60 hover:border-[#0077B6]/40 hover:bg-white rounded-2xl px-4 py-3.5 text-[13px] text-slate-700 font-medium shadow-sm hover:shadow-lg transition-all duration-300 flex items-start gap-2.5 active:scale-[0.98] hover:scale-[1.01]"
              >
                <span className="mt-0.5 text-slate-300 group-hover:text-[#0077B6] transition-colors text-base">
                  →
                </span>
                <span className="leading-relaxed group-hover:text-slate-900">{text}</span>
              </button>
            ))}
          </div>

          {/* CHAT PANEL */}
          <div className="flex-1 bg-white/95 border border-slate-200/60 rounded-3xl shadow-xl overflow-hidden flex flex-col backdrop-blur-sm">
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 lg:px-8 py-6 space-y-4 custom-scroll"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-[#0077B6]/10 to-[#0077B6]/5 border border-[#0077B6]/20 flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8 text-[#0077B6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-2">
                    Start with a real operational scenario
                  </p>
                  <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed px-4">
                    Example: "We found raw chicken stored over lettuce during prep. What should we document and fix before an inspector arrives?"
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={classNames(
                      'flex animate-fadeIn',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={classNames(
                        'max-w-[85%] rounded-2xl px-5 py-3.5 text-[13px] leading-relaxed shadow-md backdrop-blur-sm',
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-[#0077B6] to-[#0077B6]/90 text-white rounded-br-md border border-[#0077B6]/20'
                          : 'bg-white text-slate-800 rounded-bl-md border border-slate-200/60'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* INPUT BAR */}
            <form
              onSubmit={handleSend}
              className="border-t border-slate-200/60 bg-gradient-to-b from-slate-50/50 to-white px-5 lg:px-6 py-4"
            >
              <div className="max-w-5xl mx-auto flex items-center gap-3 rounded-2xl border-2 border-slate-200/60 bg-white shadow-lg focus-within:border-[#0077B6]/60 focus-within:shadow-xl transition-all h-14 px-3">
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestions[0] || 'What is the correct corrective action for a critical violation?')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 text-slate-500 hover:text-[#0077B6] hover:border-[#0077B6]/60 hover:from-[#EFF6FF] hover:to-white active:scale-95 transition-all shadow-sm hover:shadow-md"
                  aria-label="Use example question"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask about ${COUNTY_LABELS[activeCounty]} regulations…`}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400 font-medium h-full px-2"
                />

                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className={classNames(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-all shadow-md active:scale-95',
                    input.trim()
                      ? 'bg-gradient-to-br from-[#0077B6] to-[#023E8A] text-white shadow-[#0077B6]/20 hover:shadow-lg hover:shadow-[#0077B6]/30 hover:scale-105'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  )}
                  aria-label="Send question"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
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

              <p className="mt-3 text-[10px] text-center text-slate-400 font-medium tracking-wide">
                AI-generated guidance • Always verify with official county documents
              </p>
            </form>
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
          background: linear-gradient(180deg, rgba(148, 163, 184, 0.4), rgba(148, 163, 184, 0.6));
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(0, 119, 182, 0.4), rgba(0, 119, 182, 0.6));
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        @keyframes ruminate {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            filter: drop-shadow(0 0 0 rgba(0, 119, 182, 0));
          }
          25% {
            transform: translateY(-2px) rotate(-5deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
            filter: drop-shadow(0 0 6px rgba(0, 119, 182, 0.5));
          }
          75% {
            transform: translateY(2px) rotate(5deg);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
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

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
