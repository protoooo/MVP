'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// County-specific document configurations
const COUNTY_DOCUMENTS = {
  washtenaw: [
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
    { title: 'Cooling Foods', filename: 'Cooling Foods.pdf' },
    { title: 'Cross Contamination', filename: 'Cross contamination.pdf' },
    { title: 'Enforcement Action Guide', filename: 'Enforcement Action | Washtenaw County, MI.pdf' },
    { title: 'Food Allergy Info', filename: 'Food Allergy Information | Washtenaw County, MI.pdf' },
    { title: 'Inspection Program', filename: 'Food Service Inspection Program | Washtenaw County, MI.pdf' },
    { title: 'Foodborne Illness Guide', filename: 'Food borne illness guide.pdf' },
    { title: 'Norovirus Cleaning', filename: 'NorovirusEnvironCleaning.pdf' },
    { title: 'Admin Procedures', filename: 'PROCEDURES_FOR_THE_ADMINISTRATION_AND_ENFORCEMENT_OF_THE_WASHTENAW_COUNTY_FOOD_SERVICE_REGULATION.pdf' },
    { title: 'Cooking Temps Chart', filename: 'Summary Chart for Minimum Cooking Food Temperatures.pdf' },
    { title: 'USDA Safe Minimums', filename: 'USDA_Safe_Minimum_Internal_Temperature_Chart.pdf' },
    { title: 'Violation Types', filename: 'Violation Types | Washtenaw County, MI.pdf' },
    { title: 'MCL Act 92 (2000)', filename: 'mcl_act_92_of_2000.pdf' },
    { title: 'Emergency Action Plan', filename: 'retail_food_establishments_emergency_action_plan.pdf' }
  ],
  wayne: [
    { title: '3 Comp Sink', filename: '3comp_sink.pdf' },
    { title: '5 Keys to Safer Food', filename: '5keys_to_safer_food.pdf' },
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
    { title: 'USDA Safe Minimum Temps', filename: 'USDA_Safe_Minimum_Internal_Temperature_Chart.pdf' },
    { title: 'Calibrate Thermometer', filename: 'calibrate_thermometer.pdf' },
    { title: 'Clean & Sanitizing', filename: 'clean_sanitizing.pdf' },
    { title: 'Consumer Advisory 2012', filename: 'consumer_advisory-updated_2012.pdf' },
    { title: 'Contamination', filename: 'contamination.pdf' },
    { title: 'Cooking Temps', filename: 'cook_temps.pdf' },
    { title: 'Cooling', filename: 'cooling.pdf' },
    { title: 'Date Marking', filename: 'date_marking.pdf' },
    { title: 'Employee Health Poster', filename: 'employeehealthposter.pdf' },
    { title: 'Food Allergen Info', filename: 'foodallergeninformation.pdf' },
    { title: 'General Norovirus Fact Sheet', filename: 'general_noro_fact_sheet.pdf' },
    { title: 'Gloves USDA', filename: 'gloves_usda.pdf' },
    { title: 'Guide for Wiping Cloths', filename: 'guideforuseofwipingcloths.doc' },
    { title: 'Holding Temps', filename: 'hold_temps.pdf' },
    { title: 'Non-Food Equipment', filename: 'nfsem_equip.pdf' },
    { title: 'Non-Food Thawing', filename: 'nfsem_thaw.pdf' },
    { title: 'Non-Food Trash', filename: 'nfsem_trash.pdf' },
    { title: 'Norovirus for Food Handlers', filename: 'norovirus-foodhandlers.pdf' },
    { title: 'Norovirus Cleaning Guidelines', filename: 'noroviruscleani nguidelines.pdf' },
    { title: 'Raw Meat Storage', filename: 'raw_meat_storage.pdf' },
    { title: 'Time as Public Health Control', filename: 'time_as_a_public_health_control.pdf' }
  ],
  oakland: [
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' }
  ]
}

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [userCounty, setUserCounty] = useState('washtenaw')
  const [showCountySelector, setShowCountySelector] = useState(false)
  
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState('documents')
  const [viewingPdf, setViewingPdf] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  // INITIAL MESSAGE
  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}. Upload a photo or ask a question about your local food safety regulations. I'll cite specific documents and pages in my responses.`,
          citations: []
        }
      ])
    }
  }, [userCounty])

  // LOAD CHAT HISTORY
  useEffect(() => {
    if (session) {
      const stored = localStorage.getItem(`chat_history_${session.user.id}`)
      if (stored) {
        try {
          setChatHistory(JSON.parse(stored))
        } catch (e) {
          console.error('Failed to parse saved history:', e)
        }
      }
    }
  }, [session])

  // SAVE CHAT
  const saveCurrentChat = () => {
    if (!session || messages.length <= 1) return

    const chatTitle = messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New Chat'
    const chat = {
      id: currentChatId || Date.now().toString(),
      title: chatTitle,
      messages,
      timestamp: Date.now(),
      county: userCounty
    }

    const existingIndex = chatHistory.findIndex(c => c.id === chat.id)
    let newHistory = [...chatHistory]

    if (existingIndex >= 0) newHistory[existingIndex] = chat
    else newHistory = [chat, ...newHistory].slice(0, 50)

    setChatHistory(newHistory)
    localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))
    setCurrentChatId(chat.id)
  }

  const loadChat = (chat) => {
    setMessages(chat.messages)
    setUserCounty(chat.county)
    setCurrentChatId(chat.id)
    setIsSidebarOpen(false)
  }

  const startNewChat = () => {
    saveCurrentChat()
    setMessages([
      { 
        role: 'assistant',
        content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}. Upload a photo or ask a question about your local food safety regulations.`,
        citations: []
      }
    ])
    setCurrentChatId(null)
    setIsSidebarOpen(false)
  }

  const deleteChat = (chatId, e) => {
    e.stopPropagation()
    const newHistory = chatHistory.filter(c => c.id !== chatId)
    setChatHistory(newHistory)
    localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))

    if (currentChatId === chatId) startNewChat()
  }

  // ACCESS CONTROL
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed, requests_used, images_used, county')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) return router.push('/pricing')

      setUserCounty(profile.county || 'washtenaw')

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status, trial_end, current_period_end')
        .eq('user_id', session.user.id)
        .single()

      const limits = subscription?.plan === 'enterprise'
        ? { requests: 5000, images: 500 }
        : { requests: 500, images: 50 }

      setSession(session)
      setSubscriptionInfo({
        plan: subscription?.plan || 'pro',
        status: subscription?.status || 'active',
        requestsUsed: profile?.requests_used || 0,
        imagesUsed: profile?.images_used || 0,
        requestLimit: limits.requests,
        imageLimit: limits.images,
        trialEnd: subscription?.trial_end ? new Date(subscription.trial_end) : null,
        currentPeriodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end) : null
      })
    }
    checkAccess()
  }, [])

  // SCROLL BOTTOM
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCountyChange = async (newCounty) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ county: newCounty })
      .eq('id', session.user.id)

    if (error) return alert('Error updating county.')

    setUserCounty(newCounty)
    setShowCountySelector(false)

    setMessages([
      { 
        role: 'assistant',
        content: `County updated to ${COUNTY_NAMES[newCounty]}. I now have access to ${COUNTY_DOCUMENTS[newCounty].length} ${COUNTY_NAMES[newCounty]}-specific documents.`,
        citations: []
      }
    ])
  }

  const handleCitationClick = (citation) => {
    const doc = COUNTY_DOCUMENTS[userCounty].find(d =>
      d.title.toLowerCase().includes(citation.document.toLowerCase())
    )

    if (!doc) return alert('Document not found.')

    const pageMatch = citation.pages.match(/\d+/)
    const pageNum = pageMatch ? parseInt(pageMatch[0]) : 1

    setViewingPdf({ ...doc, targetPage: pageNum })
  }

  const renderMessageContent = (msg) => {
    if (!msg.citations?.length) return msg.content

    const parts = []
    let lastIndex = 0
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match

    while ((match = citationRegex.exec(msg.content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: msg.content.slice(lastIndex, match.index) })
      }
      parts.push({
        type: 'citation',
        document: match[1],
        pages: match[2]
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < msg.content.length) {
      parts.push({ type: 'text', content: msg.content.slice(lastIndex) })
    }

    return (
      <>
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.content}</span>
          ) : (
            // Updated Citation Style: White background, Green border/text
            <button
              key={i}
              onClick={() => handleCitationClick(part)}
              className="inline-flex items-center bg-white border border-[#16A34A] text-[#16A34A] hover:bg-green-50 px-2 py-1 rounded text-xs font-bold transition-colors mx-1 cursor-pointer shadow-sm"
            >
              {part.document}, Page {part.pages}
            </button>
          )
        )}
      </>
    )
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !image) return

    const userMessage = { role: 'user', content: input, image, citations: [] }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImage(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: input }],
          image: userMessage.image,
          county: userCounty
        })
      })

      const data = await response.json()

      if (response.status === 403) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ ' + data.error }])
        return router.push('/pricing')
      }

      if (response.status === 429) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ ' + data.error }])
        return
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message, citations: data.citations }
      ])

      if (subscriptionInfo) {
        setSubscriptionInfo(prev => ({
          ...prev,
          requestsUsed: prev.requestsUsed + 1,
          imagesUsed: image ? prev.imagesUsed + 1 : prev.imagesUsed
        }))
      }

      setTimeout(saveCurrentChat, 200)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result)
    reader.readAsDataURL(file)
  }

  if (!session) return null

  const currentDocuments =
    COUNTY_DOCUMENTS[userCounty] || COUNTY_DOCUMENTS['washtenaw']

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden">

      {/* COUNTY SELECTOR MODAL */}
      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Select Your County</h3>
              <button onClick={() => setShowCountySelector(false)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>
            {Object.entries(COUNTY_NAMES).map(([key, name]) => (
              <button
                key={key}
                onClick={() => handleCountyChange(key)}
                className="w-full text-left p-4 border-2 border-slate-100 rounded-xl mb-2 hover:border-[#EA580C] hover:bg-orange-50 transition-all text-slate-700 font-medium"
              >
                {name} <span className="text-slate-400 text-sm ml-2">— {COUNTY_DOCUMENTS[key].length} documents</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF VIEWER */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-white">
            <div>
              <h3 className="font-bold text-slate-900">{viewingPdf.title}</h3>
              <p className="text-xs text-slate-500 font-medium">
                Page {viewingPdf.targetPage}
              </p>
            </div>
            <button 
              onClick={() => setViewingPdf(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              Close
            </button>
          </div>
          <iframe
            src={`/documents/${userCounty}/${viewingPdf.filename}#page=${viewingPdf.targetPage}`}
            className="flex-1 w-full"
          />
        </div>
      )}

      {/* SIDEBAR - Darker slate (slate-900) */}
      <div className={`fixed md:relative inset-y-0 left-0 w-80 bg-slate-900 text-white p-6 transition-transform duration-300 z-40 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">protocol<span className="font-normal">LM</span></h1>
            {/* Colored line */}
            <div className="h-1 w-full bg-gradient-to-r from-[#EA580C] via-[#E11D48] to-[#16A34A] rounded-full mt-1"></div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <button
          onClick={() => setShowCountySelector(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl mb-6 flex items-center justify-between transition-colors border border-slate-700"
        >
          <span className="text-sm font-medium truncate">{COUNTY_NAMES[userCounty]}</span>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </button>

        {/* Sidebar Tabs */}
        <div className="flex mb-4 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setSidebarView('documents')}
            className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all ${sidebarView === 'documents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Documents
          </button>
          <button
            onClick={() => setSidebarView('history')}
            className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all ${sidebarView === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            History
          </button>
        </div>

        {/* DOCUMENTS LIST */}
        {sidebarView === 'documents' && (
          <div className="overflow-y-auto h-[calc(100vh-220px)] pr-2 space-y-1 custom-scrollbar">
            {currentDocuments.map((doc, i) => (
              <button
                key={i}
                onClick={() => setViewingPdf({ ...doc, targetPage: 1 })}
                className="w-full text-left p-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors truncate"
              >
                {doc.title}
              </button>
            ))}
          </div>
        )}

        {/* HISTORY LIST */}
        {sidebarView === 'history' && (
          <div className="overflow-y-auto h-[calc(100vh-220px)] pr-2 custom-scrollbar">
            {/* New Chat - Darker Green #16A34A */}
            <button
              className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white p-3 mb-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              onClick={startNewChat}
            >
              <span>+</span> New Chat
            </button>

            {chatHistory.length === 0 && (
              <p className="text-slate-500 text-sm text-center mt-4">No chat history yet.</p>
            )}

            {chatHistory.map(chat => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat)}
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl mb-2 group cursor-pointer transition-all"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-sm text-slate-200 truncate pr-2">{chat.title}</p>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="text-slate-500 hover:text-[#E11D48] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(chat.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-white relative">

        {/* MOBILE HEADER */}
        <div className="md:hidden p-4 bg-slate-900 text-white flex justify-between items-center shadow-md z-30">
          <div>
            <span className="font-bold text-lg">protocol<span className="font-normal">LM</span></span>
            <div className="text-xs text-slate-400">{COUNTY_NAMES[userCounty]}</div>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-4 rounded-2xl max-w-[85%] lg:max-w-[75%] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'bg-[#EA580C] text-white' // User bubble is now Darker Orange
                }`}
              >
                {/* Only show avatar for Assistant */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#EA580C] via-[#E11D48] to-[#16A34A] flex items-center justify-center text-[10px] text-white font-bold">
                      LM
                    </div>
                    <span className="font-semibold text-xs text-slate-500">protocolLM</span>
                  </div>
                )}
                
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 md:p-6 border-t border-slate-100 bg-white"
        >
          <div className="max-w-4xl mx-auto relative flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className={`p-3 rounded-xl transition-all ${
                image 
                  ? 'bg-[#E11D48] text-white shadow-md' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            </button>

            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={image ? "Ask a question about this image..." : "Ask a food safety question..."}
              className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all text-sm"
            />

            <button
              type="submit"
              disabled={isLoading}
              // Send button matches user bubble (Dark Orange)
              className="px-6 py-3.5 bg-[#EA580C] hover:bg-[#c2410c] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all text-sm"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
          <div className="text-center mt-2">
             <p className="text-[10px] text-slate-400">AI can make mistakes. Verify with cited documents.</p>
          </div>
        </form>
      </div>
    </div>
  )
}
