// components/NotificationOptInModal.jsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

/**
 * NotificationOptInModal - Post-purchase modal for collecting notification preferences
 * Shows after successful payment with friendly copy
 * Allows users to opt into inspection reminders and regulation updates
 */
export default function NotificationOptInModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  customerEmail 
}) {
  const [inspectionReminders, setInspectionReminders] = useState(false)
  const [regulationUpdates, setRegulationUpdates] = useState(false)
  const [establishmentType, setEstablishmentType] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit({
        inspectionReminders,
        regulationUpdates,
        establishmentType: establishmentType || null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleSkip}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
          
          <div className="pr-10">
            <h2 className="text-2xl font-bold text-white mb-1">
              Stay informed! 📬
            </h2>
            <p className="text-slate-300 text-sm">
              We'll help you stay ahead of inspections and regulations
            </p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            As a thank you for your purchase, we'd love to send you helpful reminders and updates. 
            You can unsubscribe anytime.
          </p>

          {/* Checkbox Options */}
          <div className="space-y-4 mb-6">
            {/* Inspection Reminders */}
            <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={inspectionReminders}
                onChange={(e) => setInspectionReminders(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-semibold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">
                  🗓️ Inspection Season Reminders
                </div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  Get a friendly heads-up 2 weeks before typical inspection season (March & September). 
                  Perfect timing for a fresh scan!
                </div>
              </div>
            </label>

            {/* Regulation Updates */}
            <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={regulationUpdates}
                onChange={(e) => setRegulationUpdates(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-semibold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">
                  📋 Michigan Food Code Updates
                </div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  Stay current with Michigan food safety regulation changes and new requirements. 
                  We only send this when there's important news.
                </div>
              </div>
            </label>
          </div>

          {/* Optional: Establishment Type */}
          {(inspectionReminders || regulationUpdates) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                What type of establishment do you have? (Optional)
              </label>
              <select
                value={establishmentType}
                onChange={(e) => setEstablishmentType(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-offset-0 text-slate-900 bg-white transition-colors"
              >
                <option value="">Select one...</option>
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Café/Coffee Shop</option>
                <option value="food_truck">Food Truck</option>
                <option value="catering">Catering</option>
                <option value="bakery">Bakery</option>
                <option value="bar">Bar/Tavern</option>
                <option value="other">Other</option>
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                This helps us send more relevant information
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-slate-500 text-center mt-4 leading-relaxed">
            We respect your inbox. Unsubscribe anytime with one click. 
            Your email: <span className="font-medium text-slate-700">{customerEmail}</span>
          </p>
        </form>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}
