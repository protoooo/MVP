'use client'

import { useState, useEffect, useCallback } from 'react'
import SearchBar from '@/components/dashboard/SearchBar'
import FilterBar from '@/components/dashboard/FilterBar'
import EstablishmentCard from '@/components/dashboard/EstablishmentCard'
import AnalyticsSummary from '@/components/dashboard/AnalyticsSummary'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function InspectionDashboard() {
  const [establishments, setEstablishments] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  })
  const [showQA, setShowQA] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [qaLoading, setQaLoading] = useState(false)

  const fetchEstablishments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20',
        county: 'washtenaw',
        ...(searchTerm && { search: searchTerm }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.type && { type: filters.type }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      })

      const response = await fetch(`/api/establishments?${params}`)
      const data = await response.json()

      if (response.ok) {
        setEstablishments(data.establishments)
        setPagination(prev => ({
          ...prev,
          totalPages: data.totalPages,
          total: data.total
        }))
      }
    } catch (error) {
      console.error('Failed to fetch establishments:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filters, pagination.page])

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/establishments/analytics?county=washtenaw')
      const data = await response.json()

      if (response.ok) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }, [])

  useEffect(() => {
    fetchEstablishments()
    fetchAnalytics()
  }, [fetchEstablishments, fetchAnalytics])

  const handleSearch = (term) => {
    setSearchTerm(term)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleQASubmit = async (e) => {
    e.preventDefault()
    setQaLoading(true)
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
      setQaLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary font-sans text-text-primary">
      {/* Header */}
      <div className="bg-text-primary px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <span className="text-white text-xs uppercase tracking-wider font-semibold">
            Washtenaw County Health Inspections
          </span>
        </div>
      </div>

      <header className="bg-bg-primary border-b border-border-default shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary tracking-tight">Inspection Dashboard</h1>
              <p className="text-base text-text-secondary mt-1">Track food safety compliance across Washtenaw County</p>
            </div>
            <button
              onClick={() => setShowQA(!showQA)}
              className="btn-secondary"
            >
              {showQA ? 'Hide Q&A' : 'Ask a Question'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Q&A Section (Collapsible) */}
        {showQA && (
          <section className="card mb-8 animate-fadeInUp">
            <h2 className="text-xl font-bold text-primary mb-4">Food Safety Regulation Q&A</h2>
            <p className="text-sm text-text-secondary mb-4">
              Ask questions about Michigan food safety regulations and compliance requirements.
            </p>
            <form onSubmit={handleQASubmit} className="space-y-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What temperature must hot food be held at?"
                className="min-h-[100px]"
                required
              />
              <button type="submit" disabled={qaLoading} className="btn-primary">
                {qaLoading ? 'Processing...' : 'Submit Question'}
              </button>
            </form>

            {answer && (
              <div className="mt-6 alert-info animate-slideDown">
                <h3 className="text-sm font-bold uppercase mb-2">Response</h3>
                <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}
          </section>
        )}

        {/* Analytics Summary */}
        <div className="mb-8">
          <AnalyticsSummary analytics={analytics} />
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="space-y-4">
            <SearchBar onSearch={handleSearch} />
            <FilterBar filters={filters} onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-text-secondary">
            Showing {establishments.length} of {pagination.total} establishments
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 text-sm text-text-primary">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Establishments List */}
        {loading ? (
          <div className="card text-center py-12">
            <p className="text-text-secondary">Loading establishments...</p>
          </div>
        ) : establishments.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {establishments.map((establishment) => (
              <EstablishmentCard key={establishment.id} establishment={establishment} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-text-secondary">No establishments found matching your criteria.</p>
          </div>
        )}

        {/* Subscription Placeholder */}
        <div className="card-elevated mt-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-primary mb-2">Premium Features Coming Soon</h3>
            <p className="text-text-secondary mb-4">
              Get real-time alerts, custom reports, and advanced analytics
            </p>
            <div className="inline-block px-4 py-2 bg-primary text-white rounded-lg font-semibold">
              $5-10/month
            </div>
            <p className="text-xs text-text-tertiary mt-2">Subscribe to unlock premium features</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-text-primary text-white mt-16">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Inspection Dashboard</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Track and monitor food safety compliance across Washtenaw County. Data sourced from public health inspection reports.
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm text-gray-400">© {new Date().getFullYear()} Inspection Dashboard</p>
              <p className="text-xs text-gray-500 mt-2">Public compliance monitoring service</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
