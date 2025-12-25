export function trackEvent(eventName, props = {}) {
  if (typeof window === 'undefined' || !window.plausible) return

  try {
    window.plausible(eventName, { props })
  } catch (err) {
    console.warn('Analytics error:', err)
  }
}

export const AnalyticsEvents = {
  TRIAL_STARTED: 'Trial Started',
  PHOTO_SCAN: 'Photo Scan',
  TEXT_QUESTION: 'Text Question',
  VIOLATION_FOUND: 'Violation Found',
  SUBSCRIPTION_CONVERTED: 'Subscription Converted',
  DEVICE_REGISTERED: 'Device Registered',
}
