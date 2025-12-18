'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { IBM_Plex_Mono } from 'next/font/google'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const DOCUMENTS = [
  'Facility Safety Manual',
  'HACCP Hazard Log',
  'Cold Chain Audit Notes',
  'Supplier Certificate of Analysis',
  'Daily Temperature Check Log',
  'Corrective Action Worksheet',
  'Preventive Maintenance Sheet',
  'Sanitation Standard Operating Procedure',
  'Environmental Monitoring Report',
  'Pest Control Activity Log',
  'Incident Investigation Form',
  'Employee Training Roster',
  'Line Clearance Checklist',
  'Root Cause Analysis Notes',
  'Regulatory Inspection Summary',
  'Recall Readiness Plan',
  'Allergen Control Checklist',
  'Water Quality Test Results',
  'Air Handling Calibration Log',
  'Shipping Verification Record',
  'Receiving Verification Record',
  'Batch Release Form',
  'Lot Traceability Map',
  'Waste Handling Log',
  'Change Control Request'
]

const TYPEWRITER_LINES = [
  'Welcome to Protocol LM.',
  'Where you catch violations before they cost you.',
  'We watch every permit, inspection, and audit trail.',
  'Send the evidence. We return clarity before dawn.'
]

const LOADING_MESSAGES = [
  'Parsing safety playbooks…',
  'Cross-checking citations…',
  'Replaying audit history…',
  'Re-indexing deviations…'
]

