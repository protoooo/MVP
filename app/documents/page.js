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
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
    { title: 'Wayne County Health Code', filename: 'Wayne_County_Health_Code.pdf' },
    { title: 'Detroit Health Guidelines', filename: 'Detroit_Health_Guidelines.pdf' },
  ],
  oakland: [
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
    { title: 'Oakland County Regulations', filename: 'Oakland_County_Regulations.pdf' },
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
  
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to protocolLM. Upload a photo or ask a question to search all documents.' }
  ])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewingPdf, setViewingPdf] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { 
        router.push('/')
        return 
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed, requests_used, images_used, county')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) { 
        router.push('/pricing')
        return 
      }

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
  }, [supabase, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCountyChange = async (newCounty) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ county: newCounty })
        .eq('id', session.user.id)

      if (error) throw error

      setUserCounty(newCounty)
      setShowCountySelector(false)
      
      setMessages([
        { role: 'assistant', content: `County updated to ${COUNTY_NAMES[newCounty]}. Ask me anything about your local food safety regulations.` }
      ])
    } catch (error) {
      console.error('Error updating county:', error)
      alert('Failed to update county. Please try again.')
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !image) return

    const userMessage = { role: 'user', content: input, image: image }
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
        }),
      })

      const data = await response.json()
      
      if (response.status === 403) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '⚠️ ' + data.error + '\n\nPlease visit the pricing page to subscribe.' 
        }])
        setTimeout(() => router.push('/pricing'), 3000)
        return
      }

      if (response.status === 429) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '⚠️ ' + data.error 
        }])
        return
      }

      if (data.error) throw new Error(data.error)

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      
      if (subscriptionInfo) {
        setSubscriptionInfo(prev => ({
          ...prev,
          requestsUsed: prev.requestsUsed + 1,
          imagesUsed: userMessage.image ? prev.imagesUsed + 1 : prev.imagesUsed
        }))
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  if (!session) return null

  const currentDocuments = COUNTY_DOCUMENTS[userCounty] || COUNTY_DOCUMENTS.washtenaw

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden">
      
      {/* County Selector Modal */}
      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Select Your County</h3>
              <button onClick={() => setShowCountySelector(false)} className="text-slate-400 hover:text-slate-900 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">Choose the county where your restaurant operates to access local regulations.</p>
            
            <div className="space-y-3">
              {Object.entries(COUNTY_NAMES).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => handleCountyChange(key)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                    userCounty === key 
                      ? 'border-slate-900 bg-slate-50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{name}</span>
                    {userCounty === key && (
                      <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex justify-between items-center p-5 bg-white border-b border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 truncate">{viewingPdf.title}</h3>
            <button onClick={() => setViewingPdf(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-2.5 rounded-lg text-sm transition font-semibold">Close</button>
          </div>
          
          <div className="flex-1 w-full relative bg-slate-50 overflow-hidden">
            <iframe 
              src={`/documents/${userCounty}/${viewingPdf.filename}`} 
              className="absolute inset-0 w-full h-full border-none" 
              title="Document Viewer"
            />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 p-4 flex justify-between items-center z-50 shadow-lg">
        <span className="font-bold text-white tracking-tight text-lg" style={{ letterSpacing: '-0.03em' }}>
          protocol<span className="font-black">LM</span>
        </span>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-80 bg-gradient-to-b from-slate-900 to-black text-white flex flex-col z-40 shadow-2xl`}>
        
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 text-white/80 hover:text-white p-2 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <div className="p-6 hidden md:block border-b border-white/10">
          <h1 className="text-xl font-bold text-white tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            protocol<span className="font-black">LM</span>
          </h1>
          <div className="text-xs text-slate-300 mt-1 font-medium">Michigan Restaurant Compliance</div>
          
          <button 
            onClick={() => setShowCountySelector(true)}
            className="mt-4 w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl p-4 transition text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-300 mb-1 font-medium">Current County</div>
                <div className="text-sm font-semibold text-white">{COUNTY_NAMES[userCounty]}</div>
              </div>
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </button>
          
          {subscriptionInfo && (
            <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">{subscriptionInfo.plan}</span>
                {subscriptionInfo.trialEnd && new Date() < subscriptionInfo.trialEnd && (
                  <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-md font-semibold">TRIAL</span>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                    <span>Queries</span>
                    <span className="font-semibold">{subscriptionInfo.requestsUsed}/{subscriptionInfo.requestLimit}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((subscriptionInfo.requestsUsed / subscriptionInfo.requestLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                    <span>Image analyses</span>
                    <span className="font-semibold">{subscriptionInfo.imagesUsed}/{subscriptionInfo.imageLimit}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((subscriptionInfo.imagesUsed / subscriptionInfo.imageLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 mt-16 md:mt-0">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 px-2">
            {COUNTY_NAMES[userCounty]} Documents
          </div>
          <div className="space-y-1">
            {currentDocuments.map((doc, idx) => (
              <button 
                key={idx} 
                className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm hover:bg-white/10 transition-all duration-200 text-left group" 
                onClick={() => { setViewingPdf(doc); setIsSidebarOpen(false); }}
              >
                 <div className="flex items-center overflow-hidden flex-1 min-w-0">
                    <svg className="w-4 h-4 mr-3 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="truncate text-white group-hover:text-slate-50 font-medium">{doc.title}</span>
                 </div>
                 <span className="text-xs text-slate-300 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">View</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} 
            className="w-full py-3 text-sm text-white hover:text-slate-50 border border-white/30 rounded-xl hover:bg-white/10 transition font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-white">
        
        <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm mt-16 md:mt-0">
          <div>
            <h2 className="font-bold text-slate-900 text-base" style={{ letterSpacing: '-0.01em' }}>Compliance Assistant</h2>
            <p className="text-xs text-slate-500 font-medium">Searching {COUNTY_NAMES[userCounty]} documents</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-semibold">GEMINI 2.0</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                {msg.image && <img src={msg.image} alt="Analysis Target" className="max-w-[250px] rounded-xl border border-slate-200 shadow-md" />}
                <div className={`p-4 rounded-xl text-sm md:text-base leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-900 border border-slate-200'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="loading-container">
                  <div className="box-loading">
                    <div className="box"></div>
                    <div className="box"></div>
                    <div className="box"></div>
                    <div className="box"></div>
                    <div className="box"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 bg-white border-t border-slate-200 pb-safe">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-white p-2 rounded-xl border-2 border-slate-200 focus-within:border-slate-900 transition shadow-sm">
            <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}} 
              placeholder={image ? "Image attached. Add context..." : "Ask about regulations..."} 
              className="flex-1 bg-transparent text-slate-900 text-sm md:text-base max-h-32 py-3 focus:outline-none resize-none" 
              rows="1"
            />
            <button type="submit" disabled={isLoading || (!input.trim() && !image)} className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 shadow-md hover:shadow-lg">
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
            {image && (
              <div className="absolute -top-14 left-0 bg-white border-2 border-slate-300 px-4 py-2 rounded-xl flex items-center shadow-lg">
                <span className="text-xs text-slate-700 font-bold mr-2">IMAGE READY</span>
                <button onClick={() => setImage(null)} className="text-slate-400 hover:text-slate-900 ml-2 font-bold">✕</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
