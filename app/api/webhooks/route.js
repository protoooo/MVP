/**
 * Webhook Configuration API
 * GET /api/webhooks - Get webhook config
 * POST /api/webhooks - Register webhook
 * PUT /api/webhooks - Update webhook
 * DELETE /api/webhooks - Delete webhook
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  registerWebhook,
  getWebhookForApiKey,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveryHistory
} from '@/lib/webhooks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

/**
 * Authorize API key
 */
async function authorizeApiKey(apiKey) {
  if (!apiKey || !supabase) return null
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, active')
    .eq('key', apiKey)
    .eq('active', true)
    .maybeSingle()
  
  return error || !data ? null : data
}

/**
 * GET - Get webhook configuration and delivery history
 */
export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const webhookConfig = await getWebhookForApiKey(authData.id)
    
    if (!webhookConfig) {
      return NextResponse.json({ 
        configured: false,
        webhook: null
      })
    }

    // Get delivery history
    const deliveryHistory = await getWebhookDeliveryHistory(webhookConfig.id, 50)

    return NextResponse.json({
      configured: true,
      webhook: {
        id: webhookConfig.id,
        webhook_url: webhookConfig.webhook_url,
        active: webhookConfig.active,
        max_retries: webhookConfig.max_retries,
        retry_delay_seconds: webhookConfig.retry_delay_seconds,
        created_at: webhookConfig.created_at,
        last_triggered_at: webhookConfig.last_triggered_at
      },
      delivery_history: deliveryHistory
    })
  } catch (error) {
    console.error('[webhooks API] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST - Register webhook
 */
export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const { webhook_url, max_retries, retry_delay_seconds } = await req.json()
    
    if (!webhook_url) {
      return NextResponse.json({ error: 'webhook_url required' }, { status: 400 })
    }

    // Check if webhook already exists for this API key
    const existing = await getWebhookForApiKey(authData.id)
    if (existing) {
      return NextResponse.json({ 
        error: 'Webhook already configured for this API key. Use PUT to update or DELETE first.' 
      }, { status: 409 })
    }

    const webhook = await registerWebhook(
      authData.id,
      authData.user_id,
      webhook_url,
      { max_retries, retry_delay_seconds }
    )

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        webhook_url: webhook.webhook_url,
        webhook_secret: webhook.webhook_secret, // Only returned on creation
        active: webhook.active,
        max_retries: webhook.max_retries,
        retry_delay_seconds: webhook.retry_delay_seconds
      },
      message: 'Webhook registered successfully. Save the webhook_secret - it will not be shown again.'
    }, { status: 201 })
  } catch (error) {
    console.error('[webhooks API] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT - Update webhook
 */
export async function PUT(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    // Get existing webhook
    const existing = await getWebhookForApiKey(authData.id)
    if (!existing) {
      return NextResponse.json({ error: 'No webhook configured for this API key' }, { status: 404 })
    }

    const updates = await req.json()

    const webhook = await updateWebhook(existing.id, authData.user_id, updates)

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        webhook_url: webhook.webhook_url,
        active: webhook.active,
        max_retries: webhook.max_retries,
        retry_delay_seconds: webhook.retry_delay_seconds
      }
    })
  } catch (error) {
    console.error('[webhooks API] PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE - Delete webhook
 */
export async function DELETE(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    // Get existing webhook
    const existing = await getWebhookForApiKey(authData.id)
    if (!existing) {
      return NextResponse.json({ error: 'No webhook configured for this API key' }, { status: 404 })
    }

    const success = await deleteWebhook(existing.id, authData.user_id)

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[webhooks API] DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
