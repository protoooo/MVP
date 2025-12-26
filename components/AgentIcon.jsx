'use client'

const iconMap = {
  chat: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <rect x="18" y="14" width="28" height="26" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M20 34c0 4.418 3.582 8 8 8h3.5c.552 0 1 .448 1 1v5.2c0 .86 1.073 1.262 1.642.617l6.644-7.437c.188-.21.454-.33.734-.33H38c4.418 0 8-3.582 8-8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="agent-detail"
      />
      <path d="M24 22.5h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 27.5h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="43" cy="30" r="1.6" fill="currentColor" className="agent-detail" />
    </svg>
  ),
  vision: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <path d="M16 22v-6h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48 22v-6h-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 42v6h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48 42v6h-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="20" y="22" width="24" height="20" rx="5" stroke="currentColor" strokeWidth="2.2" />
      <rect x="26" y="28" width="12" height="8" rx="3" stroke="currentColor" strokeWidth="2" className="agent-detail" />
      <path d="M24 32h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M43 32h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 36h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="agent-detail" />
    </svg>
  ),
  pdf: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <rect x="18" y="16" width="22" height="30" rx="5" stroke="currentColor" strokeWidth="2.4" />
      <rect x="24" y="21" width="22" height="27" rx="5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M28 28h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 34h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="42" cy="40" r="4.5" stroke="currentColor" strokeWidth="2.2" className="agent-detail" />
      <path d="M42 36v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="agent-detail" />
      <path d="M38 40h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="agent-detail" />
    </svg>
  ),
  history: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <path d="M20 32c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-12 12" stroke="currentColor" strokeWidth="2.4" />
      <path d="M20 32h-4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 32v-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 32 26 34.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="2" fill="currentColor" className="agent-detail" />
      <circle cx="44" cy="32" r="2" fill="currentColor" className="agent-detail" />
      <circle cx="20" cy="32" r="2" fill="currentColor" className="agent-detail" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 64 64" fill="none" className="agent-icon-svg" role="img" aria-hidden="true">
      <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M32 16.5V13m0 38v-3.5M19.9 21.1 17.4 19m29.2 26.1-2.5-2.1M16.5 32H13m38 0h-3.5M19.9 42.9 17.4 45m29.2-26.1-2.5 2.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M27 32c0-2.761 2.239-5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="agent-detail" />
      <path d="M37 32c0 2.761-2.239 5-5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="agent-detail" />
      <path d="M32 22v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="agent-detail" />
      <path d="M32 38v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="agent-detail" />
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
