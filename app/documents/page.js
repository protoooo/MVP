'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// --- Particle Background ---
const ParticleBackground = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    let animationFrameId

    const colors = ['#d97706', '#be123c', '#16a34a', '#0284c7', '#4338ca', '#4F759B']
    const particleCount = 30 
    const connectionDistance = 80
    const mouseDistance = 120
    const particles = []

    let mouse = { x: null, y: null }

    function initParticles() {
      particles.length = 0
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth
        canvas.height = canvas.parentElement.offsetHeight
        initParticles()
      }
    }

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    class Particle {
      constructor() {
        this.x = Math.random() * (canvas.width || 300)
        this.y = Math.random() * (canvas.height || 800)
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 2 + 1.5 
        this.color = colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        this.x += this.vx
        this.y += this.vy
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1

        if (mouse.x != null) {
          let dx = mouse.x - this.x
          let dy = mouse.y - this.y
          let distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < mouseDistance) {
            const forceDirectionX = dx / distance
            const forceDirectionY = dy / distance
            const force = (mouseDistance - distance) / mouseDistance
            this.x -= (forceDirectionX * force * 0.6)
            this.y -= (forceDirectionY * force * 0.6)
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < particles.length; i++) {
        particles[i].update()
        particles[i].draw()
        for (let j = i; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x
          let dy = particles[i].y - particles[j].y
          let distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < connectionDistance) {
            let opacity = 1 - (distance / connectionDistance)
            ctx.globalAlpha = opacity * 0.4 
            const gradient = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y)
            gradient.addColorStop(0, particles[i].color)
            gradient.addColorStop(1, particles[j].color)
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
            ctx.globalAlpha = 1.0
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    handleResize()
    initParticles()
    animate()

    window.addEventListener('resize', handleResize)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove)
        canvas.removeEventListener('mouseleave', handleMouseLeave)
      }
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto z-0 opacity-60"
    />
  )
}

