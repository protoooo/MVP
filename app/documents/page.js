'use client'

import { useState, useEffect, useRef } from 'react'

// ---- CONFIGURATION ----

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County',
}

const SUGGESTED_QUERIES = {
  washtenaw: [
    'Inspector wrote us up for a repeat cooling violation. What do we need to change before they come back?',
    'We had a minor sewage backup under the dish machine. Do we have to close the store?',
    'My line cook came in with diarrhea but says it\'s from “bad takeout”. Can they work today?',
    'How should we document corrective action so the next inspection report looks clean?',
  ],
  wayne: [
    'We just got a complaint about undercooked chicken on DoorDash. What steps should we take in Wayne County?',
    'Our certified manager quit and we don’t have a replacement yet. What are we required to do?',
    'What exactly triggers an “imminent health hazard” closure for this county?',
    'How much trouble are we in if we failed to date mark prep from yesterday?',
  ],
  oakland: [
    'If our mall location fails its next inspection, what happens to our license and how fast?',
    'What is the correct two-step cooling process for chili in Oakland County?',
    'We found mouse droppings on a shelf before opening. Can we still operate today?',
    'What should my managers do the week before a scheduled inspection to protect our grade?',
  ],
}

// ---- SMALL ICON COMPONENTS ----

function GlobeIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        className="fill-none stroke-current"
        strokeWidth="1.6"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4.5"
        ry="9"
        className="fill-none stroke-current"
        strokeWidth="1.6"
      />
      <path
        d="M3 12h18M12 3c2.5 2 3.8 4.4 3.8 7s-1.3 5-3.8 7c-2.5-2-3.8-4.4-3.8-7s1.3-5 3.8-7Z"
        className="fill-none stroke-current"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M12 5v14M5 12h14"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M5 12h12M13 6l6 6-6 6"
        className="stroke-current"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---- MAIN PAGE ----

export default function DocumentsPage() {
  const [activeCounty, setActiveCounty] = useState('oakland')
  const [messages, setMessages] = useState([]) // {role: 'user' | 'assistant', content: string}[]
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, isSending])

  const handleSend = async (textOverride) => {
    const trimmed = (textOverride ?? inputValue).trim()
    if (!trimmed || isSending) return

    // push user message
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInputValue('')
    setIsSending(true)

    try {
      // TODO: replace this with your real API / streaming logic
      // Example:
      // const res = await fetch('/api/query', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     county: activeCounty,
      //     question: trimmed,
      //     history: messages,
      //   }),
      // })
      // const data = await res.json()
      // const answer = data.answer ?? 'No answer returned.'

      const fakeAnswer =
        'This is a placeholder response. Paste your real protocolLM API call into handleSend so franchisees see county-specific guidance here.'

      const answer = fakeAnswer

      setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry — something went wrong while contacting protocolLM. Please try again, or check your connection.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSuggestionClick = (q) => {
    handleSend(q)
  }

  const currentSuggestions = SUGGESTED_QUERIES[activeCounty] || []

  return (
    <div className="min-h-screen flex bg-[#F3F6FB] text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 bg-[#F8FAFF] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="text-[22px] font-bold tracking-tight text-[#023E8A]">
            protocol<span className="text-[#0077B6]">LM</span>
          </div>
        </div>

        <div className="px-6 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
            Jurisdiction
          </p>
          <div className="space-y-2">
            {(['washtenaw', 'wayne', 'oakland'] as const).map((county) => {
              const isActive = activeCounty === county
              return (
                <button
                  key={county}
                  type="button"
                  onClick={() => setActiveCounty(county)}
                  className={`w-full text-left text-sm font-semibold px-3 py-2 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-[#EEF3FF] border-[#CBD5FF] text-[#1D2A5B]'
                      : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  {COUNTY_NAMES[county]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-6 pt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
            History
          </p>
          {messages.length === 0 ? (
            <p className="text-xs text-slate-400 leading-relaxed">
              No questions yet. Your first inquiry will appear here.
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Session in progress. (You can wire this to your real history list.)
            </p>
          )}
        </div>

        <div className="mt-auto px-6 py-4 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Signed in</span>
          {/* You can replace this with real email / query count */}
          <span className="font-semibold">protocolLM user</span>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="px-6 md:px-10 py-4 md:py-5 border-b border-slate-200 bg-[#FDFEFF] flex items-center justify-between">
          <div>
            <div className="text-sm md:text-base font-semibold text-slate-900">
              {COUNTY_NAMES[activeCounty]}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-semibold text-emerald-700">
                Database Active
              </span>
            </div>
          </div>
        </header>

        {/* Conversation */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 md:px-10 pt-4 md:pt-6 pb-32">
            {/* System ready line */}
            <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-700 mb-4">
              <GlobeIcon className="w-4 h-4 md:w-5 md:h-5 text-[#0077B6]" />
              <span>
                You’re in the {COUNTY_NAMES[activeCounty]} compliance channel. Ask how to
                handle violations, closures, or inspection findings for this county.
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-4 md:space-y-5">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user'
                if (isUser) {
                  return (
                    <div key={index} className="flex justify-end">
                      <div className="max-w-xl rounded-2xl rounded-tr-md bg-[#0077B6] text-white px-4 md:px-5 py-3 md:py-3.5 text-sm md:text-[15px] leading-relaxed shadow-md">
                        {msg.content}
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={index}
                    className="flex items-start gap-2 md:gap-3 max-w-3xl"
                  >
                    <div className="mt-1">
                      <GlobeIcon className="w-4 h-4 md:w-5 md:h-5 text-[#0077B6]" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-md bg-white border border-slate-200 px-4 md:px-5 py-3 md:py-3.5 text-sm md:text-[15px] leading-relaxed text-slate-800 shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                )
              })}

              {isSending && (
                <div className="flex items-start gap-2 md:gap-3 max-w-3xl">
                  <div className="mt-1">
                    <GlobeIcon className="w-4 h-4 md:w-5 md:h-5 text-[#0077B6]" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-2 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '120ms' }}
                    ></span>
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '240ms' }}
                    ></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {currentSuggestions.length > 0 && (
              <div className="mt-8 max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-3">
                  Try questions your managers actually ask
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {currentSuggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSuggestionClick(q)}
                      className="px-4 py-3 rounded-2xl bg-[#F3F6FF] hover:bg-[#E5EBFF] text-[12px] md:text-[13px] text-slate-800 border border-[#CBD5FF] shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-[1px] active:scale-95 text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-[#F8FAFF]/95 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-4 md:px-6 pt-3 pb-2">
              <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-full h-14 px-3 md:px-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                <button
                  type="button"
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
                  aria-label="New inquiry"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={`Ask anything about ${COUNTY_NAMES[activeCounty]} regulations…`}
                  className="flex-1 bg-transparent border-none outline-none text-sm md:text-[15px] text-slate-800 placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isSending}
                  className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all ${
                    !inputValue.trim() || isSending
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#0077B6] text-white hover:bg-[#023E8A] shadow-md hover:shadow-lg active:scale-95'
                  }`}
                  aria-label="Send"
                >
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-2 text-[10px] text-center text-slate-400">
                AI generated content. Verify with official {COUNTY_NAMES[activeCounty]} documents.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
