// app/admin/layout.js - Server-side admin protection
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export const metadata = {
  title: 'Admin - protocolLM',
  description: 'Admin dashboard',
}

export default async function AdminLayout({ children }) {
  const cookieStore = cookies()
  
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
      {/* Admin Header */}
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

      {/* Admin Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
