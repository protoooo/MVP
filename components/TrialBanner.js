// components/TrialBanner.js - Show trial countdown

'use client'
import { useEffect, useState } from 'react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['500', '600'] })

export default function TrialBanner({ subscription, onUpgrade }) {
  const [daysLeft, setDaysLeft] = useState(null)
  const [isTrialing, setIsTrialing] = useState(false)

  useEffect(() => {
    if (!subscription) return

    const isTrial = subscription.status === 'trialing'
    setIsTrialing(isTrial)

    if (isTrial && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end)
      const now = new Date()
      const diffTime = trialEnd - now
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setDaysLeft(diffDays)
    }
  }, [subscription])

  // Don't show if not trialing or trial ended
  if (!isTrialing || daysLeft === null || daysLeft < 0) return null

  // Show different messages based on days left
  const isUrgent = daysLeft <= 2
  const bgColor = isUrgent ? 'bg-amber-500' : 'bg-blue-600'
  const textColor = 'text-white'

  return (
    <div className={`${bgColor} border-b border-white/10`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
        <div className={`flex items-center justify-between gap-4 ${inter.className}`}>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-semibold ${textColor}`}>
              {daysLeft === 0 ? (
                'Trial ends today'
              ) : daysLeft === 1 ? (
                'Trial ends tomorrow'
              ) : (
                `${daysLeft} days left in trial`
              )}
            </span>
            {!isUrgent && (
              <span className={`${textColor} opacity-90`}>
                • Enjoying protocolLM?
              </span>
            )}
          </div>

          <button
            onClick={onUpgrade}
            className="px-4 py-1.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-white/90 transition flex-shrink-0"
          >
            {isUrgent ? 'Upgrade Now' : 'Subscribe to Keep Access'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Usage in app/page.js (inside your header):
//
// {session && (
//   <TrialBanner 
//     subscription={subscription} 
//     onUpgrade={() => setShowPricingModal(true)} 
//   />
// )}
