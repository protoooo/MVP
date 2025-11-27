'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import SessionGuard from '@/components/SessionGuard'

// --- CONSTANTS ---
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

// --- MOCK AUDIT CHECKLIST ---
const AUDIT_CHECKLIST = [
  {
    category: 'Temperature Control',
    items: [
      { id: 'cold_holding', label: 'Cold holding at 41°F or below', critical: true },
      { id: 'hot_holding', label: 'Hot holding at 135°F or above', critical: true },
      { id: 'cooking_temps', label: 'Proper cooking temperatures documented', critical: true },
      { id: 'cooling', label: 'Cooling procedures (135°F to 70°F in 2hrs, 70°F to 41°F in 4hrs)', critical: true },
      { id: 'thermometers', label: 'Calibrated thermometers available and used', critical: false }
    ]
  },
  {
    category: 'Personal Hygiene',
    items: [
      { id: 'handwashing', label: 'Handwashing sinks accessible and stocked', critical: true },
      { id: 'hand_antiseptic', label: 'Hand antiseptic used properly (after washing)', critical: false },
      { id: 'no_bare_hand', label: 'No bare hand contact with ready-to-eat foods', critical: true },
      { id: 'hair_restraints', label: 'Hair restraints worn properly', critical: false },
      { id: 'jewelry', label: 'No jewelry on hands/arms (except plain band)', critical: false }
    ]
  },
  {
    category: 'Cross Contamination',
    items: [
      { id: 'storage_separation', label: 'Raw meats stored below ready-to-eat foods', critical: true },
      { id: 'cutting_boards', label: 'Color-coded cutting boards used correctly', critical: false },
      { id: 'wiping_cloths', label: 'Wiping cloths stored in sanitizer (200ppm chlorine)', critical: false },
      { id: 'equipment_cleaning', label: 'Food contact surfaces cleaned and sanitized', critical: true }
    ]
  },
  {
    category: 'Facility & Equipment',
    items: [
      { id: 'three_comp_sink', label: '3-compartment sink setup correct (wash-rinse-sanitize)', critical: true },
      { id: 'dishwasher', label: 'Dish machine reaching proper temps (150°F wash, 180°F rinse)', critical: true },
      { id: 'water_pressure', label: 'Adequate water pressure and hot water supply', critical: true },
      { id: 'floors_walls', label: 'Floors, walls, ceilings clean and in good repair', critical: false },
      { id: 'pest_control', label: 'No evidence of pests, pest control logs available', critical: true }
    ]
  },
  {
    category: 'Food Safety Management',
    items: [
      { id: 'certified_manager', label: 'Certified Food Safety Manager on staff', critical: true },
      { id: 'date_marking', label: 'Ready-to-eat PHF foods properly date marked', critical: true },
      { id: 'allergen_awareness', label: 'Allergen procedures documented and followed', critical: false },
      { id: 'employee_illness', label: 'Employee illness policy posted and enforced', critical: true },
      { id: 'haccp_logs', label: 'Temperature logs, cleaning logs maintained', critical: false }
    ]
  }
]

function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

