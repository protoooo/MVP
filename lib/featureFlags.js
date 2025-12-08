// lib/featureFlags.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const cache = {
  data: {},
  timestamps: {}
}

const CACHE_TTL = 60000 // 1 minute

export async function isServiceEnabled() {
  const flagName = 'service_enabled'
  const now = Date.now()
  
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
      console.error('[FeatureFlags] Database error:', error.message)
      return true // Fail open
    }

    const enabled = data?.enabled ?? true
    
    cache.data[flagName] = enabled
    cache.timestamps[flagName] = now
    
    return enabled
  } catch (err) {
    console.error('[FeatureFlags] Exception:', err.message)
    return true // Fail open
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
