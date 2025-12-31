'use client'

export default function FilterBar({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Severity
        </label>
        <select
          value={filters.severity || ''}
          onChange={(e) => handleChange('severity', e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Establishment Type
        </label>
        <select
          value={filters.type || ''}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">All Types</option>
          <option value="restaurant">Restaurant</option>
          <option value="cafe">Cafe</option>
          <option value="food_truck">Food Truck</option>
          <option value="bakery">Bakery</option>
          <option value="grocery">Grocery Store</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Date From
        </label>
        <input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => handleChange('dateFrom', e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Date To
        </label>
        <input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => handleChange('dateTo', e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
    </div>
  )
}
