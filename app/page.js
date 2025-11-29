'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import SessionGuard from '@/components/SessionGuard'

// --- CONSTANTS (from Documents page) ---
const COUNTY_LABELS: Record<string, string> = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County',
}

const COUNTY_SUGGESTIONS: Record<string, string[]> = {
  washtenaw: [
    'What happens if my walk-in is at 48°F during an inspection?',
    'How fast do I have to cool chili from 135°F to 41°F?',
    'What is considered an imminent health hazard?',
    'Do I have to throw away food if an employee vomits?',
  ],
  wayne: [],
  oakland: [],
}

const AUDIT_CHECKLIST = [
  {
    category: 'Temperature Control',
    items: [
      { id: 'cold_holding', label: 'Cold holding at 41°F or below', critical: true },
      { id: 'hot_holding', label: 'Hot holding at 135°F or above', critical: true },
      { id: 'cooking_temps', label: 'Proper cooking temperatures documented', critical: true },
      { id: 'cooling', label: 'Cooling procedures (135°F to 70°F in 2hrs)', critical: true },
      { id: 'thermometers', label: 'Calibrated thermometers available', critical: false },
    ],
  },
  {
    category: 'Personal Hygiene',
    items: [
      { id: 'handwashing', label: 'Handwashing sinks accessible and stocked', critical: true },
      { id: 'hand_antiseptic', label: 'Hand antiseptic used properly', critical: false },
      { id: 'no_bare_hand', label: 'No bare hand contact with RTE foods', critical: true },
      { id: 'hair_restraints', label: 'Hair restraints worn properly', critical: false },
      { id: 'jewelry', label: 'No jewelry on hands/arms', critical: false },
    ],
  },
  {
    category: 'Cross Contamination',
    items: [
      { id: 'storage_separation', label: 'Raw meats stored below RTE foods', critical: true },
      { id: 'cutting_boards', label: 'Color-coded cutting boards used', critical: false },
      { id: 'wiping_cloths', label: 'Wiping cloths stored in sanitizer', critical: false },
      { id: 'equipment_cleaning', label: 'Food contact surfaces sanitized', critical: true },
    ],
  },
]

function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

