cat << 'EOF' > lib/usage.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Check and increment usage for a user.
 * 
 * @param {string} userId - Supabase user id
 * @param {Object} options
 * @param {boolean} options.isImage - true if this is an image audit, false for text
 * @returns {Promise<void>}
 * @throws {Error} with .code = 'NO_SUBSCRIPTION' | 'LIMIT_REACHED'
 */
export async function checkAndIncrementUsage(userId, { isImage }) {
  if (!userId) {
    const err = new Error('Missing user id')
    err.code = 'NO_USER'
    throw err
  }

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select(
      'id, plan, status, text_limit, image_limit, text_used, image_used, current_period_end'
    )
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (error) {
    console.error('[usage] Failed to fetch subscription:', error)
    const errObj = new Error('Subscription lookup failed')
    errObj.code = 'SUB_LOOKUP_FAILED'
    throw errObj
  }

  if (!sub) {
    const err = new Error('No active subscription')
    err.code = 'NO_SUBSCRIPTION'
    throw err
  }

  const now = new Date()

  if (sub.current_period_end && new Date(sub.current_period_end) < now) {
    const err = new Error('Subscription period expired')
    err.code = 'SUB_EXPIRED'
    throw err
  }

  if (isImage) {
    if (sub.image_used >= sub.image_limit) {
      const err = new Error('Image limit reached')
      err.code = 'LIMIT_REACHED'
      err.kind = 'image'
      throw err
    }

    const { error: updError } = await supabase
      .from('subscriptions')
      .update({ image_used: sub.image_used + 1 })
      .eq('id', sub.id)

    if (updError) {
      console.error('[usage] Failed to increment image usage:', updError)
    }
  } else {
    if (sub.text_used >= sub.text_limit) {
      const err = new Error('Text limit reached')
      err.code = 'LIMIT_REACHED'
      err.kind = 'text'
      throw err
    }

    const { error: updError } = await supabase
      .from('subscriptions')
      .update({ text_used: sub.text_used + 1 })
      .eq('id', sub.id)

    if (updError) {
      console.error('[usage] Failed to increment text usage:', updError)
    }
  }
}
EOF
