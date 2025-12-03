'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'

// ==========================================
// CONFIG & DATA
// ==========================================

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const STRIPE_PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
const STRIPE_PRICE_ID_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL

const SOURCE_DOCUMENTS = [
  'Washtenaw Enforcement Actions',
  'Sanitizing Protocols',
  'FDA Food Code 2022',
  'Michigan Modified Food Code',
  'Emergency Action Plans',
  'Norovirus Cleaning Guidelines',
  'Fats, Oils, & Grease (FOG) Protocol',
  'Cross-Contamination Prevention',
  'Consumer Advisory Guidelines',
  'Allergen Awareness Standards',
  'Time & Temp Control (TCS)',
  'Food Labeling Guide',
  'Date Marking Guide',
  'USDA Safe Minimum Temps',
]

// ==========================================
// GLOBAL STYLES
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #020408;
      overscroll-behavior: none;
      height: 100dvh;
      width: 100%;
      max-width: 100dvw;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        Helvetica, Arial, sans-serif;
    }

    /* FLUID BACKGROUND ANIMATIONS */
    @keyframes blob {
      0% {
        transform: translate(0px, 0px) scale(1);
      }
      33% {
        transform: translate(30px, -50px) scale(1.05);
      }
      66% {
        transform: translate(-20px, 20px) scale(0.96);
      }
      100% {
        transform: translate(0px, 0px) scale(1);
      }
    }

    .animate-blob {
      animation: blob 18s infinite ease-in-out;
    }

    .animation-delay-2000 {
      animation-delay: 2s;
    }
    .animation-delay-4000 {
      animation-delay: 4s;
    }

    /* PREMIUM GLASS CARDS (more matte / understated) */
    .glass-panel {
      background: rgba(8, 12, 20, 0.9);
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      border-radius: 32px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 22px 60px -26px rgba(0, 0, 0, 0.85);
    }

    .glass-panel-soft {
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      box-shadow: 0 18px 40px -20px rgba(15, 23, 42, 0.85);
    }

    .pressable {
      transition: transform 0.12s cubic-bezier(0.3, 0.9, 0.4, 1.3),
        box-shadow 0.15s ease-out;
    }

    .pressable:active {
      transform: scale(0.96) translateY(1px);
      box-shadow: 0 12px 22px -16px rgba(0, 0, 0, 0.8);
    }

    /* LOADING */
    .loader {
      height: 20px;
      aspect-ratio: 2.5;
      --_g: no-repeat radial-gradient(farthest-side, #ffffff 90%, #0000);
      background: var(--_g), var(--_g), var(--_g), var(--_g);
      background-size: 20% 50%;
      animation: l43 1s infinite linear;
    }
    @keyframes l43 {
      0% {
        background-position: calc(0 * 100% / 3) 50%,
          calc(1 * 100% / 3) 50%,
          calc(2 * 100% / 3) 50%,
          calc(3 * 100% / 3) 50%;
      }
      16.67% {
        background-position: calc(0 * 100% / 3) 0,
          calc(1 * 100% / 3) 50%,
          calc(2 * 100% / 3) 50%,
          calc(3 * 100% / 3) 50%;
      }
      33.33% {
        background-position: calc(0 * 100% / 3) 100%,
          calc(1 * 100% / 3) 0,
          calc(2 * 100% / 3) 50%,
          calc(3 * 100% / 3) 50%;
      }
      50% {
        background-position: calc(0 * 100% / 3) 50%,
          calc(1 * 100% / 3) 100%,
          calc(2 * 100% / 3) 0,
          calc(3 * 100% / 3) 50%;
      }
      66.67% {
        background-position: calc(0 * 100% / 3) 50%,
          calc(1 * 100% / 3) 50%,
          calc(2 * 100% / 3) 100%,
          calc(3 * 100% / 3) 0;
      }
      83.33% {
        background-position: calc(0 * 100% / 3) 50%,
          calc(1 * 100% / 3) 50%,
          calc(2 * 100% / 3) 50%,
          calc(3 * 100% / 3) 100%;
      }
      100% {
        background-position: calc(0 * 100% / 3) 50%,
          calc(1 * 100% / 3) 50%,
          calc(2 * 100% / 3) 50%,
          calc(3 * 100% / 3) 50%;
      }
    }

    @keyframes popIn {
      0% {
        opacity: 0;
        transform: translateY(4px) scale(0.97);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .animate-pop-in {
      animation: popIn 0.26s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    }

    /* Custom Scrollbar for Cards */
    .card-scroll::-webkit-scrollbar {
      width: 4px;
    }
    .card-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .card-scroll::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.45);
      border-radius: 999px;
    }
    .card-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(248, 250, 252, 0.65);
    }
  `}</style>
)

// ==========================================
// ICONS (minimal, consistent, no “vibe” fluff)
// ==========================================
const Icons = {
  ArrowUp: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  ),
  SignOut: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M4 19h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4" />
    </svg>
  ),
  X: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 18L18 6" />
      <path d="M6 6l12 12" />
    </svg>
  ),
  Plus: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  Settings: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .35 1.98l.03.03a2 2 0 0 1-2.83 2.83l-.03-.03a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.08 1.65V21a2 2 0 0 1-4 0v-.05A1.8 1.8 0 0 0 8.8 19.3a1.8 1.8 0 0 0-2 .36l-.03.03a2 2 0 1 1-2.83-2.83l.03-.03A1.8 1.8 0 0 0 4.7 15a1.8 1.8 0 0 0-1.65-1.08H3A2 2 0 0 1 3 10h.05A1.8 1.8 0 0 0 4.7 8.3a1.8 1.8 0 0 0-.35-1.98l-.03-.03A2 2 0 1 1 7.15 3.5l.03.03a1.8 1.8 0 0 0 2 .36H9.2A1.8 1.8 0 0 0 10.28 2.2 2 2 0 0 1 14 3v.05A1.8 1.8 0 0 0 15.2 4.7a1.8 1.8 0 0 0 2-.36l.03-.03a2 2 0 1 1 2.83 2.83l-.03.03a1.8 1.8 0 0 0-.36 2z" />
    </svg>
  ),
  Camera: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h2.3a2 2 0 0 0 1.8-1.1l.7-1.4A2 2 0 0 1 10.5 3h3a2 2 0 0 1 1.8 1.1l.7 1.4A2 2 0 0 0 17.8 7H20a2 2 0 0 1 2 2v8.5A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5V9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  MessageSquare: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10h.01M12 10h.01M17 10h.01" />
      <path d="M5 20.5 7.5 18H19a2 2 0 0 0 2-2V6.5A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5v9A2.5 2.5 0 0 0 5.5 18H7" />
    </svg>
  ),
  Check: ({ className = '' }: { className?: string }) => (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  Book: () => (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
    </svg>
  ),
}

// ==========================================
// FLUID BACKGROUND
// ==========================================
const FluidBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-[#020408]">
    <div className="absolute top-[-16%] left-[-18%] w-[70vw] h-[70vw] bg-emerald-900/60 rounded-full mix-blend-screen filter blur-[140px] opacity-35 animate-blob" />
    <div className="absolute bottom-[-20%] right-[-18%] w-[70vw] h-[70vw] bg-sky-900/70 rounded-full mix-blend-screen filter blur-[140px] opacity-40 animate-blob animation-delay-2000" />
    <div
      className="absolute inset-0 opacity-[0.06] pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2310202e'/%3E%3Cstop offset='1' stop-color='%2308141e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23g)' fill-opacity='0.7' d='M0 0h160v160H0z'/%3E%3C/svg%3E")`,
      }}
    />
  </div>
)

