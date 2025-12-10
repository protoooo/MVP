'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all') // all, active, trial, canceled
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [filter])

  async function checkAdminAndLoadData() {
    setLoading(true)
    
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      
      if (!user || user.email !== adminEmail) {
        router.push('/')
        return
      }

      // Fetch users with subscriptions
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          user_profiles (
            id,
            created_at,
            accepted_terms,
            accepted_privacy
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching subscriptions:', error)
        return
      }

      // Get user emails from auth
      const usersWithDetails = await Promise.all(
        subscriptions.map(async (sub) => {
          // Get email from user_id
          const { data: authData } = await supabase.auth.admin.getUserById(sub.user_id)
          
          return {
            ...sub,
            email: authData?.user?.email || 'Unknown',
            profile: sub.user_profiles
          }
        })
      )

      // Apply filter
      let filtered = usersWithDetails
      if (filter === 'active') {
        filtered = usersWithDetails.filter(u => u.status === 'active')
      } else if (filter === 'trial') {
        filtered = usersWithDetails.filter(u => u.status === 'trialing')
      } else if (filter === 'canceled') {
        filtered = usersWithDetails.filter(u => u.status === 'canceled')
      }

      setUsers(filtered)
    } catch (error) {
      console.error('Admin check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlanName = (priceId) => {
    if (priceId?.includes('monthly')) return 'Monthly'
    if (priceId?.includes('annual')) return 'Annual'
    return 'Unknown'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'trialing': return 'bg-blue-100 text-blue-800'
      case 'canceled': return 'bg-red-100 text-red-800'
      case 'past_due': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
              <p className="text-sm text-slate-600 mt-1">View and manage paid subscriptions</p>
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

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Active ({users.filter(u => u.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('trial')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'trial'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Trial ({users.filter(u => u.status === 'trialing').length})
          </button>
          <button
            onClick={() => setFilter('canceled')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'canceled'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Canceled ({users.filter(u => u.status === 'canceled').length})
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Renews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {user.email}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            ID: {user.user_id.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{user.plan}</div>
                        <div className="text-xs text-slate-500">{getPlanName(user.price_id)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(user.current_period_end)}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View in Stripe →
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600">Total Revenue (MRR)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              ${users.filter(u => u.status === 'active').length * 100}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600">Active Subscriptions</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {users.filter(u => u.status === 'active').length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600">Trial Users</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {users.filter(u => u.status === 'trialing').length}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600">Churn Rate</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {users.length > 0 
                ? ((users.filter(u => u.status === 'canceled').length / users.length) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
