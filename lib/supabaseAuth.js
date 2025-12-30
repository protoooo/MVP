/**
 * Supabase Auth Utilities
 * Handles authentication and user session management
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Get Supabase client for browser (client-side)
 */
export function getSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Get Supabase client for server (with service role key)
 */
export function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: Object, error: Object}>}
 */
export async function signUp(email, password) {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    console.error('Sign up error:', error)
    return { user: null, error }
  }
  
  return { user: data.user, error: null }
}

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: Object, error: Object}>}
 */
export async function signIn(email, password) {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    console.error('Sign in error:', error)
    return { user: null, error }
  }
  
  return { user: data.user, error: null }
}

/**
 * Sign out the current user
 * @returns {Promise<{error: Object}>}
 */
export async function signOut() {
  const supabase = getSupabaseBrowserClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Sign out error:', error)
  }
  
  return { error }
}

/**
 * Get the current user session
 * @returns {Promise<{user: Object, session: Object, error: Object}>}
 */
export async function getCurrentUser() {
  const supabase = getSupabaseBrowserClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Get user error:', error)
    return { user: null, session: null, error }
  }
  
  const { data: { session } } = await supabase.auth.getSession()
  
  return { user, session, error: null }
}

/**
 * Get user profile with subscription data
 * @param {string} userId - User ID
 * @returns {Promise<{profile: Object, error: Object}>}
 */
export async function getUserProfile(userId) {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Get profile error:', error)
    return { profile: null, error }
  }
  
  return { profile: data, error: null }
}

/**
 * Update user profile (server-side only)
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<{profile: Object, error: Object}>}
 */
export async function updateUserProfile(userId, updates) {
  const supabase = getSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Update profile error:', error)
    return { profile: null, error }
  }
  
  return { profile: data, error: null }
}

/**
 * Create user profile (server-side only)
 * @param {Object} profileData - Profile data including user ID
 * @returns {Promise<{profile: Object, error: Object}>}
 */
export async function createUserProfile(profileData) {
  const supabase = getSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: profileData.id,
      email: profileData.email,
      stripe_customer_id: profileData.stripe_customer_id || null,
      stripe_subscription_id: profileData.stripe_subscription_id || null,
      current_plan: profileData.current_plan || null,
      monthly_image_limit: profileData.monthly_image_limit || 0,
      images_used_this_period: profileData.images_used_this_period || 0,
      billing_cycle_start: profileData.billing_cycle_start || null,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Create profile error:', error)
    return { profile: null, error }
  }
  
  return { profile: data, error: null }
}
