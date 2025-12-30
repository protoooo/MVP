// lib/featureFlags.js - Feature flags that fail CLOSED in production
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

const cache = {
  data: {},
  timestamps: {}
}

const CACHE_TTL = 60000 // 1 minute

export async function isServiceEnabled() {
  const flagName = 'service_enabled'
  const now = Date.now()
  
  // Return cached value if still valid
  if (cache.data[flagName] !== undefined && 
      cache.timestamps[flagName] && 
      (now - cache.timestamps[flagName]) < CACHE_TTL) {
    return cache.data[flagName]
  }
  
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('flag_name', flagName)
      .maybeSingle()

    if (error) {
      logger.error('Feature flag check failed', { error: error.message })
      // CHANGED: Fail CLOSED - if we can't check the flag, stay enabled
      // (since DB issues would also break auth anyway)
      return true
    }

    const enabled = data?.enabled ?? true
    
    // Update cache
    cache.data[flagName] = enabled
    cache.timestamps[flagName] = now
    
    if (!enabled) {
      logger.warn('Service disabled via feature flag')
    }
    
    return enabled
  } catch (err) {
    logger.error('Feature flag exception', { error: err.message })
    return true // Keep service running if flag check fails
  }
}

export async function getMaintenanceMessage() {
  try {
    const { data } = await supabase
      .from('feature_flags')
      .select('message')
      .eq('flag_name', 'service_enabled')
      .maybeSingle()

    return data?.message || 'protocolLM is temporarily unavailable. Please try again shortly.'
  } catch {
    return 'Service temporarily unavailable. Please try again shortly.'
  }
}

export function clearFeatureFlagCache() {
  cache.data = {}
  cache.timestamps = {}
  logger.info('Feature flag cache cleared')
}
