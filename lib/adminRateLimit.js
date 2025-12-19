// lib/adminRateLimit.js - NEW FILE
import { logger } from './logger'

// Track admin access attempts by IP
const adminAttempts = new Map()
const MAX_ADMIN_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkAdminRateLimit(ip) {
  if (!ip) {
    logger.security('Admin access without IP')
    return false
  }

  const now = Date.now()
  const attempts = adminAttempts.get(ip) || []
  
  // Clean old attempts
  const recentAttempts = attempts.filter(timestamp => now - timestamp < WINDOW_MS)
  
  if (recentAttempts.length >= MAX_ADMIN_ATTEMPTS) {
    logger.security('Admin rate limit exceeded', { 
      ip, 
      attempts: recentAttempts.length,
      window: '15min'
    })
    return false
  }
  
  // Add current attempt
  recentAttempts.push(now)
  adminAttempts.set(ip, recentAttempts)
  
  return true
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, attempts] of adminAttempts.entries()) {
    const recent = attempts.filter(t => now - t < WINDOW_MS)
    if (recent.length === 0) {
      adminAttempts.delete(ip)
    } else {
      adminAttempts.set(ip, recent)
    }
  }
}, 5 * 60 * 1000) // Every 5 minutes


// app/admin/layout.js - UPDATED with rate limiting
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Outfit, Inter } from 'next/font/google'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export const metadata = {
  title: 'Admin - protocolLM',
  description: 'Admin dashboard',
}

async function getClientIp() {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip') || 'unknown'
}

export default async function AdminLayout({ children }) {
  // ✅ NEW: Rate limit check BEFORE auth check
  const ip = await getClientIp()
  
  if (!checkAdminRateLimit(ip)) {
    redirect('/?error=rate_limit')
  }

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  // Check if user is admin
  const adminEmail = process.env.ADMIN_EMAIL
  
  if (!user || !adminEmail || user.email !== adminEmail) {
    redirect('/')
  }

  return (
    <div className={`min-h-screen bg-slate-50 ${inter.className}`}>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold text-slate-900 ${outfit.className}`}>
                protocolLM Admin
              </h1>
              <p className="text-sm text-slate-600">Logged in as {user.email}</p>
            </div>
            
            <nav className="flex gap-4">
              <a href="/admin/analytics" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                Analytics
              </a>
              <a href="/admin/ingest" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                Ingest
              </a>
              <a href="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Back to App →
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  )
}
