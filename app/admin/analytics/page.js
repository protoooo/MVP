'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const Icons = {
  Users: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Activity: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  DollarSign: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Image: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  MessageSquare: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Clock: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="text-blue-600">
          <Icon />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
    <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
    <p className="text-sm text-slate-600">{title}</p>
    {subtitle && (
      <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
    )}
  </div>
)

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [timeRange, setTimeRange] = useState('7d')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [timeRange])

  async function checkAdminAndLoadData() {
    setLoading(true)
    
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push('/')
        return
      }

      // Fetch analytics data
      const data = await fetchAnalytics()
      setAnalytics(data)
    } catch (error) {
      console.error('Analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAnalytics() {
    const now = new Date()
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Fetch total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    // Fetch active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trialing'])

    // Fetch usage data for time period
    const { data: usageData } = await supabase
      .from('usage_counters')
      .select('text_count, image_count, period_start')
      .gte('period_start', startDate.toISOString())
      .order('period_start', { ascending: false })

    const totalTextQueries = usageData?.reduce((sum, row) => sum + (row.text_count || 0), 0) || 0
    const totalImageQueries = usageData?.reduce((sum, row) => sum + (row.image_count || 0), 0) || 0

    // Fetch recent chats
    const { data: recentChats } = await supabase
      .from('chats')
      .select('created_at, user_id')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Fetch revenue data (from subscriptions)
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('price_id, status, current_period_start')
      .in('status', ['active', 'trialing'])

    // Calculate MRR (assuming $100/month for business plan)
    const mrr = (activeSubscriptions || 0) * 100

    // Calculate average queries per user
    const avgQueriesPerUser = activeSubscriptions > 0 
      ? Math.round((totalTextQueries + totalImageQueries) / activeSubscriptions)
      : 0

    // Get new users in time period
    const { count: newUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    // Daily activity breakdown
    const dailyActivity = []
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayUsage = usageData?.filter(u => 
        u.period_start && u.period_start.startsWith(dateStr)
      ) || []
      
      dailyActivity.push({
        date: dateStr,
        textQueries: dayUsage.reduce((sum, u) => sum + (u.text_count || 0), 0),
        imageQueries: dayUsage.reduce((sum, u) => sum + (u.image_count || 0), 0),
      })
    }

    return {
      totalUsers,
      activeSubscriptions,
      totalTextQueries,
      totalImageQueries,
      mrr,
      avgQueriesPerUser,
      newUsers,
      dailyActivity,
      recentChats: recentChats?.length || 0,
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Failed to load analytics</p>
          <button
            onClick={checkAdminAndLoadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">protocolLM usage metrics and insights</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Back to App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={analytics.totalUsers}
            subtitle={`+${analytics.newUsers} new in period`}
            icon={Icons.Users}
          />
          <StatCard
            title="Active Subscriptions"
            value={analytics.activeSubscriptions}
            subtitle="Paying customers"
            icon={Icons.Activity}
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${analytics.mrr.toLocaleString()}`}
            subtitle="MRR from subscriptions"
            icon={Icons.DollarSign}
          />
          <StatCard
            title="Avg Queries/User"
            value={analytics.avgQueriesPerUser}
            subtitle="Per active subscription"
            icon={Icons.TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Text Queries"
            value={analytics.totalTextQueries.toLocaleString()}
            subtitle={`In last ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '1'} days`}
            icon={Icons.MessageSquare}
          />
          <StatCard
            title="Image Analyses"
            value={analytics.totalImageQueries.toLocaleString()}
            subtitle="Photos analyzed"
            icon={Icons.Image}
          />
          <StatCard
            title="Total Chats"
            value={analytics.recentChats}
            subtitle="Conversations started"
            icon={Icons.Clock}
          />
        </div>

        {/* Daily Activity Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Daily Activity</h2>
          <div className="space-y-4">
            {analytics.dailyActivity.slice(-7).map((day, idx) => {
              const total = day.textQueries + day.imageQueries
              const maxTotal = Math.max(...analytics.dailyActivity.map(d => d.textQueries + d.imageQueries))
              const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm text-slate-600">
                      {total} queries
                    </span>
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div className="flex h-full">
                      <div
                        className="bg-blue-500"
                        style={{ width: `${(day.textQueries / maxTotal) * 100}%` }}
                        title={`${day.textQueries} text queries`}
                      />
                      <div
                        className="bg-purple-500"
                        style={{ width: `${(day.imageQueries / maxTotal) * 100}%` }}
                        title={`${day.imageQueries} image queries`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-slate-500">
                    <span>📝 {day.textQueries} text</span>
                    <span>📷 {day.imageQueries} images</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-slate-600">Text Queries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded" />
              <span className="text-slate-600">Image Analyses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
