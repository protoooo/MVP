'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import SessionGuard from '@/components/SessionGuard'
import Image from 'next/image'

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

  const hasMockAuditAccess = userPlan === 'pro' || userPlan === 'enterprise'

  return (
    // --- MAIN CONTAINER: SUPABASE DARK (#121212) ---
    <div className="fixed inset-0 h-full w-full bg-[#121212] text-[#EDEDED] flex overflow-hidden font-sans selection:bg-[#3ECF8E] selection:text-black">
      
      {/* SESSION GUARD (Logic Unchanged) */}
      {userId && <SessionGuard userId={userId} />}
      
      {/* --- SIDEBAR (Console Style) --- */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-[#1C1C1C] border-r border-[#2C2C2C] shadow-2xl z-30">
        <div className="h-20 flex items-center px-6 border-b border-[#2C2C2C]">
           <div className="text-xl font-bold tracking-tight text-white">
              protocol<span className="text-[#3ECF8E]">LM</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scroll">
          <div>
            <div className="px-2 mb-3 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest">Jurisdiction</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/20 font-mono">CONNECTED</span>
            </div>
            <div className="space-y-1">
              {['washtenaw', 'wayne', 'oakland'].map((county) => {
                const isActive = activeCounty === county
                return (
                  <button
                    key={county}
                    onClick={() => setActiveCounty(county)}
                    className={classNames(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-200 border font-mono',
                      isActive
                        ? 'bg-[#2C2C2C] border-[#3C3C3C] text-white shadow-sm'
                        : 'bg-transparent border-transparent text-[#888] hover:bg-[#232323] hover:text-white'
                    )}
                  >
                    <span>{COUNTY_LABELS[county].toUpperCase()}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] shadow-[0_0_8px_rgba(62,207,142,0.6)]"></div>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1">
             <div className="px-2 mb-3">
                <span className="text-[10px] font-mono font-bold text-[#888] uppercase tracking-widest">Query Logs</span>
             </div>
             {messages.length === 0 ? (
                <div className="px-3 py-6 text-center border border-dashed border-[#3C3C3C] rounded-md bg-[#161616]">
                   <span className="text-[10px] text-[#666] font-mono uppercase">Empty Buffer</span>
                </div>
             ) : (
                <div className="space-y-1">
                  {messages
                    .filter((m) => m.role === 'user')
                    .slice(-6)
                    .reverse()
                    .map((m, idx) => (
                      <div key={idx} className="group relative flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-[#232323] transition-all cursor-default">
                         <div className="mt-1.5 w-1 h-1 rounded-full bg-[#444] group-hover:bg-[#3ECF8E] transition-colors flex-shrink-0"></div>
                         <span className="text-[11px] text-[#AAA] font-mono line-clamp-2 leading-relaxed truncate">
                           {m.content || '[Image Data]'}
                         </span>
                      </div>
                    ))}
                </div>
             )}
          </div>
        </div>

        <div className="p-4 border-t border-[#2C2C2C] bg-[#161616]">
          <div className="flex items-center justify-between gap-3 bg-[#1C1C1C] p-3 rounded-md border border-[#2C2C2C] shadow-sm">
            <div className="flex-1 min-w-0 px-1">
              <p className="text-xs font-bold text-white truncate font-mono">{loadingUser ? 'INITIALIZING...' : 'OPERATOR_ID'}</p>
              <p className="text-[10px] text-[#666] truncate font-mono">{userEmail}</p>
              <p className="text-[9px] text-[#3ECF8E] font-bold uppercase mt-1">{userPlan} TIER</p>
            </div>
            <button onClick={handleSignOut} className="p-2 text-[#666] hover:text-red-400 transition-colors rounded hover:bg-red-500/10" title="Sign Out">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#121212]">
        
        {/* BACKGROUND GRID */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>

        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-[#121212]/80 backdrop-blur-md border-b border-[#2C2C2C] flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
             <div className="lg:hidden text-lg font-bold text-white tracking-tight">protocol<span className="text-[#3ECF8E]">LM</span></div>
             <div className="hidden lg:block">
                <h1 className="text-sm lg:text-base font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                  {COUNTY_LABELS[activeCounty]}
                  <span className="hidden lg:inline-flex w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse shadow-[0_0_8px_rgba(62,207,142,0.6)]"></span>
                </h1>
             </div>
          </div>
          <div className="lg:hidden flex bg-[#232323] p-1 rounded">
              {['washtenaw', 'wayne', 'oakland'].map((county) => (
                  <button key={county} onClick={() => setActiveCounty(county)} className={classNames('w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold transition-all font-mono', activeCounty === county ? 'bg-[#3C3C3C] text-white shadow-sm border border-[#444]' : 'text-[#666]')}>
                      {county.charAt(0).toUpperCase()}
                  </button>
              ))}
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2C2C2C] bg-[#121212] px-4 lg:px-8 z-10">
          <button
            onClick={() => setActiveTab('chat')}
            className={classNames(
              'px-6 py-3 text-xs font-bold transition-colors relative uppercase tracking-wider font-mono',
              activeTab === 'chat'
                ? 'text-[#3ECF8E] border-b-2 border-[#3ECF8E]'
                : 'text-[#666] hover:text-white'
            )}
          >
            Query_Console
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={classNames(
              'px-6 py-3 text-xs font-bold transition-colors relative flex items-center gap-2 uppercase tracking-wider font-mono',
              activeTab === 'audit'
                ? 'text-[#3ECF8E] border-b-2 border-[#3ECF8E]'
                : 'text-[#666] hover:text-white'
            )}
          >
            Audit_Protocol
            {!hasMockAuditAccess && (
              <span className="text-[9px] bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 py-0.5 rounded font-bold border border-[#F59E0B]/30">LOCKED</span>
            )}
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          
          {activeTab === 'chat' ? (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 lg:px-20 py-6 custom-scroll space-y-6 scroll-smooth bg-[#121212]">
                 {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                       <div className="w-16 h-16 bg-[#1C1C1C] border border-[#333] rounded-md shadow-2xl flex items-center justify-center mb-6">
                          <svg className="w-8 h-8 text-[#3ECF8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                       </div>
                       <h2 className="text-xl font-bold text-white mb-2 tracking-tight font-mono">TERMINAL READY</h2>
                       <p className="text-xs text-[#888] max-w-sm text-center mb-8 font-mono">
                          Connected to <span className="text-[#EDEDED]">{COUNTY_LABELS[activeCounty]}</span>. System awaiting input...
                       </p>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                          {suggestions.map((text, idx) => (
                             <button key={idx} onClick={() => handleSuggestionClick(text)} className="text-left p-3 rounded bg-[#1C1C1C] border border-[#333] hover:border-[#3ECF8E] hover:bg-[#232323] transition-all group">
                                <span className="block text-[9px] font-bold text-[#555] group-hover:text-[#3ECF8E] mb-1 font-mono uppercase tracking-wide">Query_{idx + 1}</span>
                                <span className="text-xs text-[#CCC] font-medium leading-relaxed line-clamp-2">{text}</span>
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
                              <span className="text-[10px] font-bold text-[#555] mb-1.5 px-1 uppercase tracking-wider font-mono">
                                 {isUser ? 'USER_INPUT' : 'SYSTEM_RESPONSE'}
                              </span>
                              <div className={classNames('px-5 py-3.5 text-sm leading-7 shadow-sm border', isUser ? 'bg-[#232323] text-white rounded-md border-[#333]' : 'bg-[#161616] text-[#D4D4D4] border-[#2C2C2C] rounded-md')}>
                                {msg.image && (
                                  <img src={msg.image} alt="User Upload" className="mb-3 rounded border border-[#333] max-h-60 w-auto" />
                                )}
                                {isLastAssistant && msg.content === '' ? (
                                  <div className="flex gap-1.5 py-1.5 px-1">
                                    <span className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{animationDelay: '0s'}} />
                                    <span className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{animationDelay: '0.15s'}} />
                                    <span className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{animationDelay: '0.3s'}} />
                                  </div>
                                ) : (
                                  <div className="whitespace-pre-wrap font-mono text-xs md:text-sm">{msg.content}</div>
                                )}
                              </div>
                          </div>
                        </div>
                      )
                    })
                 )}
              </div>

              {/* Fixed Input Bar */}
              <div className="flex-shrink-0 z-20 bg-[#121212]/90 backdrop-blur-xl border-t border-[#2C2C2C] px-4 lg:px-20 pt-4 pb-safe">
                 <div className="max-w-4xl mx-auto relative">
                    
                    {selectedImage && (
                      <div className="absolute -top-24 left-4 p-2 bg-[#1C1C1C] rounded shadow-xl border border-[#333] animate-in fade-in slide-in-from-bottom-2">
                        <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded" />
                        <button 
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-900 text-white rounded-full p-1 hover:bg-red-700 border border-red-500 transition-colors"
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
                            className="p-2 text-[#555] hover:text-[#3ECF8E] hover:bg-[#3ECF8E]/10 rounded transition-all"
                            title="Upload Image"
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
                          placeholder={selectedImage ? "Analyzing artifact..." : `Query ${COUNTY_LABELS[activeCounty]}...`}
                          className="block w-full pl-12 pr-14 py-3.5 bg-[#161616] border border-[#333] rounded-md text-sm text-[#EDEDED] placeholder-[#444] focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/50 transition-all font-mono"
                       />
                       
                       <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                          <button
                            type="submit"
                            disabled={isSending || (!input.trim() && !selectedImage)}
                            className={classNames(
                              'p-2 rounded transition-all duration-200 flex items-center justify-center',
                              (input.trim() || selectedImage)
                                ? 'bg-[#3ECF8E] text-black hover:bg-[#34b27b]'
                                : 'bg-[#222] text-[#444] cursor-not-allowed'
                            )}
                          >
                             {isSending ? (
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
            // MOCK AUDIT VIEW (Dark Mode)
            <div className="flex-1 overflow-y-auto px-4 lg:px-20 py-6 custom-scroll">
              {!hasMockAuditAccess ? (
                <div className="max-w-2xl mx-auto mt-20">
                  <div className="bg-[#1C1C1C] border border-[#333] rounded-md p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-[#232323] rounded-full flex items-center justify-center mx-auto mb-4">
                       <svg className="w-8 h-8 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                       </svg>
                    </div>
                    <h3 className="text-xl font-bold text-[#EDEDED] mb-2 font-mono">RESTRICTED_ACCESS</h3>
                    <p className="text-[#888] mb-8 font-mono text-sm">
                      Upgrade authorization to <strong className="text-[#3ECF8E]">Pro</strong> or <strong className="text-[#3ECF8E]">Enterprise</strong> to unlock Mock Audit workflows.
                    </p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="bg-[#3ECF8E] hover:bg-[#34b27b] text-black px-6 py-2.5 rounded text-sm font-bold transition-colors uppercase tracking-wide font-mono"
                    >
                      View Access Plans
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto">
                  {/* Audit Header */}
                  <div className="bg-[#1C1C1C] rounded-md border border-[#333] p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-white font-mono">AUDIT_LOG</h2>
                        <p className="text-xs text-[#666] mt-1 font-mono uppercase tracking-widest">
                          {COUNTY_LABELS[activeCounty]}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={generateAuditReport}
                          disabled={Object.keys(auditResults).length === 0}
                          className="px-4 py-2 bg-[#3ECF8E] hover:bg-[#34b27b] disabled:bg-[#2C2C2C] disabled:text-[#555] disabled:cursor-not-allowed text-black rounded font-bold text-xs uppercase tracking-wide font-mono transition-colors"
                        >
                          Export Report
                        </button>
                        <button
                          onClick={clearAudit}
                          className="px-4 py-2 bg-[#232323] hover:bg-[#2C2C2C] text-[#CCC] border border-[#333] rounded font-bold text-xs uppercase tracking-wide font-mono transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] font-bold text-[#666] mb-2 font-mono uppercase">
                        <span>Compliance Status</span>
                        <span>
                          {Object.keys(auditResults).length} / {AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)} Checks
                        </span>
                      </div>
                      <div className="w-full bg-[#111] rounded-full h-2 border border-[#222]">
                        <div
                          className="bg-[#3ECF8E] h-full rounded-full transition-all duration-300"
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
                        <div key={category.category} className="bg-[#1C1C1C] rounded-md border border-[#333] overflow-hidden">
                          <button
                            onClick={() => toggleCategory(category.category)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#232323] transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <svg
                                className={classNames(
                                  'w-4 h-4 text-[#444] group-hover:text-[#3ECF8E] transition-all font-mono',
                                  isExpanded ? 'rotate-90' : ''
                                )}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <h3 className="text-sm font-bold text-[#EDEDED] font-mono uppercase tracking-wide">{category.category}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-[#666]">
                                {checkedInCategory}/{categoryItems.length}
                              </span>
                              <div className="w-12 bg-[#111] rounded-full h-1 border border-[#222]">
                                <div
                                  className="bg-[#3ECF8E] h-full rounded-full transition-all"
                                  style={{ width: `${(checkedInCategory / categoryItems.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-[#2C2C2C] bg-[#161616]">
                              {category.items.map((item) => {
                                const status = auditResults[item.id]
                                const note = auditNotes[item.id] || ''
                                const image = auditImages[item.id]

                                return (
                                  <div
                                    key={item.id}
                                    className="px-6 py-4 border-b border-[#222] last:border-b-0"
                                  >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                          <p className="text-[13px] text-[#CCC] font-mono">
                                            {item.label}
                                          </p>
                                          {item.critical && (
                                            <span className="text-[9px] bg-[#7F1D1D] text-[#FCA5A5] px-1.5 py-0.5 rounded border border-[#F87171]/30 font-bold uppercase tracking-wide font-mono">
                                              CRITICAL
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'pass')}
                                          className={classNames(
                                            'px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide font-mono border transition-all',
                                            status === 'pass'
                                              ? 'bg-[#064E3B] text-[#6EE7B7] border-[#34D399]/50'
                                              : 'bg-[#1F1F1F] text-[#666] border-[#333] hover:bg-[#262626]'
                                          )}
                                        >
                                          Pass
                                        </button>
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'fail')}
                                          className={classNames(
                                            'px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide font-mono border transition-all',
                                            status === 'fail'
                                              ? 'bg-[#7F1D1D] text-[#FCA5A5] border-[#F87171]/50'
                                              : 'bg-[#1F1F1F] text-[#666] border-[#333] hover:bg-[#262626]'
                                          )}
                                        >
                                          Fail
                                        </button>
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'na')}
                                          className={classNames(
                                            'px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide font-mono border transition-all',
                                            status === 'na'
                                              ? 'bg-[#374151] text-[#D1D5DB] border-[#6B7280]'
                                              : 'bg-[#1F1F1F] text-[#666] border-[#333] hover:bg-[#262626]'
                                          )}
                                        >
                                          N/A
                                        </button>
                                      </div>
                                    </div>

                                    {/* Photo/Note Area */}
                                    {status && status !== 'na' && (
                                      <div className="mt-3 space-y-2 pl-1">
                                        {image ? (
                                          <div className="relative inline-block group">
                                            <img
                                              src={image}
                                              alt="Audit evidence"
                                              className="h-24 w-auto rounded border border-[#444]"
                                            />
                                            <button
                                              onClick={() => removeAuditImage(item.id)}
                                              className="absolute -top-2 -right-2 bg-red-900 text-white rounded-full p-1 shadow-lg border border-red-500 hover:bg-red-700 transition-colors"
                                            >
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => triggerAuditImageUpload(item.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#262626] border border-[#333] rounded text-[10px] font-mono font-bold text-[#888] hover:text-[#DDD] transition-colors uppercase tracking-wide"
                                          >
                                            + Attach_Evidence
                                          </button>
                                        )}

                                        <textarea
                                          value={note}
                                          onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                          placeholder="Notes / Corrective Actions..."
                                          className="w-full px-3 py-2 text-xs bg-[#0A0A0A] border border-[#333] rounded text-[#CCC] font-mono focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/30 resize-none"
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

      <style jsx global>{`
        .pb-safe { 
           padding-bottom: calc(env(safe-area-inset-bottom) + 20px); 
        }
        /* Custom Scrollbar matching dark theme */
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: #161616; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 0px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #444; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}
