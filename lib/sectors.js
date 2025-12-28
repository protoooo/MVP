// lib/sectors.js - Multi-Sector Configuration
// Defines all supported compliance sectors and their metadata

/**
 * Sector identifiers (used in database, API calls, file paths)
 */
export const SECTORS = {
  FOOD_SAFETY: 'food_safety',
  FIRE_LIFE_SAFETY: 'fire_life_safety',
  RENTAL_HOUSING: 'rental_housing',
}

/**
 * Sector display names and descriptions
 */
export const SECTOR_METADATA = {
  [SECTORS.FOOD_SAFETY]: {
    id: SECTORS.FOOD_SAFETY,
    name: 'Food Safety',
    description: 'Food service establishments, restaurants, and health department inspections',
    price: 50, // USD per month - flat subscription
    pricingModel: 'flat',
    usageNotes: 'Unlimited weekly inspections included. No per-image or per-video charges.',
    active: true,
    state: 'michigan',
    icon: '🍽️',
    category: 'Health & Safety',
  },
  [SECTORS.FIRE_LIFE_SAFETY]: {
    id: SECTORS.FIRE_LIFE_SAFETY,
    name: 'Fire & Life Safety',
    description: 'Occupied buildings, fire code compliance, and life safety systems',
    price: null, // Usage-based pricing
    pricingModel: 'usage',
    usageRates: {
      perMinuteVideo: 0.50, // USD per minute of video
      perImage: 0, // Images included, no separate charge
    },
    usageNotes: 'Billed by video duration. Ideal for long building walkthroughs (30-90+ minutes).',
    active: false, // Not yet available
    state: 'michigan',
    icon: '🔥',
    category: 'Building Safety',
  },
  [SECTORS.RENTAL_HOUSING]: {
    id: SECTORS.RENTAL_HOUSING,
    name: 'Rental Housing',
    description: 'Residential habitability, property maintenance, and tenant safety',
    price: 10, // USD per month - flat subscription
    priceAnnual: 100, // USD per year - discounted annual option
    pricingModel: 'flat',
    usageNotes: 'Low-cost access for tenants. No per-report or per-minute billing.',
    active: false, // Not yet available
    state: 'michigan',
    icon: '🏠',
    category: 'Housing',
  },
}

/**
 * Admin role - has access to all sectors regardless of subscription
 */
export const ADMIN_ROLE = 'admin'

/**
 * Legacy mapping: county/scope to sector
 * For backward compatibility with existing Food Safety implementation
 */
export const COUNTY_TO_SECTOR = {
  washtenaw: SECTORS.FOOD_SAFETY,
  wayne: SECTORS.FOOD_SAFETY,
  oakland: SECTORS.FOOD_SAFETY,
  macomb: SECTORS.FOOD_SAFETY,
  michigan: SECTORS.FOOD_SAFETY,
  general: SECTORS.FOOD_SAFETY,
}

/**
 * Document folder mapping: sector to folder name
 */
export const SECTOR_DOCUMENT_FOLDERS = {
  [SECTORS.FOOD_SAFETY]: 'food_safety',
  [SECTORS.FIRE_LIFE_SAFETY]: 'fire_life_safety',
  [SECTORS.RENTAL_HOUSING]: 'rental_housing',
}

/**
 * Database collection names for legacy compatibility
 * Maps old county-based collections to new sector-based approach
 */
export const LEGACY_COLLECTIONS_TO_SECTOR = {
  michigan: SECTORS.FOOD_SAFETY,
  washtenaw: SECTORS.FOOD_SAFETY,
  wayne: SECTORS.FOOD_SAFETY,
  oakland: SECTORS.FOOD_SAFETY,
  macomb: SECTORS.FOOD_SAFETY,
  general: SECTORS.FOOD_SAFETY,
}

/**
 * Get all active sectors
 */
export function getActiveSectors() {
  return Object.values(SECTOR_METADATA).filter(sector => sector.active)
}

/**
 * Get sector metadata by ID
 */
export function getSectorById(sectorId) {
  return SECTOR_METADATA[sectorId] || null
}