// --- AUTH MODAL (from landing) ---
const AuthModal = ({
  isOpen,
  onClose,
  defaultView = 'login',
}: {
  isOpen: boolean
  onClose: () => void
  defaultView?: 'login' | 'signup'
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [view, setView] = useState<'login' | 'signup'>(defaultView)
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
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed, accepted_terms, accepted_privacy')
          .eq('id', data.session.user.id)
          .single()

        if (!profile?.accepted_terms || !profile?.accepted_privacy) {
          window.location.href = '/accept-terms'
        } else if (profile?.is_subscribed) {
          // You *could* redirect to '/' now that home is the main console.
          window.location.href = '/documents'
        } else {
          window.location.href = '/pricing'
        }
      }
    } catch (error: any) {
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {message && (
          <p
            className={classNames(
              'mt-4 text-xs text-center',
              message.type === 'error' ? 'text-red-400' : 'text-[#3ECF8E]'
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
            {view === 'signup' ? 'Have an account? Sign in' : 'No account? Sign up'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- CHAT + AUDIT CONSOLE (from Documents page, adapted) ---
type ConsoleProps = {
  onFirstInteraction?: () => void
  onRequireAuth?: () => void
}

const ComplianceConsole = ({ onFirstInteraction, onRequireAuth }: ConsoleProps) => {
  const router = useRouter()
  const supabase = createClient()

  // --- STATE (from DocumentsPage) ---
  const [activeTab, setActiveTab] = useState<'chat' | 'audit'>('chat')
  const [activeCounty] = useState<'washtenaw' | 'wayne' | 'oakland'>('washtenaw')
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<'guest' | 'starter' | 'pro' | 'enterprise'>('guest')
  const [loadingUser, setLoadingUser] = useState(true)

  // Mock Audit State
  const [auditResults, setAuditResults] = useState<Record<string, 'pass' | 'fail' | 'na' | undefined>>({})
  const [auditNotes, setAuditNotes] = useState<Record<string, string>>({})
  const [auditImages, setAuditImages] = useState<Record<string, string>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const auditImageInputRef = useRef<HTMLInputElement | null>(null)
  const [currentAuditImageItem, setCurrentAuditImageItem] = useState<string | null>(null)

  // --- EFFECTS ---
  useEffect(() => {
    let cancelled = false
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) {
            setUserPlan('guest')
            setLoadingUser(false)
          }
          return
        }
        if (!cancelled) {
          setUserEmail(user.email || '')
          setUserId(user.id)

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan')
            .eq('user_id', user.id)
            .single()

          if (sub?.plan) {
            setUserPlan(sub.plan as any)
          } else {
            setUserPlan('starter')
          }
        }
      } catch (err) {
        console.error('Error loading user', err)
      } finally {
        if (!cancelled) setLoadingUser(false)
      }
    }
    loadUser()
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // --- HANDLERS ---
  const markInteracted = () => {
    if (!hasInteracted) {
      setHasInteracted(true)
      onFirstInteraction?.()
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeImage = () => setSelectedImage(null)

  const handleAuditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && currentAuditImageItem) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAuditImages((prev) => ({
          ...prev,
          [currentAuditImageItem]: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
    setCurrentAuditImageItem(null)
  }

  const triggerAuditImageUpload = (itemId: string) => {
    setCurrentAuditImageItem(itemId)
    auditImageInputRef.current?.click()
  }

  const removeAuditImage = (itemId: string) => {
    setAuditImages((prev) => {
      const newImages = { ...prev }
      delete newImages[itemId]
      return newImages
    })
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()

    const trimmed = input.trim()
    if ((!trimmed && !selectedImage) || isSending) return

    markInteracted()

    const newUserMessage = {
      role: 'user',
      content: trimmed,
      image: selectedImage,
    }

    setMessages((prev) => [...prev, newUserMessage])
    setInput('')
    const imageToSend = selectedImage
    setSelectedImage(null)
    setIsSending(true)

    // Placeholder assistant bubble
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMessage],
          image: imageToSend,
          county: activeCounty,
        }),
      })

      if (res.status === 401) {
        // Unauthenticated
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content:
              'You need a ProtocolLM account to use the live console. Click “Log in” or “Start Free Trial” to continue.',
          }
          return updated
        })
        onRequireAuth?.()
        return
      }

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
      console.error(err)
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

  const handleSuggestionClick = (text: string) => {
    markInteracted()
    setInput(text)
    if (inputRef.current) inputRef.current.focus()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUserId(null)
    setUserEmail('')
    setUserPlan('guest')
    router.push('/')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Audit logic
  const handleAuditChange = (itemId: string, status: 'pass' | 'fail' | 'na') => {
    setAuditResults((prev) => ({ ...prev, [itemId]: status }))
  }

  const handleNoteChange = (itemId: string, note: string) => {
    setAuditNotes((prev) => ({ ...prev, [itemId]: note }))
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  const generateAuditReport = () => {
    const totalItems = AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)
    const completedItems = Object.keys(auditResults).length
    const failedItems = Object.values(auditResults).filter((v) => v === 'fail').length

    let report = `PROTOCOL_LM AUDIT REPORT\n`
    report += `Date: ${new Date().toLocaleString()}\n`
    report += `Items Checked: ${completedItems}/${totalItems}\n`
    report += `Issues Found: ${failedItems}\n`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Audit-Report.txt`
    a.click()
  }

  const clearAudit = () => {
    if (confirm('Clear audit data?')) {
      setAuditResults({})
      setAuditNotes({})
      setAuditImages({})
    }
  }

  const suggestions = COUNTY_SUGGESTIONS[activeCounty] || []
  const hasMockAuditAccess = userPlan === 'pro' || userPlan === 'enterprise'

  return (
    <div className="w-full h-full bg-[#121212] text-[#EDEDED] flex rounded-md border border-[#2C2C2C] overflow-hidden">
      {/* SESSION GUARD */}
      {userId && <SessionGuard userId={userId} />}

      {/* SIDEBAR */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-[#1C1C1C] border-r border-[#2C2C2C] z-10">
        <div className="h-16 flex items-center px-6 border-b border-[#2C2C2C]">
          <div className="text-lg font-bold tracking-tight text-white">
            protocol<span className="text-[#3B82F6]">LM</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scroll">
          {/* Jurisdiction */}
          <div>
            <div className="px-2 mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">
                Jurisdiction
              </span>
            </div>
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium bg-[#252525] border border-[#3B82F6]/30 text-white shadow-sm cursor-default">
                <span>Washtenaw County</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium text-[#555] cursor-not-allowed border border-transparent">
                <span>Wayne County</span>
                <span className="text-[9px] uppercase tracking-wide font-bold opacity-50">Soon</span>
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium text-[#555] cursor-not-allowed border border-transparent">
                <span>Oakland County</span>
                <span className="text-[9px] uppercase tracking-wide font-bold opacity-50">Soon</span>
              </button>
            </div>
          </div>

          {/* Recent Inquiries */}
          <div className="flex-1">
            <div className="px-2 mb-3">
              <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">
                Recent Inquiries
              </span>
            </div>
            {messages.filter((m) => m.role === 'user').length === 0 ? (
              <div className="px-3 py-6 text-center border border-dashed border-[#333] rounded-md">
                <span className="text-[11px] text-[#555] font-medium">History Clear</span>
              </div>
            ) : (
              <div className="space-y-1">
                {messages
                  .filter((m) => m.role === 'user')
                  .slice(-6)
                  .reverse()
                  .map((m, idx) => (
                    <div
                      key={idx}
                      className="group relative flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-[#252525] transition-colors cursor-pointer border border-transparent hover:border-[#333]"
                    >
                      <div className="mt-1.5 w-1 h-1 rounded-full bg-[#555] group-hover:bg-[#3B82F6] transition-colors flex-shrink-0" />
                      <span className="text-[12px] text-[#CCC] font-medium line-clamp-1 truncate">
                        {m.content || 'Image Analysis'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-[#2C2C2C] bg-[#18181B]">
          <div className="flex items-center justify-between gap-3 p-2 rounded-md">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {loadingUser ? 'Guest' : userEmail || 'Guest'}
              </p>
              <p className="text-[10px] text-[#888] font-medium uppercase mt-0.5">
                {userPlan} Plan
              </p>
            </div>
            {userId && (
              <button
                onClick={handleSignOut}
                className="p-2 text-[#666] hover:text-white transition-colors"
                title="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#121212]">
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-[#121212]/80 backdrop-blur-md border-b border-[#2C2C2C] flex items-center justify-between px-4 md:px-6 z-10">
          <div className="flex items-center gap-4">
            <div className="lg:hidden text-lg font-bold text-white tracking-tight">
              protocol<span className="text-[#3B82F6]">LM</span>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-1.5 h-4 bg-[#3B82F6] rounded-sm" />
              <h1 className="text-sm font-bold text-white tracking-wide uppercase">
                Washtenaw Compliance Console
              </h1>
            </div>
          </div>
          <div className="lg:hidden flex bg-[#222] p-1 rounded border border-[#333]">
            <span className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white bg-[#333] rounded shadow-sm">
              W
            </span>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-[#2C2C2C] bg-[#121212] px-4 md:px-6 z-10">
          <button
            onClick={() => setActiveTab('chat')}
            className={classNames(
              'px-4 md:px-6 py-3 text-xs font-bold transition-colors relative uppercase tracking-wider',
              activeTab === 'chat'
                ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                : 'text-[#888] hover:text-white'
            )}
          >
            Assistant
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={classNames(
              'px-4 md:px-6 py-3 text-xs font-bold transition-colors relative flex items-center gap-2 uppercase tracking-wider',
              activeTab === 'audit'
                ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                : 'text-[#888] hover:text-white'
            )}
          >
            Protocol Audit
            {!hasMockAuditAccess && (
              <span className="text-[9px] bg-[#333] text-[#888] px-1.5 py-0.5 rounded font-bold border border-[#444]">
                LOCKED
              </span>
            )}
          </button>
        </div>

        {/* Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10 bg-[#121212]">
          {activeTab === 'chat' ? (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 lg:px-24 xl:px-32 py-8 custom-scroll space-y-6"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center min-h-[340px]">
                    <div className="w-12 h-12 bg-[#18181B] border border-[#333] rounded-lg flex items-center justify-center mb-4 shadow-lg">
                      <svg
                        className="w-6 h-6 text-[#3B82F6]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-white mb-4 tracking-wide text-center">
                      Train your team before the inspector arrives.
                    </h2>
                    <p className="text-xs md:text-sm text-[#888] mb-6 text-center max-w-xl">
                      Ask ProtocolLM real questions from your kitchen. Answers are grounded in{' '}
                      <span className="text-[#EDEDED] font-semibold">Washtenaw County</span>,{' '}
                      <span className="text-[#EDEDED] font-semibold">Michigan Food Law</span>, and the{' '}
                      <span className="text-[#EDEDED] font-semibold">FDA Food Code 2022</span>.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                      {suggestions.map((text, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(text)}
                          className="text-left p-4 rounded-lg bg-[#18181B] border border-[#2C2C2C] hover:border-[#3B82F6] hover:bg-[#252525] transition-all group"
                        >
                          <span className="text-[13px] text-[#CCC] font-medium leading-relaxed">
                            {text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
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
                            'flex flex-col max-w-[85%] lg:max-w-[60%]',
                            isUser ? 'items-end' : 'items-start'
                          )}
                        >
                          <span className="text-[10px] font-bold text-[#666] mb-1.5 px-1 uppercase tracking-wider">
                            {isUser ? 'Operator' : 'System'}
                          </span>
                          <div
                            className={classNames(
                              'px-5 py-3.5 text-[14px] leading-relaxed border shadow-sm',
                              isUser
                                ? 'bg-[#2C2C2C] text-white border-[#3F3F46] rounded-lg rounded-tr-sm'
                                : 'bg-[#18181B] text-[#E4E4E7] border-[#333] rounded-lg rounded-tl-sm'
                            )}
                          >
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Upload"
                                className="mb-3 rounded border border-[#444] max-h-64 w-auto"
                              />
                            )}
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                {isSending && (
                  <div className="flex justify-start pl-2">
                    <span className="text-xs text-[#666] animate-pulse font-medium">
                      Processing query...
                    </span>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <div className="flex-shrink-0 z-20 bg-[#121212] border-t border-[#2C2C2C] px-4 lg:px-20 pt-4 pb-safe">
                <div className="max-w-4xl mx-auto relative mb-4">
                  {selectedImage && (
                    <div className="absolute -top-24 left-0 p-2 bg-[#18181B] rounded-lg shadow-lg border border-[#333] animate-in fade-in slide-in-from-bottom-2">
                      <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded" />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-900/90 text-white rounded-full p-1 hover:bg-red-700 transition-colors border border-red-700"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSend} className="relative group">
                    {/* File Upload */}
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-[#666] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-all"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Text Input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSending}
                      placeholder="Ask protocolLM..."
                      className="block w-full pl-12 pr-14 py-3.5 bg-[#18181B] border border-[#333] rounded-xl text-sm text-[#EDEDED] placeholder-[#52525B] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/50 transition-all shadow-sm"
                    />

                    {/* Send Button */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <button
                        type="submit"
                        disabled={isSending || (!input.trim() && !selectedImage)}
                        className={classNames(
                          'p-2 rounded-lg transition-all duration-200 flex items-center justify-center',
                          input.trim() || selectedImage
                            ? 'bg-[#3B82F6] text-white shadow-md hover:bg-[#2563EB]'
                            : 'bg-[#27272A] text-[#444] cursor-not-allowed'
                        )}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                              strokeWidth={2.5}
                              d="M5 12h14M12 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          ) : (
            // AUDIT TAB
            <div className="flex-1 overflow-y-auto px-4 lg:px-32 py-8 custom-scroll bg-[#121212]">
              {!hasMockAuditAccess ? (
                <div className="max-w-xl mx-auto mt-20">
                  <div className="bg-[#1C1C1C] border border-[#333] rounded-lg p-8 text-center shadow-2xl">
                    <div className="w-12 h-12 bg-[#252525] rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-6 h-6 text-[#F59E0B]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Access Restricted</h3>
                    <p className="text-[#888] text-sm mb-6">
                      The Self-Audit Protocol is available on{' '}
                      <strong className="text-[#3B82F6]">Pro</strong> &{' '}
                      <strong className="text-[#3B82F6]">Enterprise</strong> plans.
                    </p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-2.5 rounded-md text-xs font-bold transition-colors uppercase tracking-wide"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-[#1C1C1C] rounded-lg border border-[#333] p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-white">Self-Audit Protocol</h2>
                        <p className="text-xs text-[#666] mt-1 uppercase tracking-wider font-bold">
                          {COUNTY_LABELS[activeCounty]}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={generateAuditReport}
                          disabled={Object.keys(auditResults).length === 0}
                          className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-md font-bold text-xs uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Export
                        </button>
                        <button
                          onClick={clearAudit}
                          className="px-4 py-2 bg-[#252525] hover:bg-[#333] text-[#CCC] border border-[#333] rounded-md font-bold text-xs uppercase tracking-wide transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] font-bold text-[#666] mb-2 uppercase tracking-widest">
                        <span>Completion Status</span>
                        <span>
                          {Object.keys(auditResults).length} /{' '}
                          {AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)}
                        </span>
                      </div>
                      <div className="w-full bg-[#111] rounded-full h-1.5 border border-[#222]">
                        <div
                          className="bg-[#3B82F6] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              (Object.keys(auditResults).length /
                                AUDIT_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={auditImageInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAuditImageSelect}
                  />

                  <div className="space-y-3">
                    {AUDIT_CHECKLIST.map((category) => {
                      const isExpanded = expandedCategories[category.category] !== false
                      const categoryItems = category.items
                      const checkedInCategory = categoryItems.filter(
                        (item) => auditResults[item.id]
                      ).length

                      return (
                        <div
                          key={category.category}
                          className="bg-[#1C1C1C] rounded-lg border border-[#333] overflow-hidden"
                        >
                          <button
                            onClick={() => toggleCategory(category.category)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#232323] transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <svg
                                className={classNames(
                                  'w-4 h-4 text-[#555] group-hover:text-[#3B82F6] transition-all',
                                  isExpanded ? 'rotate-90' : ''
                                )}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              <h3 className="text-sm font-bold text-[#EDEDED] uppercase tracking-wide">
                                {category.category}
                              </h3>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[#666] font-bold">
                                {checkedInCategory}/{categoryItems.length}
                              </span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-[#2C2C2C] bg-[#18181B]">
                              {category.items.map((item) => {
                                const status = auditResults[item.id]
                                const note = auditNotes[item.id] || ''
                                const image = auditImages[item.id]

                                return (
                                  <div
                                    key={item.id}
                                    className="px-6 py-4 border-b border-[#252525] last:border-b-0"
                                  >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                          <p className="text-[13px] text-[#D4D4D8] font-medium">
                                            {item.label}
                                          </p>
                                          {item.critical && (
                                            <span className="text-[9px] bg-[#7F1D1D]/30 text-[#FCA5A5] px-1.5 py-0.5 rounded border border-[#F87171]/30 font-bold uppercase tracking-wider">
                                              Critical
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'pass')}
                                          className={classNames(
                                            'px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all',
                                            status === 'pass'
                                              ? 'bg-[#064E3B] text-[#6EE7B7] border-[#059669]'
                                              : 'bg-[#222] text-[#666] border-[#333] hover:bg-[#2A2A2A]'
                                          )}
                                        >
                                          Pass
                                        </button>
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'fail')}
                                          className={classNames(
                                            'px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all',
                                            status === 'fail'
                                              ? 'bg-[#7F1D1D] text-[#FCA5A5] border-[#DC2626]'
                                              : 'bg-[#222] text-[#666] border-[#333] hover:bg-[#2A2A2A]'
                                          )}
                                        >
                                          Fail
                                        </button>
                                        <button
                                          onClick={() => handleAuditChange(item.id, 'na')}
                                          className={classNames(
                                            'px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all',
                                            status === 'na'
                                              ? 'bg-[#374151] text-[#D1D5DB] border-[#4B5563]'
                                              : 'bg-[#222] text-[#666] border-[#333] hover:bg-[#2A2A2A]'
                                          )}
                                        >
                                          N/A
                                        </button>
                                      </div>
                                    </div>

                                    {status && status !== 'na' && (
                                      <div className="mt-3 pl-1 flex flex-col gap-3">
                                        <textarea
                                          value={note}
                                          onChange={(e) =>
                                            handleNoteChange(item.id, e.target.value)
                                          }
                                          placeholder="Observations or corrective actions..."
                                          className="w-full px-3 py-2 text-xs bg-[#121212] border border-[#333] rounded text-[#CCC] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 resize-none"
                                          rows={2}
                                        />
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => triggerAuditImageUpload(item.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#2C2C2C] border border-[#333] rounded text-[10px] font-bold text-[#888] hover:text-white transition-colors uppercase tracking-wide"
                                          >
                                            <svg
                                              className="w-3.5 h-3.5"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                              />
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                              />
                                            </svg>
                                            {image ? 'Change Photo' : 'Add Evidence'}
                                          </button>
                                          {image && (
                                            <div className="relative group">
                                              <img
                                                src={image}
                                                alt="Proof"
                                                className="h-10 w-10 rounded border border-[#444] object-cover"
                                              />
                                              <button
                                                onClick={() => removeAuditImage(item.id)}
                                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <svg
                                                  className="w-2 h-2"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                  />
                                                </svg>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .pb-safe {
          padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
        }
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  )
}

// --- MAIN LANDING + CONSOLE WRAP ---
function MainContent() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [hasStartedChat, setHasStartedChat] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    const authParam = searchParams.get('auth')
    if (authParam === 'signup' || authParam === 'login') {
      setAuthView(authParam)
      setShowAuth(true)
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  const openAuth = (view: 'login' | 'signup') => {
    setAuthView(view)
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen w-full bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3ECF8E] selection:text-[#121212] flex flex-col relative overflow-hidden max-w-[100vw]">
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#121212]">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/80" />
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-0 border-b border-[#2C2C2C] bg-[#121212]/80 backdrop-blur-md">
        <div
          className={classNames(
            'w-full max-w-6xl flex justify-between items-center h-16 transition-all duration-1000',
            mounted ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-xl font-bold tracking-tight text-[#EDEDED]">
              protocol<span className="text-[#3ECF8E]">LM</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => router.push('/pricing')}
              className="text-xs font-medium text-[#888] hover:text-white transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => openAuth('login')}
              className="text-xs font-medium text-[#888] hover:text-white transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="bg-[#3ECF8E] hover:bg-[#34b27b] text-[#151515] px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-[0_0_10px_rgba(62,207,142,0.15)]"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* BODY */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-10 flex flex-col gap-6 relative z-10 min-h-[calc(100vh-64px)]">
        {/* HERO ONLY BEFORE CHAT STARTS */}
        {!hasStartedChat && (
          <div className="w-full max-w-5xl text-center mx-auto mb-2 mt-4">
            <h1
              className={classNames(
                'text-3xl md:text-4xl lg:text-5xl font-medium text-[#EDEDED] tracking-tight leading-tight mb-6 transition-all duration-1000 md:whitespace-nowrap',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: '200ms' }}
            >
              Train your team before the inspector arrives
            </h1>

            <div
              className={classNames(
                'flex flex-wrap justify-center gap-3 mb-4 transition-all duration-1000',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: '300ms' }}
            >
              <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#3ECF8E]/30 rounded px-3 py-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E]" />
                <span className="text-[11px] font-medium text-[#EDEDED] uppercase tracking-wide">
                  Washtenaw County
                </span>
              </div>
              <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#333] rounded px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#444]" />
                <span className="text-[11px] font-medium text-[#888] uppercase tracking-wide">
                  Michigan Food Law
                </span>
              </div>
              <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#333] rounded px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#444]" />
                <span className="text-[11px] font-medium text-[#888] uppercase tracking-wide">
                  FDA Code 2022
                </span>
              </div>
            </div>

            {/* Mobile CTA */}
            <div
              className={classNames(
                'md:hidden flex justify-center mt-4 transition-all duration-1000',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
              style={{ transitionDelay: '400ms' }}
            >
              <button
                onClick={() => openAuth('signup')}
                className="bg-[#3ECF8E] hover:bg-[#34b27b] text-[#151515] px-6 py-2.5 rounded-md text-sm font-semibold shadow-lg"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}

        {/* CONSOLE */}
        <div className="flex-1 flex items-stretch">
          <ComplianceConsole
            onFirstInteraction={() => setHasStartedChat(true)}
            onRequireAuth={() => openAuth('signup')}
          />
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full py-8 border-t border-[#2C2C2C] bg-[#121212] relative z-10 mt-auto">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 text-xs text-[#666]">
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-[#EDEDED] transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-[#EDEDED] transition-colors">
              Privacy
            </a>
          </div>
          <span className="hidden md:inline text-[#333]">|</span>
          <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#2C2C2C] rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
            <span className="text-[10px] font-mono uppercase tracking-wide text-[#888]">
              Wayne &amp; Oakland: Coming Q1
            </span>
          </div>
          <span className="hidden md:inline text-[#333]">|</span>
          <span className="text-[#444]">© 2025 protocolLM</span>
        </div>
      </footer>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultView={authView}
      />
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
