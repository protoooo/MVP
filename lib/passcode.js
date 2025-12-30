// lib/passcode.js - Generate and validate 5-digit passcodes

/**
 * Generate a random 5-digit passcode
 * @returns {string} 5-digit passcode (e.g., "47392")
 */
export function generatePasscode() {
  return Math.floor(10000 + Math.random() * 90000).toString()
}

/**
 * Validate passcode format
 * @param {string} passcode 
 * @returns {boolean}
 */
export function isValidPasscode(passcode) {
  return /^\d{5}$/.test(passcode)
}
