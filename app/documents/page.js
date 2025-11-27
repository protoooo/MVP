'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

// --- CONFIGURATION ---
const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const COUNTY_TAGLINES = {
  washtenaw: 'Database Active',
  wayne: 'Database Active',
  oakland: 'Database Active'
}

const COUNTY_PLACEHOLDERS = {
  washtenaw: 'Ask anything about Washtenaw County regulations…',
  wayne: 'Ask anything about Wayne County regulations…',
  oakland: 'Ask anything about Oakland County regulations…'
}

const SUGGESTED_QUERIES = {
  washtenaw: [
    'Cooling requirements',
    'Corrective action for repeat violations',
    'Employee illness reporting',
    'Date marking rules'
  ],
  wayne: [
    'Cooling requirements',
    'Employee health policy',
    'Pest control action',
    'Sewage backup procedures'
  ],
  oakland: [
    'Cooling requirements',
    'Employee health',
    'Pest control action',
    'Date marking rules'
  ]
}

// Helper: call your backend agent API
async function callAgent({ county, message, signal }) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ county, message })
  })

  if (!res.ok) {
    throw new Error('Something went wrong. Please try again.')
  }

  const data = await res.json()
  return data.answer || 'No answer returned from agent.'
}

export default function DocumentsPage() {
  const [activeCounty, setActiveCounty] = useState('oakland')
  const [messagesByCounty, setMessagesByCounty] = useState({
    washtenaw: [],
    wayne: [],
    oakland: []
  })
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [systemReadyShown, setSystemReadyShown] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [queryCount, setQueryCount] = useState(null)

  const scrollRef = useRef(null)
  const abortRef = useRef(null)

  const supabase = createClient()
  const router = useRouter()

  // Load user info / query count
  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!isMounted) return

        const email = userData?.user?.email || ''
        setUserEmail(email)

        if (!userData?.user?.id) return

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('query_count')
          .eq('id', userData.user.id)
          .single()

        if (profile && typeof profile.query_count === 'number') {
          setQueryCount(profile.query_count)
        }
      } catch (err) {
        console.error(err)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [supabase])

  // Auto-scroll conversation
  useEffect(() => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    container.scrollTop = container.scrollHeight
  }, [messagesByCounty, activeCounty, isThinking])

  const currentMessages = messagesByCounty[activeCounty] || []

  const handleCountyChange = (county) => {
    setActiveCounty(county)
    setInputValue('')
    setSystemReadyShown(true)
  }

  const handleSuggestionClick = (text) => {
    setInputValue(text)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || isThinking) return

    // Cancel in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    const newUserMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: trimmed
    }

    setMessagesByCounty((prev) => ({
      ...prev,
      [activeCounty]: [...(prev[activeCounty] || []), newUserMessage]
    }))

    setInputValue('')
    setIsThinking(true)
    setSystemReadyShown(false)

    try {
      const answer = await callAgent({
        county: activeCounty,
        message: trimmed,
        signal: controller.signal
      })

      const newAssistantMessage = {
        id: Date.now() + '-assistant',
        role: 'assistant',
        content: answer
      }

      setMessagesByCounty((prev) => ({
        ...prev,
        [activeCounty]: [...(prev[activeCounty] || []), newAssistantMessage]
      }))
    } catch (err) {
      if (err.name === 'AbortError') return

      const errorMessage = {
        id: Date.now() + '-error',
        role: 'assistant',
        content:
          'There was a problem getting a response. Please verify your connection and try again.'
      }

      setMessagesByCounty((prev) => ({
        ...prev,
        [activeCounty]: [...(prev[activeCounty] || []), errorMessage]
      }))
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F9FC] text-slate-900 flex">
      {/* LEFT SIDEBAR */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="px-6 pt-6 pb-4">
          <div className="text-xl font-bold tracking-tight text-[#023E8A]">
            protocol<span className="text-[#0077B6]">LM</span>
          </div>
        </div>

        <div className="px-6 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Jurisdiction
        </div>

        <div className="px-4 space-y-1">
          {Object.keys(COUNTY_NAMES).map((key) => (
            <button
              key={key}
              onClick={() => handleCountyChange(key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                activeCounty === key
                  ? 'bg-white text-[#023E8A] border-slate-200 shadow-sm shadow-slate-200/70 hover:bg-white active:scale-[0.97]'
                  : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-50 active:scale-[0.97]'
              }`}
            >
              {COUNTY_NAMES[key]}
            </button>
          ))}
        </div>

        <div className="px-6 pt-8 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          History
        </div>

        <div className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto">
          {currentMessages
            .filter((m) => m.role === 'user')
            .slice(-6)
            .reverse()
            .map((m) => (
              <div
                key={m.id}
                className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 line-clamp-2"
              >
                {m.content}
              </div>
            ))}

          {currentMessages.filter((m) => m.role === 'user').length === 0 && (
            <div className="text-[11px] text-slate-400 italic">
              No questions yet. Your first inquiry will appear here.
            </div>
          )}
        </div>

        {/* Account card */}
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-700 truncate">
                {userEmail || 'Signed in'}
              </span>
              {queryCount !== null && (
                <span className="text-[11px] text-slate-400">
                  {queryCount} queries used
                </span>
              )}
            </div>
            <button
              onClick={() => router.push('/billing')}
              className="text-[11px] font-semibold text-[#0077B6] hover:text-[#023E8A] active:scale-95 transition-transform"
            >
              Billing
            </button>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/')
            }}
            className="mt-3 text-[11px] text-slate-400 hover:text-red-500 active:scale-95 transition-transform"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="px-4 md:px-10 pt-4 md:pt-6 pb-3 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="md:hidden text-lg font-bold tracking-tight text-[#023E8A]">
              protocol<span className="text-[#0077B6]">LM</span>
            </div>
            <div>
              <div className="text-sm md:text-base font-semibold text-slate-800">
                {COUNTY_NAMES[activeCounty]}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-600">
                  {COUNTY_TAGLINES[activeCounty]}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Conversation area */}
        <div className="flex-1 flex flex-col px-4 md:px-10 pt-4 md:pt-8 pb-28 md:pb-32 bg-gradient-to-br from-[#F5F9FC] via-[#F7FBFF] to-[#EEF4FB]">
          {/* System ready line */}
          {systemReadyShown && currentMessages.length === 0 && (
            <div className="max-w-3xl mx-auto md:mx-0 md:ml-8 mb-4 md:mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <GlobeIcon className="w-4 h-4 text-[#0077B6]" />
                <span>
                  System ready. Regulatory Intelligence active for{' '}
                  {COUNTY_NAMES[activeCounty]}.
                </span>
              </div>
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto max-w-3xl mx-auto md:mx-0 md:ml-8 space-y-4 md:space-y-5 pr-1"
          >
            {currentMessages.length === 0 && !isThinking && !systemReadyShown && (
              <div className="text-sm text-slate-400 mt-10">
                Start by asking a question or choose a preset below.
              </div>
            )}

            {currentMessages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-xl rounded-2xl rounded-br-sm bg-[#0077B6] text-white text-sm px-4 py-3 shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    <GlobeIcon className="w-4 h-4 text-[#0077B6]" />
                  </div>
                  <div className="max-w-xl rounded-2xl rounded-tl-sm bg-white text-sm text-slate-800 px-4 py-3 shadow-sm border border-slate-100">
                    {msg.content}
                  </div>
                </div>
              )
            })}

            {isThinking && (
              <div className="flex items-center gap-3 mt-2">
                <div className="mt-1">
                  <GlobeIcon className="w-4 h-4 text-[#0077B6]" />
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-100 rounded-full px-3 py-2 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0077B6] animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#0077B6] animate-bounce"
                    style={{ animationDelay: '80ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#0077B6] animate-bounce"
                    style={{ animationDelay: '160ms' }}
                  />
                  <span className="text-[11px] text-slate-500 font-medium ml-1 hidden md:inline">
                    Reviewing county code & FDA Food Code…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Suggested queries */}
          <div className="max-w-3xl mx-auto md:mx-0 md:ml-8 mt-6 flex flex-wrap gap-3">
            {SUGGESTED_QUERIES[activeCounty].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSuggestionClick(q)}
                className="px-4 py-2 rounded-full bg-white/80 hover:bg-white text-xs md:text-[13px] text-slate-600 border border-slate-100 shadow-sm hover:-translate-y-[1px] hover:shadow-md active:scale-95 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom input bar */}
        <form
          onSubmit={handleSubmit}
          className="fixed left-0 right-0 bottom-0 z-20 bg-gradient-to-t from-[#F5F9FC] to-[#F5F9FC]/90 border-t border-slate-100 px-3 md:px-10 py-3 md:py-4"
        >
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)] px-3 md:px-4 py-1.5 md:py-2">
              <button
                type="button"
                onClick={() => {
                  setMessagesByCounty((prev) => ({
                    ...prev,
                    [activeCounty]: []
                  }))
                  setSystemReadyShown(true)
                  setInputValue('')
                }}
                className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 text-lg leading-none transition-all active:scale-95"
              >
                +
              </button>

              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                rows={1}
                placeholder={COUNTY_PLACEHOLDERS[activeCounty]}
                className="flex-1 resize-none border-none outline-none text-sm md:text-[15px] text-slate-800 placeholder:text-slate-400 bg-transparent py-1 md:py-1.5 px-1 leading-[1.35]"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isThinking}
                className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all ${
                  inputValue.trim() && !isThinking
                    ? 'bg-[#0077B6] text-white shadow-md hover:bg-[#023E8A] active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-default'
                }`}
              >
                <span className="sr-only">Send</span>
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h13" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 text-center md:text-left px-1">
              AI generated content. Verify with official {COUNTY_NAMES[activeCounty]} documents.
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

// Simple globe icon
function GlobeIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4a9 9 0 0 1 0 16" />
      <path d="M12 4a9 9 0 0 0 0 16" />
    </svg>
  )
}
