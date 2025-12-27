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
  logoSrc,
}) {
  const [wheelRadius, setWheelRadius] = useState(120)
  const [expanded, setExpanded] = useState(true)

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
      { key: 'chat', label: 'Chat', iconType: 'chat', color: '#3478eb', onClick: onChat },
      { key: 'image', label: 'Image Analysis', iconType: 'vision', color: '#1e9c63', onClick: onImage },
      { key: 'pdf', label: 'PDF Export', iconType: 'pdf', color: '#d96a1c', onClick: onPdfExport },
      { key: 'history', label: 'History', iconType: 'history', color: '#0f766e', onClick: onChatHistory },
      { key: 'settings', label: 'Settings', iconType: 'settings', color: '#4b5563', onClick: onSettings },
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
          <button
            type="button"
            className="radial-center-btn"
            onClick={() => setExpanded((v) => !v)}
            aria-label="ProtocolLM menu"
          >
            {logoSrc ? (
              <img src={logoSrc?.src || logoSrc} alt="ProtocolLM" className="radial-center-logo" />
            ) : (
              <span className="radial-center-dot" />
            )}
          </button>

          {expanded &&
            actions.map((action, index) => {
              const pos = getItemPosition(index, actions.length, wheelRadius)

              return (
                 <button
                   key={action.key}
                   type="button"
                   className={`radial-item radial-item--${action.key}`}
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
           --item-icon-size: 38px;
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

         .radial-center-btn {
           --center-size: 120px;
           position: absolute;
          top: 50%;
          left: 50%;
          width: var(--center-size);
          height: var(--center-size);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #f6f7f5;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.65);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
           transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
           touch-action: manipulation;
         }

        .radial-center-btn:hover {
           transform: translate(-50%, -50%) scale(1.05);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.1);
          border-color: rgba(0, 0, 0, 0.12);
        }

        .radial-center-btn:active {
           transform: translate(-50%, -50%) scale(0.92);
           box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
         }

         .radial-center-logo {
           width: 96px;
           height: 96px;
           object-fit: contain;
         }

        .radial-center-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3478eb;
          box-shadow: 0 0 0 6px rgba(52, 120, 235, 0.12);
        }

         .radial-item {
           --item-size: 70px;
           position: absolute;
          top: 0;
          left: 0;
          width: var(--item-size);
          height: var(--item-size);
          padding: 0;
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fefefe;
          color: var(--icon-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
           transform-origin: center;
           transform: translate(
               calc(var(--item-x) - (var(--item-size) / 2)),
               calc(var(--item-y) - (var(--item-size) / 2))
             )
            scale(0.94);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7);
          transition: transform 0.2s ease, opacity 0.25s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          opacity: 0;
          animation: radial-item-pop 0.3s ease forwards;
           animation-delay: var(--item-delay);
           touch-action: manipulation;
         }

         .radial-item:hover {
          transform: translate(
              calc(var(--item-x) - (var(--item-size) / 2)),
              calc(var(--item-y) - (var(--item-size) / 2))
            )
             scale(1.07);
           box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
           border-color: rgba(0, 0, 0, 0.12);
         }

         .radial-item:active {
           transform: translate(
               calc(var(--item-x) - (var(--item-size) / 2)),
               calc(var(--item-y) - (var(--item-size) / 2))
             )
             scale(0.9);
           box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
         }

        .radial-item:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 10px;
        }

         .radial-icon {
           width: var(--item-icon-size);
           height: var(--item-icon-size);
           display: inline-flex;
           align-items: center;
           justify-content: center;
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
            --item-icon-size: 34px;
          }
        }

        .radial-item--pdf {
          --item-size: 74px;
        }

        .radial-item--pdf .radial-icon {
          --item-icon-size: 40px;
        }

        @media (max-width: 480px) {
          .radial-center-btn {
            --center-size: 100px;
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
