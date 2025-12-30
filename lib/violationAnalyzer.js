/**
 * Violation Analysis and Classification
 * Provides utilities for analyzing and classifying health code violations
 */

/**
 * Classify violation severity based on keywords and context
 * @param {string} description - The violation description
 * @param {string} citation - The citation reference
 * @returns {string} Severity level (Low, Medium, High)
 */
export function classifyViolationSeverity(description, citation = '') {
  const lowerDesc = description.toLowerCase()
  const lowerCite = citation.toLowerCase()

  // Critical/High severity indicators
  const criticalKeywords = [
    'foodborne illness',
    'contamination',
    'cross-contamination',
    'raw meat',
    'temperature danger zone',
    'temperature abuse',
    'expired food',
    'pest infestation',
    'rodent',
    'vermin',
    'sewage',
    'no hot water',
    'no handwashing',
    'critical violation'
  ]

  // Medium severity indicators
  const mediumKeywords = [
    'improper storage',
    'not properly covered',
    'inadequate cleaning',
    'missing label',
    'poor hygiene',
    'dirty equipment',
    'unclean surface',
    'inadequate temperature',
    'no thermometer',
    'worn equipment'
  ]

  // Check for critical violations
  if (criticalKeywords.some(keyword => lowerDesc.includes(keyword) || lowerCite.includes(keyword))) {
    return 'High'
  }

  // Check for medium violations
  if (mediumKeywords.some(keyword => lowerDesc.includes(keyword) || lowerCite.includes(keyword))) {
    return 'Medium'
  }

  // Default to Low
  return 'Low'
}

/**
 * Aggregate violations by severity
 * @param {Array<{description: string, severity: string, citation: string}>} violations
 * @returns {{high: number, medium: number, low: number, total: number}}
 */
export function aggregateViolationsBySeverity(violations) {
  const aggregation = {
    high: 0,
    medium: 0,
    low: 0,
    total: violations.length
  }

  for (const violation of violations) {
    const severity = violation.severity.toLowerCase()
    if (severity === 'high') {
      aggregation.high++
    } else if (severity === 'medium') {
      aggregation.medium++
    } else {
      aggregation.low++
    }
  }

  return aggregation
}

/**
 * Group violations by category
 * @param {Array<{description: string, severity: string, citation: string}>} violations
 * @returns {Object<string, Array>} Violations grouped by category
 */
export function groupViolationsByCategory(violations) {
  const categories = {
    'Food Storage & Temperature': [],
    'Cross-Contamination': [],
    'Personal Hygiene': [],
    'Equipment & Facilities': [],
    'Pest Control': [],
    'Other': []
  }

  for (const violation of violations) {
    const lowerDesc = violation.description.toLowerCase()
    let categorized = false

    if (lowerDesc.includes('storage') || lowerDesc.includes('temperature') || lowerDesc.includes('freezer') || lowerDesc.includes('refriger')) {
      categories['Food Storage & Temperature'].push(violation)
      categorized = true
    }
    
    if (!categorized && (lowerDesc.includes('cross-contamin') || lowerDesc.includes('raw meat') || lowerDesc.includes('separate'))) {
      categories['Cross-Contamination'].push(violation)
      categorized = true
    }
    
    if (!categorized && (lowerDesc.includes('hygiene') || lowerDesc.includes('handwash') || lowerDesc.includes('glove') || lowerDesc.includes('hair'))) {
      categories['Personal Hygiene'].push(violation)
      categorized = true
    }
    
    if (!categorized && (lowerDesc.includes('equipment') || lowerDesc.includes('surface') || lowerDesc.includes('clean') || lowerDesc.includes('sanit'))) {
      categories['Equipment & Facilities'].push(violation)
      categorized = true
    }
    
    if (!categorized && (lowerDesc.includes('pest') || lowerDesc.includes('rodent') || lowerDesc.includes('insect') || lowerDesc.includes('vermin'))) {
      categories['Pest Control'].push(violation)
      categorized = true
    }
    
    if (!categorized) {
      categories['Other'].push(violation)
    }
  }

  // Remove empty categories
  const filteredCategories = {}
  for (const [category, items] of Object.entries(categories)) {
    if (items.length > 0) {
      filteredCategories[category] = items
    }
  }

  return filteredCategories
}

/**
 * Deduplicate similar violations
 * @param {Array<{description: string, severity: string, citation: string}>} violations
 * @returns {Array} Deduplicated violations
 */
export function deduplicateViolations(violations) {
  const seen = new Set()
  const unique = []

  for (const violation of violations) {
    // Create a normalized key for comparison
    const key = violation.description.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100)

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(violation)
    }
  }

  return unique
}

/**
 * Sort violations by severity (High -> Medium -> Low)
 * @param {Array<{description: string, severity: string, citation: string}>} violations
 * @returns {Array} Sorted violations
 */
export function sortViolationsBySeverity(violations) {
  const severityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 }
  
  return [...violations].sort((a, b) => {
    const orderA = severityOrder[a.severity] ?? 3
    const orderB = severityOrder[b.severity] ?? 3
    return orderA - orderB
  })
}

/**
 * Create a summary of violations for reporting
 * @param {Array<{description: string, severity: string, citation: string}>} violations
 * @returns {Object} Summary object
 */
export function createViolationSummary(violations) {
  const aggregation = aggregateViolationsBySeverity(violations)
  const categories = groupViolationsByCategory(violations)
  const sorted = sortViolationsBySeverity(violations)

  return {
    total: aggregation.total,
    by_severity: {
      high: aggregation.high,
      medium: aggregation.medium,
      low: aggregation.low
    },
    by_category: Object.fromEntries(
      Object.entries(categories).map(([cat, items]) => [cat, items.length])
    ),
    violations: sorted
  }
}