// --- Main Dashboard ---

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export default function DocumentsPage() {
  const [session, setSession] = useState(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [userCounty, setUserCounty] = useState('washtenaw')
  const [showCountySelector, setShowCountySelector] = useState(false)
  const [isUpdatingCounty, setIsUpdatingCounty] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)
  
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [canSend, setCanSend] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewingPdf, setViewingPdf] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  const prismGradient = {
    background: 'linear-gradient(to right, #d97706, #be123c, #4338ca, #0284c7, #16a34a)'
  }

  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}. Upload a photo or ask a question.`,
          citations: []
        }
      ])
    }
  }, [userCounty])

  useEffect(() => {
    if (session) {
      const stored = localStorage.getItem(`chat_history_${session.user.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setChatHistory(parsed)
          }
        } catch (e) {
          console.error('Invalid chat history data')
          localStorage.removeItem(`chat_history_${session.user.id}`)
        }
      }
    }
  }, [session])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    router.push('/')
  }

  const handleManageSubscription = async () => {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/create-portal-session', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!res.ok) {
        throw new Error('Failed to access billing portal')
      }
      
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Could not access billing portal.')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Error loading billing portal.')
    } finally {
      setLoadingPortal(false)
    }
  }

  const saveCurrentChat = () => {
    if (!session || messages.length <= 1) return

    try {
      const chatTitle = messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New Chat'
      const chat = {
        id: currentChatId || Date.now().toString(),
        title: chatTitle,
        messages: messages,
        timestamp: Date.now(),
        county: userCounty
      }

      const existingIndex = chatHistory.findIndex(c => c.id === chat.id)
      let newHistory = [...chatHistory]

      if (existingIndex >= 0) newHistory[existingIndex] = chat
      else newHistory = [chat, ...newHistory].slice(0, 50)

      localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))
      setChatHistory(newHistory)
      setCurrentChatId(chat.id)
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        const newHistory = chatHistory.slice(0, 25)
        try {
          localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))
          setChatHistory(newHistory)
        } catch (retryError) {
          console.error('Storage error:', retryError)
        }
      }
    }
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
        content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}.`,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCountyChange = async (newCounty) => {
    if (!['washtenaw', 'wayne', 'oakland'].includes(newCounty)) {
      console.error('Invalid county selected')
      return
    }
    
    setIsUpdatingCounty(true)
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ county: newCounty })
      .eq('id', session.user.id)

    if (error) {
      alert('Error updating county.')
      setIsUpdatingCounty(false)
      return
    }

    setUserCounty(newCounty)
    setShowCountySelector(false)
    setIsUpdatingCounty(false)

    setMessages([
      { 
        role: 'assistant',
        content: `County updated to ${COUNTY_NAMES[newCounty]}.`,
        citations: []
      }
    ])
  }

  const handleCitationClick = (citation) => {
    if (!citation || typeof citation !== 'object') return
    
    const docName = citation.document || ''
    const pageMatch = citation.pages?.toString().match(/\d+/)
    const pageNum = pageMatch ? parseInt(pageMatch[0]) : 1

    if (!['washtenaw', 'wayne', 'oakland'].includes(userCounty)) {
      console.error('Invalid county')
      return
    }

    setViewingPdf({
      title: docName,
      filename: `${docName}.pdf`,
      county: userCounty,
      targetPage: pageNum
    })
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
            <button
              key={i}
              onClick={() => handleCitationClick(part)}
              className="inline-flex items-center bg-white border border-slate-300 text-slate-700 hover:border-[#4F759B] hover:text-[#4F759B] px-2 py-1 rounded text-xs font-bold transition-colors mx-1 cursor-pointer shadow-sm"
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
    if (!canSend) return
    
    const sanitizedInput = input.trim()
    if (sanitizedInput.length > 5000) {
      alert('Message too long. Please keep messages under 5000 characters.')
      return
    }

    setCanSend(false)

    const userMessage = { 
      role: 'user', 
      content: sanitizedInput, 
      image, 
      citations: [] 
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImage(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: sanitizedInput }],
          image: userMessage.image,
          county: userCounty
        })
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment.')
        } else if (response.status === 401) {
          throw new Error('Session expired. Please sign in again.')
        } else {
          throw new Error('An error occurred. Please try again.')
        }
      }

      const data = await response.json()

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
      console.error('Chat error:', err)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Error: ${err.message}`,
        citations: []
      }])
    } finally {
      setIsLoading(false)
      setTimeout(() => setCanSend(true), 1000)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are allowed')
      e.target.value = ''
      return
    }
    
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image must be smaller than 5MB')
      e.target.value = ''
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        setImage(result)
      } else {
        alert('Invalid image format')
        e.target.value = ''
      }
    }
    reader.onerror = () => {
      alert('Error reading file')
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  if (!session) return null

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden">

      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Select Your County</h3>
              <button 
                onClick={() => setShowCountySelector(false)} 
                className="text-slate-400 hover:text-slate-900"
                disabled={isUpdatingCounty}
              >
                ✕
              </button>
            </div>
            {Object.entries(COUNTY_NAMES).map(([key, name]) => (
              <button
                key={key}
                onClick={() => handleCountyChange(key)}
                disabled={isUpdatingCounty}
                className="w-full text-left p-4 border-2 border-slate-100 rounded-xl mb-2 hover:border-[#4F759B] hover:bg-slate-50 transition-all text-slate-700 font-medium disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-white flex-shrink-0">
            <div>
              <h3 className="font-bold text-slate-900">{viewingPdf.title}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {viewingPdf.targetPage && `Page ${viewingPdf.targetPage}`}
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
            src={`/documents/${userCounty}/${viewingPdf.filename}${viewingPdf.targetPage ? `#page=${viewingPdf.targetPage}` : ''}`}
            className="flex-1 w-full"
            sandbox="allow-same-origin" 
            title="PDF Viewer"
          />
        </div>
      )}

      <div className={`${isSidebarOpen ? 'fixed' : 'hidden'} md:relative md:block inset-y-0 left-0 w-full sm:w-80 bg-slate-50 border-r border-slate-200 text-slate-900 flex flex-col z-40 relative overflow-hidden`}>
        
        <ParticleBackground />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-6 flex-shrink-0 border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">protocol<span className="font-normal text-slate-600">LM</span></h1>
                <div className="h-1 w-full rounded-full mt-1 opacity-90" style={prismGradient}></div>
              </div>
              <button className="md:hidden text-slate-400 hover:text-slate-900" onClick={() => setIsSidebarOpen(false)}>✕</button>
            </div>

            <button
              onClick={() => setShowCountySelector(true)}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 p-3 rounded-xl mb-6 flex items-center justify-between transition-colors border border-slate-200 shadow-sm"
            >
              <span className="text-sm font-bold truncate">{COUNTY_NAMES[userCounty]}</span>
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <button
              onClick={startNewChat}
              className="group relative w-full rounded-xl overflow-hidden mb-4 shadow-sm"
            >
              <div className="absolute inset-0" style={prismGradient}></div>
              <div className="relative m-[2px] bg-white hover:bg-slate-50 text-slate-800 font-bold p-3 rounded-[10px] transition-all flex items-center justify-center gap-2">
                <span>+</span> New Chat
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
            {chatHistory.length === 0 && (
              <p className="text-slate-400 text-sm text-center mt-4">No chat history yet.</p>
            )}

            {chatHistory.map(chat => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat)}
                className="p-3 bg-white/80 backdrop-blur-sm hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl mb-2 group cursor-pointer transition-all shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-sm text-slate-700 truncate pr-2 flex-1">{chat.title}</p>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(chat.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Combined Sidebar Footer with "Need Help?" Link */}
          <div className="p-4 border-t border-slate-200/60 bg-slate-50/80 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm" style={prismGradient}>
                {session?.user?.email ? session.user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {session?.user?.email}
                </p>
                <p className="text-[10px] text-slate-500 font-medium capitalize">
                  {subscriptionInfo?.plan === 'enterprise' ? 'Enterprise' : 'Pro'} Plan
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                {loadingPortal ? '...' : 'Manage'}
              </button>
              <button 
                onClick={handleSignOut}
                className="text-xs font-semibold text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 py-2 rounded-lg transition-all"
              >
                Sign Out
              </button>
            </div>

            {/* ADDED SECTION */}
            <div className="mt-2 pt-2 border-t border-slate-200/60">
              <a 
                href="/contact" 
                className="text-xs text-slate-500 hover:text-slate-900 transition flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Need Help?
              </a>
            </div>
          </div>

        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-white">

        <div className="md:hidden p-4 bg-slate-50 border-b border-slate-200 text-slate-900 flex justify-between items-center shadow-sm z-30 flex-shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-center flex-1 mx-4 min-w-0">
            <span className="font-bold text-lg text-slate-900">protocol<span className="font-normal text-slate-600">LM</span></span>
            <div className="text-xs text-slate-500 truncate">{COUNTY_NAMES[userCounty]}</div>
          </div>
          <div className="w-6"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-4 rounded-2xl max-w-[85%] lg:max-w-[75%] text-sm leading-relaxed shadow-sm break-words ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-800'
                    : 'text-white' 
                }`}
                style={msg.role === 'user' ? prismGradient : {}}
              >
                {msg.image && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img 
                      src={msg.image} 
                      alt="Uploaded evidence" 
                      className="max-w-full h-auto max-h-64 object-cover" 
                    />
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0" style={prismGradient}>
                      LM
                    </div>
                    <span className="font-semibold text-xs text-slate-500">protocolLM</span>
                  </div>
                )}
                
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={prismGradient}>
                    LM
                  </div>
                  <span className="font-semibold text-xs text-slate-500">protocolLM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 p-4 md:p-6 border-t border-slate-100 bg-white">
          
          {image && (
            <div className="max-w-4xl mx-auto mb-3 px-1">
              <div className="relative inline-block">
                <img src={image} alt="Preview" className="h-16 w-auto rounded-lg border border-slate-200 shadow-sm" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 md:gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={isLoading}
                className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                  image 
                    ? 'text-white shadow-md' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                style={image ? prismGradient : {}}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              </button>

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={image ? "Ask about this image..." : "Ask a question..."}
                className="flex-1 min-w-0 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all text-sm"
                disabled={isLoading}
                maxLength={5000}
              />

              <button
                type="submit"
                disabled={isLoading || !canSend}
                className="h-[48px] px-4 text-slate-900 font-bold hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                Send
              </button>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-slate-400">System can make mistakes. Verify with cited documents.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
