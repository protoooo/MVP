// ============================================================================
// 1. TRIAL REMINDER CRON JOB
// File: scripts/send-trial-reminders.js
// ============================================================================

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { emails } from '../lib/emails.js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getUserEmail(userId) {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.email || null
  } catch (error) {
    console.error('Failed to get user email:', error)
    return null
  }
}

async function sendTrialReminders() {
  console.log('🔔 Checking for trial reminders...')
  
  const now = new Date()
  
  // Day 3 reminders (midpoint)
  const day3Start = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000) // 4 days from now
  const day3End = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)   // 5 days from now
  
  const { data: day3Trials } = await supabase
    .from('subscriptions')
    .select('user_id, trial_end')
    .eq('status', 'trialing')
    .gte('trial_end', day3Start.toISOString())
    .lt('trial_end', day3End.toISOString())
  
  console.log(`📧 Found ${day3Trials?.length || 0} day-3 reminders to send`)
  
  for (const trial of day3Trials || []) {
    const userEmail = await getUserEmail(trial.user_id)
    if (userEmail) {
      const userName = userEmail.split('@')[0]
      await emails.trialMidpoint(userEmail, userName)
      console.log(`✅ Sent day-3 reminder to ${userEmail.substring(0, 3)}***`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
    }
  }
  
  // Day 5 reminders (2 days left)
  const day5Start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
  const day5End = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)   // 3 days from now
  
  const { data: day5Trials } = await supabase
    .from('subscriptions')
    .select('user_id, trial_end')
    .eq('status', 'trialing')
    .gte('trial_end', day5Start.toISOString())
    .lt('trial_end', day5End.toISOString())
  
  console.log(`📧 Found ${day5Trials?.length || 0} day-5 reminders to send`)
  
  for (const trial of day5Trials || []) {
    const userEmail = await getUserEmail(trial.user_id)
    if (userEmail) {
      const userName = userEmail.split('@')[0]
      await emails.trialEndingSoon(userEmail, userName, 2)
      console.log(`✅ Sent day-5 reminder to ${userEmail.substring(0, 3)}***`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // Day 7 reminders (trial ended)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const { data: endedTrials } = await supabase
    .from('subscriptions')
    .select('user_id, trial_end, status')
    .eq('status', 'trialing')
    .lt('trial_end', now.toISOString())
    .gte('trial_end', yesterday.toISOString())
  
  console.log(`📧 Found ${endedTrials?.length || 0} ended trials`)
  
  for (const trial of endedTrials || []) {
    const userEmail = await getUserEmail(trial.user_id)
    if (userEmail) {
      const userName = userEmail.split('@')[0]
      await emails.trialEnded(userEmail, userName)
      console.log(`✅ Sent trial-ended email to ${userEmail.substring(0, 3)}***`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  console.log('✅ Trial reminders complete')
}

sendTrialReminders()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })


// ============================================================================
// 2. PASSWORD RESET UI IN AUTH MODAL
// File: app/page.js (UPDATE THE AuthModal COMPONENT)
// ============================================================================

// Find this section in your AuthModal component and replace it:

function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setMessage('')
      setMessageKind('info')
    }
  }, [isOpen, initialMode])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')
    setMessageKind('info')

    try {
      const captchaToken = await executeRecaptcha(mode)
      if (!captchaToken) {
        setMessageKind('err')
        setMessage('Security verification failed. Please try again.')
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password
        endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessageKind('err')
        setMessage(data.error || 'Authentication failed.')
        return
      }

      if (mode === 'reset') {
        setMessageKind('ok')
        setMessage('Check your email for reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else if (mode === 'signup') {
        setMessageKind('ok')
        setMessage('Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else {
        setMessageKind('ok')
        setMessage('Signed in. Redirecting…')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 450)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessageKind('err')
      setMessage('Unexpected issue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] ui-backdrop flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md ui-modal ui-modal-anim p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className={`text-lg font-semibold text-white tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs text-white/55 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button onClick={onClose} className="ui-icon-btn" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/55 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className={`ui-input ${inter.className}`}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-white/55 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`ui-input pr-16 ${inter.className}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/55 hover:text-white text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="ui-btn ui-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="ui-btn-inner">
              {loading && <span className="ui-spinner" aria-hidden="true" />}
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </span>
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 ui-toast ${
              messageKind === 'err' ? 'ui-toast-err' : messageKind === 'ok' ? 'ui-toast-ok' : ''
            }`}
          >
            <span className="ui-toasticon" aria-hidden="true">
              {messageKind === 'err' ? <Icons.X /> : messageKind === 'ok' ? <Icons.Check /> : <Icons.Spark />}
            </span>
            <span className={`ui-toasttext ${inter.className}`}>{message}</span>
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/55">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full text-white/55 hover:text-white">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full text-white/55 hover:text-white">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/55 hover:text-white">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/55 hover:text-white">
              Back to sign in
            </button>
          )}
        </div>

        <RecaptchaBadge />
      </div>
    </div>
  )
}


// ============================================================================
// 3. CONTACT FORM BACKEND
// File: app/api/contact/route.js (NEW FILE)
// ============================================================================

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SUPPORT_EMAIL = process.env.FROM_EMAIL || 'protocolLM <hello@protocollm.org>'
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'austinrnorthrop@gmail.com'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json()

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: SUPPORT_EMAIL,
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `[Contact Form] ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">New Contact Form Submission</h2>
            
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
            </div>
            
            <div style="background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
              <p style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="color: #64748b; font-size: 13px; margin-top: 16px;">
              Reply directly to this email to respond to ${name}
            </p>
          </div>
        `
      })
    })

    if (!res.ok) {
      const error = await res.json()
      logger.error('Failed to send contact email', { error })
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    logger.audit('Contact form submitted', { 
      from: email.substring(0, 3) + '***',
      subject 
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Contact form error', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


// ============================================================================
// 4. UPDATE CONTACT PAGE TO USE API
// File: app/contact/page.js (REPLACE handleSubmit function)
// ============================================================================

const handleSubmit = async (e) => {
  e.preventDefault()
  
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    if (!res.ok) {
      throw new Error('Failed to send message')
    }

    setSubmitted(true)
  } catch (error) {
    alert('Failed to send message. Please email us directly at hello@protocollm.org')
  }
}


// ============================================================================
// 5. UPGRADE BUTTON FOR TRIAL USERS
// File: app/page.js (ADD TO HEADER, after the user menu)
// ============================================================================

// Add this state near the top of your Page component:
const [subscription, setSubscription] = useState(null)

// Add this useEffect to fetch subscription:
useEffect(() => {
  async function fetchSubscription() {
    if (!session) return
    
    const { data } = await supabase
      .from('subscriptions')
      .select('status, trial_end, current_period_end')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    setSubscription(data)
  }
  
  fetchSubscription()
}, [session, supabase])

// Then in your header, add this button BEFORE the user menu:
{session && subscription?.status === 'trialing' && (
  <button
    onClick={() => setShowPricingModal(true)}
    className="ui-btn ui-btn-primary text-xs px-3 py-2"
  >
    <span className="ui-btn-inner">Upgrade Early</span>
  </button>
)}


// ============================================================================
// 6. PACKAGE.JSON - ADD REMINDER SCRIPT
// File: package.json (ADD TO "scripts" SECTION)
// ============================================================================

"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start -H 0.0.0.0 -p ${PORT:-3000}",
  "lint": "next lint",
  "ingest": "node scripts/ingest-documents.js",
  "test-search": "node scripts/test-search.js",
  "send-reminders": "node scripts/send-trial-reminders.js"  // ✅ ADD THIS
}


// ============================================================================
// 7. RAILWAY CRON SETUP (DO THIS IN RAILWAY DASHBOARD)
// ============================================================================

/*
1. Go to Railway dashboard → Your project
2. Click "Settings" tab
3. Scroll to "Cron Jobs"
4. Click "Add Cron Job"
5. Set:
   - Name: "Trial Reminders"
   - Command: npm run send-reminders
   - Schedule: 0 9 * * * (Daily at 9am UTC)
   - Timezone: America/Detroit
6. Click "Add"

This will run your reminder script every morning at 9am Detroit time.
*/
