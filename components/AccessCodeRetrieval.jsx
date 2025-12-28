// components/AccessCodeRetrieval.jsx
'use client'

import { useState } from 'react'
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react'

/**
 * AccessCodeRetrieval - Self-service component for users who lost their access code
 * Can be embedded in the landing page or shown as a modal
 */
export default function AccessCodeRetrieval({ className = '' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [remaining, setRemaining] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/access-code/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setRemaining(data.remaining)
        setEmail('') // Clear the form
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Failed to retrieve access code')
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage('Network error. Please try again.')
    }
  }

  return (
    <div className={`bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="mt-0.5">
          <Mail className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Lost Your Access Code?
          </h3>
          <p className="text-sm text-slate-600">
            Enter your email and we'll send it to you again. No charge.
          </p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-900 font-medium mb-1">
                Access code sent!
              </p>
              <p className="text-green-700 text-sm">
                Check your email inbox (and spam folder) for your access code.
                {remaining !== null && remaining > 0 && (
                  <span className="block mt-1 text-xs text-green-600">
                    You have {remaining} {remaining === 1 ? 'request' : 'requests'} remaining this hour.
                  </span>
                )}
              </p>
              <button
                onClick={() => {
                  setStatus('idle')
                  setRemaining(null)
                }}
                className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium underline"
              >
                Send another code
              </button>
            </div>
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-900 font-medium mb-1">
                Unable to send code
              </p>
              <p className="text-red-700 text-sm">
                {errorMessage}
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="retrieval-email" className="sr-only">
              Email address
            </label>
            <input
              id="retrieval-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={status === 'loading'}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-offset-0 text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send My Code'
            )}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Limited to 3 requests per hour per email
          </p>
        </form>
      )}
    </div>
  )
}
