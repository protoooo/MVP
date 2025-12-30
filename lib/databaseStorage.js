/**
 * Database Storage Utilities
 * Handles storing analysis results and violations in database
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Get Supabase client
 * @returns {Object} Supabase client
 */
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Store violations in the database (separate violations table to avoid JSONB size limits)
 * @param {string} sessionId - Analysis session ID
 * @param {Array<{description: string, severity: string, citation: string, timestamp?: string, image_url?: string}>} violations
 * @returns {Promise<{success: boolean, count: number}>}
 */
export async function storeViolations(sessionId, violations) {
  try {
    if (!violations || violations.length === 0) {
      return { success: true, count: 0 }
    }

    const supabase = getSupabaseClient()

    // Prepare violations data (note: using video_timestamp instead of timestamp)
    const violationsData = violations.map(v => ({
      session_id: sessionId,
      description: v.description,
      severity: v.severity,
      citation: v.citation || 'General Health Code',
      video_timestamp: v.timestamp || null,  // Changed from timestamp to video_timestamp
      frame_number: v.frameNumber || null,
      image_url: v.image_url || null
    }))

    // Insert violations (counts are auto-updated by trigger)
    const { error } = await supabase
      .from('violations')
      .insert(violationsData)

    if (error) {
      console.error('Error storing violations:', error)
      throw new Error(`Failed to store violations: ${error.message}`)
    }

    console.log(`Stored ${violations.length} violations for session ${sessionId}`)

    return {
      success: true,
      count: violations.length
    }
  } catch (error) {
    console.error('Store violations error:', error)
    throw error
  }
}

/**
 * Get violations for a session
 * @param {string} sessionId - Analysis session ID
 * @returns {Promise<Array>} Array of violations
 */
export async function getSessionViolations(sessionId) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .rpc('get_session_violations', { p_session_id: sessionId })

    if (error) {
      console.error('Error fetching violations:', error)
      throw new Error(`Failed to fetch violations: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Get violations error:', error)
    throw error
  }
}

/**
 * Update session with completion status and metadata
 * This uses minimal JSONB data to avoid size issues
 * @param {string} passcode - Session passcode
 * @param {Object} updates - Updates to apply
 * @returns {Promise<{success: boolean}>}
 */
export async function updateAnalysisSession(passcode, updates) {
  try {
    const supabase = getSupabaseClient()

    const updateData = {
      status: updates.status || 'completed',
      completed_at: updates.completed_at || new Date().toISOString(),
      pdf_url: updates.pdf_url || null,
      upload_completed: updates.upload_completed !== undefined ? updates.upload_completed : true
    }

    // Only include metadata if it's small (< 100KB as JSON string)
    if (updates.input_metadata) {
      const metadataSize = JSON.stringify(updates.input_metadata).length
      if (metadataSize < 100000) {
        updateData.input_metadata = updates.input_metadata
      } else {
        console.warn('Input metadata too large, storing minimal version')
        updateData.input_metadata = { size: metadataSize, truncated: true }
      }
    }

    // Store only summary stats in output_summary, not full violations
    if (updates.output_summary) {
      updateData.output_summary = {
        total: updates.output_summary.total || 0,
        by_severity: updates.output_summary.by_severity || {}
      }
    }

    const { error } = await supabase
      .from('analysis_sessions')
      .update(updateData)
      .eq('passcode', passcode)

    if (error) {
      console.error('Error updating session:', error)
      throw new Error(`Failed to update session: ${error.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Update session error:', error)
    throw error
  }
}

/**
 * Create a new analysis session
 * @param {Object} sessionData - Session data
 * @returns {Promise<{session: Object}>}
 */
export async function createAnalysisSession(sessionData) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('analysis_sessions')
      .insert({
        type: sessionData.type,
        passcode: sessionData.passcode,
        status: sessionData.status || 'pending',
        upload_completed: sessionData.upload_completed || false,
        input_metadata: sessionData.input_metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      throw new Error(`Failed to create session: ${error.message}`)
    }

    return { session: data }
  } catch (error) {
    console.error('Create session error:', error)
    throw error
  }
}
