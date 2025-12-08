'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { getDeviceFingerprint } from '@/lib/deviceFingerprint'
import { Outfit, Inter, JetBrains_Mono } from 'next/font/google'

// --- TYPOGRAPHY ---
const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

const DOC_MAPPING = {
  '3compsink.pdf': 'Sanitizing Protocols',
  'Violation Types.pdf': 'Violation Classifications',
  'Enforcement Action.pdf': 'Enforcement Guidelines',
  'FDA_FOOD_CODE_2022.pdf': 'FDA Food Code (2022)',
  'MI_MODIFIED.pdf': 'Michigan Modified Law',
  'Cooking_Temps.pdf': 'Critical Temperatures',
  'Cooling Foods.pdf': 'Cooling Procedures',
  'Cross contamination.pdf': 'Cross Contamination',
  'food_labeling.pdf': 'Labeling Standards',
  'Norovirus.pdf': 'Biohazard Cleanup',
  'Allergy Info.pdf': 'Allergen Control',
  'Emergency_Plan.pdf': 'Emergency Plans',
  'Date_Marking.pdf': 'Date Marking Rules',
}
const TICKER_ITEMS = Object.values(DOC_MAPPING)

// --- ICONS ---
const Icons = {
  Camera: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Zap: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  FileText: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1z" />
    </svg>
  ),
  LogOut: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  File: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
  <style jsx global>{`
    body {
      background-color: #ffffff;
      overscroll-behavior: none;
      height: 100dvh;
      width: 100%;
      max-width: 100dvw;
      overflow: hidden;
      color: #475569;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .btn-press {
      transition: transform 0.1s ease;
    }
    .btn-press:active {
      transform: scale(0.98);
    }
    @keyframes slideUpFade {
      0% { transform: translateY(100%); opacity: 0; }
      10% { transform: translateY(0); opacity: 1; }
      90% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-100%); opacity: 0; }
    }
    .animate-ticker-item {
      animation: slideUpFade 4s ease-in-out forwards;
    }
    /* UPLOAD CIRCLE (Water effect, grayscale) */
    .loader-upload {    
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid #ccc;
      background: linear-gradient(to top, #000000 50%, transparent 50%);
      background-size: 100% 200%;
      background-position: 0% 0%; 
      animation: fillWater 1.5s ease-out forwards;
    }
    @keyframes fillWater {
      0% { background-position: 0% 0%; }
      100% { background-position: 0% 100%; } 
    }
    /* FALLBACK DOTS */
    .loader {
      height: 14px;
      aspect-ratio: 2.5;
      --_g: no-repeat radial-gradient(farthest-side, #000 90%, #0000);
      background: var(--_g), var(--_g), var(--_g), var(--_g);
      background-size: 20% 50%;
      animation: l43 1s infinite linear;
    }
    @keyframes l43 {
      0% { background-position: calc(0 * 100% / 3) 50%, calc(1 * 100% / 3) 50%, calc(2 * 100% / 3) 50%, calc(3 * 100% / 3) 50%; }
      16.67% { background-position: calc(0 * 100% / 3) 0, calc(1 * 100% / 3) 50%, calc(2 * 100% / 3) 50%, calc(3 * 100% / 3) 50%; }
      33.33% { background-position: calc(0 * 100% / 3) 100%, calc(1 * 100% / 3) 0, calc(2 * 100% / 3) 50%, calc(3 * 100% / 3) 50%; }
      50% { background-position: calc(0 * 100% / 3) 50%, calc(1 * 100% / 3) 100%, calc(2 * 100% / 3) 0, calc(3 * 100% / 3) 50%; }
      66.67% { background-position: calc(0 * 100% / 3) 50%, calc(1 * 100% / 3) 50%, calc(2 * 100% / 3) 100%, calc(3 * 100% / 3) 0; }
      83.33% { background-position: calc(0 * 100% / 3) 50%, calc(1 * 100% / 3) 50%, calc(2 * 100% / 3) 50%, calc(3 * 100% / 3) 100%; }
      100% { background-position: calc(0 * 100% / 3) 50%, calc(1 * 100% / 3) 50%, calc(2 * 100% / 3) 50%, calc(3 * 100% / 3) 50%; }
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }
    details > summary { list-style: none; }
    details > summary::-webkit-details-marker { display: none; }
    @keyframes springUp {
      0% { opacity: 0; transform: translateY(10px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-spring { animation: springUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `}</style>
)

