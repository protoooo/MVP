'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

// --- 1. DATA STRUCTURES (Now only functional data remains) ---
// Note: Frontend will now display "N/A" or "0.00" for metrics as data structures were removed.
// When you connect to your backend, these fields will populate.

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

  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
  
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
    setIsMobileChatOpen(false);
  }, [activeCounty])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isMobileChatOpen])

  async function handleSend(e) {
    if (e) e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const newUserMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, newUserMessage])
    setInput('')
    setIsSending(true)

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
    
    if (!isMobileChatOpen) setIsMobileChatOpen(true);


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
  
  // Placeholder Data for Table (Since real data was removed)
  const unitsInActiveCounty = [
    { id: 101, name: 'Unit Alpha', riskScore: 1.2, lastInspection: '95.2%', failureProb: '8%', exposure: '1,500' },
    { id: 102, name: 'Unit Beta', riskScore: 1.9, lastInspection: '88.1%', failureProb: '12%', exposure: '2,100' },
    { id: 201, name: 'Unit Gamma', riskScore: 2.8, lastInspection: '82.5%', failureProb: '18%', exposure: '4,200' },
    { id: 202, name: 'Unit Delta', riskScore: 1.5, lastInspection: '90.9%', failureProb: '10%', exposure: '1,800' },
  ];
  
  // Executive Metrics Placeholder
  const EXECUTIVE_SUMMARY_DATA = {
    projectedAnnualSavings: '48,000',
    currentFranchiseeRiskIndex: 1.83,
    complianceScore: '90.7%',
  };


  // RENDER HELPER FUNCTION for the Input Bar (used in both desktop and mobile layouts)
  const renderInputBar = (isMobileFooter = false) => (
    <div className={classNames(
      "px-4 py-2.5 flex-shrink-0",
      isMobileFooter ? 'bg-white border-t border-slate-200' : 'bg-[#EBF1FF]' // Use lighter color for desktop chat input area
    )}>
      {messages.length === 0 && !isMobileFooter && (
        <div className="mb-2.5 grid grid-cols-1 gap-2">
          {suggestions.slice(0, 2).map((text, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(text)}
              className="group text-left bg-white border border-blue-100 hover:border-blue-400 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium shadow-sm transition-all duration-200 flex items-start gap-2"
            >
              <span className="mt-0.5 text-blue-400 group-hover:text-blue-600 transition-colors text-sm font-bold">
                →
              </span>
              <span className="leading-relaxed group-hover:text-slate-900 line-clamp-2">{text}</span>
            </button>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSend} className="max-w-5xl mx-auto flex items-center gap-2.5 rounded-full border border-blue-200 bg-white focus-within:border-blue-500 focus-within:shadow-lg transition-all h-11 px-3">
        <button
          type="button"
          onClick={() => handleSuggestionClick(suggestions[0] || 'What is the correct corrective action for a critical violation?')}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-blue-500 hover:text-blue-700 hover:bg-blue-100 active:scale-95 transition-all flex-shrink-0"
          aria-label="Use example question"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          type="submit"
          disabled={isSending || !input.trim()}
          className={classNames(
            'flex h-7 w-7 items-center justify-center rounded-full transition-all active:scale-95 flex-shrink-0',
            input.trim()
              ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          )}
          aria-label="Send question"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
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
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
  
  // RENDER HELPER FUNCTION for the Messages (used in both desktop and mobile overlays)
  const renderMessagesPanel = () => (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 custom-scroll min-h-0"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6">
            <div className="w-14 h-14 mb-4 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-base font-bold text-slate-900 mb-1.5">
              Compliance Intelligence Ready
            </p>
            <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
              Get instant, auditable answers to critical regulatory questions.
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
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg/5', // Softer shadow
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-md' // Slightly different corner for user
                      : 'bg-white text-slate-900 rounded-bl-md border border-slate-100' // White background for assistant
                  )}
                >
                  {isLastAssistant && msg.content === '' ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{animationDelay: '0s'}} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{animationDelay: '0.2s'}} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{animationDelay: '0.4s'}} />
                      </div>
                      <span className="text-slate-600 text-xs font-medium">Processing query...</span>
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
  );


  return (
    <div className="h-screen w-full bg-[#F3F6FC] text-slate-900 flex overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR (Updated styling) */}
      <aside className="hidden lg:flex lg:flex-col w-72 border-r border-slate-200 bg-white shadow-2xl/10">
        
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="text-2xl font-extrabold text-slate-900">
            protocol<span className="text-blue-600">LM</span>
          </div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
            EXECUTIVE PLATFORM
          </div>
        </div>

        {/* Jurisdictions */}
        <div className="px-4 py-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3 px-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Active Jurisdiction
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Live Intel</span>
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
                    'w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border-2',
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{COUNTY_LABELS[county]}</span>
                    {isActive && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* History (Updated styling) */}
        <div className="px-6 py-5 flex-1 overflow-hidden">
          <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-3">
            Recent Queries
          </p>
          <div className="text-xs text-slate-600 h-full overflow-y-auto">
            {messages.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                <span className="text-slate-500 text-xs block font-medium">No recent queries</span>
              </div>
            ) : (
              <ul className="space-y-2 max-h-full overflow-y-auto custom-scroll pr-2">
                {messages
                  .filter((m) => m.role === 'user')
                  .slice(-10)
                  .reverse()
                  .map((m, idx) => (
                    <li
                      key={idx}
                      className="cursor-pointer bg-white border border-slate-200 hover:border-blue-400 rounded-xl px-3.5 py-2.5 transition-all duration-150 shadow-sm"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-[10px] text-blue-400 mt-1 font-bold">Q:</span>
                        <span className="text-[11px] text-slate-800 line-clamp-2 leading-relaxed flex-1 font-medium">
                          {m.content}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom User (Updated styling) */}
        <div className="mt-auto border-t border-slate-200 px-6 py-3.5 bg-slate-50">
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-full px-4 py-2.5 shadow-md">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Operator
              </p>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {loadingUser ? 'Loading…' : userEmail || 'Unknown user'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[10px] font-bold text-red-600 hover:text-white transition-colors uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-red-600 border border-red-600"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA: EXECUTIVE DASHBOARD & CHAT TOOL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header (Updated styling) */}
        <header className="w-full border-b border-slate-200 bg-white px-6 lg:px-8 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile logo */}
              <div className="lg:hidden text-base font-bold text-slate-900">
                protocol<span className="text-blue-600">LM</span>
              </div>
              <div className="hidden lg:block">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold text-slate-900">
                    {COUNTY_LABELS[activeCounty]}
                  </h1>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                      Active Monitoring
                    </span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Executive Dashboard: High-Level Compliance and Financial Exposure
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
                      'px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wide',
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-300 hover:border-blue-400'
                    )}
                  >
                    {COUNTY_LABELS[county].split(' ')[0]}
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        {/* CONTENT: TWO PANEL LAYOUT (DASHBOARD & CHAT) */}
        <section className="flex-1 flex px-4 lg:px-6 py-4 gap-4 overflow-hidden min-h-0 lg:pb-4 pb-20"> 

          {/* 1. STRATEGIC DASHBOARD (Executive View - Updated styling) */}
          <div className="flex-1 lg:flex-[3] bg-white rounded-2xl shadow-xl p-7 overflow-y-auto custom-scroll">
            <h2 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight border-b border-blue-500/30 pb-2">
              Operational Metrics Summary
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Critical indicators for franchise health and risk mitigation.
            </p>

            {/* 1.1. Executive Summary / ROI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Card 1: Projected Savings (Money's Worth) */}
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-lg border border-emerald-300/50">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  Projected Annual Savings
                </p>
                <p className="text-3xl font-extrabold text-emerald-900 leading-tight">
                  ${EXECUTIVE_SUMMARY_DATA.projectedAnnualSavings}<span className="text-lg text-emerald-600 font-semibold">+</span>
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  *From mitigated violation losses.*
                </p>
              </div>

              {/* Card 2: Average Compliance Score */}
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg border border-blue-300/50">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">
                  Avg. Inspection Score
                </p>
                <p className="text-3xl font-extrabold text-blue-900 leading-tight">
                  {EXECUTIVE_SUMMARY_DATA.complianceScore}
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Franchisee-wide performance.
                </p>
              </div>

              {/* Card 3: System-Wide Risk Index */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg border border-slate-300/50">
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  System-Wide Risk Index
                </p>
                <p className="text-3xl font-extrabold text-slate-900 leading-tight">
                  {EXECUTIVE_SUMMARY_DATA.currentFranchiseeRiskIndex}
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  Lower score = lower failure probability.
                </p>
              </div>
            </div>

            {/* 1.2. Unit Risk Deep Dive Table (Updated styling) */}
            <h3 className="text-lg font-extrabold text-slate-900 mb-4 border-b border-slate-200 pb-2">
              Unit-Level Financial Risk Overview
            </h3>

            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Unit Name
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Latest Score
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      <span className="text-red-600">Compliance Risk Score</span>
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Potential Loss Exposure
                    </th>
                    <th scope="col" className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {unitsInActiveCounty.map((unit) => (
                    // Logic for risk color remains
                    <tr 
                      key={unit.id} 
                      className={unit.riskScore > 2.0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}
                    >
                      <td className="px-5 py-3 text-sm font-semibold text-slate-900">{unit.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{unit.lastInspection}</td>
                      <td className="px-5 py-3 text-sm font-extrabold" 
                          style={{ color: unit.riskScore > 2.0 ? '#dc2626' : unit.riskScore > 1.5 ? '#f59e0b' : '#10b981' }}>
                        {unit.riskScore}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">
                        ${unit.exposure}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50">
                          View Report →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. COMPLIANCE CHAT (Utility Tool - Desktop Only) */}
          <div className="hidden lg:block lg:flex-[2] max-w-lg flex flex-col">
            <div className="flex-1 bg-[#F5F8FF] rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
              
              {/* Chat Panel Header (Updated styling) */}
              <div className="py-4 px-5 border-b border-blue-200 bg-white">
                <p className="text-[11px] font-extrabold text-blue-700 uppercase tracking-widest">
                  ProtocolLM: Expert Consultation
                </p>
                <p className="text-xs text-slate-500">
                  Real-time guidance for <span className="font-semibold text-slate-700">{COUNTY_LABELS[activeCounty]}</span>
                </p>
              </div>

              {/* Messages Panel */}
              {renderMessagesPanel()}

              {/* INPUT BAR (Desktop version) */}
              {renderInputBar(false)}
            </div>
          </div>
          {/* End Desktop Chat Panel */}

        </section>
        {/* END CONTENT */}
      </main>
      
      {/* MOBILE CHAT HISTORY OVERLAY (Updated styling) */}
      {isMobileChatOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-lg flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-900">
              ProtocolLM Chat
            </h3>
            <button
              onClick={() => setIsMobileChatOpen(false)}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Messages Panel */}
          {renderMessagesPanel()}

          {/* Input Bar is rendered below, outside of this component */}
        </div>
      )}

      {/* FIXED MOBILE FOOTER (Always visible on mobile/tablet screens for action) */}
      <footer className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-white shadow-2xl/50">
        {/* Show a button to open chat history if the history is empty */}
        {messages.length === 0 && (
          <div className="px-4 pt-2.5">
            <button
              onClick={() => setIsMobileChatOpen(true)}
              className="w-full text-center bg-blue-50 border border-blue-300 text-blue-700 rounded-xl text-xs font-semibold py-2 mb-2 hover:bg-blue-100 transition-all"
            >
              Consult ProtocolLM Assistant
            </button>
          </div>
        )}
        
        {/* If chat history exists, show the input bar directly */}
        {renderInputBar(true)}

        {/* Action Button for Chat Overlay (when messages exist) */}
        {messages.length > 0 && !isMobileChatOpen && (
          <div className="px-4 pb-2.5 pt-1">
            <button
              onClick={() => setIsMobileChatOpen(true)}
              className="w-full text-center bg-blue-600 text-white rounded-xl text-xs font-semibold py-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/50"
            >
              View Conversation ({messages.filter(m => m.role === 'user').length} queries)
            </button>
          </div>
        )}
      </footer>

      {/* Style block remains the same */}
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
