/**
 * Webhook Management System
 * Handles webhook registration, delivery, and retries
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

/**
 * Register a webhook for an API key
 */
export async function registerWebhook(apiKeyId, userId, webhookUrl, options = {}) {
  if (!supabase) return null
  
  // Validate URL
  try {
    new URL(webhookUrl)
  } catch (err) {
    throw new Error('Invalid webhook URL')
  }
  
  // Generate webhook secret for signing
  const webhookSecret = crypto.randomBytes(32).toString('hex')
  
  const { data, error } = await supabase
    .from('webhook_configs')
    .insert([{
      user_id: userId,
      api_key_id: apiKeyId,
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
      active: true,
      max_retries: options.max_retries || 3,
      retry_delay_seconds: options.retry_delay_seconds || 60
    }])
    .select()
    .single()
  
  if (error) {
    console.error('[webhooks] Error registering webhook:', error)
    throw error
  }
  
  return {
    ...data,
    webhook_secret // Return secret only on creation
  }
}

/**
 * Get active webhook for an API key
 */
export async function getWebhookForApiKey(apiKeyId) {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('api_key_id', apiKeyId)
    .eq('active', true)
    .maybeSingle()
  
  if (error) {
    console.error('[webhooks] Error fetching webhook:', error)
    return null
  }
  
  return data
}

/**
 * Update webhook configuration
 */
export async function updateWebhook(webhookId, userId, updates) {
  if (!supabase) return null
  
  const allowedUpdates = {
    webhook_url: updates.webhook_url,
    active: updates.active,
    max_retries: updates.max_retries,
    retry_delay_seconds: updates.retry_delay_seconds
  }
  
  // Remove undefined values
  Object.keys(allowedUpdates).forEach(key => 
    allowedUpdates[key] === undefined && delete allowedUpdates[key]
  )
  
  const { data, error } = await supabase
    .from('webhook_configs')
    .update(allowedUpdates)
    .eq('id', webhookId)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('[webhooks] Error updating webhook:', error)
    throw error
  }
  
  return data
}

/**
 * Delete/deactivate a webhook
 */
export async function deleteWebhook(webhookId, userId) {
  if (!supabase) return false
  
  const { error } = await supabase
    .from('webhook_configs')
    .update({ active: false })
    .eq('id', webhookId)
    .eq('user_id', userId)
  
  if (error) {
    console.error('[webhooks] Error deleting webhook:', error)
    return false
  }
  
  return true
}

/**
 * Sign webhook payload using HMAC SHA256
 */
export function signWebhookPayload(payload, secret) {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex')
}

/**
 * Deliver webhook payload (with retry logic)
 */
export async function deliverWebhook(webhookConfig, payload, sessionId = null) {
  if (!supabase) {
    console.warn('[webhooks] Supabase not configured, skipping webhook delivery')
    return false
  }
  
  // Create delivery record
  const { data: delivery, error: insertError } = await supabase
    .from('webhook_deliveries')
    .insert([{
      webhook_config_id: webhookConfig.id,
      session_id: sessionId,
      status: 'pending',
      attempt_count: 0,
      payload: payload
    }])
    .select()
    .single()
  
  if (insertError) {
    console.error('[webhooks] Error creating delivery record:', insertError)
    return false
  }
  
  // Attempt delivery (don't await - process in background)
  attemptWebhookDelivery(delivery.id, webhookConfig, payload).catch(err => {
    console.error('[webhooks] Background delivery failed:', err)
  })
  
  return true
}

/**
 * Actually attempt the webhook HTTP request
 */
async function attemptWebhookDelivery(deliveryId, webhookConfig, payload) {
  if (!supabase) return
  
  const maxRetries = webhookConfig.max_retries || 3
  let attemptCount = 0
  let lastError = null
  
  while (attemptCount < maxRetries) {
    attemptCount++
    
    try {
      // Sign the payload
      const signature = signWebhookPayload(payload, webhookConfig.webhook_secret)
      
      // Send webhook
      const response = await fetch(webhookConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': new Date().toISOString(),
          'X-Webhook-Delivery-Id': deliveryId
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      
      // Update delivery record
      if (response.ok) {
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'sent',
            attempt_count: attemptCount,
            response_code: response.status,
            response_body: await response.text().catch(() => ''),
            delivered_at: new Date().toISOString()
          })
          .eq('id', deliveryId)
        
        // Update webhook last triggered time
        await supabase
          .from('webhook_configs')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', webhookConfig.id)
        
        console.log(`[webhooks] Successfully delivered webhook ${deliveryId}`)
        return true
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text().catch(() => '')}`)
      }
    } catch (err) {
      lastError = err
      console.error(`[webhooks] Delivery attempt ${attemptCount} failed:`, err)
      
      // Update with retry status
      if (attemptCount < maxRetries) {
        const nextRetryAt = new Date(Date.now() + (webhookConfig.retry_delay_seconds || 60) * 1000)
        
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'retrying',
            attempt_count: attemptCount,
            error_message: err.message,
            next_retry_at: nextRetryAt.toISOString()
          })
          .eq('id', deliveryId)
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, (webhookConfig.retry_delay_seconds || 60) * 1000))
      }
    }
  }
  
  // All retries failed
  await supabase
    .from('webhook_deliveries')
    .update({
      status: 'failed',
      attempt_count: attemptCount,
      error_message: lastError?.message || 'Unknown error'
    })
    .eq('id', deliveryId)
  
  console.error(`[webhooks] Failed to deliver webhook ${deliveryId} after ${attemptCount} attempts`)
  return false
}

/**
 * Retry failed webhook deliveries
 */
export async function retryFailedWebhooks() {
  if (!supabase) return 0
  
  // Get failed deliveries that are ready for retry
  const { data: failedDeliveries, error } = await supabase
    .from('webhook_deliveries')
    .select('*, webhook_configs(*)')
    .eq('status', 'retrying')
    .lt('next_retry_at', new Date().toISOString())
    .limit(100)
  
  if (error || !failedDeliveries) {
    console.error('[webhooks] Error fetching failed deliveries:', error)
    return 0
  }
  
  let retriedCount = 0
  for (const delivery of failedDeliveries) {
    if (delivery.webhook_configs) {
      await attemptWebhookDelivery(
        delivery.id,
        delivery.webhook_configs,
        delivery.payload
      ).catch(err => {
        console.error('[webhooks] Retry failed:', err)
      })
      retriedCount++
    }
  }
  
  return retriedCount
}

/**
 * Get webhook delivery history for a webhook config
 */
export async function getWebhookDeliveryHistory(webhookConfigId, limit = 50) {
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from('webhook_deliveries')
    .select('id, status, attempt_count, response_code, error_message, created_at, delivered_at')
    .eq('webhook_config_id', webhookConfigId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('[webhooks] Error fetching delivery history:', error)
    return []
  }
  
  return data
}
