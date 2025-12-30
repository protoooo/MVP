'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabaseAuth'

export default function ProtocolLMHomePage() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  // Check current user on mount
  useEffect(() => {
    async function loadUser() {
      const { user: currentUser } = await getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])

  const handleQASubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAnswer('')
    
    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setAnswer(data.answer)
      } else {
        setAnswer(`Error: ${data.error || 'Failed to get answer'}`)
      }
    } catch (error) {
      setAnswer(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (plan) => {
    // If not logged in, redirect to signup
    if (!user) {
      router.push('/auth/signup')
      return
    }

    // Redirect to subscription checkout
    setLoading(true)
    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      })
      
      const data = await response.json()
      
      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(`Error: ${data.error || 'Failed to create subscription'}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary font-sans text-text-primary">
      {/* Official Gov Banner */}
      <div className="bg-text-primary px-4 py-1.5">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <span className="text-white text-xs uppercase tracking-wider font-semibold">
            An official Michigan compliance tool
          </span>
        </div>
      </div>

      {/* Main Header with Superbase styling */}
      <header className="bg-bg-primary border-b border-border-default shadow-soft">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-primary tracking-tight">ProtocolLM</h1>
              <p className="text-base text-text-secondary mt-1">Food Safety Image Compliance Analysis</p>
            </div>
            <div className="flex gap-3">
              {user ? (
                <button
                  onClick={() => router.push('/upload')}
                  className="btn-primary"
                >
                  Go to Upload
                </button>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="btn-secondary"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="btn-primary"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 gap-10">
          
          {/* Free Q&A Section - Superbase Card Style */}
          <section className="card animate-fadeInUp">
            <div className="mb-6 pb-4 border-b border-border-default">
              <h2 className="text-2xl font-bold text-primary">Regulation Inquiry</h2>
              <p className="text-text-secondary mt-2">Get answers grounded in Michigan food safety regulations (Free).</p>
            </div>
            
            <form onSubmit={handleQASubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Your Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., What temperature must hot food be held at?"
                  className="min-h-[120px]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Processing Inquiry...' : 'Submit Question'}
              </button>
            </form>
            
            {answer && (
              <div className="mt-8 alert-info animate-slideDown">
                <h3 className="text-sm font-bold uppercase mb-2">Response</h3>
                <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}
          </section>

          {/* Subscription Plans - Superbase Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Starter Plan */}
            <section className="card-flat flex flex-col h-full animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              <div className="pb-4 mb-6 border-b border-border-default">
                <h2 className="text-xl font-bold text-primary">Starter</h2>
                <p className="text-sm text-text-secondary mt-1">For small operations</p>
              </div>

              <div className="flex-grow">
                <div className="bg-bg-tertiary p-5 rounded-lg border border-border-light mb-6">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-text-primary">Monthly</span>
                    <span className="text-3xl font-bold text-primary">$25</span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">200 images per month</p>
                </div>
                
                <ul className="space-y-3 mb-8 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>200 image uploads/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>AI violation detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>PDF compliance reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Email report delivery</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('starter')}
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? 'Processing...' : user ? 'Subscribe Now' : 'Sign Up to Subscribe'}
              </button>
            </section>

            {/* Professional Plan - Featured */}
            <section className="card-elevated flex flex-col h-full relative animate-fadeInUp" style={{ animationDelay: '0.2s', borderColor: 'var(--color-primary)' }}>
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="badge">MOST POPULAR</span>
              </div>
              <div className="pb-4 mb-6 border-b border-border-default">
                <h2 className="text-xl font-bold text-primary">Professional</h2>
                <p className="text-sm text-text-secondary mt-1">For busy restaurants</p>
              </div>

              <div className="flex-grow">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-5 rounded-lg border border-primary/20 mb-6">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-text-primary">Monthly</span>
                    <span className="text-3xl font-bold text-primary">$50</span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">500 images per month</p>
                </div>
                
                <ul className="space-y-3 mb-8 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>500 image uploads/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>AI violation detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>PDF compliance reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Email report delivery</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('professional')}
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? 'Processing...' : user ? 'Subscribe Now' : 'Sign Up to Subscribe'}
              </button>
            </section>

            {/* Enterprise Plan */}
            <section className="card-flat flex flex-col h-full animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <div className="pb-4 mb-6 border-b border-border-default">
                <h2 className="text-xl font-bold text-primary">Enterprise</h2>
                <p className="text-sm text-text-secondary mt-1">For high-volume operations</p>
              </div>

              <div className="flex-grow">
                <div className="bg-bg-tertiary p-5 rounded-lg border border-border-light mb-6">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-text-primary">Monthly</span>
                    <span className="text-3xl font-bold text-primary">$100</span>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">1,500 images per month</p>
                </div>
                
                <ul className="space-y-3 mb-8 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>1,500 image uploads/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>AI violation detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>PDF compliance reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Email report delivery</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('enterprise')}
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? 'Processing...' : user ? 'Subscribe Now' : 'Sign Up to Subscribe'}
              </button>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-text-primary text-white mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4">About ProtocolLM</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                ProtocolLM helps food service establishments maintain compliance with food safety regulations through AI-powered image analysis. 
                Simple, fast, and built for daily restaurant use.
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm text-gray-400">© {new Date().getFullYear()} ProtocolLM</p>
              <p className="text-xs text-gray-500 mt-2">Subscription-based compliance analysis service</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
