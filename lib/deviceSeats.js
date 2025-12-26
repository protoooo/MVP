import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase admin env vars')
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

export function generateInviteCode() {
  return crypto.randomBytes(16).toString('hex')
}

export function hashInviteCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export async function ensureSeatInventory({ purchaserUserId, quantity }) {
  const supabase = getAdminClient()
  const safeQuantity = Math.max(1, parseInt(quantity || '1', 10))

  const { data: existingSeats, error: existingError } = await supabase
    .from('device_seats')
    .select('id')
    .eq('purchaser_user_id', purchaserUserId)

  if (existingError) {
    logger.error('Failed to load seat inventory', { error: existingError.message, purchaserUserId })
    throw existingError
  }

  const currentCount = existingSeats?.length || 0
  const needed = safeQuantity - currentCount

  if (needed <= 0) return { created: 0 }

  const inserts = Array.from({ length: needed }).map(() => {
    const code = generateInviteCode()
    return {
      purchaser_user_id: purchaserUserId,
      invite_code_hash: hashInviteCode(code),
      invite_code_last4: code.slice(-4),
      status: 'available',
    }
  })

  const { error: insertError } = await supabase.from('device_seats').insert(inserts)

  if (insertError) {
    logger.error('Failed to create device seats', { error: insertError.message, purchaserUserId, needed })
    throw insertError
  }

  logger.info('Created new seats', { purchaserUserId, created: inserts.length })
  return { created: inserts.length }
}

export async function regenerateSeatInvite(seatId, purchaserUserId) {
  const supabase = getAdminClient()
  const code = generateInviteCode()
  const hash = hashInviteCode(code)

  const { error } = await supabase
    .from('device_seats')
    .update({
      invite_code_hash: hash,
      invite_code_last4: code.slice(-4),
      status: 'available',
      claimed_user_id: null,
      claimed_at: null,
      device_fingerprint: null,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', seatId)
    .eq('purchaser_user_id', purchaserUserId)

  if (error) {
    logger.error('Failed to regenerate invite code', { seatId, error: error.message })
    throw error
  }

  return { code, last4: code.slice(-4) }
}

export async function revokeSeat(seatId, purchaserUserId) {
  return regenerateSeatInvite(seatId, purchaserUserId)
}

export async function claimSeat({ inviteCode, claimerUserId, deviceFingerprint }) {
  const supabase = getAdminClient()
  const hash = hashInviteCode(inviteCode || '')

  const { data: seat, error: seatError } = await supabase
    .from('device_seats')
    .select('id, purchaser_user_id, status')
    .eq('invite_code_hash', hash)
    .eq('status', 'available')
    .limit(1)
    .maybeSingle()

  if (seatError) {
    logger.error('Failed to fetch seat for claim', { error: seatError.message })
    throw seatError
  }

  if (!seat) {
    const err = new Error('Invite code is invalid or already used')
    err.code = 'INVITE_NOT_FOUND'
    throw err
  }

  const { error: updateError } = await supabase
    .from('device_seats')
    .update({
      status: 'claimed',
      claimed_user_id: claimerUserId,
      claimed_at: new Date().toISOString(),
      device_fingerprint: deviceFingerprint || null,
    })
    .eq('id', seat.id)
    .eq('status', 'available')

  if (updateError) {
    logger.error('Failed to claim seat', { error: updateError.message, seatId: seat.id })
    throw updateError
  }

  return { seatId: seat.id, purchaserUserId: seat.purchaser_user_id }
}

export async function listSeatsForUser(userId) {
  const supabase = getAdminClient()

  const { data: seats, error } = await supabase
    .from('device_seats')
    .select('*')
    .or(`purchaser_user_id.eq.${userId},claimed_user_id.eq.${userId}`)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('Failed to list seats', { error: error.message, userId })
    throw error
  }

  return seats || []
}
