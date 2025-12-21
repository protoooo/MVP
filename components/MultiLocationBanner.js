// components/MultiLocationBanner.js
'use client'

import { useState, useEffect } from 'react'
import { IBM_Plex_Mono } from 'next/font/google'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function MultiLocationBanner({ locationCheck }) {
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed state when location check changes
  useEffect(() => {
    setDismissed(false)
  }, [locationCheck?.uniqueLocationsUsed])

  if (!locationCheck?.requiresUpgrade || dismissed) {
    return null
  }

  const { 
    gracePeriodDaysRemaining, 
    uniqueLocationsUsed, 
    message 
  } = locationCheck

  const isUrgent = gracePeriodDaysRemaining <= 1

  return (
    <div 
      className={ibmMono.className}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '400px',
        background: isUrgent ? '#dc2626' : '#f59e0b',
        color: 'white',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>
          {isUrgent ? '⚠️' : '📍'}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            {isUrgent ? 'Action Required' : 'Multi-Location Detected'}
          </div>
          
          <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '12px', opacity: 0.95 }}>
            Using from <strong>{uniqueLocationsUsed} locations</strong>. 
            {gracePeriodDaysRemaining > 0 && (
              <> Upgrade within <strong>{gracePeriodDaysRemaining} day{gracePeriodDaysRemaining > 1 ? 's' : ''}</strong> to continue access.</>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="mailto:support@protocollm.org?subject=Multi-Location%20Upgrade"
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                background: 'white',
                color: isUrgent ? '#dc2626' : '#f59e0b',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Upgrade Now
            </a>
            
            {!isUrgent && (
              <button
                onClick={() => setDismissed(true)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0',
            lineHeight: '1',
            opacity: 0.7
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
