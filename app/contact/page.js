'use client'

import { useState } from 'react'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import InfoPageLayout from '@/components/InfoPageLayout'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const { isLoaded, executeRecaptcha } = useRecaptcha()

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
        body: JSON.stringify({ ...formData, captchaToken })
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
      setError('An unexpected error occurred. Please try emailing us directly at support@protocollm.org')
    } finally {
      setLoading(false)
    }
  }

  return (
    <InfoPageLayout
      title="Contact"
      subtitle="Reach our compliance team for product questions, billing help, or data requests. We respond quickly during business hours."
      eyebrow="Support"
    >
      <div className="info-section">
        <h2 className="info-section-title">Get in Touch</h2>
        <p>We're local to Washtenaw County and here to support operators.</p>

        <div style={{ display: 'grid', gap: '12px', marginTop: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div style={{ 
            padding: '16px', 
            background: 'var(--bg-3)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-sm)' 
          }}>
            <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
              Email
            </div>
            <a href="mailto:support@protocollm.org" style={{ display: 'block', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
              support@protocollm.org
            </a>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0 }}>
              Responses within 24-48 hours.
            </p>
          </div>

          <div style={{ 
            padding: '16px', 
            background: 'var(--bg-3)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-sm)' 
          }}>
            <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
              Business Hours
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
              Mon - Fri, 9AM - 6PM EST
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0 }}>
              We monitor urgent production issues after hours.
            </p>
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          background: 'var(--bg-3)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-sm)',
          marginTop: '12px'
        }}>
          <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
            Location
          </div>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
            Washtenaw County, Michigan
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0 }}>
            Serving restaurants and food operators statewide.
          </p>
        </div>
      </div>

      <div className="info-highlight">
        <div className="info-highlight-title">Response Promise</div>
        <p>
          We prioritize health-code critical issues and strive to resolve support tickets quickly.
        </p>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">Send Us a Message</h2>

        {submitted ? (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center', 
            background: 'var(--bg-3)', 
            border: '1px solid var(--accent)', 
            borderRadius: 'var(--radius-md)',
            marginTop: '20px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ink-0)', margin: '0 0 8px' }}>
              Message Sent!
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--ink-1)', margin: 0 }}>
              We've received your message and will respond within 24-48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--ink-1)', marginBottom: '8px' }}>
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-0)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--ink-1)', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink-0)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--ink-1)', marginBottom: '8px' }}>
                Subject
              </label>
              <input
                type="text"
                name="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink-0)',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--ink-1)', marginBottom: '8px' }}>
                Message
              </label>
              <textarea
                name="message"
                rows="5"
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink-0)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {error && (
              <p style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#ef4444', 
                fontSize: '14px' 
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !isLoaded}
              style={{
                width: '100%',
                height: '44px',
                marginTop: '20px',
                background: loading || !isLoaded ? 'var(--bg-3)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || !isLoaded ? 'not-allowed' : 'pointer',
                opacity: loading || !isLoaded ? 0.5 : 1,
                transition: 'background 0.15s ease'
              }}
            >
              {loading ? 'Sending…' : 'Send Message'}
            </button>

            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--ink-2)', textAlign: 'center' }}>
              We use reCAPTCHA to protect this form.
            </p>

            <RecaptchaBadge />
          </form>
        )}
      </div>
    </InfoPageLayout>
  )
}
