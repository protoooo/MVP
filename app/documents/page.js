'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const DOCUMENTS = [
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
]

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to protocol LM. Upload a photo or ask a question to search all documents.' }
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
        .select('is_subscribed, requests_used, images_used')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) { 
        router.push('/pricing')
        return 
      }

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
          image: userMessage.image
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

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden">
      
      {/* PDF Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex justify-between items-center p-4 bg-white border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{viewingPdf.title}</h3>
            <button onClick={() => setViewingPdf(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm transition font-medium">Close</button>
          </div>
          
          <div className="flex-1 w-full relative bg-slate-50 overflow-hidden">
            <iframe 
              src={`/documents/${viewingPdf.filename}`} 
              className="absolute inset-0 w-full h-full border-none" 
              title="Document Viewer"
            />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white p-4 flex justify-between items-center z-50 border-b border-slate-200">
        <span className="font-semibold text-slate-900">protocol LM</span>
        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-80 bg-white border-r border-slate-200 flex flex-col z-40`}>
        
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <div className="p-6 hidden md:block border-b border-slate-200">
          <h1 className="text-lg font-semibold text-slate-900">protocol LM</h1>
          <div className="text-xs text-slate-500 mt-1">Washtenaw County Compliance</div>
          
          {subscriptionInfo && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-900 uppercase">{subscriptionInfo.plan}</span>
                {subscriptionInfo.trialEnd && new Date() < subscriptionInfo.trialEnd && (
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">TRIAL</span>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Queries</span>
                    <span className="font-medium">{subscriptionInfo.requestsUsed}/{subscriptionInfo.requestLimit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className="bg-slate-900 h-1.5 rounded-full transition-all" 
                      style={{ width: `${Math.min((subscriptionInfo.requestsUsed / subscriptionInfo.requestLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Image analyses</span>
                    <span className="font-medium">{subscriptionInfo.imagesUsed}/{subscriptionInfo.imageLimit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className="bg-slate-900 h-1.5 rounded-full transition-all" 
                      style={{ width: `${Math.min((subscriptionInfo.imagesUsed / subscriptionInfo.imageLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 mt-16 md:mt-0">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Document Library</div>
          <div className="space-y-1">
            {DOCUMENTS.map((doc, idx) => (
              <button 
                key={idx} 
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm hover:bg-slate-100 transition-colors text-left group" 
                onClick={() => { setViewingPdf(doc); setIsSidebarOpen(false); }}
              >
                 <div className="flex items-center overflow-hidden flex-1 min-w-0">
                    <svg className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="truncate text-slate-700 group-hover:text-slate-900">{doc.title}</span>
                 </div>
                 <span className="text-xs text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition flex-shrink-0">View</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} 
            className="w-full py-2.5 text-sm text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
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
        
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm mt-16 md:mt-0">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Compliance Assistant</h2>
            <p className="text-xs text-slate-500">Searching all documents</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">GEMINI 2.0</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                {msg.image && <img src={msg.image} alt="Analysis Target" className="max-w-[250px] rounded-lg border border-slate-200 shadow-sm" />}
                <div className={`p-4 rounded-lg text-sm md:text-base leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-4 py-2 rounded-full border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                Searching documents...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 bg-white border-t border-slate-200 pb-safe">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-white p-2 rounded-lg border border-slate-300 focus-within:border-slate-900 transition shadow-sm">
            <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition flex-shrink-0">
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
            <button type="submit" disabled={isLoading || (!input.trim() && !image)} className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0">
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
            {image && (
              <div className="absolute -top-12 left-0 bg-white border border-slate-300 px-3 py-1.5 rounded-lg flex items-center shadow-sm">
                <span className="text-xs text-slate-700 font-medium mr-2">IMAGE READY</span>
                <button onClick={() => setImage(null)} className="text-slate-400 hover:text-slate-900 ml-2">✕</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
