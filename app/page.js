'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import SessionGuard from '@/components/SessionGuard'

// --- CONSTANTS ---
const COUNTY_LABELS = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County',
}

const COUNTY_SUGGESTIONS = {
  washtenaw: [], // removed sample questions
  wayne: [],
  oakland: [],
}

const START_HELP_TEXT =
  'Instant answers from Washtenaw County regulations, trained on 1,000+ local enforcement docs.'

function classNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

// --- AUTH MODAL (unchanged behavior from your old landing) ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)
  const supabase = createClient()

  useEffect(() => {
    setView(defaultView)
    setMessage(null)
  }, [isOpen, defaultView])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Google sign-in error:', error)
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { county: 'washtenaw' },
          },
        })
        if (error) throw error
        if (data?.user && !data?.session) {
          setMessage({ type: 'success', text: 'Check your email.' })
        } else if (data?.session) {
          window.location.href = '/accept-terms'
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed, accepted_terms, accepted_privacy')
          .eq('id', data.session.user.id)
          .single()

        if (!profile?.accepted_terms || !profile?.accepted_privacy) {
          window.location.href = '/accept-terms'
        } else if (profile?.is_subscribed) {
          window.location.href = '/'
        } else {
          window.location.href = '/pricing'
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <div className="w-full max-w-[380px] bg-[#1C1C1C] border border-[#2C2C2C] shadow-2xl p-8 rounded-md relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-lg font-medium text-[#EDEDED] tracking-tight">
            {view === 'signup' ? 'Create Account' : 'Sign In'}
          </h2>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 p-2.5 bg-[#232323] text-[#EDEDED] border border-[#333333] hover:bg-[#2C2C2C] hover:border-[#444] transition-all disabled:opacity-50 mb-6 rounded-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm font-medium">Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2C2C2C]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-[#1C1C1C] text-[#666]">Or</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2.5 bg-[#161616] border border-[#333333] focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/20 outline-none text-[#EDEDED] text-sm rounded-md transition-all placeholder-[#555]"
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-2.5 bg-[#161616] border border-[#333333] focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/20 outline-none text-[#EDEDED] text-sm rounded-md transition-all placeholder-[#555]"
            placeholder="Password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3ECF8E] hover:bg-[#34b27b] text-[#151515] font-semibold py-2.5 rounded-md text-sm transition-all disabled:opacity-50 mt-2 shadow-[0_0_10px_rgba(62,207,142,0.2)]"
          >
            {loading
              ? 'Processing...'
              : view === 'signup'
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        {message && (
          <p
            className={classNames(
              'mt-4 text-xs text-center',
              message.type === 'error' ? 'text-red-400' : 'text-green-400'
            )}
          >
            {message.text}
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-[#2C2C2C] text-center">
          <button
            onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
            className="text-xs text-[#888] hover:text-[#3ECF8E] transition-colors"
          >
            {view === 'signup'
              ? 'Have an account? Sign in'
              : 'No account? Sign up'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- MAIN CHAT PAGE (landing + real product) ---
function MainContent() {
  const router = useRouter()
  const supabase = createClient()

  // chat state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [activeCounty] = useState('washtenaw')

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)

  // auth state
  const [userId, setUserId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('signup')

  // simple mount animation
  const [mounted, setMounted] = useState(false)

  const canUseAssistant = !authLoading && !!userId && isSubscribed

  // load user + subscription
  useEffect(() => {
    let cancelled = false
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) {
            setUserId(null)
            setIsSubscribed(false)
          }
          return
        }
        if (!cancelled) {
          setUserId(user.id)
          setUserEmail(user.email || '')
        }

        // check subscription / trial flag
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', user.id)
          .single()

        if (!cancelled) {
          if (!error && profile) {
            setIsSubscribed(!!profile.is_subscribed)
          } else {
            setIsSubscribed(false)
          }
        }
      } catch (err) {
        console.error('Error loading user', err)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }
    loadUser()
    setMounted(true)
    return () => {
      cancelled = true
    }
  }, [supabase])

  // scroll on new messages
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeImage = () => setSelectedImage(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleUnauthedFocusOrKey = (e) => {
    e.preventDefault()
    router.push('/pricing')
  }

  async function handleSend(e) {
    if (e) e.preventDefault()

    const trimmed = input.trim()
    if ((!trimmed && !selectedImage) || isSending) return

    if (!canUseAssistant) {
      // gate non-paid / non-trial to pricing
      router.push('/pricing')
      return
    }

    const newUserMessage = {
      role: 'user',
      content: trimmed,
      image: selectedImage,
    }

    const baseMessages = [...messages, newUserMessage]
    setMessages(baseMessages)
    setInput('')
    const imageToSend = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    // optimistic assistant placeholder
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: baseMessages,
          image: imageToSend,
          county: activeCounty,
        }),
      })

      if (!res.ok) {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Connection error. Please check your network.',
          }
          return updated
        })
        return
      }

      const data = await res.json()
      const replyText = data?.message || 'Error processing request.'

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: replyText,
        }
        return updated
      })
    } catch (err) {
      console.error('Chat error', err)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Network error. Please try again.',
        }
        return updated
      })
    } finally {
      setIsSending(false)
    }
  }

  const openAuth = (view) => {
    setAuthView(view)
    setShowAuth(true)
  }

  const isEmptyConversation = messages.length === 0
  const showCenterTagline = isEmptyConversation && input.trim().length === 0

  const inputShapePill = isEmptyConversation // pill before first real message

  return (
    <div className="min-h-screen w-full bg-[#121212] text-[#EDEDED] flex flex-col relative overflow-hidden">
      {/* background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#121212]">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/80" />
      </div>

      {/* NAVBAR (kept minimal, header above chat removed) */}
      <nav className="relative z-20 border-b border-[#2C2C2C] bg-[#121212]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <span className="text-lg font-bold tracking-tight text-[#EDEDED]">
              protocol<span className="text-[#3ECF8E]">LM</span>
            </span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-wide text-[#6B7280] border border-[#27272A] rounded-full px-2 py-0.5">
              {COUNTY_LABELS[activeCounty]}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!userId && (
              <>
                <button
                  onClick={() => openAuth('login')}
                  className="text-xs font-medium text-[#9CA3AF] hover:text-white transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => router.push('/pricing')}
                  className="text-xs font-semibold bg-[#3ECF8E] hover:bg-[#34b27b] text-[#111827] px-3 py-1.5 rounded-md shadow-[0_0_10px_rgba(62,207,142,0.2)] transition-all"
                >
                  Start trial
                </button>
              </>
            )}
            {userId && (
              <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                <span className="hidden sm:inline truncate max-w-[140px]">
                  {userEmail || 'Logged in'}
                </span>
                <span
                  className={classNames(
                    'w-1.5 h-1.5 rounded-full',
                    isSubscribed ? 'bg-[#3ECF8E]' : 'bg-amber-400'
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* SESSION GUARD */}
      {userId && <SessionGuard userId={userId} />}

      {/* MAIN CHAT */}
      <main className="relative z-10 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center">
          {/* message area */}
          <div
            ref={scrollRef}
            className="flex-1 w-full max-w-3xl mx-auto px-4 pt-6 pb-32 overflow-y-auto custom-scroll"
          >
            {showCenterTagline ? (
              <div className="h-full flex flex-col items-center justify-start pt-20 text-center">
                <p className="text-sm text-[#9CA3AF] max-w-xl leading-relaxed">
                  {START_HELP_TEXT}
                </p>
                {!canUseAssistant && !authLoading && (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[#FBBF24] hover:text-white transition-colors border border-[#4B5563] rounded-full px-4 py-1.5 bg-[#111827]/40"
                  >
                    Start your trial to run a live compliance query
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div
                      key={idx}
                      className={classNames(
                        'flex w-full',
                        isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={classNames(
                          'flex flex-col max-w-[85%]',
                          isUser ? 'items-end' : 'items-start'
                        )}
                      >
                        <span className="text-[10px] font-bold text-[#6B7280] mb-1 uppercase tracking-wider">
                          {isUser ? 'Operator' : 'System'}
                        </span>
                        <div
                          className={classNames(
                            'px-4 py-3 text-[14px] leading-relaxed border shadow-sm whitespace-pre-wrap',
                            isUser
                              ? 'bg-[#1F2933] text-white border-[#374151] rounded-2xl rounded-tr-sm'
                              : 'bg-[#020617] text-[#E5E7EB] border-[#1F2937] rounded-2xl rounded-tl-sm'
                          )}
                        >
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Upload"
                              className="mb-3 rounded border border-[#4B5563] max-h-64 w-auto"
                            />
                          )}
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {isSending && (
                  <div className="flex justify-start">
                    <span className="text-xs text-[#9CA3AF] animate-pulse font-medium">
                      Processing query…
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* bottom input */}
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent pt-4 pb-4">
            <div className="max-w-3xl mx-auto px-4">
              {/* image preview */}
              {selectedImage && (
                <div className="mb-3 inline-block relative">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="h-20 w-auto rounded-lg border border-[#4B5563] bg-black/40"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 border border-red-300 hover:bg-red-500 transition-colors"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}

              <form onSubmit={handleSend}>
                <div
                  className={classNames(
                    'relative flex items-center bg-[#020617] border border-[#374151] text-sm shadow-[0_0_25px_rgba(15,23,42,0.9)]',
                    inputShapePill ? 'rounded-full py-3 pl-11 pr-11' : 'rounded-2xl py-3 pl-11 pr-11'
                  )}
                >
                  {/* file button */}
                  <div className="absolute left-3 inset-y-0 flex items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                    <button
                      type="button"
                      onClick={
                        canUseAssistant
                          ? () => fileInputRef.current?.click()
                          : (e) => handleUnauthedFocusOrKey(e)
                      }
                      className="p-1.5 rounded-full text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#111827] transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* input */}
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={canUseAssistant ? handleKeyDown : handleUnauthedFocusOrKey}
                    onFocus={canUseAssistant ? undefined : handleUnauthedFocusOrKey}
                    placeholder={
                      canUseAssistant
                        ? 'Ask about cooling, walk-in temps, or enforcement steps…'
                        : 'Start your free trial to ask a compliance question…'
                    }
                    className="w-full bg-transparent text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none"
                  />

                  {/* send button */}
                  <div className="absolute right-3 inset-y-0 flex items-center">
                    <button
                      type="submit"
                      disabled={isSending}
                      className={classNames(
                        'w-8 h-8 flex items-center justify-center rounded-full transition-all',
                        input.trim() || selectedImage
                          ? 'bg-[#3ECF8E] hover:bg-[#34b27b] text-[#020617]'
                          : 'bg-[#111827] text-[#4B5563] cursor-not-allowed'
                      )}
                      onClick={canUseAssistant ? undefined : (e) => handleUnauthedFocusOrKey(e)}
                    >
                      {isSending ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 12h14M12 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              <p className="mt-2 text-[10px] text-[#6B7280] text-center">
                Responses are generated strictly from county, state, and FDA code where available.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-4 border-t border-[#111827] bg-[#020617]/95">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#6B7280]">
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-[#E5E7EB] transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-[#E5E7EB] transition-colors">
              Privacy
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
            <span className="uppercase tracking-wide">
              Wayne &amp; Oakland – in progress
            </span>
          </div>
          <span className="text-[#4B5563]">© 2025 protocolLM</span>
        </div>
      </footer>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultView={authView}
      />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}>
      <MainContent />
    </Suspense>
  )
}
