'use client'

const stroke = 2.6

const iconMap = {
  chat: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <path
        d="M18 20h28a8 8 0 0 1 8 8v10a8 8 0 0 1-8 8H30l-8 8v-8h-4a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 26h12" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path d="M24 32h18" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  ),
  vision: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <rect x="14" y="21" width="36" height="22" rx="6" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth={stroke} />
      <path d="M20 18h4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path d="M40 18h4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  ),
  pdf: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <path
        d="M22 14h16l10 10v26a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path d="M38 14v10h10" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
      <path d="M28 30h8" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path d="M32 34v12" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path d="M28 42 32 46 36 42" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  history: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth={stroke} />
      <path d="M32 20v12l8 4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 32h-6" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <circle cx="32" cy="32" r="9" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M32 14.5V20M32 44v5.5M18.5 22.5l3.5 3.5M42 38l3.5 3.5M14.5 32H20M44 32h5.5M18.5 41.5 22 38M42 26l3.5-3.5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  ),
}

export default function AgentIcon({ type = 'chat', className = '' }) {
  const Icon = iconMap[type] || iconMap.chat

  return (
    <span className={`agent-icon ${className}`}>
      <Icon />
    </span>
  )
}