function useTypewriter(lines) {
  const [output, setOutput] = useState('')

  useEffect(() => {
    let isCancelled = false
    let lineIndex = 0
    let charIndex = 0
    let buffer = ''
    let printed = []
    let deleting = false
    let deleteCountdown = 0
    let timeoutId

    const schedule = (delay) => {
      timeoutId = setTimeout(step, delay)
    }

    const step = () => {
      if (isCancelled) return
      const current = lines[lineIndex]

      if (!deleting) {
        const makeMistake = Math.random() < 0.12 && charIndex < current.length - 2

        if (makeMistake) {
          const alphabet = 'abcdefghijklmnopqrstuvwxyz'
          const wrongChar = alphabet[Math.floor(Math.random() * alphabet.length)]
          buffer += wrongChar
          deleteCountdown = 1 + Math.floor(Math.random() * 2)
          deleting = true
          setOutput([...printed, buffer].join('\n'))
          return schedule(220 + Math.random() * 120)
        }

        buffer += current[charIndex]
        charIndex += 1
        setOutput([...printed, buffer].join('\n'))

        if (charIndex === current.length) {
          printed = [...printed, buffer]
          buffer = ''
          charIndex = 0
          lineIndex = (lineIndex + 1) % lines.length
          return schedule(900)
        }

        return schedule(70 + Math.random() * 80)
      }

      buffer = buffer.slice(0, -1)
      deleteCountdown -= 1
      setOutput([...printed, buffer].join('\n'))

      if (deleteCountdown <= 0) deleting = false
      schedule(50 + Math.random() * 70)
    }

    schedule(400)

    return () => {
      isCancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lines])

  return output
}

function RetroLoadingBar({ progress }) {
  return (
    <div className="w-full max-w-xl mx-auto mt-6">
      <div className="h-12 rounded-md bg-[#0b1020] border border-[#23458b] px-3 flex items-center gap-2 shadow-[0_0_0_1px_#0b1020]">
        <div className="flex-1 grid grid-cols-12 gap-2">
          {Array.from({ length: 12 }).map((_, idx) => {
            const threshold = (idx + 1) * (100 / 12)
            const isActive = progress >= threshold
            return (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className={`h-6 rounded-sm transition-all duration-200 ${
                  isActive ? 'bg-[#3a78c2] shadow-[0_0_8px_#3a78c2]' : 'bg-[#1a1f2c]'
                }`}
              />
            )
          })}
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-[#c5d9ff]">{progress}%</span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const typewriter = useTypewriter(TYPEWRITER_LINES)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [activeMode, setActiveMode] = useState(null)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Protocol LM is awake. Waiting on your signal.' },
    { role: 'user', text: 'Queue up the latest inspection packet.' }
  ])
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const [input, setInput] = useState('')
  const intervalRef = useRef(null)
  const fileInputRef = useRef(null)

  const documentRows = useMemo(() => [...DOCUMENTS, ...DOCUMENTS.slice(0, 5)], [])

  const startLoading = (modeLabel) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setActiveMode(modeLabel)
    setIsLoading(true)
    setProgress(0)
    setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + 6 + Math.floor(Math.random() * 8))
        if (next === 100) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          setIsLoading(false)
          setMessages((prevMessages) => [
            ...prevMessages,
            { role: 'assistant', text: 'Intake complete. Findings are ready for review.' }
          ])
        }
        return next
      })
    }, 220)
  }

  const handleSend = () => {
    if (!input.trim()) return
    const content = input.trim()
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', text: content },
      { role: 'assistant', text: 'Document stream received. Cross-referencing now.' }
    ])
    setInput('')
  }

  useEffect(() => {
    document.documentElement.style.backgroundColor = '#0b1018'
    document.documentElement.style.color = '#e9f1ff'
    return () => {
      document.documentElement.style.backgroundColor = ''
      document.documentElement.style.color = ''
    }
  }, [])

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), [])

  return (
    <main
      className={`${ibmMono.className} min-h-screen w-full bg-[#0b1018] text-[#e9f1ff] flex flex-col items-center justify-center relative overflow-hidden px-6 py-10`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(58,120,194,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(58,120,194,0.05),transparent_40%)]" />
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(18,23,33,0.6) 0%, rgba(11,16,24,0.8) 100%)' }} />

      <div className="relative z-10 w-full max-w-6xl flex flex-col gap-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <section className="bg-[#0e1320] border border-[#1d2c45] shadow-[0_8px_40px_rgba(0,0,0,0.45)] rounded-xl p-6 flex flex-col gap-4 h-full">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#8fb5ff]">
              <span className="w-2 h-2 rounded-full bg-[#3a78c2] shadow-[0_0_10px_#3a78c2]" />
              Protocol LM
            </div>
            <div className="flex-1 bg-[#0a0f1a] rounded-lg border border-[#1a2a3f] p-5 text-[#d9e6ff] text-lg leading-relaxed whitespace-pre-line">
              <div className="text-sm text-[#8fb5ff] mb-2">IBM Console Feed</div>
              <div className="min-h-[180px] tracking-tight">{typewriter}</div>
            </div>
          </section>

          <section className="bg-[#0e1320] border border-[#1d2c45] shadow-[0_8px_40px_rgba(0,0,0,0.45)] rounded-xl p-6 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between text-sm text-[#c5d9ff]">
              <div className="flex items-center gap-2 font-semibold text-[#8fb5ff]">
                <span className="h-2 w-2 rounded-full bg-[#3a78c2]" />
                Ingested Documents
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-[#7f9ccf]">Live Scroll</span>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-[#0a0f1a] border border-[#1a2a3f] p-3 h-[320px]">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, transparent 16%, transparent 84%, #0a0f1a 100%)' }} />
              <div className="absolute inset-0 overflow-hidden">
                <div className="animate-doc-scroll space-y-3">
                  {documentRows.map((doc, idx) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={`${doc}-${idx}`}
                      className="flex items-center gap-3 text-[#d9e6ff] text-sm"
                    >
                      <span className="h-1 w-1 rounded-full bg-[#3a78c2]" />
                      <span className="tracking-tight">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="bg-[#0e1320] border border-[#1d2c45] shadow-[0_8px_40px_rgba(0,0,0,0.45)] rounded-xl p-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm uppercase tracking-[0.25em] text-[#8fb5ff]">Console Chat</div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Open camera intake"
                onClick={() => {
                  startLoading('camera')
                  fileInputRef.current?.click()
                }}
                className={`h-12 w-12 rounded-full flex items-center justify-center bg-[#0b1018] border border-[#23458b] text-[#c5d9ff] shadow-[0_0_12px_rgba(58,120,194,0.35)] hover:shadow-[0_0_16px_rgba(58,120,194,0.55)] transition-all ${
                  activeMode === 'camera' ? 'ring-2 ring-[#3a78c2]' : ''
                }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="6" width="18" height="14" rx="2" />
                  <circle cx="12" cy="13" r="3.5" />
                  <path d="M9 6l1.5-2h3L15 6" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" />
              <button
                type="button"
                aria-label="Start chat"
                onClick={() => startLoading('text')}
                className={`h-12 w-12 rounded-full flex items-center justify-center bg-[#0b1018] border border-[#23458b] text-[#c5d9ff] shadow-[0_0_12px_rgba(58,120,194,0.35)] hover:shadow-[0_0_16px_rgba(58,120,194,0.55)] transition-all ${
                  activeMode === 'text' ? 'ring-2 ring-[#3a78c2]' : ''
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 5h16v10H6l-2 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="space-y-3 text-base tracking-tight">
              {messages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <p
                    className={`${
                      msg.role === 'user'
                        ? 'text-[#c5d9ff] text-right max-w-3xl'
                        : 'text-[#e9f1ff] max-w-3xl'
                    } whitespace-pre-wrap leading-relaxed`}
                  >
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>

            {isLoading && <RetroLoadingBar progress={progress} />}

            <div className="flex items-center gap-3 text-sm text-[#8fb5ff]">
              <span className="uppercase tracking-[0.2em]">{activeMode ? `${activeMode} link` : 'Idle'}</span>
              <span className="text-[#c5d9ff]">{isLoading ? loadingMessage : 'Standing by for a new drop.'}</span>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 bg-transparent border-b border-dashed border-[#23458b]">
                <textarea
                  rows={2}
                  placeholder="Type your prompt — no borders, just the feed."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full resize-none bg-transparent text-[#e9f1ff] placeholder:text-[#5f7397] focus:outline-none focus:ring-0"
                />
              </div>
              <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2 bg-[#3a78c2] text-[#0b1018] rounded-md uppercase tracking-[0.2em] text-xs font-semibold hover:shadow-[0_0_18px_rgba(58,120,194,0.6)] transition-all"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes doc-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-doc-scroll {
          animation: doc-scroll 22s linear infinite;
        }
      `}</style>
    </main>
  )
}