export default function DocumentsPage() {
  const router = useRouter()
  const supabase = createClient()

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('chat') // 'chat' or 'audit'
  const [activeCounty, setActiveCounty] = useState('washtenaw')
  const [systemStatus, setSystemStatus] = useState('System ready.')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  // Image State
  const [selectedImage, setSelectedImage] = useState(null)
  
  // User State
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState(null)
  const [userPlan, setUserPlan] = useState('starter')
  const [loadingUser, setLoadingUser] = useState(true)

  // Mock Audit State
  const [auditResults, setAuditResults] = useState({})
  const [auditNotes, setAuditNotes] = useState({})
  const [auditImages, setAuditImages] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const auditImageInputRef = useRef(null)
  const [currentAuditImageItem, setCurrentAuditImageItem] = useState(null)

  // --- EFFECTS ---
  useEffect(() => {
    let cancelled = false
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/')
          return
        }
        if (!cancelled) {
          setUserEmail(user.email || '')
          setUserId(user.id)
          
          // Get user plan
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan')
            .eq('user_id', user.id)
            .single()
          
          if (sub?.plan) {
            setUserPlan(sub.plan)
          }
        }
      } catch (err) {
        console.error('Error loading user', err)
      } finally {
        if (!cancelled) setLoadingUser(false)
      }
    }
    loadUser()
    return () => { cancelled = true }
  }, [router, supabase])

  useEffect(() => {
    setSystemStatus(`System ready. ${COUNTY_STATUS[activeCounty] || ''}`)
    setMessages([])
    setSelectedImage(null)
  }, [activeCounty])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // --- HANDLERS ---

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeImage = () => {
    setSelectedImage(null)
  }

  const handleAuditImageSelect = (e) => {
    const file = e.target.files[0]
    if (file && currentAuditImageItem) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAuditImages(prev => ({
          ...prev,
          [currentAuditImageItem]: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
    setCurrentAuditImageItem(null)
  }

  const triggerAuditImageUpload = (itemId) => {
    setCurrentAuditImageItem(itemId)
    auditImageInputRef.current?.click()
  }

  const removeAuditImage = (itemId) => {
    setAuditImages(prev => {
      const newImages = { ...prev }
      delete newImages[itemId]
      return newImages
    })
  }

  async function handleSend(e) {
    if (e) e.preventDefault()
    
    const trimmed = input.trim()
    if ((!trimmed && !selectedImage) || isSending) return

    const newUserMessage = { 
      role: 'user', 
      content: trimmed,
      image: selectedImage 
    }
    
    setMessages((prev) => [...prev, newUserMessage])
    setInput('')
    const imageToSend = selectedImage 
    setSelectedImage(null) 
    setIsSending(true)

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMessage], 
          image: imageToSend, 
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
      const replyText = data?.message || 'Response received, but in an unexpected format.'

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

  const handleAuditChange = (itemId, status) => {
    setAuditResults(prev => ({
      ...prev,
      [itemId]: status
    }))
  }

  const handleNoteChange = (itemId, note) => {
    setAuditNotes(prev => ({
      ...prev,
      [itemId]: note
    }))
  }

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const generateAuditReport = () => {
    const totalItems = AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)
    const completedItems = Object.keys(auditResults).length
    const passedItems = Object.values(auditResults).filter(v => v === 'pass').length
    const failedItems = Object.values(auditResults).filter(v => v === 'fail').length
    const criticalFails = AUDIT_CHECKLIST.flatMap(cat => cat.items)
      .filter(item => item.critical && auditResults[item.id] === 'fail').length

    let report = `MOCK AUDIT REPORT - ${COUNTY_LABELS[activeCounty]}\n`
    report += `Generated: ${new Date().toLocaleString()}\n`
    report += `\n========================================\n\n`
    report += `SUMMARY:\n`
    report += `- Total Items Checked: ${completedItems}/${totalItems}\n`
    report += `- Passed: ${passedItems}\n`
    report += `- Failed: ${failedItems}\n`
    report += `- Critical Violations: ${criticalFails}\n`
    report += `\n========================================\n\n`

    AUDIT_CHECKLIST.forEach(category => {
      report += `\n${category.category.toUpperCase()}:\n`
      category.items.forEach(item => {
        const status = auditResults[item.id] || 'not checked'
        const note = auditNotes[item.id] || ''
        const hasImage = !!auditImages[item.id]
        const critical = item.critical ? ' [CRITICAL]' : ''
        report += `\n  ${item.label}${critical}\n`
        report += `  Status: ${status.toUpperCase()}\n`
        if (hasImage) report += `  Photo: Attached\n`
        if (note) report += `  Notes: ${note}\n`
      })
    })

    report += `\n========================================\n`
    report += `\nRECOMMENDATIONS:\n`
    if (criticalFails > 0) {
      report += `- URGENT: Address ${criticalFails} critical violation(s) immediately\n`
    }
    if (failedItems > 0) {
      report += `- Review and correct ${failedItems} failed item(s)\n`
    }
    if (completedItems === totalItems && failedItems === 0) {
      report += `- Excellent! All items passed. Continue current practices.\n`
    }

    // Download as text file
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mock-audit-${activeCounty}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearAudit = () => {
    if (confirm('Clear all audit data? This cannot be undone.')) {
      setAuditResults({})
      setAuditNotes({})
      setAuditImages({})
      setExpandedCategories({})
    }
  }

  const suggestions = COUNTY_SUGGESTIONS[activeCounty] || []

  // Check if user has access to Mock Audit
  const hasMockAuditAccess = userPlan === 'pro' || userPlan === 'enterprise'

  return (
    <div className="fixed inset-0 h-full w-full bg-[#F8FAFC] text-slate-900 flex overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* SESSION GUARD */}
      {userId && <SessionGuard userId={userId} />}
      
      {/* --- SIDEBAR (Desktop) --- */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
           <div className="text-2xl font-bold text-slate-900 tracking-tight">
              protocol<span className="text-blue-600">LM</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scroll">
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
                         <span className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                           {m.content || '[Image Analysis]'}
                         </span>
                      </div>
                    ))}
                </div>
             )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-0 px-1">
              <p className="text-xs font-bold text-slate-900 truncate">{loadingUser ? 'Loading...' : 'Operator'}</p>
              <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
              <p className="text-[9px] text-blue-600 font-bold uppercase mt-0.5">{userPlan} Plan</p>
            </div>
            <button onClick={handleSignOut} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50" title="Sign Out">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white lg:bg-[#F8FAFC]">
        
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
             <div className="lg:hidden text-lg font-bold text-slate-900 tracking-tight">protocol<span className="text-blue-600">LM</span></div>
             <div className="hidden lg:block">
                <h1 className="text-sm lg:text-base font-bold text-slate-900 flex items-center gap-2">
                  {COUNTY_LABELS[activeCounty]}
                  <span className="hidden lg:inline-flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">Verified Regulatory Intelligence Platform</p>
             </div>
          </div>
          <div className="lg:hidden flex bg-slate-100 p-1 rounded-lg">
              {['washtenaw', 'wayne', 'oakland'].map((county) => (
                  <button key={county} onClick={() => setActiveCounty(county)} className={classNames('w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-all', activeCounty === county ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                      {county.charAt(0).toUpperCase()}
                  </button>
              ))}
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 lg:px-8 z-10">
          <button
            onClick={() => setActiveTab('chat')}
            className={classNames(
              'px-6 py-3 text-sm font-bold transition-colors relative',
              activeTab === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={classNames(
              'px-6 py-3 text-sm font-bold transition-colors relative flex items-center gap-2',
              activeTab === 'audit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Mock Audit
            {!hasMockAuditAccess && (
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">PRO</span>
            )}
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {activeTab === 'chat' ? (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 lg:px-20 py-6 custom-scroll space-y-6 scroll-smooth">
                 {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                       <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6">
                          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                       </div>
                       <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Protocol Compliance</h2>
                       <p className="text-sm text-slate-500 max-w-sm text-center mb-8">
                          Authorized documentation loaded for <span className="font-semibold text-slate-700">{COUNTY_LABELS[activeCounty]}</span>. Ask specific regulatory questions or upload an inspection photo.
                       </p>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                          {suggestions.map((text, idx) => (
                             <button key={idx} onClick={() => handleSuggestionClick(text)} className="text-left p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
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
                        <div key={idx} className={classNames('flex w-full animate-fadeIn', isUser ? 'justify-end' : 'justify-start')}>
                          <div className={classNames("flex flex-col max-w-[85%] lg:max-w-[70%]", isUser ? "items-end" : "items-start")}>
                              <span className="text-[10px] font-bold text-slate-400 mb-1.5 px-1 uppercase tracking-wider">
                                 {isUser ? 'You' : 'ProtocolLM'}
                              </span>
                              <div className={classNames('px-5 py-3.5 text-sm leading-7 shadow-sm', isUser ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm')}>
                                {msg.image && (
                                  <img src={msg.image} alt="User Upload" className="mb-3 rounded-lg border border-white/20 max-h-60 w-auto" />
                                )}
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
              <div className="flex-shrink-0 z-20 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 lg:px-20 pt-4 pb-safe">
                 <div className="max-w-4xl mx-auto relative">
                    
                    {selectedImage && (
                      <div className="absolute -top-24 left-4 p-2 bg-white rounded-xl shadow-lg border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                        <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg" />
                        <button 
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSend} className="relative group">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageSelect}
                          />
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Upload Image for Analysis"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                       </div>
                       
                       <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={isSending}
                          placeholder={selectedImage ? "Describe what we're looking at..." : `Ask about ${COUNTY_LABELS[activeCounty]} regulations...`}
                          className="block w-full pl-12 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                       />
                       
                       <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <button
                            type="submit"
                            disabled={isSending || (!input.trim() && !selectedImage)}
                            className={classNames(
                              'p-2 rounded-lg transition-all duration-200 flex items-center justify-center',
                              (input.trim() || selectedImage)
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
            </>
          ) : (
            // MOCK AUDIT VIEW
            <div className="flex-1 overflow-y-auto px-4 lg:px-20 py-6 custom-scroll">
              {!hasMockAuditAccess ? (
                <div className="max-w-2xl mx-auto mt-20">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center">
                    <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="text-2xl font-bold text-amber-900 mb-2">Mock Audit Feature</h3>
                    <p className="text-amber-800 mb-6">
                      Upgrade to <strong>Pro</strong> or <strong>Enterprise</strong> to access the Mock Audit workflow.
                    </p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                    >
                      View Pricing Plans
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto">
                  {/* Audit Header */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">Mock Inspection Audit</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {COUNTY_LABELS[activeCounty]} - Self-Assessment Checklist
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={generateAuditReport}
                          disabled={Object.keys(auditResults).length === 0}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-colors"
                        >
                          Generate Report
                        </button>
                        <button
                          onClick={clearAudit}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                        <span>Progress</span>
                        <span>
                          {Object.keys(auditResults).length} / {AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)} items checked
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(Object.keys(auditResults).length / AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checklist Categories */}
                  <input type="file" ref={auditImageInputRef} className="hidden" accept="image/*" onChange={handleAuditImageSelect} />
                  
                  <div className="space-y-4">
                    {AUDIT_CHECKLIST.map((category) => {
                      const isExpanded = expandedCategories[category.category] !== false
                      const categoryItems = category.items
                      const checkedInCategory = categoryItems.filter(item => auditResults[item.id]).length
                      
                      return (
                        <div key={category.category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <button
                            onClick={() => toggleCategory(category.category)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <svg
                                className={classNames(
                                  'w-5 h-5 text-slate-400 transition-transform',
                                  isExpanded ? 'rotate-90' : ''
                                )}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <h3 className="text-lg font-bold text-slate-900">{category.category}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-500">
                                {checkedInCategory} / {categoryItems.length}
                              </span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${(checkedInCategory / categoryItems.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-slate-100">
                              {category.items.map((item) => {
                                const status = auditResults[item.id]
                                const note = auditNotes[item.id] || ''
                                const image = auditImages[item.id]

                                return (
                                  <div
                                    key={item.id}
                                    className="px-6 py-4 border-b border-slate-50 last:border-b-0"
                                  >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-sm font-medium text-slate-900">
                                            {item.label}
                                          </p>
                                          {item.critical && (
                                            <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">
                                              Critical
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'pass')}
                                          className={classNames(
                                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                                            status === 'pass'
                                              ? 'bg-green-600 text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-green-50'
                                          )}
                                        >
                                          Pass
                                        </button>
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'fail')}
                                          className={classNames(
                                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                                            status === 'fail'
                                              ? 'bg-red-600 text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-red-50'
                                          )}
                                        >
                                          Fail
                                        </button>
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'na')}
                                          className={classNames(
                                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                                            status === 'na'
                                              ? 'bg-slate-600 text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          )}
                                        >
                                          N/A
                                        </button>
                                      </div>
                                    </div>

                                    {/* Photo Upload */}
                                    {status && status !== 'na' && (
                                      <div className="mt-3 space-y-2">
                                        {image ? (
                                          <div className="relative inline-block">
                                            <img
                                              src={image}
                                              alt="Audit evidence"
                                              className="h-32 w-auto rounded-lg border-2 border-slate-200"
                                            />
                                            <button
                                              onClick={() => removeAuditImage(item.id)}
                                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                            >
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => triggerAuditImageUpload(item.id)}
                                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Add Photo
                                          </button>
                                        )}

                                        <textarea
                                          value={note}
                                          onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                          placeholder="Add notes or corrective actions..."
                                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                          rows={2}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Styles */}
      <style jsx global>{`
        .pb-safe { 
           padding-bottom: calc(env(safe-area-inset-bottom) + 20px); 
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  )
}
