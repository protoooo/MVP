/**
 * Standards Profiles Management
 * Helper functions for working with configurable evaluation profiles
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

/**
 * Industry categories supported by the system
 */
export const INDUSTRIES = {
  FOOD: 'food',
  RETAIL: 'retail',
  LOGISTICS: 'logistics',
  CONSTRUCTION: 'construction',
  HEALTHCARE: 'healthcare',
  GENERAL: 'general'
}

/**
 * Common task types across industries
 */
export const TASK_TYPES = {
  GENERAL: 'general',
  RECEIVING: 'receiving',
  STORAGE: 'storage',
  CLEANING: 'cleaning',
  DELIVERY: 'delivery',
  INSPECTION: 'inspection'
}

/**
 * Strictness levels for evaluation
 */
export const STRICTNESS_LEVELS = {
  LOW: 'low',      // Only flag obvious, severe issues
  MEDIUM: 'medium', // Balance between catching issues and false positives
  HIGH: 'high'      // Flag all potential issues, be conservative
}

/**
 * Get a standards profile by ID
 */
export async function getProfileById(profileId) {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('standards_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('active', true)
    .single()
  
  if (error) {
    console.error('[standardsProfiles] Error fetching profile:', error)
    return null
  }
  
  return data
}

/**
 * Get the default zero-config profile
 * Note: This query uses profile_name for a system profile lookup.
 * An index on (is_system_profile, profile_name) would optimize this,
 * but since system profiles are few and cached, current performance is acceptable.
 */
export async function getZeroConfigProfile() {
  if (!supabase) {
    // Return hardcoded default if database not available
    return {
      id: 'zero-config',
      profile_name: 'Zero Config - General',
      industry: INDUSTRIES.GENERAL,
      task_type: TASK_TYPES.GENERAL,
      strictness_level: STRICTNESS_LEVELS.MEDIUM,
      plain_language_rules: [
        'Work should appear complete',
        'Area should be safe and organized',
        'No obvious issues should be present',
        'Standards of quality should be maintained'
      ],
      is_system_profile: true,
      description: 'Default profile for any industry without specific configuration'
    }
  }
  
  const { data, error } = await supabase
    .from('standards_profiles')
    .select('*')
    .eq('profile_name', 'Zero Config - General')
    .eq('is_system_profile', true)
    .single()
  
  if (error || !data) {
    console.error('[standardsProfiles] Error fetching zero-config profile:', error)
    return null
  }
  
  return data
}

/**
 * Get system profile for specific industry and task
 */
export async function getSystemProfile(industry, taskType) {
  if (!supabase) return null
  
  // Try to find exact match
  let { data, error } = await supabase
    .from('standards_profiles')
    .select('*')
    .eq('industry', industry)
    .eq('task_type', taskType)
    .eq('is_system_profile', true)
    .eq('active', true)
    .maybeSingle()
  
  if (data) return data
  
  // Fallback to general task type for the industry
  ({ data, error } = await supabase
    .from('standards_profiles')
    .select('*')
    .eq('industry', industry)
    .eq('task_type', TASK_TYPES.GENERAL)
    .eq('is_system_profile', true)
    .eq('active', true)
    .maybeSingle())
  
  if (data) return data
  
  // Final fallback to zero-config
  return getZeroConfigProfile()
}

/**
 * Create a custom profile for a user
 */
export async function createCustomProfile(userId, profileData) {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('standards_profiles')
    .insert([{
      user_id: userId,
      profile_name: profileData.profile_name,
      industry: profileData.industry || INDUSTRIES.GENERAL,
      task_type: profileData.task_type || TASK_TYPES.GENERAL,
      strictness_level: profileData.strictness_level || STRICTNESS_LEVELS.MEDIUM,
      plain_language_rules: profileData.plain_language_rules || [],
      document_ids: profileData.document_ids || [],
      scoring_preferences: profileData.scoring_preferences || {},
      description: profileData.description || '',
      is_system_profile: false,
      active: true
    }])
    .select()
    .single()
  
  if (error) {
    console.error('[standardsProfiles] Error creating profile:', error)
    return null
  }
  
  return data
}

/**
 * List all profiles accessible to a user (their custom + system profiles)
 */
export async function listUserProfiles(userId) {
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from('standards_profiles')
    .select('*')
    .or(`user_id.eq.${userId},is_system_profile.eq.true`)
    .eq('active', true)
    .order('is_system_profile', { ascending: false })
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('[standardsProfiles] Error listing profiles:', error)
    return []
  }
  
  return data
}

