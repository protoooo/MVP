'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// ==========================================
// ICONS
// ==========================================
const Icons = {
  Menu: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Chat: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Clipboard: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  Upload: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Send: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  X: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>,
  Check: () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
  Sparkles: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
}

// ==========================================
// AUTH MODAL COMPONENT
// ==========================================
const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✓ Check your email for the secure login link.')
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setMessage('Error: ' + error.message)
      setGoogleLoading(false)
    }
    // Note: If successful, user will be redirected to Google, so no need to set loading to false
  }

  if (!isOpen) return null

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
    </svg>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-sm text-[#888]">Sign in to access compliance tools</p>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
            <Icons.X />
          </button>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-4 border border-gray-300"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2A2A2A]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#1C1C1C] px-2 text-[#666]">Or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-[#161616] border border-[#333] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E] transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || googleLoading}
            className="w-full bg-[#3ECF8E] hover:bg-[#34D399] text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Continue with Email'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('Error') 
              ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
              : 'bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E]'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-[#2A2A2A] text-center">
          <p className="text-xs text-[#666] mb-3">New to protocolLM?</p>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="text-sm text-[#3ECF8E] hover:text-[#34D399] font-medium transition-colors"
          >
            Start 30-day free trial →
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// MAIN CHAT INTERFACE
// ==========================================
const ChatInterface = ({ session, onSignOut }) => {
  const [activeTab, setActiveTab] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => { 
    if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight 
  }, [messages])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(p => [...p, newMsg])
    setInput('')
    const img = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    setMessages(p => [...p, { role: 'assistant', content: 'Processing compliance query...' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], image: img })
      })
      const data = await res.json()
      setMessages(p => {
        const u = [...p]
        u[u.length - 1].content = data.message || 'Error processing request.'
        return u
      })
    } catch (err) {
      setMessages(p => {
        const u = [...p]
        u[u.length - 1].content = 'Network error. Please try again.'
        return u
      })
    } finally { setIsSending(false) }
  }

  const handleImage = (e) => {
    if (e.target.files?.[0]) {
      const r = new FileReader()
      r.onloadend = () => setSelectedImage(r.result)
      r.readAsDataURL(e.target.files[0])
    }
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-[#1C1C1C] text-[#EDEDED] overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#161616] border-r border-[#2A2A2A] transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="h-14 flex items-center px-5 border-b border-[#2A2A2A]">
          <div className="font-mono text-sm font-bold tracking-tight text-[#EDEDED]">
            protocol<span className="text-[#3ECF8E]">LM</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-[#888]">
            <Icons.X />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button 
            onClick={() => { setActiveTab('chat'); setSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group ${activeTab === 'chat' ? 'bg-[#232323] text-white' : 'text-[#888] hover:bg-[#1C1C1C] hover:text-[#EDEDED]'}`}
          >
            <span className={activeTab === 'chat' ? 'text-[#3ECF8E]' : 'text-[#666] group-hover:text-[#EDEDED]'}><Icons.Chat /></span>
            Compliance Chat
          </button>
          <button 
            onClick={() => { setActiveTab('audit'); setSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group ${activeTab === 'audit' ? 'bg-[#232323] text-white' : 'text-[#888] hover:bg-[#1C1C1C] hover:text-[#EDEDED]'}`}
          >
            <span className={activeTab === 'audit' ? 'text-[#3ECF8E]' : 'text-[#666] group-hover:text-[#EDEDED]'}><Icons.Clipboard /></span>
            Mock Audit
          </button>
        </div>

        <div className="p-4 border-t border-[#2A2A2A] bg-[#161616]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#3ECF8E] flex items-center justify-center text-black font-bold text-xs">
              {session.user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{session.user.email}</p>
              <p className="text-[10px] text-[#666] truncate">Pro Plan</p>
            </div>
          </div>
          <button 
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-[#333] hover:border-[#555] bg-[#1C1C1C] hover:bg-[#232323] text-xs text-[#888] hover:text-white transition-all"
          >
            <Icons.SignOut />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#1C1C1C]">
        <header className="h-14 border-b border-[#2A2A2A] flex items-center justify-between px-4 lg:px-6 bg-[#1C1C1C] shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#888] hover:text-white">
              <Icons.Menu />
            </button>
            <h1 className="text-sm font-medium text-[#EDEDED]">{activeTab === 'chat' ? 'AI Compliance Assistant' : 'Self-Inspection Audit'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse"></div>
            <span className="text-[10px] font-mono text-[#666] uppercase">System Operational</span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 select-none">
                <div className="w-12 h-12 mb-4 text-[#333]"><Icons.Chat /></div>
                <p className="text-sm text-[#888]">Ask about food code violations, temperatures,<br/>or upload a photo for analysis.</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded bg-[#232323] border border-[#333] flex items-center justify-center shrink-0 text-[#3ECF8E] text-xs font-mono">AI</div>
                )}
                <div className={`space-y-2 max-w-[85%] lg:max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.image && (
                    <img src={msg.image} alt="Upload" className="rounded-md border border-[#333] max-h-60 object-contain bg-black/50" />
                  )}
                  <div className={`text-sm leading-relaxed p-3 rounded-lg border ${
                    msg.role === 'user' 
                      ? 'bg-[#232323] border-[#333] text-[#EDEDED]' 
                      : 'bg-transparent border-transparent text-[#CCC] pl-0 pt-1'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#2A2A2A] bg-[#1C1C1C]">
            <div className="max-w-3xl mx-auto relative">
              {selectedImage && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-[#232323] border border-[#333] rounded-md flex items-center gap-2">
                  <span className="text-xs text-[#888]">Image attached</span>
                  <button onClick={() => setSelectedImage(null)} className="text-white hover:text-red-400"><Icons.X /></button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 rounded-md border border-[#333] hover:border-[#555] hover:bg-[#232323] text-[#888] hover:text-white transition-colors"
                >
                  <Icons.Upload />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImage} 
                />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 bg-[#161616] border border-[#333] rounded-md px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E] transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input && !selectedImage}
                  className="px-4 rounded-md bg-[#3ECF8E] hover:bg-[#34D399] text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  <Icons.Send />
                </button>
              </form>
              <p className="text-[10px] text-[#444] mt-2 text-center">AI can make mistakes. Verify critical code violations.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ==========================================
// ROOT COMPONENT
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setIsLoading(false)
    }
    init()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  if (isLoading) return (
    <div className="h-screen w-screen bg-[#1C1C1C] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  // If logged in, show full chat interface
  if (session) {
    return <ChatInterface session={session} onSignOut={() => supabase.auth.signOut()} />
  }

  // If logged out, show landing page with inline chat demo
  return (
    <>
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => setShowAuthModal(false)}
      />

      <div className="min-h-screen bg-[#1C1C1C] text-[#EDEDED] flex flex-col font-sans selection:bg-[#3ECF8E] selection:text-black">
        {/* Header */}
        <nav className="fixed top-0 w-full h-16 bg-[#1C1C1C]/80 backdrop-blur border-b border-[#2A2A2A] z-50 flex items-center justify-between px-6 lg:px-12">
          <div className="font-mono font-bold text-lg tracking-tight">protocol<span className="text-[#3ECF8E]">LM</span></div>
          <div className="flex gap-4 items-center">
            <button onClick={() => setShowAuthModal(true)} className="text-sm text-[#888] hover:text-white transition-colors">Log In</button>
            <button onClick={() => router.push('/pricing')} className="bg-[#3ECF8E] hover:bg-[#34D399] text-black px-4 py-2 rounded-md text-sm font-medium transition-colors">Get Started</button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 pt-32 px-4 flex flex-col items-center justify-center text-center pb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#333] bg-[#232323] text-xs text-[#888] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E]"></span>
            Updated for 2025 Food Code
          </div>
          
          <h1 className="text-4xl md:text-6xl font-semibold text-white mb-6 tracking-tight max-w-3xl">
            AI Compliance Officer <br/> <span className="text-[#888]">for your kitchen.</span>
          </h1>
          
          <p className="text-[#666] text-lg mb-8 max-w-xl">
            Prevent violations before the health inspector arrives. Instant answers, mock audits, and image analysis.
          </p>

          <div className="flex gap-4 mb-12">
            <button 
              onClick={() => router.push('/pricing')}
              className="bg-[#3ECF8E] hover:bg-[#34D399] text-black px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <Icons.Sparkles />
              Start Free Trial
            </button>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-[#232323] hover:bg-[#2A2A2A] border border-[#333] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In
            </button>
          </div>

          {/* Demo Chat Window */}
          <div className="w-full max-w-4xl mx-auto bg-[#161616] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-2xl">
            <div className="h-10 bg-[#1C1C1C] border-b border-[#2A2A2A] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
              <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
            </div>
            <div className="p-6 space-y-4 min-h-[400px] bg-[#1C1C1C]">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">U</div>
                <div className="flex-1 bg-[#232323] border border-[#333] rounded-lg p-3 text-sm text-[#EDEDED]">
                  Is 48°F acceptable for a walk-in cooler holding raw chicken?
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded bg-[#232323] border border-[#333] flex items-center justify-center shrink-0 text-[#3ECF8E] text-xs font-mono">AI</div>
                <div className="flex-1 text-sm text-[#CCC] leading-relaxed">
                  <p className="mb-3"><span className="text-red-400 font-bold">❌ VIOLATION:</span> NO - 48°F is not acceptable.</p>
                  <p className="mb-3">Per Michigan Modified Food Code (3-501.16), TCS foods like raw chicken must be held at <span className="text-white font-bold">41°F or below</span>.</p>
                  <p className="text-[#888]"><strong className="text-white">Action Required:</strong> Discard if time/temperature unknown, or rapid chill immediately and document corrective action.</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs text-[#555]">
            Try it now — no credit card required for 30-day trial
          </p>
        </main>
      </div>
    </>
  )
}
