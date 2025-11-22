import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { monitoring } from '@/lib/monitoring'
import { rateLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// CRITICAL: Add your admin email here
async function isAdmin(supabase, userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .single()
  
  // ⚠️ CHANGE THIS TO YOUR ACTUAL EMAIL ADDRESS ⚠️
  const adminEmails = [
    'austinrnorthrop@gmail.com',  // ← PUT YOUR EMAIL HERE
    // Add more admin emails if needed:
    // 'another-admin@example.com',
  ]
  
  return adminEmails.includes(data?.email)
}

export async function GET(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check if user is admin
  const admin = await isAdmin(supabase, session.user.id)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'overview'
  
  try {
    let data
    
    switch (type) {
      case 'overview':
        data = {
          metrics: monitoring.getMetrics(),
          health: monitoring.getHealth(),
          endpoints: monitoring.getEndpointStats(),
          rateLimits: rateLimiter.getStats()
        }
        break
        
      case 'errors':
        const limit = parseInt(searchParams.get('limit') || '50')
        data = {
          errors: monitoring.getRecentErrors(limit)
        }
        break
        
      case 'health':
        const dbHealth = await monitoring.checkDatabaseHealth()
        data = {
          system: monitoring.getHealth(),
          database: dbHealth,
          timestamp: new Date().toISOString()
        }
        break
        
      case 'endpoints':
        data = {
          endpoints: monitoring.getEndpointStats()
        }
        break
        
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Admin metrics error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
