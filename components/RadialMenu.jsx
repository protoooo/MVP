// components/RadialMenu.jsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { MessageCircle, Camera, FileText, Settings, Clock } from 'lucide-react'

/**
 * RadialMenu - A centered logo button that toggles a radial wheel menu
 * 
 * @param {Object} props
 * @param {string} props.logoSrc - The logo image source
 * @param {Function} props.onChat - Handler for Chat action
 * @param {Function} props.onImage - Handler for Image/Photo action  
 * @param {Function} props.onPdfExport - Handler for PDF Export action
 * @param {Function} props.onSettings - Handler for Settings action
 * @param {Function} props.onChatHistory - Handler for Chat History action
 * @param {string} props.className - Additional CSS classes
 */
export default function RadialMenu({
  logoSrc,
  onChat,
  onImage,
  onPdfExport,
  onSettings,
  onChatHistory,
  className = '',
}) {
  const [wheelOpen, setWheelOpen] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const containerRef = useRef(null)

  // Define the 5 actions for the wheel
  const actions = [
    { key: 'chat', label: 'Chat', icon: MessageCircle, onClick: onChat },
    { key: 'image', label: 'Image', icon: Camera, onClick: onImage },
    { key: 'pdf', label: 'PDF Export', icon: FileText, onClick: onPdfExport },
    { key: 'settings', label: 'Settings', icon: Settings, onClick: onSettings },
    { key: 'history', label: 'History', icon: Clock, onClick: onChatHistory },
  ]

  // Calculate radial positions for 5 items evenly spaced (72° apart)
  // Starting from top (-90°) and going clockwise
  const getItemPosition = (index, total, radius) => {
    const angleStep = (2 * Math.PI) / total
    const startAngle = -Math.PI / 2 // Start from top
    const angle = startAngle + index * angleStep
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  // Handle click outside to close wheel
  useEffect(() => {
    if (!wheelOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setWheelOpen(false)
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setWheelOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [wheelOpen])

  const handleCenterClick = useCallback(() => {
    setWheelOpen((prev) => !prev)
  }, [])

  const handleActionClick = useCallback((action) => {
    if (action.onClick) {
      action.onClick()
    }
    setWheelOpen(false)
  }, [])

  // Wheel radius - responsive
  const wheelRadius = typeof window !== 'undefined' && window.innerWidth < 400 ? 100 : 120

  return (
    <>
      <div 
        ref={containerRef}
        className={`radial-menu-container ${className}`}
      >
        {/* Center logo button */}
        <button
          type="button"
          className={`radial-center-btn ${isPressed ? 'pressed' : ''} ${wheelOpen ? 'open' : ''}`}
          onClick={handleCenterClick}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          aria-label={wheelOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={wheelOpen}
        >
          <span className="radial-center-inner">
            {logoSrc && (
              <Image
                src={logoSrc}
                alt="ProtocolLM"
                width={80}
                height={80}
                className="radial-logo-img"
                priority
              />
            )}
          </span>
        </button>

        {/* Wheel items */}
        <div className={`radial-wheel ${wheelOpen ? 'open' : ''}`}>
          {actions.map((action, index) => {
            const pos = getItemPosition(index, actions.length, wheelRadius)
            const Icon = action.icon
            
            return (
              <button
                key={action.key}
                type="button"
                className="radial-item"
                onClick={() => handleActionClick(action)}
                style={{
                  '--item-x': `${pos.x}px`,
                  '--item-y': `${pos.y}px`,
                  '--item-delay': `${index * 0.04}s`,
                }}
                aria-label={action.label}
                tabIndex={wheelOpen ? 0 : -1}
              >
                <span className="radial-item-icon">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="radial-item-label">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .radial-menu-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        /* Center button - squishy pressable */
        .radial-center-btn {
          position: relative;
          z-index: 10;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: 
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          overflow: hidden;
        }

        .radial-center-btn:hover {
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        /* Squishy press effect */
        .radial-center-btn.pressed {
          transform: scale(0.92);
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .radial-center-btn.open {
          transform: scale(1.05);
          box-shadow: 
            0 16px 48px rgba(95, 168, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            0 0 0 2px rgba(95, 168, 255, 0.3);
        }

        .radial-center-btn.open.pressed {
          transform: scale(0.98);
        }

        .radial-center-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .radial-center-btn :global(.radial-logo-img) {
          width: 80px;
          height: 80px;
          object-fit: contain;
          pointer-events: none;
        }

        /* Wheel container */
        .radial-wheel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .radial-wheel.open {
          pointer-events: auto;
        }

        /* Individual wheel items */
        .radial-item {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 64px;
          height: 64px;
          margin-left: -32px;
          margin-top: -32px;
          border-radius: 16px;
          border: none;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(16px) saturate(130%);
          -webkit-backdrop-filter: blur(16px) saturate(130%);
          box-shadow: 
            0 8px 24px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: rgba(15, 23, 42, 0.9);
          opacity: 0;
          transform: translate(0, 0) scale(0.5);
          transition: 
            opacity 0.25s ease,
            transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
            background 0.15s ease,
            box-shadow 0.15s ease;
          transition-delay: var(--item-delay);
        }

        .radial-wheel.open .radial-item {
          opacity: 1;
          transform: translate(var(--item-x), var(--item-y)) scale(1);
        }

        .radial-item:hover {
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 
            0 12px 32px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          transform: translate(var(--item-x), var(--item-y)) scale(1.08);
        }

        .radial-item:active {
          transform: translate(var(--item-x), var(--item-y)) scale(0.95);
        }

        .radial-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(15, 23, 42, 0.85);
        }

        .radial-item-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: rgba(15, 23, 42, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 58px;
        }

        /* Responsive adjustments for smaller screens */
        @media (max-width: 400px) {
          .radial-center-btn {
            width: 88px;
            height: 88px;
          }

          .radial-center-btn :global(.radial-logo-img) {
            width: 70px;
            height: 70px;
          }

          .radial-item {
            width: 56px;
            height: 56px;
            margin-left: -28px;
            margin-top: -28px;
            border-radius: 14px;
          }

          .radial-item-icon :global(svg) {
            width: 18px;
            height: 18px;
          }

          .radial-item-label {
            font-size: 8px;
            max-width: 50px;
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .radial-center-btn,
          .radial-item {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  )
}
