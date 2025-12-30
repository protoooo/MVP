/**
 * Application-wide constants for Michigan Tenant Report System
 */

// Detroit Landlord Compliance Statistics
// Source: Studies cited in problem statement
export const DETROIT_STATS = {
  NON_COMPLIANT_PERCENTAGE: 90, // % of evicting landlords not compliant with city codes
  COMPLIANT_PERCENTAGE: 10,     // % of Detroit rentals meeting full compliance
  SOURCE: 'Detroit Housing Code Compliance Studies 2024',
  LAST_UPDATED: '2024-12-30'
}

// Report Expiration Policy
export const REPORT_EXPIRY = {
  HOURS: 48,
  POLICY_NAME: 'Burn After Reading',
  RATIONALE: 'Privacy protection and data minimization'
}

// GPS Validation
export const GPS_VALIDATION = {
  THRESHOLD_MILES: 0.5,
  RATIONALE: 'Balances fraud prevention with GPS drift and large properties'
}

// Photo Upload Limits
export const PHOTO_LIMITS = {
  MAX_PHOTOS_PER_REPORT: 200,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic']
}

// Rate Limiting
export const RATE_LIMITS = {
  PAYMENT_ATTEMPTS_PER_HOUR: 5,
  UPLOAD_ATTEMPTS_PER_HOUR: 10,
  DOWNLOAD_ATTEMPTS_PER_HOUR: 100
}
