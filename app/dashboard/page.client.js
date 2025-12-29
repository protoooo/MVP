'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function DashboardClient() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [apiKeys, setApiKeys] = useState([])
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ total_reports: 0, total_photos: 0, total_violations: 0 })
  
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/auth')
          return
        }

        setUser(session.user)

        // Load subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()
        
        setSubscription(sub)

        // Load API keys
        const token = session.access_token
        const keysRes = await fetch('/api/keys', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (keysRes.ok) {
          const keysData = await keysRes.json()
          setApiKeys(keysData.keys || [])
        }

        // Load reports
        const { data: reportsData } = await supabase
          .from('reports')
          .select('session_id, created_at, json_report')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        setReports(reportsData || [])

        // Calculate stats
        const totalReports = reportsData?.length || 0
        const totalPhotos = reportsData?.reduce((sum, r) => sum + (r.json_report?.summary?.total_items_analyzed || 0), 0) || 0
        const totalViolations = reportsData?.reduce((sum, r) => sum + (r.json_report?.summary?.violations_found || 0), 0) || 0
        
        setStats({ total_reports: totalReports, total_photos: totalPhotos, total_violations: totalViolations })
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleGenerateKey = async () => {
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session.access_token

      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName || 'API Key' })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate key')
      }

      setGeneratedKey(data.key)
      setNewKeyName('')
      
      // Reload keys
      const keysRes = await fetch('/api/keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setApiKeys(keysData.keys || [])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session.access_token

      await fetch(`/api/keys?key_id=${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Reload keys
      const keysRes = await fetch('/api/keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setApiKeys(keysData.keys || [])
      }
    } catch (err) {
      console.error('Failed to revoke key:', err)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className={plusJakarta.className} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/audit` : 'https://your domain.railway.app/api/webhook/audit'

  return (
    <div className={plusJakarta.className} style={{ minHeight: '100vh', background: '#f6f9ff' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', textDecoration: 'none' }}>
            protocolLM
          </Link>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', color: '#0f172a' }}>Dashboard</h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Total Reports</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a' }}>{stats.total_reports}</div>
          </div>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Photos Analyzed</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a' }}>{stats.total_photos}</div>
          </div>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Violations Found</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{stats.total_violations}</div>
          </div>
        </div>

        {/* Subscription Status */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#0f172a' }}>Subscription</h2>
          {subscription ? (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Status:</strong> <span style={{ color: '#10b981', textTransform: 'capitalize' }}>{subscription.status}</span>
              </p>
              <p>
                <strong>Plan:</strong> {subscription.plan || 'Unlimited Monthly ($49/mo)'}
              </p>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No active subscription. <Link href="/" style={{ color: '#5fa8ff' }}>Start a trial</Link></p>
          )}
        </div>

        {/* API Keys */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a' }}>API Keys</h2>
            <button
              onClick={() => setShowNewKeyModal(true)}
              style={{ background: '#5fa8ff', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}
            >
              + New Key
            </button>
          </div>
          
          {apiKeys.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {apiKeys.map(key => (
                <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{key.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', fontFamily: 'monospace' }}>{key.key}</div>
                    {key.last_used_at && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        Last used: {new Date(key.last_used_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    style={{ background: 'none', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.375rem', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No API keys yet. Create one to access the API.</p>
          )}
        </div>

        {/* Webhook Instructions */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#0f172a' }}>Webhook Integration</h2>
          <p style={{ marginBottom: '1rem', color: '#64748b' }}>
            Use this webhook URL in Jolt, Kroger, or your in-house systems for automatic photo analysis.
          </p>
          
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Webhook URL:</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <code style={{ flex: 1, padding: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl)}
                style={{ background: '#5fa8ff', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Copy
              </button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Example Payload:</div>
            <pre style={{ background: '#fff', padding: '1rem', borderRadius: '0.375rem', overflow: 'auto', fontSize: '0.75rem', fontFamily: 'monospace' }}>
{`{
  "images": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ],
  "api_key": "plm_...",
  "location": "fridge"
}`}
            </pre>
          </div>

          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
            Paste the webhook URL and your API key into your system's settings. Photos will be automatically analyzed and you'll receive a JSON response with violations and a report URL.
          </p>
        </div>

        {/* Recent Reports */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#0f172a' }}>Recent Reports</h2>
          {reports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reports.map(report => (
                <div key={report.session_id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        Session: {report.session_id.substring(0, 8)}...
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {new Date(report.created_at).toLocaleString()}
                      </div>
                      {report.json_report?.summary && (
                        <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                          {report.json_report.summary.total_items_analyzed} photos analyzed • {' '}
                          {report.json_report.summary.violations_found} violations found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No reports yet. Upload photos to generate your first report.</p>
          )}
        </div>
      </main>

      {/* New Key Modal */}
      {showNewKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowNewKeyModal(false)}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '0.75rem', maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Generate New API Key</h3>
            
            {generatedKey ? (
              <div>
                <p style={{ marginBottom: '1rem', color: '#10b981', fontWeight: '600' }}>✓ API Key Generated Successfully!</p>
                <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                  Save this key now - you won't be able to see it again!
                </p>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <code style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>{generatedKey.key}</code>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => copyToClipboard(generatedKey.key)}
                    style={{ flex: 1, background: '#5fa8ff', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Copy Key
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedKey(null)
                      setShowNewKeyModal(false)
                    }}
                    style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '0.375rem', padding: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Key Name (optional)</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="My API Key"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '1rem' }}
                  />
                </div>
                
                {error && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#ef4444', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleGenerateKey}
                    style={{ flex: 1, background: '#5fa8ff', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Generate Key
                  </button>
                  <button
                    onClick={() => setShowNewKeyModal(false)}
                    style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '0.375rem', padding: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
