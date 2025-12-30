import { customAlphabet } from 'nanoid'

// Create custom alphabet without confusing characters (0, O, I, l)
const nanoid = customAlphabet('123456789abcdefghjkmnpqrstuvwxyz', 16)

/**
 * Generate an obfuscated secret link for tenant reports
 * Format: xxxx-xxxx-xxxx (e.g., ax72-99p3-z218)
 * @returns {string} - Secret link identifier
 */
export function generateSecretLink() {
  const id = nanoid()
  // Format as xxxx-xxxx-xxxx-xxxx
  return `${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}`
}

/**
 * Generate a shorter access code for email
 * Format: ABC12345 (8 characters)
 * @returns {string} - Access code
 */
export function generateAccessCode() {
  const code = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)
  return code()
}

/**
 * Format time remaining until expiry
 * @param {Date|string} expiryDate - Expiry timestamp
 * @returns {Object} - Formatted time remaining
 */
export function getTimeRemaining(expiryDate) {
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffMs = expiry - now
  
  if (diffMs <= 0) {
    return {
      expired: true,
      hours: 0,
      minutes: 0,
      formatted: 'Expired'
    }
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  return {
    expired: false,
    hours,
    minutes,
    totalMinutes: Math.floor(diffMs / (1000 * 60)),
    formatted: `${hours}h ${minutes}m remaining`
  }
}

/**
 * Check if report has expired
 * @param {Date|string} expiryDate - Expiry timestamp
 * @returns {boolean} - True if expired
 */
export function isExpired(expiryDate) {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}