const NavBarTicker = () => {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TICKER_ITEMS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div
      key={index}
      className="flex items-center gap-2 animate-ticker-item text-[10px] font-bold text-slate-700 uppercase tracking-wide whitespace-nowrap"
    >
      <Icons.File />
      {TICKER_ITEMS[index]}
    </div>
  )
}

const FormattedMessage = ({ content }) => {
  if (!content) return null
  const lines = content.split('\n')
  const keywords = [
    'Violation',
    'Confirmed violations',
    'Possible issues',
    'Likely violation',
    'Potential issue',
    'Remediation',
    'Summary',
    'Findings',
    'Source',
  ]
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-2" />
        const parts = line.split(/:(.*)/s)
        let header = parts[0]
        let body = parts[1] || ''
        const isHeader = keywords.some((k) => header.includes(k))
        if (isHeader) {
          return (
            <div key={idx} className="text-base leading-relaxed text-slate-700">
              <span className="font-bold text-slate-900">{header}:</span>
              {body}
            </div>
          )
        }
        return (
          <div key={idx} className="text-base leading-relaxed text-slate-700">
            {line}
          </div>
        )
      })}
    </div>
  )
}

const ThinkingIndicator = ({ queryType = 'simple' }) => {
  const [progress, setProgress] = useState(0)
  const [text, setText] = useState('Analyzing request...')
  const DURATIONS = { simple: 3000, standard: 8000, image: 15000 }
  const MAX_PROGRESS = 95
  const TOTAL_DURATION = DURATIONS[queryType] || DURATIONS.standard
  const stages = {
    simple: [
      { threshold: 0, label: 'Processing...' },
      { threshold: 50, label: 'Generating response...' },
    ],
    standard: [
      { threshold: 0, label: 'Analyzing request...' },
      { threshold: 25, label: 'Reviewing regulations...' },
      { threshold: 60, label: 'Formulating response...' },
    ],
    image: [
      { threshold: 0, label: 'Analyzing image...' },
      { threshold: 15, label: 'Identifying equipment...' },
      { threshold: 30, label: 'Checking local code...' },
      { threshold: 50, label: 'Classifying violation types...' },
      { threshold: 70, label: 'Formulating compliance report...' },
    ],
  }
  const currentStages = stages[queryType] || stages.standard

  useEffect(() => {
    let rafId
    const start = performance.now()
    let lastUpdate = start
    const tick = (now) => {
      const elapsed = now - start
      const ratio = Math.min(elapsed / TOTAL_DURATION, 1)
      const target = Math.min(ratio * 100, MAX_PROGRESS)
      if (now - lastUpdate >= 100 || target === MAX_PROGRESS) {
        lastUpdate = now
        setProgress(target)
        const currentStage = currentStages.reduce(
          (acc, stage) => (target >= stage.threshold ? stage : acc),
          currentStages[0]
        )
        setText(currentStage.label)
      }
      if (target < MAX_PROGRESS) {
        rafId = requestAnimationFrame(tick)
      }
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [queryType, TOTAL_DURATION, currentStages])

  return (
    <div className="flex flex-col items-start gap-3 p-2">
      <span className="text-xs font-bold text-slate-600 uppercase tracking-widest animate-pulse">
        {text}
      </span>
      <div className="w-40 h-[22px] rounded-full border-2 border-black bg-white overflow-hidden">
        <div
          className="h-full bg-black"
          style={{ width: `${progress}%`, transition: 'width 0.3s ease-out' }}
        />
      </div>
    </div>
  )
}

// --- LANDING PAGE (Black & White) ---
const LandingPage = ({ onAction, onSignUp }) => {
  return (
    <div className="w-full bg-white relative z-10 pb-24">
      {/* SECTION 1: HERO */}
      <section className="relative h-[30rem] flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 rounded-b-3xl shadow-xl overflow-hidden">
        <div className="z-20 text-center px-4 max-w-4xl">
          <h1
            className={`text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6 ${outfit.className}`}
          >
            One Photo Could Save <br /> You{' '}
            <span className="text-slate-100 underline decoration-slate-400/60">
              Thousands
            </span>
          </h1>
          <p
            className={`text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8 ${inter.className}`}
          >
            Washtenaw County health inspectors catch everything. Now you can too.
            Powered by OpenAI for inspection-grade accuracy.
          </p>
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={() => onAction('chat')}
              className="bg-black hover:bg-slate-900 text-white text-base font-bold py-4 px-10 rounded-full transition-all duration-200 uppercase tracking-wide shadow-lg hover:-translate-y-1"
            >
              Try Free Demo
            </button>
            <div className="text-sm text-slate-400 font-medium">
              3 Free Queries • No Signup Required
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className={`text-3xl font-bold text-slate-900 mb-4 tracking-tight ${outfit.className}`}
            >
              How It Works
            </h2>
            <p className={`text-slate-600 ${inter.className}`}>
              Professional compliance in three steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-white border border-slate-200 p-10 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="text-slate-400 mb-6">
                <Icons.Camera />
              </div>
              <h3
                className={`text-xl font-bold text-slate-900 mb-3 ${outfit.className}`}
              >
                1. Take Photo
              </h3>
              <p
                className={`text-slate-600 leading-relaxed ${inter.className}`}
              >
                Use any smartphone camera. No app installation required.
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-10 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="text-slate-400 mb-6">
                <Icons.Zap />
              </div>
              <h3
                className={`text-xl font-bold text-slate-900 mb-3 ${outfit.className}`}
              >
                2. Automated Analysis
              </h3>
              <p
                className={`text-slate-600 leading-relaxed ${inter.className}`}
              >
                Uses OpenAI to cross-check against the Michigan Food Code and
                local guidance in seconds.
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-10 rounded-xl hover:shadow-lg transition-shadow duration-200">
              <div className="text-slate-400 mb-6">
                <Icons.FileText />
              </div>
              <h3
                className={`text-xl font-bold text-slate-900 mb-3 ${outfit.className}`}
              >
                3. Get Report
              </h3>
              <p
                className={`text-slate-600 leading-relaxed ${inter.className}`}
              >
                Receive detailed violations, potential fines, and remediation
                steps in plain language.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: ROI DATA (Monochrome) */}
      <section className="py-24 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className={`text-3xl font-bold text-slate-900 mb-4 tracking-tight ${outfit.className}`}
            >
              Violation Costs
            </h2>
            <p className={`text-slate-600 ${inter.className}`}>
              Potential financial impact of citations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white border border-slate-200 p-8 rounded-xl">
              <h3
                className={`font-bold text-slate-900 mb-2 ${outfit.className}`}
              >
                Re-inspection
              </h3>
              <p
                className={`text-2xl font-bold text-slate-900 mb-2 ${mono.className}`}
              >
                $125 - $350
              </p>
              <p
                className={`text-sm text-slate-600 leading-relaxed ${inter.className}`}
              >
                Fees per visit until resolved.
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-xl">
              <h3
                className={`font-bold text-slate-900 mb-2 ${outfit.className}`}
              >
                Daily Fines
              </h3>
              <p
                className={`text-2xl font-bold text-slate-900 mb-2 ${mono.className}`}
              >
                $1,000 / day
              </p>
              <p
                className={`text-sm text-slate-600 leading-relaxed ${inter.className}`}
              >
                For continuing violations.
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-xl">
              <h3
                className={`font-bold text-slate-900 mb-2 ${outfit.className}`}
              >
                Misdemeanor
              </h3>
              <p
                className={`text-2xl font-bold text-slate-900 mb-2 ${mono.className}`}
              >
                Up to $2,000
              </p>
              <p
                className={`text-sm text-slate-600 leading-relaxed ${inter.className}`}
              >
                Sec. 20199 fines per occurrence.
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-xl">
              <h3
                className={`font-bold text-slate-900 mb-2 ${outfit.className}`}
              >
                Outbreak
              </h3>
              <p
                className={`text-2xl font-bold text-slate-900 mb-2 ${mono.className}`}
              >
                $4,000+
              </p>
              <p
                className={`text-sm text-slate-600 leading-relaxed ${inter.className}`}
              >
                Lost revenue and legal fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-200 text-center">
        <p
          className={`text-slate-500 font-medium mb-4 text-sm ${inter.className}`}
        >
          Serving Washtenaw County Food Service Establishments
        </p>
        <div className="flex justify-center gap-6 mb-6 text-sm text-slate-500 font-medium">
          <Link href="/terms" className="hover:text-slate-900 transition-colors">
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="hover:text-slate-900 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/report-issue"
            className="hover:text-slate-900 transition-colors"
          >
            Report Issue
          </Link>
        </div>
      </footer>
    </div>
  )
}

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
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const handleModeClick = (mode) => {
    setActiveMode(mode)
    setShowMenu(false)
    if (mode === 'image' && fileInputRef.current) {
      setTimeout(() => fileInputRef.current?.click(), 0)
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-8 z-20 relative input-container">
      {selectedImage && (
        <div className="mb-3 mx-1 p-3 bg-white border border-slate-200 rounded-lg inline-flex items-center gap-3 shadow-sm">
          <div className="loader-upload scale-75 shrink-0" />
          <span className="text-sm text-slate-900 font-bold flex items-center gap-2">
            Image Uploaded - Ready to Send
          </span>
          <button
            onClick={() => {
              setSelectedImage(null)
              setActiveMode('chat')
            }}
            className="text-slate-400 hover:text-slate-900 ml-2"
          >
            <Icons.X />
          </button>
        </div>
      )}
      <form
        onSubmit={handleSend}
        className="relative flex items-end w-full p-2 bg-white border border-slate-300 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-slate-900 focus-within:border-slate-900 transition-all"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImage}
          accept="image/*"
          className="hidden"
        />
        <div className="relative flex-shrink-0 mb-1 ml-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
              showMenu
                ? 'bg-slate-900 text-white rotate-45'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 rotate-0'
            }`}
          >
            <Icons.Plus />
          </button>
          {showMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-[160px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 p-1 animate-spring origin-bottom-left">
              <div className="space-y-0.5">
                {['chat', 'image'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeClick(m)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeMode === m
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m === 'chat' && <Icons.File />}
                    {m === 'image' && <Icons.Camera />}
                    <span className="capitalize">
                      {m === 'chat' ? 'Consult' : 'Inspect'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
              ? 'Ask about enforcement protocols...'
              : activeMode === 'image'
              ? 'Upload photo for instant audit...'
              : 'Enter audit parameters...'
          }
          className={`flex-1 max-h-[200px] min-h[44px] py-3 px-4 bg-transparent border-none focus:ring-0 focus:outline-none appearance-none resize-none text-slate-900 placeholder-slate-400 text-base leading-relaxed ${inter.className}`}
          rows={1}
          style={{ height: 'auto', overflowY: 'hidden' }}
        />
        <button
          type="submit"
          disabled={(!input.trim() && !selectedImage) || isSending}
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mb-1 mr-1 transition-all duration-200 ${
            !input.trim() && !selectedImage
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
              : 'bg-black text-white hover:bg-slate-900 shadow-md transform hover:scale-105 active:scale-95'
          }`}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Icons.ArrowUp />
          )}
        </button>
      </form>
    </div>
  )
}

