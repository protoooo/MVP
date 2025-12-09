// lib/deviceFingerprint.js

// A lightweight, browser-only fingerprint to limit abuse in demo mode.
// Safe on server builds because it does NOT reference "window" at the top level.

export async function getDeviceFingerprint() {
  try {
    // If running in a browser and crypto is available,
    // generate a high-entropy random value.
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const array = new Uint32Array(4)
      window.crypto.getRandomValues(array)
      return Array.from(array)
        .map(x => x.toString(16))
        .join('-')
    }

    // Fallback for older browsers
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  } catch (e) {
    // Extremely rare fallback
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}
