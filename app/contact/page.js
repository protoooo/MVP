// app/contact/page.js - REPLACE ENTIRE FILE (Dark UI)

'use client'

import { useState, useEffect } from 'react'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { Outfit, Inter } from 'next/font/google'
import Link from 'next/link'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  useEffect(() => {
    document.body.classList.add('ui-enterprise-bg')
    return () => document.body.classList.remove('ui-enterprise-bg')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    
    setLoading(true)
    setError('')
    
    try {
      const captchaToken = await executeRecaptcha('contact')
      
      if (!captchaToken) {
        setError('Security verification failed. Please try again.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          captchaToken
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send message. Please try again.')
        setLoading(false)
        return
      }

      setSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
      
    } catch (err) {
      console.error('Contact form error:', err)
      setError('An unexpected error occurred. Please try emailing us directly at hello@protocollm.org')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen px-4 py-10 ${inter.className}`}>
      <style jsx global>{`
        body.ui-enterprise-bg {
          overflow-x: hidden;
          background: #050608;
          color: rgba(255, 255, 255, 0.94);
          --ui-lamp: 1.08;
          --ui-vignette: 0.93;
        }
        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: -12%;
          pointer-events: none;
          background: radial-gradient(1200px 560px at 50% -14%, rgba(255, 255, 255, 0.12), transparent 62%),
            radial-gradient(980px 600px at 16% 6%, rgba(0, 255, 210, 0.06), transparent 64%),
            radial-gradient(980px 600px at 86% 4%, rgba(140, 110, 255, 0.06), transparent 66%),
            radial-gradient(1200px 820px at 50% 118%, rgba(255, 255, 255, 0.03), transparent 66%),
            conic-gradient(
              from 210deg at 50% 32%,
              rgba(0, 255, 210, 0.05),
              rgba(140, 110, 255, 0.05),
              rgba(255, 255, 255, 0.02),
              rgba(0, 255, 210, 0.05)
            );
          opacity: 0.88;
          filter: brightness(var(--ui-lamp)) saturate(1.15);
          transform: translateZ(0);
          will-change: transform;
          animation: uiAurora 18s ease-in-out infinite alternate;
        }
        @keyframes uiAurora {
          0% { transform: translate3d(0%, 0%, 0) scale(1) rotate(0deg); }
          50% { transform: translate3d(-2%, -1%, 0) scale(1.04) rotate(1.5deg); }
          100% { transform: translate3d(2%, 0%, 0) scale(1.08) rotate(-1.5deg); }
        }
        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
              380px 320px at 50% 34%,
              rgba(0, 0, 0, 0) 0%,
              rgba(0, 0, 0, 0.55) 62%,
              rgba(0, 0, 0, 0.88) 100%
            ),
            radial-gradient(circle at 50% 25%, transparent 0%, rgba(0, 0, 0, 0.62) 70%);
          opacity: var(--ui-vignette);
          transform: translateZ(0);
        }
      `}</style>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link href="/" className={`inline-flex items-baseline gap-0 select-none ${outfit.className}`}>
            <span className="text-[15px] sm:text-[16px] font-extrabold tracking-[-0.03em] text-white/90">protocol</span>
            <span className="text-[15px] sm:text-[16px] font-black tracking-[-0.03em] text-white/90">LM</span>
          </Link>
          <div className="hidden sm:block text-[12px] text-white/65">
            Made in Washtenaw County for Washtenaw County.
          </div>
        </div>

        {/* Main Container */}
        <div className="rounded-[22px] border border-white/12 bg-white/[0.03] shadow-[0_40px_120px_rgba(0,0,0,0.7)] overflow-hidden">
          
          {/* Title Section */}
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight text-white ${outfit.className}`}>Contact Us</h1>
            <p className="mt-2 text-[13px] text-white/60">We're here to help. Get in touch with our team.</p>
          </div>

          {/* Content Grid */}
          <div className="p-6 sm:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Contact Info */}
              <div>
                <h2 className={`text-xl font-bold text-white mb-6 ${outfit.className}`}>Get in Touch</h2>
                
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className={`font-bold text-white/90 text-sm mb-1 ${outfit.className}`}>Email Support</h3>
                        <a href="mailto:hello@protocollm.org" className="text-blue-400 hover:text-blue-300 text-sm">
                          hello@protocollm.org
                        </a>
                        <p className="text-xs text-white/50 mt-1">We respond within 24-48 hours</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 border border-green-500/20">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className={`font-bold text-white/90 text-sm mb-1 ${outfit.className}`}>Business Hours</h3>
                        <p className="text-white/70 text-sm">Monday - Friday</p>
                        <p className="text-white/70 text-sm">9:00 AM - 6:00 PM EST</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className={`font-bold text-white/90 text-sm mb-1 ${outfit.className}`}>Location</h3>
                        <p className="text-white/70 text-sm">Michigan, United States</p>
                        <p className="text-xs text-white/50 mt-1">Serving restaurants statewide</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <h2 className={`text-xl font-bold text-white mb-6 ${outfit.className}`}>Send us a Message</h2>
                
                {submitted ? (
                  <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
                    <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className={`text-lg font-bold text-white mb-2 ${outfit.className}`}>Message Sent!</h3>
                    <p className="text-white/70 mb-4 text-sm">
                      We've received your message and will respond within 24-48 hours.
                    </p>
                    <button 
                      onClick={() => setSubmitted(false)}
                      className="text-blue-400 hover:text-blue-300 font-semibold text-sm"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-white/55 mb-2">Your Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/12 bg-white/[0.02] text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.04] focus:outline-none transition"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/55 mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/12 bg-white/[0.02] text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.04] focus:outline-none transition"
                        placeholder="john@restaurant.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/55 mb-2">Subject</label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/12 bg-white/[0.02] text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.04] focus:outline-none transition"
                        placeholder="How can we help?"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/55 mb-2">Message</label>
                      <textarea
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-white/12 bg-white/[0.02] text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/[0.04] focus:outline-none transition resize-none"
                        placeholder="Tell us more about your question or issue..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isLoaded}
                      className="w-full bg-white text-black font-bold py-3 px-6 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Sending...' : 'Send Message'}
                    </button>

                    <RecaptchaBadge />
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm">
            <span>←</span> Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
