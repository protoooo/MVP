'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// ==========================================
// ICONS
// ==========================================
const Icons = {
  Menu: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Send: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  X: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>,
  Plus: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Upload: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Sparkles: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
}

// ==========================================
// AUTH MODAL
// ==========================================
const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const supabase = createClient()

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage('')

    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}/auth/callback`
      : '/auth/callback'

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      setStatusMessage('Error: ' + error.message)
    } else {
      setStatusMessage('✓ Check your email for the login link.')
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setStatusMessage('')

    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}/auth/callback`
      : '/auth/callback'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setStatusMessage('Error: ' + error.message)
      setGoogleLoading(false)
    }
  }

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
    </svg>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#2F2F2F] rounded-2xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">{message || 'Continue with protocolLM'}</h2>
            <p className="text-sm text-[#C5C5C5]">Start your free trial</p>
          </div>
          <button onClick={onClose} className="text-[#8E8EA0] hover:text-white transition-colors">
            <Icons.X />
          </button>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-3"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#565869]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#2F2F2F] px-2 text-[#8E8EA0]">OR</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full bg-[#40414F] border border-[#565869] rounded-xl px-4 py-3 text-sm text-white placeholder-[#8E8EA0] focus:outline-none focus:border-[#10A37F] transition-all"
          />
          <button 
            type="submit" 
            disabled={loading || googleLoading}
            className="w-full bg-[#10A37F] hover:bg-[#0E8F6F] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Continue'}
          </button>
        </form>

        {statusMessage && (
          <div className={`mt-4 p-3 rounded-xl text-sm ${
            statusMessage.includes('Error') 
              ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
              : 'bg-[#10A37F]/10 border border-[#10A37F]/20 text-[#10A37F]'
          }`}>
            {statusMessage}
          </div>
        )}

        <p className="text-xs text-[#8E8EA0] text-center mt-6">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-white">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

// ==========================================
// MAIN CHAT INTERFACE
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      
      if (data.session) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('is_subscribed, accepted_terms, accepted_privacy')
          .eq('id', data.session.user.id)
          .single()
        
        setProfile(userProfile)
      }
      
      setIsLoading(false)
    }
    init()
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  useEffect(() => { 
    if(scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight 
    }
  }, [messages])

  // Auto-focus input after first message
  useEffect(() => {
    if (messages.length > 0 && inputRef.current) {
      inputRef.current.focus()
    }
  }, [messages.length])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    // Check if user needs to authenticate or start trial
    if (!session) {
      setAuthModalMessage('Start your free trial to continue')
      setShowAuthModal(true)
      return
    }

    // Check if user accepted terms
    if (!profile?.accepted_terms || !profile?.accepted_privacy) {
      router.push('/accept-terms')
      return
    }

    // Check if user has subscription or trial
    if (!profile?.is_subscribed) {
      router.push('/pricing')
      return
    }

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(p => [...p, newMsg])
    setInput('')
    const img = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    setMessages(p => [...p, { role: 'assistant', content: 'Analyzing your compliance query...' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], image: img })
      })
      
      if (res.status === 401) {
        setShowAuthModal(true)
        setMessages(p => p.slice(0, -1))
        return
      }
      
      if (res.status === 429) {
        const data = await res.json()
        setMessages(p => {
          const u = [...p]
          u[u.length - 1].content = `⚠️ ${data.error}\n\nPlease upgrade your plan or wait until your limit resets.`
          return u
        })
        return
      }
      
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
    } finally { 
      setIsSending(false) 
    }
  }

  const handleImage = (e) => {
    if (e.target.files?.[0]) {
      if (!session) {
        setAuthModalMessage('Image analysis requires an account')
        setShowAuthModal(true)
        return
      }
      const r = new FileReader()
      r.onloadend = () => setSelectedImage(r.result)
      r.readAsDataURL(e.target.files[0])
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
  }

  if (isLoading) return (
    <div className="h-screen w-full bg-[#212121] flex items-center justify-center fixed inset-0">
      <div className="w-6 h-6 border-2 border-[#10A37F] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const hasStartedChat = messages.length > 0

  return (
    <>
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        message={authModalMessage}
      />

      <div className="flex h-screen w-full bg-[#212121] text-[#ECECEC] overflow-hidden fixed inset-0">
        
        {/* Sidebar Overlay (Mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#171717] transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}>
          <div className="p-3 border-b border-[#2F2F2F]">
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#565869] hover:bg-[#2F2F2F] text-sm text-white transition-colors"
            >
              <Icons.Plus />
              New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-xs text-[#8E8EA0] text-center py-8">
              {session ? 'Your chats appear here' : 'Sign in to save chats'}
            </div>
          </div>

          <div className="p-3 border-t border-[#2F2F2F]">
            {session ? (
              <div>
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-[#10A37F] flex items-center justify-center text-white font-bold text-xs">
                    {session.user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{session.user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#565869] hover:bg-[#2F2F2F] text-xs text-[#C5C5C5] hover:text-white transition-colors"
                >
                  <Icons.SignOut />
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-[#10A37F] hover:bg-[#0E8F6F] text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                Sign up or log in
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative min-w-0">
          <header className="h-14 border-b border-[#2F2F2F] flex items-center justify-between px-4 shrink-0 bg-[#212121]">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#C5C5C5] hover:text-white">
              <Icons.Menu />
            </button>
            <div className="flex-1 text-center lg:text-left lg:pl-4">
              <h1 className="text-base font-semibold text-white">protocolLM</h1>
            </div>
            <div className="flex items-center gap-3">
              {!session && (
                <>
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="text-sm text-[#C5C5C5] hover:text-white transition-colors hidden sm:block"
                  >
                    Log in
                  </button>
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="bg-[#10A37F] hover:bg-[#0E8F6F] text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto" ref={scrollRef}>
            {!hasStartedChat ? (
              // ChatGPT-style Empty State with centered input
              <div className="h-full flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-3xl">
                  {/* Hero Section */}
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#10A37F] mb-6">
                      <Icons.Sparkles />
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-semibold text-white mb-4">
                      What can I help with?
                    </h2>
                    {!session && (
                      <p className="text-[#C5C5C5] text-sm">
                        Start your free trial to unlock AI-powered compliance guidance
                      </p>
                    )}
                  </div>

                  {/* Sample Prompts */}
                  <div className="grid sm:grid-cols-2 gap-3 mb-12">
                    {[
                      { title: 'Temperature Control', prompt: 'What are the temperature requirements for cold holding?' },
                      { title: 'Handwashing', prompt: 'Where should handwashing sinks be located?' },
                      { title: 'Food Storage', prompt: 'How should I store raw meat in the refrigerator?' },
                      { title: 'Inspection Prep', prompt: 'What should I prepare before a health inspection?' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(item.prompt)
                          if (inputRef.current) inputRef.current.focus()
                        }}
                        className="text-left p-4 rounded-2xl border border-[#2F2F2F] hover:border-[#565869] hover:bg-[#2F2F2F] transition-all group"
                      >
                        <h3 className="text-white font-medium text-sm mb-1 group-hover:text-[#10A37F]">{item.title}</h3>
                        <p className="text-[#8E8EA0] text-xs">{item.prompt}</p>
                      </button>
                    ))}
                  </div>

                  {/* Input Bar (Tilted/Elongated) */}
                  <div className="relative">
                    {selectedImage && (
                      <div className="mb-3 p-2 bg-[#2F2F2F] rounded-lg flex items-center justify-between">
                        <span className="text-xs text-[#C5C5C5]">Image attached</span>
                        <button onClick={() => setSelectedImage(null)} className="text-white hover:text-red-400">
                          <Icons.X />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSend} className="relative">
                      <div className="flex items-center gap-2 bg-[#2F2F2F] rounded-full px-5 py-4 border border-[#565869] focus-within:border-[#8E8EA0] shadow-2xl hover:shadow-[#10A37F]/10 transition-shadow">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[#C5C5C5] hover:text-white transition-colors p-1 shrink-0"
                          title="Upload image"
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
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Message protocolLM"
                          className="flex-1 bg-transparent border-none text-base text-white placeholder-[#8E8EA0] focus:outline-none min-w-0"
                        />
                        <button 
                          type="submit"
                          disabled={(!input.trim() && !selectedImage) || isSending}
                          className="text-white bg-[#10A37F] hover:bg-[#0E8F6F] disabled:bg-[#565869] disabled:cursor-not-allowed transition-colors p-2 rounded-full shrink-0"
                        >
                          <Icons.Send />
                        </button>
                      </div>
                    </form>
                    <p className="text-xs text-[#8E8EA0] text-center mt-4">
                      protocolLM can make mistakes. Check important info with your health department.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Full Chat View
              <>
                <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-32">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role !== 'user' && (
                        <div className="w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center shrink-0">
                          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                          </svg>
                        </div>
                      )}
                      <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-[#2F2F2F] rounded-3xl px-5 py-3' : ''}`}>
                        {msg.image && (
                          <img src={msg.image} alt="Upload" className="rounded-xl mb-3 max-h-60 object-contain" />
                        )}
                        <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fixed Bottom Input */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#212121] border-t border-[#2F2F2F] p-4">
                  <div className="max-w-3xl mx-auto">
                    {selectedImage && (
                      <div className="mb-3 p-2 bg-[#2F2F2F] rounded-lg flex items-center justify-between">
                        <span className="text-xs text-[#C5C5C5]">Image attached</span>
                        <button onClick={() => setSelectedImage(null)} className="text-white hover:text-red-400">
                          <Icons.X />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSend} className="relative">
                      <div className="flex items-center gap-2 bg-[#2F2F2F] rounded-3xl px-4 py-3 border border-[#565869] focus-within:border-[#8E8EA0]">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[#C5C5C5] hover:text-white transition-colors p-1"
                          title="Upload image"
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
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Message protocolLM"
                          className="flex-1 bg-transparent border-none text-[15px] text-white placeholder-[#8E8EA0] focus:outline-none min-w-0"
                        />
                        <button 
                          type="submit"
                          disabled={(!input.trim() && !selectedImage) || isSending}
                          className="text-[#C5C5C5] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1 shrink-0"
                        >
                          <Icons.Send />
                        </button>
                      </div>
                    </form>
                    <p className="text-xs text-[#8E8EA0] text-center mt-3">
                      protocolLM can make mistakes. Check important info with your health department.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
