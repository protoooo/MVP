'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Pricing() {
  const [loadingId, setLoadingId] = useState(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleCheckout = async (priceId) => {
    setLoadingId(priceId)

    // 1. Check Session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert("Please Log In or Sign Up on the home page to subscribe.")
      router.push('/')
      return
    }

    // 2. Create Checkout
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: priceId }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        alert('Error starting checkout.')
        setLoadingId(null)
      }
    } catch (error) {
      console.error('Error:', error)
      setLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">Plans & Pricing</h1>
      <p className="text-gray-400 mb-8">Choose the plan that fits your restaurant needs.</p>
      
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* PRO PLAN */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col shadow-lg">
          <h2 className="text-xl font-bold mb-2 text-indigo-400">Pro Plan</h2>
          <p className="text-3xl font-bold mb-4">$29<span className="text-sm font-normal text-gray-400">/mo</span></p>
          <ul className="text-gray-300 text-sm mb-8 space-y-3 flex-grow">
            <li className="flex items-center">✓ Full Document Access</li>
            <li className="flex items-center">✓ AI Compliance Assistant</li>
            <li className="flex items-center">✓ 7-Day Free Trial</li>
          </ul>
          <button 
            onClick={() => handleCheckout('price_1SVG96DlSrKA3nbArP6hvWXr')} 
            disabled={loadingId !== null}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition disabled:opacity-50"
          >
            {loadingId === 'price_1SVG96DlSrKA3nbArP6hvWXr' ? 'Processing...' : 'Select Pro'}
          </button>
        </div>

        {/* ENTERPRISE PLAN */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col shadow-lg">
          <h2 className="text-xl font-bold mb-2 text-purple-400">Enterprise</h2>
          <p className="text-3xl font-bold mb-4">$99<span className="text-sm font-normal text-gray-400">/mo</span></p>
          <ul className="text-gray-300 text-sm mb-8 space-y-3 flex-grow">
            <li className="flex items-center">✓ All Pro Features</li>
            <li className="flex items-center">✓ Multi-Location Support</li>
            <li className="flex items-center">✓ Priority Support</li>
          </ul>
          <button 
            onClick={() => handleCheckout('price_1SVG8KDlSrKA3nbAfEQje8j8')} 
            disabled={loadingId !== null}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition disabled:opacity-50"
          >
            {loadingId === 'price_1SVG8KDlSrKA3nbAfEQje8j8' ? 'Processing...' : 'Select Enterprise'}
          </button>
        </div>

      </div>
      <button onClick={() => router.back()} className="mt-10 text-gray-500 hover:text-white text-sm">← Back to Home</button>
    </div>
  )
}
