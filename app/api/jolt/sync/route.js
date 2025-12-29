// Jolt Sync Endpoint
// GET /api/jolt/sync - Pull new delivery photos from Jolt and auto-audit
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { analyzeImageBatch } from '@/backend/utils/aiAnalysis'
import { generateReport } from '@/backend/utils/reportGenerator'
import { ensureBucketExists, getPublicUrlSafe } from '@/app/api/upload/storageHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

async function getUserFromAuth(req) {
  if (!supabase) return null
  
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) return null
  return user
}

async function refreshJoltToken(integration) {
  try {
    const tokenResponse = await fetch('https://api.jolt.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: integration.refresh_token,
        client_id: process.env.JOLT_CLIENT_ID,
        client_secret: process.env.JOLT_CLIENT_SECRET
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh token')
    }

    const tokenData = await tokenResponse.json()
    
    // Update token in database
    await supabase
      .from('integrations')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || integration.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', integration.user_id)
      .eq('integration_type', 'jolt')

    return tokenData.access_token
  } catch (error) {
    console.error('[jolt/sync] Token refresh failed:', error)
    throw error
  }
}

export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const user = await getUserFromAuth(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Jolt integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'jolt')
      .eq('status', 'connected')
      .maybeSingle()

    if (integrationError || !integration) {
      return NextResponse.json({ 
        error: 'Jolt not connected',
        message: 'Please connect Jolt integration first'
      }, { status: 404 })
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const expiresAt = new Date(integration.token_expires_at)
    if (expiresAt < new Date()) {
      accessToken = await refreshJoltToken(integration)
    }

    // Fetch new delivery photos from Jolt
    const since = integration.last_sync_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const joltResponse = await fetch(`https://api.jolt.com/v1/deliveries?since=${since}&include_photos=true`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!joltResponse.ok) {
      const errorData = await joltResponse.json().catch(() => ({}))
      console.error('[jolt/sync] Jolt API error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to fetch from Jolt',
        message: errorData.message || 'Jolt API request failed'
      }, { status: 502 })
    }

    const joltData = await joltResponse.json()
    const deliveries = joltData.deliveries || []

    // Extract photo URLs
    const photoUrls = []
    for (const delivery of deliveries) {
      if (delivery.photos && Array.isArray(delivery.photos)) {
        photoUrls.push(...delivery.photos.map(p => p.url))
      }
    }

    if (photoUrls.length === 0) {
      // Update last_sync_at even if no new photos
      await supabase
        .from('integrations')
        .update({ 
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('integration_type', 'jolt')

      return NextResponse.json({
        success: true,
        message: 'No new photos to analyze',
        photos_found: 0,
        audits_created: 0
      })
    }

    // Ensure buckets exist
    await Promise.all([
      ensureBucketExists('media', { public: true }, supabase),
      ensureBucketExists('reports', { public: true }, supabase),
    ])

    // Create audit session
    const sessionId = uuidv4()
    await supabase
      .from('audit_sessions')
      .insert([{
        id: sessionId,
        user_id: user.id,
        type: 'jolt_sync',
        area_tags: ['delivery']
      }])

    // Download and analyze photos
    const results = []
    const tempPaths = []

    try {
      for (let i = 0; i < Math.min(photoUrls.length, 50); i++) { // Limit to 50 photos per sync
        const photoUrl = photoUrls[i]
        
        try {
          const imageResponse = await fetch(photoUrl, {
            headers: { 'User-Agent': 'ProtocolLM-Jolt/1.0' },
            signal: AbortSignal.timeout(30000)
          })

          if (!imageResponse.ok) continue

          const imageBuffer = await imageResponse.arrayBuffer()
          
          // Save to temp file
          const tempPath = `/tmp/${uuidv4()}.jpg`
          const fs = await import('fs')
          fs.writeFileSync(tempPath, Buffer.from(imageBuffer))
          tempPaths.push(tempPath)

          // Store media reference
          const mediaId = uuidv4()
          const objectPath = `media/${sessionId}/${mediaId}.jpg`
          
          await supabase.storage
            .from('media')
            .upload(objectPath, Buffer.from(imageBuffer), { 
              upsert: true, 
              contentType: 'image/jpeg' 
            })
          
          await supabase.from('media').insert([{
            id: mediaId,
            session_id: sessionId,
            url: objectPath,
            type: 'image',
            user_id: user.id,
            area: 'delivery'
          }])
        } catch (err) {
          console.error(`[jolt/sync] Failed to process photo ${i}:`, err.message)
        }
      }

      // Analyze images
      if (tempPaths.length > 0) {
        const analysisResults = await analyzeImageBatch(tempPaths)
        
        // Save compliance results
        const insertRows = analysisResults.map((r) => ({
          id: uuidv4(),
          session_id: sessionId,
          user_id: user.id,
          media_id: null,
          violation: r.violation,
          violation_type: r.violation_type || r.type || 'General',
          severity: r.severity || 'info',
          confidence: r.confidence || 0,
          citation: r.citation || null,
          findings: r.findings || [],
          citations: r.citations || [],
        }))
        
        if (insertRows.length > 0) {
          await supabase.from('compliance_results').insert(insertRows)
        }
        
        results.push(...analysisResults)
      }

      // Generate report
      if (results.length > 0) {
        const { jsonReport, pdfBuffer } = await generateReport(sessionId, results)
        const pdfPath = `reports/${sessionId}.pdf`

        await supabase.storage
          .from('reports')
          .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' })

        await supabase
          .from('reports')
          .upsert({
            session_id: sessionId,
            user_id: user.id,
            json_report: jsonReport,
            pdf_path: pdfPath,
          }, { onConflict: 'session_id' })
      }

      // Update last_sync_at
      await supabase
        .from('integrations')
        .update({ 
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('integration_type', 'jolt')

      // Cleanup temp files
      const fs = await import('fs')
      tempPaths.forEach(p => {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p)
        } catch {}
      })

      const violationCount = results.filter(r => r.violation && r.severity !== 'info').length

      return NextResponse.json({
        success: true,
        photos_found: photoUrls.length,
        photos_analyzed: tempPaths.length,
        violations_found: violationCount,
        session_id: sessionId
      })

    } catch (processingError) {
      // Cleanup on error
      const fs = await import('fs')
      tempPaths.forEach(p => {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p)
        } catch {}
      })
      throw processingError
    }

  } catch (error) {
    console.error('[jolt/sync] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