// ==========================================
// INPUT BOX
// ==========================================
const InputBox = ({
  input,
  setInput,
  handleSend,
  handleImage,
  isSending,
  fileInputRef,
  selectedImage,
  setSelectedImage,
  inputRef,
  activeMode,
  setActiveMode,
  session,
}: any) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const handleModeClick = (mode: 'chat' | 'image') => {
    setActiveMode(mode)
    setShowMenu(false)
    if (mode === 'image' && session) fileInputRef.current?.click()
    if (mode === 'chat') inputRef.current?.focus()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto px-3 md:px-4 pb-6 md:pb-4 z-20 relative">
      {selectedImage && (
        <div className="mb-2 mx-1 px-3 py-2 glass-panel-soft rounded-xl inline-flex items-center gap-2 shadow-sm animate-pop-in">
          <span className="text-xs text-slate-100 font-medium flex items-center gap-2">
            <Icons.Camera />
            Image attached
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedImage(null)
              setActiveMode('chat')
            }}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            <Icons.X />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="relative flex items-end w-full px-2 py-2 glass-panel-soft rounded-[999px] shadow-2xl transition-all duration-300 border border-slate-600/40 bg-slate-950/80"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImage}
          accept="image/*"
          className="hidden"
        />

        {/* Mode Switcher */}
        <div className="relative flex-shrink-0 mb-1 ml-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className={`w-10 h-10 flex items-center justify-center rounded-full pressable ${
              showMenu
                ? 'bg-slate-100 text-slate-900'
                : 'bg-slate-700/60 text-slate-100 hover:bg-slate-500/80'
            }`}
          >
            <Icons.Plus />
          </button>

          {showMenu && (
            <div className="absolute bottom-full left-0 mb-3 w-[180px] bg-slate-950/95 border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden animate-pop-in z-50 p-1">
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleModeClick('chat')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs md:text-sm font-medium rounded-xl transition-colors ${
                    activeMode === 'chat'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <Icons.MessageSquare />
                  <span>Regulatory consult</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeClick('image')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs md:text-sm font-medium rounded-xl transition-colors ${
                    activeMode === 'image'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <Icons.Camera />
                  <span>Visual inspection</span>
                </button>
              </div>
            </div>
          )}
        </div>

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
          placeholder={
            activeMode === 'chat'
              ? 'Ask a compliance question...'
              : 'Upload a photo to inspect a potential violation...'
          }
          className="flex-1 max-h-[220px] min-h-[44px] py-3 px-3 bg-transparent border-none focus:ring-0 focus:outline-none appearance-none resize-none text-slate-50 placeholder-slate-500 text-[15px] leading-6"
          rows={1}
          style={{
            height: 'auto',
            overflowY: 'hidden',
            outline: 'none',
            boxShadow: 'none',
            WebkitAppearance: 'none',
          }}
        />

        {/* Send */}
        <button
          type="submit"
          disabled={(!input.trim() && !selectedImage) || isSending}
          className={`w-10 h-10 rounded-full flex items-center justify-center pressable flex-shrink-0 mb-1 mr-1 ${
            (!input.trim() && !selectedImage) || isSending
              ? 'bg-slate-700/40 text-slate-400 cursor-not-allowed'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-lg'
          }`}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icons.ArrowUp />
          )}
        </button>
      </form>
    </div>
  )
}

// ==========================================
// AUTH MODAL
// ==========================================
const AuthModal = ({
  isOpen,
  onClose,
  message,
}: {
  isOpen: boolean
  onClose: () => void
  message: string
}) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const supabase = createClient()

  const getRedirectUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    return `${baseUrl}/auth/callback`
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    })
    if (error) setStatusMessage('Error: ' + error.message)
    else setStatusMessage('✓ Check your email for the login link.')
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setStatusMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
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
    <div
      className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel-soft w-full max-w-md p-7 md:p-8 shadow-2xl animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-slate-50 mb-1">
              {message || 'Welcome to protocolLM'}
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Sign in to access your compliance workspace.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 border border-transparent font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-3 mb-4"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.55 0 9s.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/60" />
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-slate-950 px-3 text-slate-500">OR</span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Work email address"
            required
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-200 transition-all"
          />
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Sending link…' : 'Continue with email link'}
          </button>
        </form>

        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs md:text-sm border ${
              statusMessage.includes('Error')
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// PRICING OVERLAY
// ==========================================
const FullScreenPricing = ({
  handleCheckout,
  loading,
  onSignOut,
}: {
  handleCheckout: (priceId: string, planName: string) => void
  loading: string | null
  onSignOut: (e?: any) => void
}) => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>(
    'month',
  )

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-md glass-panel shadow-2xl animate-pop-in flex flex-col p-7 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onSignOut}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <Icons.X />
        </button>

        <h3 className="text-[10px] font-semibold text-slate-300 tracking-[0.28em] uppercase mb-3 mt-1 text-center">
          protocolLM
        </h3>

        {/* Billing toggle */}
        <div className="flex justify-center mb-7">
          <div className="bg-slate-900/80 p-1 rounded-full flex border border-slate-700/60">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.15em] transition-all ${
                billingInterval === 'month'
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${
                billingInterval === 'year'
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Annual
              <span className="bg-emerald-400 text-slate-900 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide">
                SAVE $100
              </span>
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline text-slate-50 justify-center mb-3">
          <span className="text-5xl md:text-6xl font-semibold tracking-tight font-sans">
            {billingInterval === 'month' ? '$50' : '$500'}
          </span>
          <span className="ml-2 text-slate-400 text-xs md:text-sm font-semibold uppercase tracking-[0.18em]">
            /{billingInterval === 'month' ? 'month' : 'year'}
          </span>
        </div>
        <p className="text-xs md:text-sm text-slate-300 text-center mb-7 leading-relaxed px-3">
          Washtenaw County–specific food safety intelligence for licensed food
          service establishments.
          <span className="block text-slate-50 font-medium mt-1.5">
            Reduce critical violations. Protect your license.
          </span>
        </p>

        {/* Features */}
        <ul className="space-y-3.5 mb-7 flex-1 border-t border-slate-700/60 pt-5 text-sm">
          <li className="flex items-start gap-3 text-slate-200">
            <Icons.Check className="text-emerald-400 mt-0.5" />
            <span>Unlimited compliance Q&amp;A across all source documents</span>
          </li>
          <li className="flex items-start gap-3 text-slate-200">
            <Icons.Check className="text-emerald-400 mt-0.5" />
            <span>Visual inspection mode for photos of equipment and setup</span>
          </li>
          <li className="flex items-start gap-3 text-slate-200">
            <Icons.Check className="text-emerald-400 mt-0.5" />
            <span>Coverage of Washtenaw County policies and FDA Food Code</span>
          </li>
          <li className="flex items-start gap-3 text-slate-200">
            <Icons.Check className="text-emerald-400 mt-0.5" />
            <span>Mock audit flows for pre-inspection readiness</span>
          </li>
          <li className="flex items-start gap-3 text-slate-200">
            <Icons.Check className="text-emerald-400 mt-0.5" />
            <span>
              Licensed per location – unlimited logins for managers and staff
            </span>
          </li>
        </ul>

        <button
          onClick={() =>
            handleCheckout(
              billingInterval === 'month'
                ? (STRIPE_PRICE_ID_MONTHLY as string)
                : (STRIPE_PRICE_ID_ANNUAL as string),
              'protocollm',
            )
          }
          disabled={loading !== null}
          className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold py-3.5 rounded-full text-xs md:text-sm uppercase tracking-[0.18em] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading === 'protocollm'
            ? 'Processing…'
            : 'Start 7-day site license trial'}
        </button>
      </div>
    </div>
  )
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false) // reserved if you add sidebar later
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [activeMode, setActiveMode] = useState<'chat' | 'image'>('chat')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const triggerMode = (mode: 'chat' | 'image') => {
    if (!session) {
      setAuthModalMessage('Sign in to use this tool')
      setShowAuthModal(true)
      return
    }
    setActiveMode(mode)
    if (mode === 'image') {
      fileInputRef.current?.click()
    } else {
      inputRef.current?.focus()
    }
  }

  // Initial session & subscription load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('auth')) {
        setAuthModalMessage(
          params.get('auth') === 'signup'
            ? 'Create an account to subscribe'
            : 'Sign in to continue',
        )
        setShowAuthModal(true)
        window.history.replaceState({}, '', '/')
      }
    }

    const init = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()
        setSession(currentSession)

        if (currentSession) {
          const { data: activeSub } = await supabase
            .from('subscriptions')
            .select('status, current_period_end, plan, stripe_subscription_id')
            .eq('user_id', currentSession.user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()

          // Admin bypass
          if (currentSession.user.email === ADMIN_EMAIL) {
            setHasActiveSubscription(true)
            setShowPricingModal(false)
            await loadChatHistory()
            setIsLoading(false)
            return
          }

          if (!activeSub || !activeSub.current_period_end) {
            setHasActiveSubscription(false)
            setShowPricingModal(true)
            setIsLoading(false)
            return
          }

          const periodEnd = new Date(activeSub.current_period_end)
          if (periodEnd < new Date()) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', currentSession.user.id)
              .eq(
                'stripe_subscription_id',
                activeSub.stripe_subscription_id as string,
              )

            setHasActiveSubscription(false)
            setShowPricingModal(true)
            setIsLoading(false)
            return
          }

          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single()

          setProfile(userProfile)

          if (userProfile?.accepted_terms && userProfile?.accepted_privacy) {
            setHasActiveSubscription(true)
            setShowPricingModal(false)
            await loadChatHistory()
          } else {
            router.push('/accept-terms')
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }

    init()

    // Safety fallback
    const safetyTimer = setTimeout(() => setIsLoading(false), 2000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        if (session.user.email === ADMIN_EMAIL) {
          setHasActiveSubscription(true)
          setShowPricingModal(false)
          await loadChatHistory()
          return
        }
        const { data: activeSub } = await supabase
          .from('subscriptions')
          .select('status, current_period_end, plan, stripe_subscription_id')
          .eq('user_id', session.user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()

        if (
          activeSub &&
          activeSub.current_period_end &&
          new Date(activeSub.current_period_end) >= new Date()
        ) {
          setHasActiveSubscription(true)
          setShowPricingModal(false)
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(userProfile)
          if (!userProfile?.accepted_terms) router.push('/accept-terms')
          else await loadChatHistory()
        } else {
          setHasActiveSubscription(false)
          setShowPricingModal(true)
        }
      } else {
        setProfile(null)
        setChatHistory([])
        setHasActiveSubscription(false)
        setShowPricingModal(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadChatHistory = async () => {
    const { data: chats } = await supabase
      .from('chats')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
    if (chats) setChatHistory(chats)
  }

  const loadChat = async (chatId: string) => {
    setIsLoading(true)
    setCurrentChatId(chatId)
    setSidebarOpen(false)
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    if (msgs) {
      setMessages(
        msgs.map((m) => ({
          role: m.role,
          content: m.content,
          image: m.image,
        })),
      )
    }
    setIsLoading(false)
  }

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    if (!confirm('Delete chat?')) return
    setChatHistory((prev) => prev.filter((c) => c.id !== chatId))
    if (currentChatId === chatId) handleNewChat()
    await supabase.from('chats').delete().eq('id', chatId)
    await loadChatHistory()
  }

  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault()
    setSession(null)
    setProfile(null)
    setMessages([])
    setChatHistory([])
    setShowUserMenu(false)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error(error)
    } finally {
      router.refresh()
      window.location.href = '/'
    }
  }

  const handleCheckout = async (priceId: string, planName: string) => {
    const checkoutTimeout = setTimeout(() => {
      setCheckoutLoading(null)
      alert('Connection timeout. Please try again.')
    }, 15000)
    setCheckoutLoading(planName)

    if (!priceId) {
      clearTimeout(checkoutTimeout)
      alert('Error: Price ID missing. Please check configuration.')
      setCheckoutLoading(null)
      return
    }
    if (!session) {
      clearTimeout(checkoutTimeout)
      setShowPricingModal(false)
      setAuthModalMessage('Create an account to subscribe')
      setShowAuthModal(true)
      setCheckoutLoading(null)
      return
    }

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()
      if (!currentSession) {
        clearTimeout(checkoutTimeout)
        alert('Session expired.')
        return
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'API Error')
      const data = await res.json()
      if (data.url) {
        clearTimeout(checkoutTimeout)
        window.location.href = data.url
      } else {
        throw new Error('No URL returned')
      }
    } catch (error: any) {
      clearTimeout(checkoutTimeout)
      alert(`Checkout failed: ${error.message}`)
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleSend = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return
    if (!session) {
      setAuthModalMessage('Start trial to chat')
      setShowAuthModal(true)
      return
    }
    if (!hasActiveSubscription) {
      setShowPricingModal(true)
      return
    }

    const userMessage = {
      role: 'user',
      content: input,
      image: selectedImage,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    const imageToSend = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    // Placeholder assistant message for streaming UX
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    let activeChatId = currentChatId

    try {
      if (!activeChatId) {
        const { data: newChat } = await supabase
          .from('chats')
          .insert({
            user_id: session.user.id,
            title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
          })
          .select()
          .single()
        if (newChat) {
          activeChatId = newChat.id
          setCurrentChatId(newChat.id)
          await loadChatHistory()
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { ...userMessage }],
          image: imageToSend,
          chatId: activeChatId,
          mode: activeMode,
        }),
      })

      if (res.status === 401) {
        setAuthModalMessage('Sign in to continue')
        setShowAuthModal(true)
        setMessages((prev) => prev.slice(0, -2))
        return
      }
      if (res.status === 402) {
        setShowPricingModal(true)
        setMessages((prev) => prev.slice(0, -2))
        return
      }
      if (res.status === 403) {
        router.push('/accept-terms')
        setMessages((prev) => prev.slice(0, -2))
        return
      }

      const data = await res.json()
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1].content =
          data.message || (data.error ? `Error: ${data.error}` : 'Error.')
        return updated
      })
    } catch (err) {
      console.error(err)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1].content = 'Network error.'
        return updated
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!session) {
      setAuthModalMessage('Login required')
      setShowAuthModal(true)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large (max 10MB).')
      return
    }
    if (!file.type.startsWith('image/')) {
      alert('Only image files are supported.')
      return
    }
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
      setActiveMode('image')
    } catch (error) {
      console.error(error)
      alert('There was an issue processing the image.')
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setCurrentChatId(null)
    setSidebarOpen(false)
    setActiveMode('chat')
  }

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input after messages update
  useEffect(() => {
    if (messages.length > 0 && inputRef.current && !isSending) {
      inputRef.current.focus()
    }
  }, [messages.length, isSending])

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#020408] text-white flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Logged in but no active subscription => force pricing overlay
  if (session && !hasActiveSubscription) {
    return (
      <>
        <GlobalStyles />
        <FullScreenPricing
          handleCheckout={handleCheckout}
          loading={checkoutLoading}
          onSignOut={handleSignOut}
        />
      </>
    )
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <>
      <GlobalStyles />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message={authModalMessage}
      />
      {showPricingModal && (
        <FullScreenPricing
          handleCheckout={handleCheckout}
          loading={checkoutLoading}
          onSignOut={handleSignOut}
        />
      )}

      <div className="relative min-h-screen w-full overflow-hidden font-sans selection:bg-emerald-300/40">
        {/* BACKGROUND */}
        {!session && <FluidBackground />}
        {session && <div className="fixed inset-0 bg-[#050509] z-0" />}

        {/* CONTENT LAYER */}
        <div className="relative z-10 flex flex-col h-[100dvh]">
          {/* HEADER */}
          <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-5 shrink-0 text-white">
            <div className="font-semibold tracking-tight text-xl md:text-2xl font-sans flex items-baseline gap-1.5">
              <span className="text-slate-100">protocol</span>
              <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                LM
              </span>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {!session && (
                <>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em] pressable shadow-lg whitespace-nowrap"
                  >
                    Start free trial
                  </button>
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className="text-[11px] md:text-xs font-medium text-slate-300 hover:text-slate-50 transition-colors hidden sm:block"
                  >
                    Pricing
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-[11px] md:text-xs font-medium border border-slate-600 px-4 py-1.5 rounded-full hover:bg-slate-800/70 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}

              {session && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNewChat}
                    className="p-2 rounded-full hover:bg-slate-800/70 text-slate-100 transition-colors pressable"
                    title="New conversation"
                  >
                    <Icons.Plus />
                  </button>
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="w-8 h-8 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-xs font-semibold tracking-wide"
                    >
                      {session.user.email[0].toUpperCase()}
                    </button>
                    {showUserMenu && (
                      <div className="absolute top-full right-0 mt-2 w-52 bg-slate-950 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-pop-in">
                        <button
                          onClick={() => setShowPricingModal(true)}
                          className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:text-slate-50 hover:bg-slate-800/70 flex items-center gap-2"
                        >
                          <Icons.Settings />
                          Manage subscription
                        </button>
                        <div className="h-px bg-slate-800 mx-0" />
                        <button
                          onClick={(e) => handleSignOut(e)}
                          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-800/70 flex items-center gap-2"
                        >
                          <Icons.SignOut />
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* MAIN */}
          <main className="flex-1 flex flex-col items-center justify-start px-4 w-full pb-20 md:pb-0 overflow-y-auto">
            {/* LOGGED OUT: LANDING */}
            {!session ? (
              <div className="w-full h-full flex flex-col items-center justify-center pb-[10vh]">
                {/* HERO TEXT – single line on desktop */}
                <div className="text-center px-4 max-w-3xl mb-10 mx-auto">
                  <h1 className="text-lg md:text-[1.9rem] font-medium tracking-[0.22em] text-slate-100/90 uppercase md:whitespace-nowrap">
                    Trained on Washtenaw County Food Safety Protocols
                  </h1>
                </div>

                {/* TWO PRIMARY CARDS */}
                <div className="w-full max-w-5xl px-2 md:px-4 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 z-20">
                  {/* Visual Inspection Card */}
                  <button
                    onClick={() => triggerMode('image')}
                    className="group relative glass-panel h-[410px] w-full pressable transition-all duration-400 text-left flex flex-col overflow-hidden border border-slate-700/70 hover:border-emerald-400/60"
                  >
                    {/* Header */}
                    <div className="px-9 pt-8 pb-4 shrink-0 bg-gradient-to-b from-slate-100/6 via-transparent to-transparent">
                      <p className="text-[10px] font-semibold tracking-[0.26em] text-emerald-300/90 uppercase mb-3">
                        Visual risk assessment
                      </p>
                      <h2 className="text-2xl md:text-[1.6rem] font-semibold text-slate-50 mb-1 tracking-tight">
                        Visual inspection
                      </h2>
                      <p className="text-[11px] text-slate-300/80 font-medium">
                        Priority &amp; Priority Foundation violations
                      </p>
                    </div>

                    {/* Body */}
                    <div className="px-9 pb-9 pt-2 flex-1 overflow-y-auto card-scroll relative">
                      <p className="text-slate-200/90 text-sm leading-relaxed mb-5">
                        Upload a photo of your kitchen, equipment, or storage
                        area. Get a structured read on possible violations
                        aligned with the Michigan Modified Food Code.
                      </p>
                      <div className="space-y-3.5 border-t border-slate-700/70 pt-5 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <p className="text-slate-300">
                            Flag Priority (P) vs. Core issues in-line with
                            inspection language.
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <p className="text-slate-300">
                            Visual checks for raw over RTE, improper thawing,
                            and cold holding.
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <p className="text-slate-300">
                            Surfaces, utensils, and equipment condition
                            (biofilm, pitting, seams).
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <p className="text-slate-300">
                            Verify handwashing stations, sink set-ups, and FOG
                            controls.
                          </p>
                        </div>
                      </div>

                      {/* Soft fade to avoid “black line” */}
                      <div
                        className="absolute bottom-0 left-0 w-full h-11 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(2,4,8,0.94), rgba(2,4,8,0))',
                        }}
                      />
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-4 border-t border-slate-800/80 bg-slate-950/60">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-100 tracking-[0.22em] uppercase">
                        <span>Start visual scan</span>
                        <span className="text-lg group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Regulatory Consult Card */}
                  <button
                    onClick={() => triggerMode('chat')}
                    className="group relative glass-panel h-[410px] w-full pressable transition-all duration-400 text-left flex flex-col overflow-hidden border border-slate-700/70 hover:border-sky-400/60"
                  >
                    {/* Header */}
                    <div className="px-9 pt-8 pb-4 shrink-0 bg-gradient-to-b from-slate-100/6 via-transparent to-transparent">
                      <p className="text-[10px] font-semibold tracking-[0.26em] text-sky-300/90 uppercase mb-3">
                        Code &amp; enforcement
                      </p>
                      <h2 className="text-2xl md:text-[1.6rem] font-semibold text-slate-50 mb-1 tracking-tight">
                        Regulatory consult
                      </h2>
                      <p className="text-[11px] text-slate-300/80 font-medium">
                        Michigan Modified Food Code &amp; Washtenaw policies
                      </p>
                    </div>

                    {/* Body */}
                    <div className="px-9 pb-9 pt-2 flex-1 overflow-y-auto card-scroll relative">
                      <p className="text-slate-200/90 text-sm leading-relaxed mb-5">
                        Ask policy questions the same way you’d ask an
                        inspector. Responses are grounded in the underlying
                        code, with citations you can use for staff training.
                      </p>
                      <div className="space-y-3.5 border-t border-slate-700/70 pt-5 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                          <p className="text-slate-300">
                            Clarify Washtenaw-specific enforcement expectations.
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                          <p className="text-slate-300">
                            SOP drafts for cooling, reheating, sanitizing, and
                            date-marking.
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                          <p className="text-slate-300">
                            Emergency action plan references (power loss, water
                            interruption).
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                          <p className="text-slate-300">
                            Code citations you can paste into corrective action
                            logs.
                          </p>
                        </div>
                      </div>

                      <div
                        className="absolute bottom-0 left-0 w-full h-11 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(2,4,8,0.94), rgba(2,4,8,0))',
                        }}
                      />
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-4 border-t border-slate-800/80 bg-slate-950/60">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-100 tracking-[0.22em] uppercase">
                        <span>Search regulations</span>
                        <span className="text-lg group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Footer links */}
                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 text-[10px] md:text-xs text-slate-400 pb-7 z-10 mt-10">
                  <div className="flex gap-4">
                    <Link
                      href="/privacy"
                      className="hover:text-slate-100 transition-colors"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/terms"
                      className="hover:text-slate-100 transition-colors"
                    >
                      Terms of Service
                    </Link>
                  </div>
                  <span className="hidden md:inline text-slate-600">|</span>
                  <span className="text-slate-500 hover:text-slate-100 transition-colors text-center md:text-left">
                    Built for Washtenaw County operators. Contact:{' '}
                    <span className="underline underline-offset-2">
                      austinrnorthrop@gmail.com
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              // LOGGED IN: CHAT EXPERIENCE
              <>
                <div className="flex-1 overflow-y-auto w-full" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-100">
                      <div className="mb-6 p-4 rounded-full bg-slate-900/80 border border-slate-700/70 text-slate-200">
                        {activeMode === 'image' ? <Icons.Camera /> : <Icons.Book />}
                      </div>
                      <h1 className="text-xl md:text-2xl font-semibold mb-2 font-sans">
                        {activeMode === 'image'
                          ? 'Visual inspection mode'
                          : 'Regulatory consultant mode'}
                      </h1>
                      <p className="text-slate-400 text-sm max-w-sm">
                        {activeMode === 'image'
                          ? 'Upload a photo of your operation to screen for potential Priority (P) and Priority Foundation (Pf) violations before an inspection.'
                          : 'Ask specific questions about the Michigan Modified Food Code or Washtenaw County enforcement so you can correct issues before they show up on your report.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col w-full max-w-3xl mx-auto py-5 px-3 md:px-4 gap-4 md:gap-5">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex ${
                            msg.role === 'user'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] ${
                              msg.role === 'user'
                                ? 'bg-slate-100 text-slate-950 px-4 py-3 rounded-2xl shadow-sm'
                                : 'bg-slate-900/80 border border-slate-800/80 px-4 py-3 rounded-2xl text-slate-100'
                            }`}
                          >
                            {msg.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={msg.image}
                                alt="Uploaded"
                                className="rounded-xl mb-3 max-h-60 object-contain border border-slate-700/70 bg-slate-950"
                              />
                            )}
                            {msg.role === 'assistant' &&
                            msg.content === '' &&
                            isSending &&
                            idx === messages.length - 1 ? (
                              <div className="loader my-1" />
                            ) : (
                              <div className="text-[15px] leading-7 whitespace-pre-wrap">
                                {msg.content}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* INPUT BAR */}
                <div className="w-full bg-slate-950/90 backdrop-blur-md pt-2 pb-4 md:pb-5 shrink-0 z-20 border-t border-slate-800/80">
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
                    activeMode={activeMode}
                    setActiveMode={setActiveMode}
                    session={session}
                  />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
