'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { compressImage } from '@/lib/imageCompression'

// ==========================================
// CUSTOM STYLES (Loader & Body Fix)
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #000000 !important;
      overscroll-behavior: none;
    }
    /* Loader for "Thinking" state */
    .loader {
      height: 20px;
      aspect-ratio: 2.5;
      --_g: no-repeat radial-gradient(farthest-side,#FFFFFF 90%,#0000);
      background:var(--_g), var(--_g), var(--_g), var(--_g);
      background-size: 20% 50%;
      animation: l43 1s infinite linear; 
    }
    @keyframes l43 {
      0%     {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
      16.67% {background-position: calc(0*100%/3) 0   ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
      33.33% {background-position: calc(0*100%/3) 100%,calc(1*100%/3) 0   ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
      50%    {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 100%,calc(2*100%/3) 0   ,calc(3*100%/3) 50% }
      66.67% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 100%,calc(3*100%/3) 0   }
      83.33% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 100%}
      100%   {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
    }
  `}</style>
)

// ==========================================
// ICONS
// ==========================================
const Icons = {
  Menu: () => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Send: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>,
  SignOut: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  X: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>,
  Plus: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Upload: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
  User: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Settings: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
}

// ==========================================
// INPUT COMPONENT
// ==========================================
const InputBox = ({ input, setInput, handleSend, handleImage, isSending, fileInputRef, selectedImage, setSelectedImage, inputRef }) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6">
      {selectedImage && (
        <div className="mb-2 p-2 bg-[#1C1C1C] rounded-lg inline-flex items-center gap-2 border border-[#2E2E2E]">
          <span className="text-xs text-[#A1A1AA]">Image attached</span>
          <button onClick={() => setSelectedImage(null)} className="text-white hover:text-red-400"><Icons.X /></button>
        </div>
      )}
      
      {/* Container */}
      <form
        onSubmit={handleSend}
        className="relative flex items-end w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded-[26px] shadow-lg transition-all focus-within:border-[#3E7BFA] focus-within:ring-1 focus-within:ring-[#3E7BFA]"
      >
        {/* Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-4 text-[#A1A1AA] hover:text-white transition-colors"
          title="Attach file"
        >
          <Icons.Upload />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImage}
          accept="image/*"
          className="hidden"
        />

        {/* Text Area */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
          placeholder="Ask anything..."
          className="flex-1 max-h-[200px] min-h-[52px] py-[14px] px-2 bg-transparent border-none focus:ring-0 resize-none text-white placeholder-[#71717A] text-[16px] leading-6"
          rows={1}
          style={{ height: 'auto', overflowY: 'hidden' }}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!input.trim() && !selectedImage) || isSending}
          className={`p-2 m-2 rounded-full transition-all ${
            (input.trim() || selectedImage) && !isSending
              ? 'bg-[#3E7BFA] text-white hover:bg-[#3469d4]'
              : 'bg-[#2E2E2E] text-[#71717A] cursor-not-allowed'
          }`}
        >
          <Icons.Send />
        </button>
      </form>
      <p className="text-center text-[11px] text-[#525252] mt-3">
        protocolLM can make mistakes. Verify important info.
      </p>
    </div>
  )
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

  const getRedirectUrl = () => {
    return `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage('')
    const redirectUrl = getRedirectUrl()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
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
    const redirectUrl = getRedirectUrl()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setStatusMessage('Error: ' + error.message)
      setGoogleLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#181818] border border-[#2E2E2E] rounded-xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">{message || 'Welcome to protocolLM'}</h2>
            <p className="text-sm text-[#888888]">Sign in to continue your session</p>
          </div>
          <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors">
            <Icons.X />
          </button>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          className="w-full bg-white hover:bg-gray-200 text-black font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 mb-4"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" /><path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" /><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" /><path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" /></svg>
          )}
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2E2E2E]"></div></div>
          <div className="relative flex justify-center text-xs"><span className="bg-[#181818] px-3 text-[#888888]">OR</span></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#666666] focus:outline-none focus:border-[#3E7BFA] transition-all"
          />
          <button type="submit" disabled={loading || googleLoading} className="w-full bg-[#3E7BFA] hover:bg-[#3469d4] text-white font-medium py-2.5 rounded-lg transition-colors">
            {loading ? 'Sending...' : 'Continue with Email'}
          </button>
        </form>

        {statusMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm border ${statusMessage.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// MAIN PAGE
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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)

        if (currentSession) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single()
          setProfile(userProfile)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    init()

    const timer = setTimeout(() => setIsLoading(false), 2000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase])

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (messages.length > 0 && inputRef.current && !isSending) {
      inputRef.current.focus()
    }
  }, [messages.length, isSending])

  const handleSignOut = async (e) => {
    if (e) {
        e.preventDefault()
        e.stopPropagation()
    }
    try {
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setMessages([])
      setShowUserMenu(false)
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = '/'
    }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    if (!session) {
      setAuthModalMessage('Sign up to start chatting')
      setShowAuthModal(true)
      return
    }

    if (profile) {
      if (!profile.accepted_terms || !profile.accepted_privacy) {
        router.push('/accept-terms')
        return
      }
      if (!profile.is_subscribed) {
        router.push('/pricing')
        return
      }
    }

    const newMsg = { role: 'user', content: input, image: selectedImage }
    setMessages(p => [...p, newMsg])
    setInput('')
    const img = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    // Add temporary assistant message for "thinking"
    setMessages(p => [...p, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMsg], image: img })
      })

      if (res.status === 401) {
        setShowAuthModal(true)
        setMessages(p => p.slice(0, -2))
        return
      }

      const data = await res.json()
      setMessages(p => {
        const u = [...p]
        u[u.length - 1].content = data.message || (data.error ? `Error: ${data.error}` : 'Error processing request.')
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

  const handleImage = async (e) => {
    if (e.target.files?.[0]) {
      if (!session) {
        setAuthModalMessage('Image analysis requires an account')
        setShowAuthModal(true)
        return
      }
      try {
        const compressed = await compressImage(e.target.files[0])
        setSelectedImage(compressed)
      } catch (error) {
        console.error(error)
      }
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setSidebarOpen(false)
  }

  if (isLoading) return <div className="fixed inset-0 bg-[#0A0A0A] text-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#3E7BFA] border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <>
      <GlobalStyles />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />
      
      <div className="fixed inset-0 w-full h-full bg-[#0A0A0A] text-white overflow-hidden font-sans flex">
        
        {/* Mobile Overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#000000] border-r border-[#1C1C1C] transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="p-3">
            <button onClick={handleNewChat} className="flex items-center justify-between w-full px-3 py-2 text-sm text-white bg-[#1C1C1C] border border-[#2E2E2E] hover:border-[#3E7BFA] rounded-lg transition-all group">
              <span className="flex items-center gap-2"><Icons.Plus /> New chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="text-xs text-[#525252] font-medium px-2 py-4 uppercase tracking-wider">Recent</div>
          </div>

          {session ? (
            <div className="p-3 border-t border-[#1C1C1C]">
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-[#1C1C1C] rounded-lg transition-colors text-left border border-transparent hover:border-[#2E2E2E]">
                  <div className="w-8 h-8 rounded-full bg-[#3E7BFA] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-900/20">
                    {session.user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{session.user.email}</div>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <button onClick={() => router.push('/pricing')} className="w-full px-4 py-3 text-left text-sm text-[#A1A1AA] hover:text-white hover:bg-[#262626] flex items-center gap-2">
                      <Icons.Settings /> Subscription
                    </button>
                    <div className="h-px bg-[#2E2E2E] mx-0"></div>
                    <button onClick={(e) => handleSignOut(e)} className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-[#262626] flex items-center gap-2">
                      <Icons.SignOut /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 border-t border-[#1C1C1C]">
              <button onClick={() => setShowAuthModal(true)} className="w-full bg-[#3E7BFA] hover:bg-[#3469d4] text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-lg shadow-blue-900/20">
                Sign in
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative min-w-0 bg-[#0A0A0A]">
          {/* Header (Mobile Only) */}
          <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between p-3 bg-[#0A0A0A] border-b border-[#1C1C1C] text-white">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-[#A1A1AA] hover:text-white"><Icons.Menu /></button>
            <span className="font-semibold text-sm">protocolLM</span>
            <button onClick={handleNewChat} className="p-1 text-[#A1A1AA] hover:text-white"><Icons.Plus /></button>
          </div>

          {!session ? (
            /* ================================== */
            /* LOGGED OUT VIEW (Centered) */
            /* ================================== */
            <div className="flex-1 flex flex-col items-center justify-center px-4 w-full h-full">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center tracking-tight">
                Washtenaw Food Safety
              </h1>
              <div className="w-full max-w-2xl">
                <InputBox
                  input={input}
                  setInput={setInput}
                  handleSend={handleSend}
                  handleImage={handleImage}
                  isSending={isSending}
                  fileInputRef={fileInputRef}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                  inputRef={inputRef}
                />
              </div>
            </div>
          ) : (
            /* ================================== */
            /* LOGGED IN VIEW (Chat) */
            /* ================================== */
            <>
              {/* Chat Container */}
              <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                    <h1 className="text-2xl font-semibold text-white mb-2">What can I help with?</h1>
                  </div>
                ) : (
                  <div className="flex flex-col w-full max-w-3xl mx-auto py-6 px-4 gap-6">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${
                          msg.role === 'user'
                            ? 'text-white px-2'
                            : 'text-[#EDEDED] px-2'
                        }`}>
                          {msg.image && <img src={msg.image} alt="Upload" className="rounded-lg mb-3 max-h-60 object-contain border border-white/10" />}
                          
                          {/* Display content or Loader if thinking */}
                          {msg.role === 'assistant' && msg.content === '' && isSending ? (
                             <div className="loader my-1"></div>
                          ) : (
                             <div className="text-[16px] leading-7 whitespace-pre-wrap">{msg.content}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Area (Bottom) */}
              <div className="w-full bg-[#0A0A0A] pt-2 shrink-0">
                <InputBox
                  input={input}
                  setInput={setInput}
                  handleSend={handleSend}
                  handleImage={handleImage}
                  isSending={isSending}
                  fileInputRef={fileInputRef}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                  inputRef={inputRef}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
