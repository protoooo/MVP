// app/auth/callback/route.js - COMPLETE with proper plan flow
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const type = requestUrl.searchParams.get('type')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`

  console.log('🔄 Auth callback:', {
    hasCode: !!code,
    hasError: !!error,
    type,
    baseUrl,
  })

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${baseUrl}/?error=${error}`)
  }

  const expectedRedirect = `${baseUrl}/auth/callback`
  if (!code) {
    console.error('❌ No code provided in auth callback. Confirm Supabase redirect URLs include the magic-link code and point to /auth/callback', {
      receivedQuery: requestUrl.search,
      expectedRedirect,
    })
    const retryUrl = `${baseUrl}/auth?error=no_code&message=${encodeURIComponent('Missing code in callback, please try logging in again.')}`
    return NextResponse.redirect(retryUrl)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('Cookie set error:', error)
          }
        },
        remove(name, options) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (error) {
            console.error('Cookie remove error:', error)
          }
        },
      },
    }
  )

  try {
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Session exchange failed:', exchangeError)
      return NextResponse.redirect(`${baseUrl}/?error=auth_failed`)
    }

    if (!data.user) {
      console.error('❌ No user in session')
      return NextResponse.redirect(`${baseUrl}/?error=no_user`)
    }

    console.log('✅ Session established:', data.user.email)

    // Password recovery flow
    if (type === 'recovery') {
      console.log('🔐 Password recovery, redirecting to reset page')
      return NextResponse.redirect(`${baseUrl}/reset-password`)
    }

    // Check email verification
    if (!data.user.email_confirmed_at) {
      console.log('⚠️ Email not yet confirmed')
      return NextResponse.redirect(`${baseUrl}/verify-email`)
    }

    console.log('✅ Email verified, checking terms acceptance...')

    // Check terms/privacy acceptance using service role
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {}
        },
      }
    )

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profile || !profile.accepted_terms || !profile.accepted_privacy) {
      console.log('📋 User needs to accept terms')
      return NextResponse.redirect(`${baseUrl}/accept-terms`)
    }

    console.log('✅ Terms accepted, checking subscription status...')

    // Check for active subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', data.user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (!subscription) {
      // No subscription - check if they selected a plan during signup
      const selectedPriceId = data.user.user_metadata?.selected_price_id

      if (selectedPriceId) {
        // ✅ Validate the price ID
        const validPrices = [
          process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
          process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY,
        ].filter(Boolean)

        if (validPrices.includes(selectedPriceId)) {
          console.log('💳 Redirecting to checkout with selected plan:', selectedPriceId.substring(0, 15) + '***')
          return NextResponse.redirect(`${baseUrl}/?checkout=${selectedPriceId}`)
        } else {
          console.error('❌ Invalid price ID in user metadata:', selectedPriceId)
        }
      }

      // No valid plan selected - show pricing modal
      console.log('💳 No plan selected, showing pricing')
      return NextResponse.redirect(`${baseUrl}/?showPricing=true&emailVerified=true`)
    }

    // Has subscription - go to chat
    console.log('✅ User has subscription, redirecting to chat')
    return NextResponse.redirect(baseUrl)

  } catch (error) {
    console.error('❌ Callback exception:', error)
    return NextResponse.redirect(`${baseUrl}/?error=callback_failed`)
  }
}
