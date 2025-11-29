'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { compressImage } from '@/lib/imageCompression'

// ==========================================
// CUSTOM STYLES
// ==========================================
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #121212 !important; /* Updated from #000000 */
      overscroll-behavior: none;
    }
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
    
    /* Custom Scrollbar for Chat */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }

    /* Hide Scrollbar for Mode Bar */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
)

// ==========================================
// ICONS
// ==========================================
const Icons = {
  Menu: () => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  Send: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg)' }}>
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  ),
  SignOut: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  X: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>,
  Plus: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Upload: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
  Settings: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  ChatBubble: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  Tag: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  
  // --- MODE ICONS ---
  MessageSquare: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  Camera: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  ClipboardCheck: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  
  // NEW UTILITY ICONS
  Shield: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.572c-2.88 0-5.382-.874-6.86-2.195a1 1 0 00-1.396 1.135 12.001 12.001 0 006.583 9.473 1.002 1.002 0 001.346 0 12.001 12.001 0 006.583-9.473 1 1 0 00-1.396-1.135C15.382 5.698 12.88 6.572 12 6.572z" /></svg>,
  AcademicCap: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>,
  Table: () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
}

// ==========================================
// INPUT COMPONENT
// ==========================================
const InputBox = ({ input, setInput, handleSend, handleImage, isSending, fileInputRef, selectedImage, setSelectedImage, inputRef, activeMode, setActiveMode }) => {
  
  const handleModeClick = (mode) => {
    setActiveMode(mode)
    if (mode === 'image') {
      fileInputRef.current?.click()
    }
  }

  // Helper to determine active color
  const getActiveColor = () => {
    switch(activeMode) {
      case 'chat': return '#3E7BFA'; // Blue
      case 'image': return '#F5A623'; // Orange
      case 'audit': return '#FDD901'; // Yellow
      case 'critical': return '#EF4444'; // Red
      case 'training': return '#A855F7'; // Purple
      case 'sop': return '#3ECF8E'; // Green
      default: return '#3E7BFA';
    }
  }

  const activeColor = getActiveColor();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6">
      
      {/* SCROLLABLE MODE BAR */}
      <div className="flex items-center gap-1 mb-2 px-1 overflow-x-auto no-scrollbar pb-1">
        
        {/* Chat (Blue) */}
        <button onClick={() => handleModeClick('chat')} className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shrink-0 ${activeMode === 'chat' ? 'text-[#3E7BFA] bg-[#3E7BFA]/10' : 'text-[#525252] hover:text-[#EDEDED] hover:bg-[#1C1C1C]'}`}>
          <Icons.MessageSquare /> <span>Chat</span>
          {activeMode === 'chat' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#3E7BFA] rounded-full shadow-[0_0_8px_#3E7BFA]"></div>}
        </button>

        {/* Image (Orange) */}
        <button onClick={() => handleModeClick('image')} className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shrink-0 ${activeMode === 'image' || selectedImage ? 'text-[#F5A623] bg-[#F5A623]/10' : 'text-[#525252] hover:text-[#EDEDED] hover:bg-[#1C1C1C]'}`}>
          <Icons.Camera /> <span>Image</span>
          {(activeMode === 'image' || selectedImage) && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F5A623] rounded-full shadow-[0_0_8px_#F5A623]"></div>}
        </button>

        {/* Mock Audit (Yellow) */}
        <button onClick={() => handleModeClick('audit')} className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shrink-0 ${activeMode === 'audit' ? 'text-[#FDD901] bg-[#FDD901]/10' : 'text-[#525252] hover:text-[#EDEDED] hover:bg-[#1C1C1C]'}`}>
          <Icons.ClipboardCheck /> <span>Audit</span>
          {activeMode === 'audit' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FDD901] rounded-full shadow-[0_0_8px_#FDD901]"></div>}
        </button>

        {/* Crisis (Red - Shield) */}
        <button onClick={() => handleModeClick('critical')} className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shrink-0 ${activeMode === 'critical' ? 'text-[#EF4444] bg-[#EF4444]/10' : 'text-[#525252] hover:text-[#EDEDED] hover:bg-[#1C1C1C]'}`}>
          <Icons.Shield /> <span>Crisis</span>
          {activeMode === 'critical' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#EF4444] rounded-full shadow-[0_0_8px_#EF4444]"></div>}
        </button>

        {/* Training (Purple) */}
        <button onClick={() => handleModeClick('training')} className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shrink-0 ${activeMode === 'training' ? 'text-[#A855F7] bg-[#A855F7]/10' : 'text-[#525252] hover:text-[#EDEDED] hover:bg-[#1C1C1C]'}`}>
          <Icons.AcademicCap /> <span>Train</span>
          {activeMode === 'training' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#A855F7] rounded-full shadow-[0_0_8px_#A855F7]"></div>}
        </button>

        {/* SOPs (Green) */}
        <button onClick={() => handleModeClick('sop')} className={`relative group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shrink-0 ${activeMode === 'sop' ? 'text-[#3ECF8E] bg-[#3ECF8E]/10' : 'text-[#525252] hover:text-[#EDEDED] hover:bg-[#1C1C1C]'}`}>
          <Icons.Table /> <span>Logs</span>
          {activeMode === 'sop' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#3ECF8E] rounded-full shadow-[0_0_8px_#3ECF8E]"></div>}
        </button>

      </div>

      {selectedImage && (
        <div className="mb-2 mx-1 p-2 bg-[#1C1C1C] rounded-lg inline-flex items-center gap-2 border border-[#F5A623]/30">
          <span className="text-xs text-[#F5A623] font-medium flex items-center gap-1">
             <Icons.Camera /> Analyzing Image
          </span>
          <button onClick={() => { setSelectedImage(null); setActiveMode('chat') }} className="text-[#525252] hover:text-white"><Icons.X /></button>
        </div>
      )}
      
      {/* DYNAMIC BORDER COLOR FORM */}
      <form
        onSubmit={handleSend}
        className={`relative flex items-end w-full bg-[#161616] border rounded-lg shadow-sm transition-all duration-300 focus-within:ring-0 focus-within:outline-none`}
        style={{ 
          borderColor: activeMode === 'chat' ? '#2E2E2E' : `${activeColor}4D`, // 30% opacity for non-active border
          '--active-color': activeColor 
        }}
      >
        <style jsx>{`
          form:focus-within {
            border-color: var(--active-color) !important;
          }
        `}</style>

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
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
          placeholder={
            activeMode === 'chat' ? "Ask anything..." :
            activeMode === 'image' ? "Upload an image to analyze..." :
            activeMode === 'audit' ? "Describe area for mock audit..." :
            activeMode === 'critical' ? "Describe the emergency (e.g. power outage)..." :
            activeMode === 'training' ? "Topic for staff training (e.g. handwashing)..." :
            "What kind of log or SOP do you need?"
          }
          className="flex-1 max-h-[200px] min-h-[50px] py-[13px] px-4 bg-transparent border-none focus:ring-0 outline-none focus:outline-none resize-none text-white placeholder-[#525252] text-[15px] leading-6"
          rows={1}
          style={{ height: 'auto', overflowY: 'hidden' }}
        />

        <button
          type="submit"
          disabled={(!input.trim() && !selectedImage) || isSending}
          className="p-2.5 m-1.5 rounded-md border transition-all flex items-center justify-center"
          style={{
            backgroundColor: (!input.trim() && !selectedImage) ? '#2E2E2E' : activeColor,
            borderColor: (!input.trim() && !selectedImage) ? '#2E2E2E' : activeColor,
            color: (!input.trim() && !selectedImage) ? '#525252' : (activeMode === 'chat' || activeMode === 'critical' || activeMode === 'training') ? 'white' : 'black',
            cursor: (!input.trim() && !selectedImage) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icons.Send />
          )}
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
  
  // HISTORY STATES
  const [chatHistory, setChatHistory] = useState([]) 
  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // NEW: ACTIVE MODE STATE
  const [activeMode, setActiveMode] = useState('chat') // 'chat', 'image', 'audit', 'critical', 'training', 'sop'
  
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // 1. Check for redirection from Pricing page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('auth')) {
        setAuthModalMessage(params.get('auth') === 'signup' ? 'Create an account to subscribe' : 'Sign in to continue')
        setShowAuthModal(true)
        window.history.replaceState({}, '', '/')
      }
    }

    // 2. Init Auth
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
          loadChatHistory()
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
        loadChatHistory()
      } else {
        setProfile(null)
        setChatHistory([])
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase])

  const loadChatHistory = async () => {
    const { data: chats } = await supabase
      .from('chats')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
    if (chats) setChatHistory(chats)
  }

  const loadChat = async (chatId) => {
    setIsLoading(true)
    setCurrentChatId(chatId)
    setSidebarOpen(false) 
    
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      
    if (msgs) {
      setMessages(msgs.map(m => ({
        role: m.role,
        content: m.content,
        image: m.image
      })))
    }
    setIsLoading(false)
  }

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
    if (e && e.preventDefault) e.preventDefault()
    setSession(null)
    setProfile(null)
    setMessages([])
    setChatHistory([])
    setShowUserMenu(false)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      router.refresh()
      window.location.href = '/'
    }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    if (!session) {
      setAuthModalMessage('Start your 30-day free trial to chat')
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

    // --- MODIFY PROMPT BASED ON MODE ---
    let finalInput = input
    
    if (activeMode === 'audit') {
      finalInput = `[MOCK AUDIT MODE] Perform a strict mock health inspection audit based on this input: ${input}`
    } else if (activeMode === 'critical') {
      finalInput = `[CRITICAL EMERGENCY MODE] The user is reporting a food safety emergency. Provide immediate, step-by-step corrective actions based on Imminent Health Hazard protocols. Be concise and authoritative. Input: ${input}`
    } else if (activeMode === 'training') {
      finalInput = `[TRAINING GENERATOR MODE] Create a short, engaging staff training script and a 3-question quiz for kitchen staff regarding: ${input}`
    } else if (activeMode === 'sop') {
      finalInput = `[SOP/LOG GENERATOR MODE] Generate a clean Markdown table/form for a Standard Operating Procedure or Log Sheet regarding: ${input}`
    }

    const newMsg = { role: 'user', content: input, image: selectedImage } // Store original input for UI
    setMessages(p => [...p, newMsg])
    setInput('')
    const img = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    setMessages(p => [...p, { role: 'assistant', content: '' }])

    let activeChatId = currentChatId

    try {
      if (!activeChatId) {
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({ 
             user_id: session.user.id, 
             title: input.slice(0, 30) + '...' 
          })
          .select()
          .single()
        
        if (newChat) {
          activeChatId = newChat.id
          setCurrentChatId(newChat.id)
          loadChatHistory() 
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, { ...newMsg, content: finalInput }], // Send modified prompt
          image: img,
          chatId: activeChatId 
        })
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
        setActiveMode('image') // Auto-switch mode
      } catch (error) {
        console.error(error)
      }
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setCurrentChatId(null) 
    setSidebarOpen(false)
    setActiveMode('chat') // Reset mode
  }

  if (isLoading) return <div className="fixed inset-0 bg-[#121212] text-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <>
      <GlobalStyles />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} message={authModalMessage} />
      
      <div className="fixed inset-0 w-full h-full bg-[#121212] text-white overflow-hidden font-sans flex">
        
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#121212] border-r border-[#3ECF8E]/20 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="p-3">
            <button onClick={handleNewChat} className="flex items-center justify-between w-full px-3 py-2 text-sm text-white bg-[#1C1C1C] border border-[#2E2E2E] hover:border-[#3ECF8E] rounded-lg transition-all group">
              <span className="flex items-center gap-2"><Icons.Plus /> New chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <div className="text-xs text-[#525252] font-medium px-2 py-4 uppercase tracking-wider">Recent</div>
            <div className="space-y-1">
              {chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg truncate transition-colors flex items-center gap-2 ${
                    currentChatId === chat.id 
                      ? 'bg-[#1C1C1C] text-white border border-[#333]' 
                      : 'text-[#888] hover:text-[#EDEDED] hover:bg-[#111]'
                  }`}
                >
                  <Icons.ChatBubble />
                  <span className="truncate">{chat.title || 'New Chat'}</span>
                </button>
              ))}
            </div>
            
            {!session && (
              <div className="mt-4 px-1">
                 <button onClick={() => router.push('/pricing')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1C] rounded-lg transition-colors">
                    <Icons.Tag />
                    Pricing
                 </button>
              </div>
            )}
          </div>

          {session ? (
            <div className="p-3 border-t border-[#1C1C1C]">
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 w-full px-3 py-2 hover:bg-[#1C1C1C] rounded-lg transition-colors text-left border border-transparent hover:border-[#2E2E2E]">
                  <div className="w-8 h-8 rounded-full bg-[#3ECF8E] flex items-center justify-center text-xs font-bold text-[#050505] shadow-lg shadow-emerald-900/20">
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
              <button onClick={() => setShowAuthModal(true)} className="w-full bg-[#3ECF8E] hover:bg-[#34b27b] text-[#050505] font-medium py-2 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/20">
                Sign in
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative min-w-0 bg-[#121212]">
          <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between p-3 bg-[#121212] border-b border-[#1C1C1C] text-white">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-[#A1A1AA] hover:text-white"><Icons.Menu /></button>
            <span className="font-semibold text-sm">protocolLM</span>
            <button onClick={handleNewChat} className="p-1 text-[#A1A1AA] hover:text-white"><Icons.Plus /></button>
          </div>

          {!session ? (
            <div className="relative flex-1 flex flex-col items-center justify-center px-4 w-full h-full pb-20">
              
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => router.push('/pricing')}
                  className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors px-4 py-2"
                >
                  Pricing
                </button>
              </div>

              <button 
                onClick={() => setShowAuthModal(true)}
                className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 hover:border-[#3ECF8E] hover:bg-[#3ECF8E]/20 transition-all cursor-pointer group"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[#3ECF8E] text-xs font-bold uppercase tracking-wider group-hover:text-emerald-300">
                  Start 30-day free trial
                </span>
              </button>

              <h1 className="text-3xl md:text-5xl text-white mb-6 text-center tracking-tight font-sans font-semibold">
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
                  activeMode={activeMode}
                  setActiveMode={setActiveMode}
                />
              </div>
            </div>
          ) : (
            <>
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

              <div className="w-full bg-[#121212] pt-2 shrink-0">
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
                />
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
