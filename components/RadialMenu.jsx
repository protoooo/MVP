// components/RadialMenu.jsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import AgentIcon from './AgentIcon'

/**
 * RadialMenu - A centered radial wheel of standalone icons
 *
 * @param {Object} props
 * @param {Function} props.onChat - Handler for Chat action
 * @param {Function} props.onImage - Handler for Image/Photo action
 * @param {Function} props.onPdfExport - Handler for PDF Export action
 * @param {Function} props.onSettings - Handler for Settings action
 * @param {Function} props.onChatHistory - Handler for Chat History action
 * @param {string} props.className - Additional CSS classes
 */
export default function RadialMenu({
  onChat,
  onImage,
  onPdfExport,
  onSettings,
  onChatHistory,
  className = '',
}) {
  const [wheelRadius, setWheelRadius] = useState(120)

  const WHEEL_RADIUS_MOBILE = 110
  const WHEEL_RADIUS_DESKTOP = 140
  const DESKTOP_BREAKPOINT = 768

  useEffect(() => {
    const updateRadius = () => {
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

  const actions = useMemo(
    () => [
      { key: 'chat', label: 'Chat', iconType: 'chat', color: '#3b82f6', onClick: onChat },
      { key: 'image', label: 'Image Analysis', iconType: 'vision', color: '#22c55e', onClick: onImage },
      { key: 'pdf', label: 'PDF Export', iconType: 'pdf', color: '#f97316', onClick: onPdfExport },
      { key: 'history', label: 'History', iconType: 'history', color: '#0d9488', onClick: onChatHistory },
      { key: 'settings', label: 'Settings', iconType: 'settings', color: '#6b7280', onClick: onSettings },
    ],
    [onChat, onChatHistory, onImage, onPdfExport, onSettings]
  )

  const getItemPosition = (index, total, radius) => {
    const angleStep = (2 * Math.PI) / total
    const startAngle = -Math.PI / 2
    const angle = startAngle + index * angleStep
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  return (
    <>
      <div className={`radial-menu-container ${className}`}>
        <div className="radial-wheel">
          {actions.map((action, index) => {
            const pos = getItemPosition(index, actions.length, wheelRadius)

            return (
              <button
                key={action.key}
                type="button"
                className="radial-item"
                onClick={action.onClick}
                style={{
                  '--item-x': `${pos.x}px`,
                  '--item-y': `${pos.y}px`,
                  '--item-delay': `${index * 0.05}s`,
                  '--icon-color': action.color,
                }}
                aria-label={action.label}
              >
                <span className="radial-icon" aria-hidden="true">
                  <AgentIcon type={action.iconType} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .radial-menu-container {
          --item-icon-size: 44px;
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

        .radial-wheel {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          transform: translate(-50%, -50%);
        }

        .radial-item {
          --item-size: 70px;
          position: absolute;
          top: 0;
          left: 0;
          width: var(--item-size);
          height: var(--item-size);
          padding: 0;
          border: none;
          background: transparent;
          color: var(--icon-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
            scale(0.94);
          transition: transform 0.2s ease, opacity 0.25s ease;
          opacity: 0;
          animation: radial-item-pop 0.3s ease forwards;
          animation-delay: var(--item-delay);
        }

        .radial-item:hover {
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
            scale(1.06);
        }

        .radial-item:active {
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
            scale(0.96);
        }

        .radial-item:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 10px;
        }

        .radial-icon {
          width: var(--item-icon-size);
          height: var(--item-icon-size);
          display: inline-flex;
        }

        .radial-icon :global(.agent-icon) {
          display: inline-flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: center;
        }

        .radial-icon :global(.agent-icon-svg) {
          width: 100%;
          height: 100%;
        }

        @keyframes radial-item-pop {
          from {
            opacity: 0;
            transform: translate(
                calc(var(--item-x) - (var(--item-size) / 2)),
                calc(var(--item-y) - (var(--item-size) / 2))
              )
              scale(0.85);
          }
          to {
            opacity: 1;
            transform: translate(
                calc(var(--item-x) - (var(--item-size) / 2)),
                calc(var(--item-y) - (var(--item-size) / 2))
              )
              scale(1);
          }
        }

        @media (max-width: 767px) {
          .radial-menu-container {
            max-width: 420px;
            max-height: 420px;
          }

          .radial-item {
            --item-size: 64px;
          }

          .radial-icon {
            --item-icon-size: 40px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .radial-item {
            transition: none !important;
            animation: none !important;
            opacity: 1;
            transform: translate(
                calc(var(--item-x) - (var(--item-size) / 2)),
                calc(var(--item-y) - (var(--item-size) / 2))
              )
              scale(1);
          }
        }
      `}</style>
    </>
  )
}
