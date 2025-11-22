'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    checkAuth()
    fetchMetrics()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [tab])
  
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
    }
  }
  
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/admin/metrics?type=${tab}`)
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      } else if (res.status === 403) {
        alert('Admin access required')
        router.push('/')
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading metrics...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">System monitoring and metrics</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {['overview', 'errors', 'health', 'endpoints'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium capitalize ${
                tab === t 
                  ? 'text-slate-900 border-b-2 border-slate-900' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        
        {/* Overview Tab */}
        {tab === 'overview' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Health Status */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">System Health</h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  metrics.health.status === 'healthy' ? 'bg-green-500' :
                  metrics.health.status === 'degraded' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <p className="text-2xl font-bold text-slate-900
