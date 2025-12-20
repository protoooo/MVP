'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function AdminLocationsPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadLocationData()
  }, [])

  async function loadLocationData() {
    setLoading(true)
    
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      
      if (!user || user.email !== adminEmail) {
        router.push('/')
        return
      }

      // Get all active subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('user_id, status, plan')
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })

      // For each user, get location data
      const usersWithLocations = []
      
      for (const sub of subscriptions || []) {
        // Get user email
        const { data: authData } = await supabase.auth.admin.getUserById(sub.user_id)
        const email = authData?.user?.email || 'Unknown'

        // Get location access history (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        
        const { data: locations } = await supabase
          .from('location_access_log')
          .select('location_fingerprint, ip_prefix, created_at')
          .eq('user_id', sub.user_id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })

        // Count unique locations
        const uniqueLocations = new Set(
          (locations || []).map(l => l.location_fingerprint)
        )

        usersWithLocations.push({
          userId: sub.user_id,
          email,
          status: sub.status,
          plan: sub.plan,
          uniqueLocations: uniqueLocations.size,
          totalAccesses: locations?.length || 0,
          lastAccess: locations?.[0]?.created_at || null,
          locations: Array.from(uniqueLocations)
        })
      }

      // Sort by number of locations (suspicious users first)
      usersWithLocations.sort((a, b) => b.uniqueLocations - a.uniqueLocations)
      
      setUsers(usersWithLocations)
    } catch (error) {
      console.error('Admin check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Location Monitoring</h1>
              <p className="text-sm text-slate-600 mt-1">Track multi-location usage patterns</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/analytics')}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Analytics
              </button>
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600">Total Active Users</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600">Multi-Location Users</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {users.filter(u => u.uniqueLocations > 2).length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600">Suspicious Activity</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {users.filter(u => u.uniqueLocations >= 4).length}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Locations (7d)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Total Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr 
                      key={user.userId} 
                      className={`hover:bg-slate-50 ${
                        user.uniqueLocations >= 4 ? 'bg-red-50' : 
                        user.uniqueLocations > 2 ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${
                            user.uniqueLocations >= 4 ? 'text-red-600' :
                            user.uniqueLocations > 2 ? 'text-amber-600' :
                            'text-slate-900'
                          }`}>
                            {user.uniqueLocations}
                          </span>
                          {user.uniqueLocations >= 4 && (
                            <span className="text-xs text-red-600">🚨 SUSPICIOUS</span>
                          )}
                          {user.uniqueLocations > 2 && user.uniqueLocations < 4 && (
                            <span className="text-xs text-amber-600">⚠️ WATCH</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.totalAccesses}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(user.lastAccess)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Detection Rules</h3>
          <div className="space-y-1 text-xs text-slate-600">
            <div>✅ <strong>1-2 locations:</strong> Normal (home + restaurant, or nearby buildings)</div>
            <div>⚠️ <strong>3 locations:</strong> Watch list (might be multi-location sharing)</div>
            <div>🚨 <strong>4+ locations:</strong> Suspicious (likely sharing across locations)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