/**
 * Update a custom profile
 */
export async function updateProfile(profileId, userId, updates) {
  if (!supabase) return null
  
  // Ensure user owns the profile and it's not a system profile
  const { data, error } = await supabase
    .from('standards_profiles')
    .update({
      profile_name: updates.profile_name,
      industry: updates.industry,
      task_type: updates.task_type,
      strictness_level: updates.strictness_level,
      plain_language_rules: updates.plain_language_rules,
      document_ids: updates.document_ids,
      scoring_preferences: updates.scoring_preferences,
      description: updates.description,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileId)
    .eq('user_id', userId)
    .eq('is_system_profile', false)
    .select()
    .single()
  
  if (error) {
    console.error('[standardsProfiles] Error updating profile:', error)
    return null
  }
  
  return data
}

/**
 * Delete a custom profile
 */
export async function deleteProfile(profileId, userId) {
  if (!supabase) return false
  
  const { error } = await supabase
    .from('standards_profiles')
    .update({ active: false })
    .eq('id', profileId)
    .eq('user_id', userId)
    .eq('is_system_profile', false)
  
  if (error) {
    console.error('[standardsProfiles] Error deleting profile:', error)
    return false
  }
  
  return true
}

/**
 * Get industry best practices description
 */
export function getIndustryBestPractices(industry) {
  const practices = {
    [INDUSTRIES.FOOD]: 'Standard food safety practices including temperature control, cross-contamination prevention, proper hygiene, and equipment maintenance',
    [INDUSTRIES.RETAIL]: 'Retail best practices including product display, inventory management, cleanliness, and customer safety',
    [INDUSTRIES.LOGISTICS]: 'Logistics standards including package handling, delivery verification, warehouse organization, and damage prevention',
    [INDUSTRIES.CONSTRUCTION]: 'Construction safety and quality standards including PPE compliance, site safety, work quality, and hazard prevention',
    [INDUSTRIES.HEALTHCARE]: 'Healthcare facility standards including sanitation, biohazard handling, and infection control',
    [INDUSTRIES.GENERAL]: 'General workplace standards focusing on safety, organization, cleanliness, and quality'
  }
  
  return practices[industry] || practices[INDUSTRIES.GENERAL]
}

/**
 * Validate profile data structure
 */
export function validateProfileData(profileData) {
  const errors = []
  
  if (!profileData.profile_name || profileData.profile_name.trim() === '') {
    errors.push('Profile name is required')
  }
  
  if (profileData.industry && !Object.values(INDUSTRIES).includes(profileData.industry)) {
    errors.push('Invalid industry specified')
  }
  
  if (profileData.task_type && !Object.values(TASK_TYPES).includes(profileData.task_type)) {
    errors.push('Invalid task type specified')
  }
  
  if (profileData.strictness_level && !Object.values(STRICTNESS_LEVELS).includes(profileData.strictness_level)) {
    errors.push('Invalid strictness level specified')
  }
  
  if (profileData.plain_language_rules && !Array.isArray(profileData.plain_language_rules)) {
    errors.push('Plain language rules must be an array')
  }
  
  if (profileData.document_ids && !Array.isArray(profileData.document_ids)) {
    errors.push('Document IDs must be an array')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
