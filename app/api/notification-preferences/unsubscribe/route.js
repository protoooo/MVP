// app/api/notification-preferences/unsubscribe/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * GET /api/notification-preferences/unsubscribe?token=xxx
 * Unsubscribe user from all notifications using their unique token
 */
export async function GET(request) {
  const ip = getClientIp(request)

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 })
    }

    // Find user by unsubscribe token
    const { data: userPrefs, error: fetchError } = await supabase
      .from('user_notification_preferences')
      .select('id, email, unsubscribed_at')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (fetchError || !userPrefs) {
      logger.warn('Invalid unsubscribe token', { token: token.substring(0, 8) + '***', ip })
      return NextResponse.json({ error: 'Invalid or expired unsubscribe link' }, { status: 404 })
    }

    // Check if already unsubscribed
    if (userPrefs.unsubscribed_at) {
      logger.info('User already unsubscribed', { 
        email: userPrefs.email.substring(0, 3) + '***', 
        ip 
      })
      
      // Return success page (already unsubscribed)
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Already Unsubscribed - protocolLM</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px 32px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { color: #1e293b; font-size: 28px; margin-bottom: 16px; font-weight: 700; }
    p { color: #64748b; line-height: 1.6; margin-bottom: 32px; font-size: 16px; }
    .btn {
      display: inline-block;
      background: #1e293b;
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Already Unsubscribed</h1>
    <p>You've already been unsubscribed from protocolLM notifications. You won't receive any more emails from us.</p>
    <a href="/" class="btn">Return to protocolLM</a>
  </div>
</body>
</html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Update to unsubscribe
    const { error: updateError } = await supabase
      .from('user_notification_preferences')
      .update({
        unsubscribed_at: new Date().toISOString(),
        opted_in_inspection_reminders: false,
        opted_in_regulation_updates: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userPrefs.id)

    if (updateError) {
      logger.error('Failed to unsubscribe user', { 
        error: updateError.message, 
        email: userPrefs.email.substring(0, 3) + '***' 
      })
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    logger.audit('User unsubscribed from notifications', {
      email: userPrefs.email.substring(0, 3) + '***',
      ip,
    })

    // Return success page
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed Successfully - protocolLM</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px 32px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { color: #1e293b; font-size: 28px; margin-bottom: 16px; font-weight: 700; }
    p { color: #64748b; line-height: 1.6; margin-bottom: 32px; font-size: 16px; }
    .btn {
      display: inline-block;
      background: #1e293b;
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #0f172a; }
    .email { 
      background: #f1f5f9; 
      padding: 8px 16px; 
      border-radius: 6px; 
      display: inline-block;
      margin-top: 16px;
      color: #475569;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">👋</div>
    <h1>Successfully Unsubscribed</h1>
    <p>You've been unsubscribed from all protocolLM notification emails. We're sorry to see you go!</p>
    <p>You can still use your access code to process videos and download reports.</p>
    <div class="email">${userPrefs.email}</div>
    <br><br>
    <a href="/" class="btn">Return to protocolLM</a>
  </div>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    logger.error('Unsubscribe error', { error: error?.message, ip })
    return NextResponse.json({ error: 'Failed to process unsubscribe request' }, { status: 500 })
  }
}
