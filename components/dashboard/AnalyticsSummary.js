'use client'

import { TrendingUp, AlertTriangle, Building2, Clock } from 'lucide-react'

export default function AnalyticsSummary({ analytics }) {
  if (!analytics) {
    return <div>Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-flat">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Establishments</p>
              <p className="text-2xl font-bold text-primary">{analytics.totalEstablishments}</p>
            </div>
          </div>
        </div>

        <div className="card-flat">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Critical Issues</p>
              <p className="text-2xl font-bold text-orange-600">{analytics.severityBreakdown?.critical || 0}</p>
            </div>
          </div>
        </div>

        <div className="card-flat">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">High Priority</p>
              <p className="text-2xl font-bold text-yellow-600">{analytics.severityBreakdown?.high || 0}</p>
            </div>
          </div>
        </div>

        <div className="card-flat">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Recent Inspections (30d)</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.recentInspections}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Violations */}
      <div className="card">
        <h3 className="text-lg font-bold text-primary mb-4">Most Common Violations</h3>
        {analytics.topViolations && analytics.topViolations.length > 0 ? (
          <div className="space-y-3">
            {analytics.topViolations.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-semibold text-text-tertiary">{idx + 1}</span>
                  <span className="text-sm text-text-primary">{item.violation}</span>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {item.count} occurrences
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No violation data available</p>
        )}
      </div>

      {/* Most Cited Establishments */}
      <div className="card">
        <h3 className="text-lg font-bold text-primary mb-4">Most Cited Establishments</h3>
        {analytics.topEstablishments && analytics.topEstablishments.length > 0 ? (
          <div className="space-y-3">
            {analytics.topEstablishments.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-semibold text-text-tertiary">{idx + 1}</span>
                  <span className="text-sm text-text-primary">{item.name}</span>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">
                  {item.count} inspections
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No establishment data available</p>
        )}
      </div>
    </div>
  )
}
