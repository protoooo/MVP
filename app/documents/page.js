'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

// ---- CONSTANTS ----

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

// ---- HELPERS ----

function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

// ---- PAGE COMPONENT ----

export default function DocumentsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [activeCounty, setActiveCounty] = useState('washtenaw')
  const [systemStatus, setSystemStatus] = useState(
    'System ready. Regulatory Intelligence active for Washtenaw County.'
  )

  const [messages, setMessages] = useState([]) // { role, content }
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [queryCount, setQueryCount] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // ---- USER / SESSION ----
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

        // If you have a query counter table, you can setQueryCount(...) here.
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

  // ---- UPDATE SYSTEM STATUS WHEN COUNTY CHANGES ----
  useEffect(() => {
    setSystemStatus(`System ready. ${COUNTY_STATUS[activeCounty] || ''}`)
    setMessages([])
  }, [activeCounty])

  // ---- AUTOSCROLL ----
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // ---- SEND MESSAGE ----
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

  // ---- SUGGESTION CLICK ----
  function handleSuggestionClick(text) {
    setInput(text)
    if (inputRef.current) inputRef.current.focus()
  }

  // ---- SIGN OUT ----
  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const suggestions = COUNTY_SUGGESTIONS[activeCounty] || []

  return (
    <div className="h-screen w-full bg-[#F5FAFF] text-slate-900 flex overflow-hidden">
      {/* LEFT SIDEBAR */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-200 bg-white/80 backdrop-blur-sm">
        {/* logo */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="text-xl font-bold tracking-tight text-[#023E8A]">
            protocol<span className="text-[#0077B6]">LM</span>
          </div>
        </div>

        {/* jurisdictions */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase mb-2">
            Jurisdiction
          </p>
          <div className="space-y-2">
            {['washtenaw', 'wayne', 'oakland'].map((county) => {
              const isActive = activeCounty === county
              return (
                <button
                  key={county}
                  onClick={() => setActiveCounty(county)}
                  className={classNames(
                    'w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all duration-200 active:scale-[0.97]',
                    isActive
                      ? 'bg-[#0077B6]/10 border-[#0077B6] text-[#023E8A] shadow-sm'
                      : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white hover:border-[#90E0EF]'
                  )}
                >
                  {COUNTY_LABELS[county]}
                </button>
              )
            })}
          </div>
        </div>

        {/* history */}
        <div className="px-6 pt-4 pb-6 flex-1 overflow-hidden">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase mb-2">
            History
          </p>
          <div className="text-[12px] text-slate-400 leading-relaxed pr-3">
            {messages.length === 0 ? (
              <span>No questions yet. Your first inquiry will appear here.</span>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
                {messages
                  .filter((m) => m.role === 'user')
                  .slice(-6)
                  .map((m, idx) => (
                    <li
                      key={idx}
                      className="truncate text-slate-600 text-[12px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                    >
                      {m.content}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* bottom user tile */}
        <div className="mt-auto border-t border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">
                Account
              </p>
              <p className="text-[12px] font-medium text-slate-800 truncate max-w-[140px]">
                {loadingUser ? 'Loading…' : userEmail || 'Unknown user'}
              </p>
              {queryCount !== null && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {queryCount} queries used
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="text-[11px] font-semibold text-slate-500 hover:text-[#E11D48] transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* header */}
        <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* mobile logo */}
            <div className="md:hidden text-lg font-bold tracking-tight text-[#023E8A]">
              protocol<span className="text-[#0077B6]">LM</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-semibold text-slate-900">
                  {COUNTY_LABELS[activeCounty]}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-[0.16em]">
                    Database Active
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 hidden md:block">
                Ask operational questions exactly the way your team would during a rush.
              </p>
            </div>
          </div>

          {/* mobile county selector */}
          <div className="md:hidden flex items-center gap-2">
            {['washtenaw', 'wayne', 'oakland'].map((county) => {
              const isActive = activeCounty === county
              return (
                <button
                  key={county}
                  onClick={() => setActiveCounty(county)}
                  className={classNames(
                    'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all',
                    isActive
                      ? 'bg-[#0077B6] text-white border-[#0077B6]'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  {COUNTY_LABELS[county].split(' ')[0]}
                </button>
              )
            })}
          </div>
        </header>

        {/* CONTENT: locked to viewport height via flex */}
        <section className="flex-1 flex flex-col px-4 md:px-8 pt-3 pb-3 gap-3 overflow-hidden">
          {/* system status banner */}
          <div className="inline-flex items-center gap-3 bg-white/90 border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm max-w-xl">
            <span
              className={classNames(
                'text-[15px] md:text-[16px]',
                isSending ? 'animate-[ruminate_1.6s_ease-in-out_infinite]' : ''
              )}
              aria-hidden="true"
            >
              🌐
            </span>
            <p className="text-[13px] md:text-sm font-medium text-slate-700">
              {systemStatus}
            </p>
          </div>

          {/* suggestion tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 max-w-5xl">
            {suggestions.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(text)}
                className="group text-left bg-white/90 border border-slate-200 hover:border-[#90E0EF] hover:bg-white rounded-2xl px-3.5 py-3 text-[12px] md:text-[13px] text-slate-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-start gap-2 active:scale-[0.98]"
              >
                <span className="mt-[2px] text-slate-400 group-hover:text-[#0077B6]">
                  ●
                </span>
                <span>{text}</span>
              </button>
            ))}
          </div>

          {/* CHAT PANEL */}
          <div className="flex-1 bg-gradient-to-b from-white/60 to-white/90 border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            {/* messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 custom-scroll"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <p className="text-[13px] font-medium">
                    Start with a real situation your team has faced.
                  </p>
                  <p className="text-[12px] mt-1 max-w-xl mx-auto">
                    Example: “We found raw chicken stored over lettuce during prep. What
                    should we document and fix before an inspector arrives?”
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={classNames(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={classNames(
                        'max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm',
                        msg.role === 'user'
                          ? 'bg-[#0077B6] text-white rounded-br-sm'
                          : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
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
              className="border-t border-slate-200 bg-white/95 px-3 md:px-4 py-3"
            >
              <div className="max-w-5xl mx-auto flex items-center gap-2 md:gap-3 rounded-full border border-[#90E0EF] bg-[#F8FBFF] shadow-sm focus-within:border-[#0077B6] focus-within:shadow-md transition-all h-12 md:h-13 px-2 md:px-3">
                <button
                  type="button"
                  onClick={() =>
                    handleSuggestionClick(
                      suggestions[0] ||
                        'What is the correct corrective action for a critical violation?'
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-[#0077B6] hover:border-[#0077B6]/60 hover:bg-[#EFF6FF] active:scale-[0.95] transition-all"
                  aria-label="Use example question"
                >
                  <span className="text-lg leading-none">+</span>
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask anything about ${COUNTY_LABELS[activeCounty]} regulations…`}
                  className="flex-1 bg-transparent border-none outline-none text-[13px] md:text-[14px] text-slate-800 placeholder-slate-400 h-full px-1"
                />

                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className={classNames(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-[0.95]',
                    input.trim()
                      ? 'bg-[#0077B6] text-white shadow-md hover:bg-[#023E8A]'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
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
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 12h6"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <p className="mt-2 text-[10px] text-center text-slate-400">
                AI generated content. Verify with official county documents before making
                operational decisions.
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* GLOBAL STYLES */}
      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.6);
          border-radius: 999px;
        }

        @keyframes ruminate {
          0% {
            transform: translateY(0) rotate(0deg);
            filter: drop-shadow(0 0 0 rgba(37, 99, 235, 0));
          }
          25% {
            transform: translateY(-1px) rotate(-4deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
            filter: drop-shadow(0 0 4px rgba(37, 99, 235, 0.45));
          }
          75% {
            transform: translateY(1px) rotate(4deg);
          }
          100% {
            transform: translateY(0) rotate(0deg);
            filter: drop-shadow(0 0 0 rgba(37, 99, 235, 0));
          }
        }
      `}</style>
    </div>
  )
}
