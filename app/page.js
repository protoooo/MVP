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
    <div className="min-h-screen bg-[#F0F0F0] font-sans text-gray-900">
      {/* Official Gov Banner */}
      <div className="bg-[#1b1b1b] px-4 py-1">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="text-white text-[10px] uppercase tracking-wider font-semibold">
            An official Michigan compliance tool
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b-4 border-[#1a4480]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-[#1a4480] tracking-tight">ProtocolLM</h1>
              <p className="text-base text-gray-600 mt-1">Food Safety Image Compliance Analysis</p>
            </div>
            <div className="flex gap-4">
              {user ? (
                <button
                  onClick={() => router.push('/upload')}
                  className="px-4 py-2 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] transition-colors"
                >
                  Go to Upload
                </button>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="px-4 py-2 border-2 border-[#1a4480] text-[#1a4480] font-bold rounded-md hover:bg-[#1a4480] hover:text-white transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="px-4 py-2 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 gap-8">
          
          {/* Free Q&A Section - Styled as a Gov Form */}
          <section className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm">
            <div className="mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold text-[#1a4480]">Regulation Inquiry</h2>
              <p className="text-gray-600 mt-2">Get answers grounded in Michigan food safety regulations (Free).</p>
            </div>
            
            <form onSubmit={handleQASubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                  Your Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., What temperature must hot food be held at?"
                  className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900 min-h-[120px]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {loading ? 'Processing Inquiry...' : 'Submit Question'}
              </button>
            </form>
            
            {answer && (
              <div className="mt-8 bg-blue-50 border-l-8 border-[#1a4480] p-6">
                <h3 className="text-sm font-bold text-[#1a4480] uppercase mb-2">Response</h3>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}
          </section>

          {/* Services Container - Subscription Plans */}
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Starter Plan */}
            <section className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm flex flex-col h-full">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-[#1a4480]">Starter</h2>
                <p className="text-sm text-gray-600 mt-1">For small operations</p>
              </div>

              <div className="flex-grow">
                <div className="bg-gray-100 p-4 border border-gray-200 mb-6 rounded-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">Monthly</span>
                    <span className="text-3xl font-bold text-[#1a4480]">$25</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">200 images per month</p>
                </div>
                
                <ul className="list-disc pl-5 space-y-2 mb-8 text-sm text-gray-700">
                  <li>200 image uploads/month</li>
                  <li>AI violation detection</li>
                  <li>PDF compliance reports</li>
                  <li>Email report delivery</li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('starter')}
                disabled={loading}
                className="w-full py-4 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : user ? 'Subscribe Now' : 'Sign Up to Subscribe'}
              </button>
            </section>

            {/* Professional Plan */}
            <section className="bg-white p-8 border-2 border-[#1a4480] shadow-lg rounded-sm flex flex-col h-full relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#1a4480] text-white px-4 py-1 text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-[#1a4480]">Professional</h2>
                <p className="text-sm text-gray-600 mt-1">For busy restaurants</p>
              </div>

              <div className="flex-grow">
                <div className="bg-gray-100 p-4 border border-gray-200 mb-6 rounded-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">Monthly</span>
                    <span className="text-3xl font-bold text-[#1a4480]">$50</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">500 images per month</p>
                </div>
                
                <ul className="list-disc pl-5 space-y-2 mb-8 text-sm text-gray-700">
                  <li>500 image uploads/month</li>
                  <li>AI violation detection</li>
                  <li>PDF compliance reports</li>
                  <li>Email report delivery</li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('professional')}
                disabled={loading}
                className="w-full py-4 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : user ? 'Subscribe Now' : 'Sign Up to Subscribe'}
              </button>
            </section>

            {/* Enterprise Plan */}
            <section className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm flex flex-col h-full">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-[#1a4480]">Enterprise</h2>
                <p className="text-sm text-gray-600 mt-1">For high-volume operations</p>
              </div>

              <div className="flex-grow">
                <div className="bg-gray-100 p-4 border border-gray-200 mb-6 rounded-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">Monthly</span>
                    <span className="text-3xl font-bold text-[#1a4480]">$100</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">1,500 images per month</p>
                </div>
                
                <ul className="list-disc pl-5 space-y-2 mb-8 text-sm text-gray-700">
                  <li>1,500 image uploads/month</li>
                  <li>AI violation detection</li>
                  <li>PDF compliance reports</li>
                  <li>Email report delivery</li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('enterprise')}
                disabled={loading}
                className="w-full py-4 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : user ? 'Subscribe Now' : 'Sign Up to Subscribe'}
              </button>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1b1b1b] text-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8">
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
