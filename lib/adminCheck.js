// lib/adminCheck.js
// Server-side only utility for checking admin status
// NEVER import this in client components

import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function isUserAdmin(userId) {
  if (!userId || !ADMIN_EMAIL) return false
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: user } = await supabase.auth.admin.getUserById(userId)
    return user?.email === ADMIN_EMAIL
  } catch (error) {
    console.error('[AdminCheck] Error:', error.message)
    return false
  }
}

export function getAdminEmail() {
  return ADMIN_EMAIL || null
}
