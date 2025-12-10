import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Map price IDs to plan names
const PRICE_TO_PLAN = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY]: 'business',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL]: 'business',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY]: 'enterprise',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL]: 'enterprise',
}

// Store processed events in database instead of memory
async function isEventProcessed(eventId) {
  const { data } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()
  
  return !!data
}

async function markEventProcessed(eventId, eventType) {
  await supabase
    .from('processed_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString()
    })
    .onConflict('event_id')
}

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get
