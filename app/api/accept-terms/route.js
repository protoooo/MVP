import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { acceptedTerms, acceptedPrivacy } = await request.json()

    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json({ error: 'Must accept both terms and privacy policy' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        accepted_terms: true,
        accepted_privacy: true,
        terms_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording terms acceptance:', error)
    return NextResponse.json({ error: 'Failed to record acceptance' }, { status: 500 })
  }
}
