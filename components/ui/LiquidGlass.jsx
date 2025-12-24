// components/ui/LiquidGlass.jsx
'use client'

import clsx from 'clsx'

export default function LiquidGlass({ className = '', children, variant = 'main' }) {
  const variantClass = variant === 'side' ? 'glass--side' : 'glass--main'

  return (
    <div className={clsx('glass', variantClass, 'relative overflow-hidden', className)}>
      <span aria-hidden className="glass__innerHighlight" />
      <span aria-hidden className="glass__shine" />
      <span aria-hidden className="glass__grain" />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
