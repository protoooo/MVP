'use client'

import { AlertCircle, Calendar, MapPin } from 'lucide-react'

export default function EstablishmentCard({ establishment }) {
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-primary mb-1">
            {establishment.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
            <MapPin className="h-4 w-4" />
            <span>{establishment.address}</span>
          </div>
          {establishment.type && (
            <span className="inline-block px-2 py-1 text-xs bg-bg-tertiary rounded">
              {establishment.type}
            </span>
          )}
        </div>
        {establishment.severity && (
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(establishment.severity)}`}>
            {establishment.severity.toUpperCase()}
          </span>
        )}
      </div>

      {establishment.inspection_date && (
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
          <Calendar className="h-4 w-4" />
          <span>Inspected: {new Date(establishment.inspection_date).toLocaleDateString()}</span>
        </div>
      )}

      {establishment.violations && establishment.violations.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-text-primary">Violations</h4>
          </div>
          <ul className="space-y-1 pl-6">
            {establishment.violations.map((violation, idx) => (
              <li key={idx} className="text-sm text-text-secondary list-disc">
                {violation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {establishment.notes && establishment.notes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-2">Notes</h4>
          <ul className="space-y-1 pl-6">
            {establishment.notes.map((note, idx) => (
              <li key={idx} className="text-sm text-text-secondary list-disc">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
