// lib/sectors.js - Food Safety Configuration
// Defines food safety compliance sector for Michigan restaurants

/**
 * Sector identifiers (used in database, API calls, file paths)
 * NOTE: Only FOOD_SAFETY is supported. Other sectors have been removed.
 */
export const SECTORS = {
  FOOD_SAFETY: 'food_safety',
}

/**
 * Sector display names and descriptions
 * NOTE: Single-sector configuration for food safety only
 */
export const SECTOR_METADATA = {
  [SECTORS.FOOD_SAFETY]: {
    id: SECTORS.FOOD_SAFETY,
    name: 'Food Safety',
    description: 'Pre-inspection video analysis for Michigan restaurant health code compliance',
    price: 149, // USD per inspection report (one-time)
    active: true,
    state: 'michigan',
    icon: '🍽️',
    category: 'Health & Safety',
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
 * NOTE: Only food_safety documents are supported
 */
export const SECTOR_DOCUMENT_FOLDERS = {
  [SECTORS.FOOD_SAFETY]: 'food_safety',
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
 * NOTE: Always returns food safety only (single-sector mode)
 */
export function getActiveSectors() {
  return [SECTOR_METADATA[SECTORS.FOOD_SAFETY]]
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
 * NOTE: Always returns FOOD_SAFETY (single-sector mode)
 */
export function getDefaultSector(subscription, isAdmin = false) {
  return SECTORS.FOOD_SAFETY
}
