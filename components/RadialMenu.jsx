// components/RadialMenu.jsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import AgentIcon from './AgentIcon'

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
  const [wheelRadius, setWheelRadius] = useState(120)
  const containerRef = useRef(null)

  // Mobile-first wheel radius configuration
  const WHEEL_RADIUS_MOBILE = 90
  const WHEEL_RADIUS_DESKTOP = 120
  const DESKTOP_BREAKPOINT = 768

  // Set wheel radius based on screen size (mobile-first: smaller default)
  useEffect(() => {
    const updateRadius = () => {
      // Mobile-first: default to smaller radius, increase for larger screens
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        setWheelRadius(WHEEL_RADIUS_DESKTOP)
      } else {
        setWheelRadius(WHEEL_RADIUS_MOBILE)
      }
    }
    updateRadius()
    window.addEventListener('resize', updateRadius)
    return () => window.removeEventListener('resize', updateRadius)
  }, [])

  // Define the 5 actions for the wheel
  const actions = [
    { key: 'chat', label: 'Chat', iconType: 'chat', onClick: onChat },
    { key: 'image', label: 'Image', iconType: 'vision', onClick: onImage },
    { key: 'pdf', label: 'PDF', iconType: 'pdf', onClick: onPdfExport },
    { key: 'settings', label: 'Settings', iconType: 'settings', onClick: onSettings },
    { key: 'history', label: 'History', iconType: 'history', onClick: onChatHistory },
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

    document.addEventListener('mousedown', handleClickOutside, { passive: true })
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
            
            return (
              <button
                key={action.key}
                type="button"
                className={`radial-item ${wheelOpen ? 'is-open' : ''}`}
                onClick={() => handleActionClick(action)}
                style={{
                  '--item-x': `${pos.x}px`,
                  '--item-y': `${pos.y}px`,
                  '--item-delay': `${index * 0.04}s`,
                }}
                aria-label={action.label}
                tabIndex={wheelOpen ? 0 : -1}
              >
                <span className="agent-card__inner">
                  <span className="agent-card__icon" aria-hidden="true">
                    <AgentIcon type={action.iconType} />
                  </span>
                  <span className="agent-card__label">{action.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .radial-menu-container {
          /* CSS custom property for logo scale - 80% larger than default */
          --logo-scale: 1.8;
          --item-size: 108px;
          --item-icon-size: 64px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          max-width: 540px;
          max-height: 540px;
          margin: 0 auto;
        }

        /* Center button - glass effect ALLOWED per requirements */
        .radial-center-btn {
          position: relative;
          z-index: 10;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 1px solid var(--border, rgba(0, 0, 0, 0.1));
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: 
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .radial-center-btn:hover {
          box-shadow: 
            0 8px 24px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        /* Squishy press effect */
        .radial-center-btn.pressed {
          transform: scale(0.92);
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.06),
            0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        .radial-center-btn.open {
          transform: scale(1.05);
          box-shadow: 
            0 8px 32px rgba(35, 131, 226, 0.15),
            0 0 0 2px rgba(35, 131, 226, 0.3);
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
          width: 70px;
          height: 70px;
          object-fit: contain;
          pointer-events: none;
          /* Scale up logo to fill the button circle nicely (80% larger) */
          transform: scale(var(--logo-scale, 1.8));
          transform-origin: center;
        }

        /* Wheel container */
        .radial-wheel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) translateZ(0);
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .radial-wheel.open {
          pointer-events: auto;
        }

        /* Agent wheel items */
        .radial-item {
          position: absolute;
          top: 0;
          left: 0;
          width: var(--item-size);
          height: var(--item-size);
          aspect-ratio: 1 / 1;
          border-radius: 24px;
          border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.06));
          background: rgba(255, 255, 255, 0.92);
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink, #1a1a1a);
          opacity: 0;
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
            scale(0.82)
            translateY(8px);
          transform-origin: center;
          transition: 
            opacity 0.25s ease,
            transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
            background 0.2s ease,
            box-shadow 0.15s ease,
            color 0.15s ease,
            border-color 0.2s ease;
          transition-delay: var(--item-delay);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          will-change: transform, opacity;
          pointer-events: none;
        }

        .radial-wheel.open .radial-item {
          opacity: 1;
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
            scale(1)
            translateY(0);
          pointer-events: auto;
        }

        .radial-item:hover,
        .radial-item:focus-visible {
          background: rgba(255, 255, 255, 0.98);
          border-color: var(--border-strong, rgba(0, 0, 0, 0.15));
          box-shadow: var(--shadow-md, 0 2px 4px rgba(0, 0, 0, 0.06));
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
            scale(1.03)
            translateY(-2px);
        }

        .radial-item:focus-visible {
          outline: 2px solid var(--focus, #2383e2);
          outline-offset: 4px;
        }

        .radial-item:active {
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
            scale(0.98)
            translateY(0);
          background: var(--clay, #f1f1ef);
        }

        .agent-card__inner {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          height: 100%;
        }

        .agent-card__icon {
          width: var(--item-icon-size);
          height: var(--item-icon-size);
          border-radius: 18px;
          border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.06));
          background: var(--surface, #ffffff);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ink, #1a1a1a);
          transition: transform 0.25s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .radial-item:hover .agent-card__icon,
        .radial-item:focus-visible .agent-card__icon {
          transform: translateY(-2px);
          border-color: var(--border-strong, rgba(0, 0, 0, 0.15));
          box-shadow: var(--shadow-md, 0 2px 4px rgba(0, 0, 0, 0.08));
        }

        .radial-item:active .agent-card__icon {
          transform: translateY(0) scale(0.98);
          box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
        }

        .agent-card__label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--ink-80, rgba(26, 26, 26, 0.8));
        }

        .agent-card__icon :global(.agent-icon) {
          display: inline-flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
          color: var(--ink, #1a1a1a);
        }

        .agent-card__icon :global(.agent-icon-svg) {
          width: 80%;
          height: 80%;
        }

        .agent-card__icon :global(.agent-icon),
        .agent-card__icon :global(.agent-icon-svg) {
          transition: transform 0.25s ease;
        }

        /* Tablet and larger screens - keep sizing consistent */
        @media (min-width: 768px) {
          .radial-center-btn {
            width: 100px;
            height: 100px;
          }

          .radial-center-btn :global(.radial-logo-img) {
            width: 80px;
            height: 80px;
          }
        }

        /* Mobile adjustments to keep the wheel centered & circular */
        @media (max-width: 767px) {
          .radial-menu-container {
            max-width: 420px;
            max-height: 420px;
          }

          .radial-item {
            --item-size: 96px;
          }

          .agent-card__icon {
            --item-icon-size: 56px;
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .radial-center-btn,
          .radial-item {
            transition: none !important;
          }
        }
      `}</style>
    </>
  )
}
