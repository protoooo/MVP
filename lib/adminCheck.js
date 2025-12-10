// lib/adminCheck.js
// Server-side only utility for checking admin status
// NEVER import this in client components

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

if (!ADMIN_EMAIL) {
  logger.warn('ADMIN_EMAIL not set - admin features disabled')
}

export async function isUserAdmin(userId) {
  if (!userId || !ADMIN_EMAIL) return false
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: user, error } = await supabase.auth.admin.getUserById(userId)
    
    if (error) {
      logger.error('Admin check failed', { error: error.message })
      return false
    }
    
    const isAdmin = user?.email === ADMIN_EMAIL
    
    if (isAdmin) {
      logger.audit('Admin access granted', { userId, email: user.email })
    }
    
    return isAdmin
  } catch (error) {
    logger.error('Admin check exception', { error: error.message })
    return false
  }
}

export function getAdminEmail() {
  return ADMIN_EMAIL || null
}
