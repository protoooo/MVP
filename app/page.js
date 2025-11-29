'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { compressImage } from '@/lib/imageCompression'

// ==========================================
// ICONS
// ==========================================
const Icons = {
  Menu: () => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Send: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>, // Updated to arrow style
  SignOut: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  X: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>,
  Plus: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Upload: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>, // Paperclip style
  User: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Settings: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  ArrowUp: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>,
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

  // Use the ENV variable, fallback to window only if necessary
  const getRedirectUrl = () => {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      return `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
    }
    return typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage('')

    const redirectUrl = getRedirectUrl()
    console.log('📧 Email redirect:', redirectUrl)

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
    console.log('🔐 Google redirect:', redirectUrl)

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
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#212121] border border-[#424242] rounded-2xl w-full max-w-md p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">{message || 'Welcome back'}</h2>
            <p className="text-sm text-[#B4B4B4]">Sign in to continue</p>
          </div>
          <button onClick={onClose} className="text-[#B4B4B4] hover:text-white transition-colors">
            <Icons.X />
          </button>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          className="w-full bg-white hover:bg-gray-100 text-black font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 mb-4"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/></svg>
          )}
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#424242]"></div></div>
          <div className="relative flex justify-center text-xs"><span className="bg-[#212121] px-3 text-[#B4B4B4]">OR</span></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full bg-[#0A0A0A] border border-[#424242] rounded-lg px-4 py-3 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#3E7BFA] transition-all"
          />
          <button type="submit" disabled={loading || googleLoading} className="w-full bg-[#3E7BFA] hover:bg-[#3469d4] text-white font-medium py-3 rounded-lg transition-colors">
            {loading ? 'Sending...' : 'Continue with Email'}
          </button>
        </form>

        {statusMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${statusMessage.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
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
      setIsLoading(false)
    }
    init()

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
    return () => subscription.unsubscribe()
  }, [supabase])

  // Handle Logout - explicit reset
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setMessages([])
    setShowUserMenu(false)
    router.refresh() // Force server refresh
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    if (!session) {
      setAuthModalMessage('Sign in to start chatting')
      setShowAuthModal(true)
      return
    }

    // Basic Subscription/Terms check
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

    setMessages(p => [...p, { role: 'assistant', content: '' }]) // Placeholder

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

  // Input Box Component to reuse logic for Center vs Bottom
  const InputBox = ({ centered = false }) => (
    <div className={`relative w-full ${centered ? 'max-w-2xl' : 'max-w-3xl mx-auto'}`}>
        {selectedImage && (
            <div className="mb-2 p-2 bg-[#212121] rounded-lg inline-flex items-center gap-2 border border-[#424242]">
                <span className="text-xs text-white">Image attached</span>
                <button onClick={() => setSelectedImage(null)} className="text-white hover:text-red-400"><Icons.X/></button>
            </div>
        )}
        <form onSubmit={handleSend} className="relative flex items-end w-full p-3 bg-[#212121] border border-[#424242] rounded-3xl shadow-sm focus-within:border-[#676767] transition-colors">
            <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[#B4B4B4] hover:text-white transition-colors"
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
            
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    }
                }}
                placeholder="Message protocolLM..."
                className="flex-1 max-h-[200px] min-h-[24px] py-2 px-3 bg-transparent border-none focus:ring-0 resize-none text-white placeholder-[#676767] leading-6"
                rows={1}
                style={{ height: 'auto', overflowY: 'hidden' }} // Simple auto-grow
            />
            
            <button 
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isSending}
                className={`p-1.5 rounded-lg transition-all ${
                    (input.trim() || selectedImage) && !isSending 
                    ? 'bg-white text-black' 
                    : 'bg-[#2F2F2F] text-[#676767] cursor-not-allowed'
                }`}
            >
                <Icons.ArrowUp />
            </button>
        </form>
    </div>
  )

  if (isLoading) return <div className="h-screen w-screen bg-[#0A0A0A] text-white flex items-center justify-center">Loading...</div>

  return (
    <>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />

      <div className="flex h-screen w-screen bg-[#0A0A0A] text-white overflow-hidden font-sans">
        
        {/* Mobile Overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#000000] border-r border-[#212121] transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="p-3">
            <button onClick={() => { setMessages([]); setInput(''); setSelectedImage(null); }} className="flex items-center justify-between w-full px-3 py-2 text-sm text-white bg-transparent hover:bg-[#212121] rounded-lg transition-colors group">
              <span className="flex items-center gap-2"><div className="w-6 h-6 bg-white rounded-full flex items-center justify-center"><Icons.Plus /></div> New chat</span>
              <span className="text-[#B4B4B4] group-hover:text-white"><Icons.Menu /></span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="text-xs text-[#676767] font-medium px-2 py-4">Today</div>
            {/* Recent chats would go here */}
          </div>

          {session ? (
            <div className="p-2 border-t border-[#212121]">
               <div className="relative">
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 w-full px-2 py-3 hover:bg-[#212121] rounded-xl transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {session.user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{session.user.email}</div>
                    </div>
                  </button>
                  {/* User Dropdown */}
                  {showUserMenu && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-[#212121] border border-[#424242] rounded-xl shadow-xl overflow-hidden z-50">
                        <button onClick={() => router.push('/pricing')} className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#2F2F2F] flex items-center gap-2">
                            <Icons.Settings /> Manage Subscription
                        </button>
                        <div className="h-px bg-[#424242] mx-2"></div>
                        <button onClick={handleSignOut} className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-[#2F2F2F] flex items-center gap-2">
                            <Icons.SignOut /> Log out
                        </button>
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="p-3 border-t border-[#212121]">
                <button onClick={() => setShowAuthModal(true)} className="w-full bg-[#3E7BFA] hover:bg-[#3469d4] text-white font-bold py-2 rounded-lg text-sm transition-colors">
                    Sign up
                </button>
                <button onClick={() => setShowAuthModal(true)} className="w-full mt-2 text-[#B4B4B4] hover:text-white text-sm py-2">
                    Log in
                </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative min-w-0 bg-[#212121] lg:bg-[#212121]">
            {/* Header (Mobile Only) */}
            <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between p-2 bg-[#212121] border-b border-[#212121] text-gray-200">
                <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-[#2F2F2F] rounded-md"><Icons.Menu /></button>
                <span className="font-semibold text-white">protocolLM</span>
                <button onClick={() => setMessages([])} className="p-2 hover:bg-[#2F2F2F] rounded-md"><Icons.Plus /></button>
            </div>

            {/* Chat Container */}
            <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                {messages.length === 0 ? (
                    /* EMPTY STATE - CENTERED INPUT */
                    <div className="h-full flex flex-col items-center justify-center p-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-6">
                            <div className="w-8 h-8 bg-black rounded-full" />
                        </div>
                        <h1 className="text-2xl font-semibold text-white mb-8">What can I help with?</h1>
                        <InputBox centered={true} />
                        <div className="mt-8 flex flex-wrap justify-center gap-2">
                            {/* Tags or suggestions if wanted, user requested removal of templates */}
                        </div>
                    </div>
                ) : (
                    /* ACTIVE CHAT STATE */
                    <div className="flex flex-col w-full max-w-3xl mx-auto py-8 px-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`w-full mb-6 flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-full border border-[#424242] flex items-center justify-center shrink-0">
                                        <div className="w-5 h-5 bg-white rounded-full" />
                                    </div>
                                )}
                                
                                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[#2F2F2F] px-4 py-2.5 rounded-2xl' : ''}`}>
                                    {msg.image && <img src={msg.image} alt="Upload" className="rounded-xl mb-3 max-h-60 object-contain" />}
                                    <div className="text-white text-sm leading-7 whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </div>
                        ))}
                        <div className="h-32" /> {/* Spacer for fixed input */}
                    </div>
                )}
            </div>

            {/* FIXED BOTTOM INPUT (Only show when chat has messages) */}
            {messages.length > 0 && (
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-6 px-4">
                    <InputBox centered={false} />
                    <p className="text-center text-xs text-[#B4B4B4] mt-2">protocolLM can make mistakes. Verify important info.</p>
                </div>
            )}
        </main>
      </div>
    </>
  )
}