const AuthModal = ({ isOpen, onClose, message }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const supabase = createClient()

  const getRedirectUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    return `${baseUrl}/auth/callback`
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getRedirectUrl() },
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
      className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2
              className={`text-xl font-bold text-slate-900 mb-1 ${outfit.className}`}
            >
              {message || 'Welcome to protocolLM'}
            </h2>
            <p className={`text-sm text-slate-500 ${inter.className}`}>
              Sign in to continue your session
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-colors"
          >
            <Icons.X />
          </button>
        </div>
        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 mb-6 shadow-sm focus:outline-none"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#000000" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-4 text-slate-400 font-medium">OR</span>
          </div>
        </div>
        <form onSubmit={handleEmailAuth} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="work@restaurant.com"
            required
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-slate-900 hover:bg-black text-white font-medium py-3 rounded-lg transition-colors shadow-sm"
          >
            {loading ? 'Sending Login Link...' : 'Continue with Email'}
          </button>
        </form>
        {statusMessage && (
          <div
            className={`mt-6 p-4 rounded-lg text-sm border ${
              statusMessage.includes('Error')
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  )
}

const ExitModal = ({ isOpen, onClose, onConvert }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl p-10 max-w-md w-full shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"
        >
          <Icons.X />
        </button>
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 p-4 rounded-full text-slate-700">
            <Icons.AlertTriangle />
          </div>
        </div>
        <h3
          className={`text-2xl font-bold text-center text-slate-900 mb-3 ${outfit.className}`}
        >
          Wait! Don&apos;t risk a violation.
        </h3>
        <p
          className={`text-center text-slate-600 mb-10 leading-relaxed ${inter.className}`}
        >
          Get a <span className="font-bold text-slate-900">FREE compliance audit</span>{' '}
          of your last inspection report before you leave.
        </p>
        <button
          onClick={onConvert}
          className="w-full bg-black hover:bg-slate-900 text-white font-semibold py-4 rounded-lg uppercase tracking-wide transition-colors mb-4"
        >
          Claim Free Audit
        </button>
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 font-medium"
        >
          No thanks, I&apos;ll risk the fine.
        </button>
      </div>
    </div>
  )
}

const FullScreenPricing = ({ handleCheckout, loading, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1000] bg-white/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-sm bg-white border border-slate-200 rounded-xl p-10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <Icons.X />
        </button>
        <h3
          className={`text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 mt-2 text-center ${outfit.className}`}
        >
          protocolLM
        </h3>
        <div className="flex items-baseline text-slate-900 justify-center mb-2">
          <span
            className={`text-5xl font-bold tracking-tighter ${outfit.className}`}
          >
            $50
          </span>
          <span className="ml-2 text-slate-500 text-sm font-medium uppercase tracking-wide">
            /mo
          </span>
        </div>
        <p
          className={`text-sm text-slate-600 text-center mb-8 leading-relaxed px-4 ${inter.className}`}
        >
          <span className="block font-semibold text-slate-900 mb-1">
            One prevented violation pays for 40 months.
          </span>
          Average Priority Fine: $1,000
        </p>
        <button
          onClick={() =>
            handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY, 'protocollm')
          }
          disabled={loading !== null}
          className="w-full bg-black hover:bg-slate-900 text-white font-semibold py-4 rounded-lg text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'protocollm' ? 'Processing...' : 'Start 7-Day Free Trial'}
        </button>
      </div>
    </div>
  )
}

const OnboardingModal = ({ isOpen, onClose, onAction }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"
        >
          <Icons.X />
        </button>
        <div className="text-center mb-8">
          <h3
            className={`text-2xl font-bold text-slate-900 mb-2 ${outfit.className}`}
          >
            Welcome to protocolLM
          </h3>
          <p className={`text-slate-600 ${inter.className}`}>
            How would you like to start?
          </p>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => onAction('image')}
            className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold py-4 px-6 rounded-xl flex items-center gap-4 transition-colors text-left group"
          >
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-500 group-hover:text-slate-900 transition-colors">
              <Icons.Camera />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Upload Photo of 3-Comp Sink
              </div>
              <div className="text-xs text-slate-500">
                Check for sanitizer &amp; setup violations
              </div>
            </div>
          </button>
          <button
            onClick={() =>
              onAction('text', 'What temp should I hold hot foods?')
            }
            className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold py-4 px-6 rounded-xl flex items-center gap-4 transition-colors text-left group"
          >
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-500 group-hover:text-slate-900 transition-colors">
              <Icons.FileText />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Ask a Question
              </div>
              <div className="text-xs text-slate-500">
                &quot;What temp should I hold hot foods?&quot;
              </div>
            </div>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 text-center text-sm text-slate-400 hover:text-slate-600 font-medium"
        >
          I&apos;ll explore on my own
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [activeMode, setActiveMode] = useState('chat')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const isDemoGuest = !session
  const fingerprintRef = useRef(null)
  const creatingChatRef = useRef(false)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const initFingerprint = async () => {
      const fp = await getDeviceFingerprint()
      if (mounted) fingerprintRef.current = fp
    }
    initFingerprint()

    const init = async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(s)
        if (s) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', s.user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()
          if (s.user.email === ADMIN_EMAIL || sub) {
            setHasActiveSubscription(true)
            const { data: existingChats } = await supabase
              .from('chats')
              .select('id')
              .eq('user_id', s.user.id)
              .limit(1)
            if (!existingChats || existingChats.length === 0) {
              setShowOnboarding(true)
            }
          } else {
            setHasActiveSubscription(false)
          }
        }
      } catch (e) {
        console.error('Auth Init Error', e)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      setSession(session)
      if (session) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', session.user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()
        if (session.user.email === ADMIN_EMAIL || sub) setHasActiveSubscription(true)
        else {
          setHasActiveSubscription(false)
          setShowPricingModal(true)
        }
      } else setHasActiveSubscription(false)
      setIsLoading(false)
    })

    const timer = setTimeout(() => {
      if (mounted) setIsLoading(false)
    }, 2000)

    return () => {
      mounted = false
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    const handleExit = (e) => {
      if (
        e.clientY < 10 &&
        !sessionStorage.getItem('exit-shown') &&
        !session
      ) {
        sessionStorage.setItem('exit-shown', 'true')
        setShowExitModal(true)
      }
    }
    document.addEventListener('mousemove', handleExit)
    return () => document.removeEventListener('mousemove', handleExit)
  }, [session])

  const triggerMode = (mode) => {
    setActiveMode(mode)
    if (mode === 'image') fileInputRef.current?.click()
    else inputRef.current?.focus()
  }

  const startDemo = (mode = 'chat') => {
    setShowDemo(true)
    triggerMode(mode)
  }

  const handleOnboardingAction = (type, query = '') => {
    setShowOnboarding(false)
    sessionStorage.setItem('onboarding_complete', 'true')
    if (type === 'image') {
      setTimeout(() => fileInputRef.current?.click(), 100)
    } else if (type === 'text') {
      setInput(query)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const currentInput = input
    const currentImage = selectedImage
    let queryType = 'standard'
    if (currentImage) queryType = 'image'
    else if (currentInput.trim().length < 20) queryType = 'simple'

    const newMsg = { role: 'user', content: currentInput, image: currentImage }
    setMessages((p) => [...p, newMsg])
    setMessages((p) => [...p, { role: 'assistant', content: '', queryType }])

    setInput('')
    setSelectedImage(null)
    setIsSending(true)
    if (fileInputRef.current) fileInputRef.current.value = ''

    let activeChatId = currentChatId
    if (session && !activeChatId && !creatingChatRef.current) {
      creatingChatRef.current = true
      const { data: newChat } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          title: currentInput.slice(0, 30) + '...',
        })
        .select()
        .single()
      if (newChat) {
        activeChatId = newChat.id
        setCurrentChatId(newChat.id)
      }
      creatingChatRef.current = false
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg],
          image: currentImage,
          chatId: activeChatId,
          mode: activeMode,
          deviceFingerprint: fingerprintRef.current,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!res.ok) {
        if (res.status === 402) {
          setShowPricingModal(true)
          throw new Error('Subscription required.')
        }
        if (res.status === 429) {
          setShowAuthModal(true)
          throw new Error('Demo limit reached.')
        }
        throw new Error(`Server error: ${res.status}`)
      }
      const data = await res.json()
      setMessages((p) => {
        const u = [...p]
        u[u.length - 1].content = data.message || 'No response text.'
        return u
      })
    } catch (err) {
      let errorMessage = 'An error occurred.'
      if (err.name === 'AbortError')
        errorMessage = 'Request timed out. The system is busy, please try again.'
      else errorMessage = err.message
      setMessages((p) => {
        const u = [...p]
        u[u.length - 1].content = `Error: ${errorMessage}`
        return u
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
      setActiveMode('image')
      setShowDemo(true)
    } catch (error) {
      console.error(error)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setCurrentChatId(null)
    setActiveMode('chat')
  }

  const handleSignOut = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    } catch (error) {
      window.location.href = '/'
    }
  }

  const handleCheckout = async (priceId, planName) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()
    if (!currentSession) {
      setShowPricingModal(false)
      setAuthModalMessage('Create an account to start your 7-day free trial.')
      setShowAuthModal(true)
      return
    }
    if (!priceId) {
      alert('Invalid price selected')
      return
    }
    setCheckoutLoading(planName)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Checkout failed')
      }
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error('No checkout URL received')
    } catch (error) {
      alert('Failed to start checkout: ' + error.message)
      setCheckoutLoading(null)
    }
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (messages.length > 0 && inputRef.current && !isSending) {
      inputRef.current.focus()
    }
  }, [messages.length, isSending])

  if (isLoading)
    return (
      <>
        <GlobalStyles />
        <div className="fixed inset-0 bg-white flex items-center justify-center">
          <div className="loader" />
        </div>
      </>
    )

  return (
    <>
      <GlobalStyles />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message={authModalMessage}
      />
      <ExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConvert={() => {
          setShowExitModal(false)
          setShowAuthModal(true)
        }}
      />
      {showPricingModal && (
        <FullScreenPricing
          handleCheckout={handleCheckout}
          loading={checkoutLoading}
          onClose={() => setShowPricingModal(false)}
        />
      )}
      {showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onAction={handleOnboardingAction}
        />
      )}
      <div className="relative min-h-screen w-full overflow-hidden bg-white selection:bg-slate-200 selection:text-slate-900">
        <div className="relative z-10 flex flex-col h-[100dvh]">
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white z-30">
            <div className="flex items-center gap-6">
              <div
                className={`font-bold tracking-tight text-xl ${outfit.className} text-slate-900`}
              >
                protocolLM
              </div>
              <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 h-8 overflow-hidden">
                <NavBarTicker />
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!session ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className={`text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors ${inter.className}`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className={`inline-flex items-center gap-2 bg-black hover:bg-slate-900 text-white px-3 sm:px-4 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide shadow-sm transition-colors ${inter.className}`}
                  >
                    <Icons.Check />
                    Start Free Trial
                  </button>
                  <button
                    onClick={() => startDemo('chat')}
                    className={`hidden md:inline-flex items-center gap-1 bg-slate-900 hover:bg-black text-white px-4 md:px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${inter.className}`}
                  >
                    Try Free Demo
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNewChat}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Icons.Plus />
                  </button>
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
                    >
                      {session.user.email[0].toUpperCase()}
                    </button>
                    {showUserMenu && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 p-1">
                        <button
                          onClick={() => setShowPricingModal(true)}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-3 rounded-md transition-colors"
                        >
                          <Icons.Settings /> Subscription
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-900 hover:bg-slate-100 flex items-center gap-3 rounded-md transition-colors"
                        >
                          <Icons.LogOut /> Log out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-start w-full pb-20 md:pb-0 overflow-y-auto bg-white">
            {!session && messages.length === 0 && !showDemo ? (
              <LandingPage
                onAction={(mode) => startDemo(mode)}
                onSignUp={() => setShowAuthModal(true)}
              />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto w-full py-8" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <p
                        className={`text-slate-500 text-base max-w-md leading-relaxed ${inter.className}`}
                      >
                        {activeMode === 'image'
                          ? 'Upload a photo to detect Priority (P) and Priority Foundation (Pf) violations.'
                          : 'Ask questions about the Michigan Modified Food Code or Washtenaw County enforcement.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col w-full max-w-4xl mx-auto py-8 px-6 gap-8">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[90%] px-2 ${
                              msg.role === 'user'
                                ? 'text-slate-900 font-medium'
                                : 'text-slate-800'
                            }`}
                          >
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Upload"
                                className="rounded-lg mb-4 max-h-80 object-contain border border-slate-200"
                              />
                            )}
                            {msg.role === 'assistant' &&
                            msg.content === '' &&
                            isSending &&
                            idx === messages.length - 1 ? (
                              <ThinkingIndicator
                                queryType={msg.queryType || 'standard'}
                              />
                            ) : (
                              <FormattedMessage content={msg.content} />
                            )}
                          </div>
                        </div>
                      ))}
                      {isDemoGuest && (
                        <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-white/90 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm">
                          <div>
                            <p
                              className={`text-xs font-semibold text-slate-900 mb-1 ${inter.className}`}
                            >
                              Liking the demo?
                            </p>
                            <p
                              className={`text-sm text-slate-600 max-w-xl ${inter.className}`}
                            >
                              You&apos;re using the free 3-query demo. Unlock{' '}
                              <span className="font-semibold text-slate-900">
                                unlimited inspections for your restaurant
                              </span>{' '}
                              with a protocolLM subscription.
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setShowPricingModal(true)}
                              className="btn-press inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide bg-black hover:bg-slate-900 text-white"
                            >
                              View Pricing &amp; Upgrade
                            </button>
                            <button
                              onClick={() => setShowAuthModal(true)}
                              className="btn-press inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              Create Account
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="w-full shrink-0 z-20 bg-white border-t border-slate-100 pt-4">
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
