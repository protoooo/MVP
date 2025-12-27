'use client'

const stroke = 3

const iconMap = {
  chat: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <rect
        x="12"
        y="16"
        width="40"
        height="26"
        rx="8"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 28h12" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path d="M22 34h18" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d="M18 42.5 18 48.5 25 42.5H32"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  vision: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <path
        d="M20 18h8l2-4h12l2 4h8a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="9" stroke="currentColor" strokeWidth={stroke} />
      <path d="M28 32.5a4 4 0 1 0 8 0" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  ),
  pdf: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <path
        d="M24 12h16l10 10v26a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M40 12v12h12" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 32h12" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path d="M32 28v16" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d="M26 40 32 46 38 40"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  history: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth={stroke} />
      <path d="M32 22v12l8 4.5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 32h-6" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M32 14.5v6M32 43.5v6M19 21l4.2 4.2M40.8 38.8 45 43M14.5 32h6M43.5 32h6M19 43l4.2-4.2M40.8 25.2 45 21"
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
