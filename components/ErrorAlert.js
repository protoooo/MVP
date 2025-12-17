// components/ErrorAlert.js - Reusable error display component
'use client'

import Link from 'next/link'
import { Inter } from 'next/font/google'
import { getErrorMessage } from '@/lib/errorMessages'

const inter = Inter({ subsets: ['latin'], weight: ['500', '600'] })

export default function ErrorAlert({ error, onAction, onDismiss }) {
  if (!error) return null

  const errorInfo = typeof error === 'string' 
    ? getErrorMessage(error)
    : getErrorMessage(error.code || error.message)

  return (
    <div className={`rounded-xl border border-red-500/30 bg-red-500/10 p-4 ${inter.className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-200 mb-1">
            {errorInfo.title}
          </h3>
          <p className="text-sm text-red-200/90 leading-relaxed">
            {errorInfo.message}
          </p>
          
          {errorInfo.action && (
            <div className="mt-3 flex gap-2">
              {errorInfo.actionUrl ? (
                <Link
                  href={errorInfo.actionUrl}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-semibold hover:bg-red-500/30 transition"
                >
                  {errorInfo.action}
                </Link>
              ) : onAction ? (
                <button
                  onClick={onAction}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-semibold hover:bg-red-500/30 transition"
                >
                  {errorInfo.action}
                </button>
              ) : null}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-red-200/60 text-xs font-medium hover:text-red-200 transition"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
