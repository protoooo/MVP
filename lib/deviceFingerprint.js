// lib/deviceFingerprint.js

// Simple, persistent "device fingerprint" for demo / rate limiting.
// - NOT tied to real hardware
// - NOT PII
// - Just a random ID stored in localStorage so the same browser
//   looks like the same "device" across visits.

const STORAGE_KEY = 'protocollm_device_fp_v1'

// Generate a random ID string
function generateId() {
  try {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const arr = new Uint32Array(4)
      window.crypto.getRandomValues(arr)
      return Array.from(arr)
        .map(x => x.toString(16).padStart(8, '0'))
        .join('-')
    }
  } catch (_) {
    // fall through to fallback
  }

  // Fallback if crypto is not available
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function getDeviceFingerprint() {
  // If this somehow runs on the server, just return a dummy value.
  if (typeof window === 'undefined') {
    return 'server-fingerprint'
  }

  try {
    // Try to reuse an existing ID from localStorage
    if (window.localStorage) {
      const existing = window.localStorage.getItem(STORAGE_KEY)
      if (existing) return existing

      const fresh = generateId()
      window.localStorage.setItem(STORAGE_KEY, fresh)
      return fresh
    }
  } catch (_) {
    // If localStorage is blocked or throws, just fall through
  }

  // Last resort: non-persistent ID
  return generateId()
}