/**
 * Validate sector ID
 */
export function isValidSector(sectorId) {
  return sectorId && Object.values(SECTORS).includes(sectorId)
}

/**
 * Get sector from legacy county/scope identifier
 */
export function getSectorFromCounty(county) {
  const normalized = String(county || '').toLowerCase().trim()
  return COUNTY_TO_SECTOR[normalized] || SECTORS.FOOD_SAFETY
}

/**
 * Check if user has access to a specific sector
 * @param {string} userId - User ID
 * @param {string} sectorId - Sector ID to check
 * @param {object} subscription - User subscription object
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {boolean} - Whether user has access
 */
export function canAccessSector(userId, sectorId, subscription, isAdmin = false) {
  // Admin has access to all sectors
  if (isAdmin) return true
  
  // Validate sector exists
  if (!isValidSector(sectorId)) return false
  
  // Check subscription includes this sector
  // subscription.sector should be the sector ID user has paid for
  return subscription?.sector === sectorId
}

/**
 * Get default sector for a user based on their subscription
 */
export function getDefaultSector(subscription, isAdmin = false) {
  // Admin defaults to food safety (original sector)
  if (isAdmin) return SECTORS.FOOD_SAFETY
  
  // Return subscribed sector or food safety as fallback
  return subscription?.sector || SECTORS.FOOD_SAFETY
}

/**
 * Calculate cost for a given usage based on sector pricing model
 * @param {string} sectorId - Sector ID
 * @param {Object} usage - Usage data
 * @param {number} usage.videoMinutes - Minutes of video processed
 * @param {number} usage.imageCount - Number of images processed
 * @returns {Object} - Cost breakdown
 */
export function calculateUsageCost(sectorId, usage = {}) {
  const sector = getSectorById(sectorId)
  if (!sector) {
    return { cost: 0, billable: false, error: 'Invalid sector' }
  }

  // Flat pricing sectors - no usage charges
  if (sector.pricingModel === 'flat') {
    return {
      cost: 0,
      billable: false,
      model: 'flat',
      monthlyFee: sector.price,
      annualFee: sector.priceAnnual,
      message: 'Included in flat subscription'
    }
  }

  // Usage-based pricing (buildings/fire safety)
  if (sector.pricingModel === 'usage') {
    const videoMinutes = usage.videoMinutes || 0
    const imageCount = usage.imageCount || 0
    
    const videoCharge = videoMinutes * (sector.usageRates?.perMinuteVideo || 0)
    const imageCharge = imageCount * (sector.usageRates?.perImage || 0)
    const totalCost = videoCharge + imageCharge

    return {
      cost: totalCost,
      billable: true,
      model: 'usage',
      breakdown: {
        videoMinutes,
        videoRate: sector.usageRates?.perMinuteVideo || 0,
        videoCharge,
        imageCount,
        imageRate: sector.usageRates?.perImage || 0,
        imageCharge,
      },
      message: `$${totalCost.toFixed(2)} for ${videoMinutes} min video`
    }
  }

  return { cost: 0, billable: false, error: 'Unknown pricing model' }
}

/**
 * Get user-friendly pricing display for a sector
 * @param {string} sectorId - Sector ID
 * @returns {string} - Human-readable pricing description
 */
export function getPricingDisplay(sectorId) {
  const sector = getSectorById(sectorId)
  if (!sector) return 'Pricing not available'

  if (sector.pricingModel === 'flat') {
    if (sector.priceAnnual) {
      return `$${sector.price}/month or $${sector.priceAnnual}/year`
    }
    return `$${sector.price}/month`
  }

  if (sector.pricingModel === 'usage' && sector.usageRates) {
    const parts = []
    if (sector.usageRates.perMinuteVideo > 0) {
      parts.push(`$${sector.usageRates.perMinuteVideo}/minute video`)
    }
    if (sector.usageRates.perImage > 0) {
      parts.push(`$${sector.usageRates.perImage}/image`)
    }
    return parts.join(', ') || 'Usage-based pricing'
  }

  return 'Pricing not available'
}
