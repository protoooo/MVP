/**
 * Standards Profiles API
 * GET /api/profiles - List profiles
 * POST /api/profiles - Create custom profile
 * PUT /api/profiles - Update profile
 * DELETE /api/profiles - Delete profile
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  listUserProfiles,
  createCustomProfile,
  updateProfile,
  deleteProfile,
  validateProfileData,
  INDUSTRIES,
  TASK_TYPES,
  STRICTNESS_LEVELS
} from '@/lib/standardsProfiles'

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
 * GET - List all profiles accessible to user
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

    const profiles = await listUserProfiles(authData.user_id)
    
    return NextResponse.json({
      profiles,
      available_industries: Object.values(INDUSTRIES),
      available_task_types: Object.values(TASK_TYPES),
      available_strictness_levels: Object.values(STRICTNESS_LEVELS)
    })
  } catch (error) {
    console.error('[profiles API] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST - Create custom profile
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

    const profileData = await req.json()
    
    // Validate profile data
    const validation = validateProfileData(profileData)
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Validation failed',
        errors: validation.errors 
      }, { status: 400 })
    }

    const profile = await createCustomProfile(authData.user_id, profileData)
    
    if (!profile) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('[profiles API] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT - Update profile
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

    const { profile_id, ...updates } = await req.json()
    
    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
    }

    // Validate updates
    const validation = validateProfileData(updates)
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Validation failed',
        errors: validation.errors 
      }, { status: 400 })
    }

    const profile = await updateProfile(profile_id, authData.user_id, updates)
    
    if (!profile) {
      return NextResponse.json({ error: 'Failed to update profile or profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[profiles API] PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE - Delete profile
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

    const { profile_id } = await req.json()
    
    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
    }

    const success = await deleteProfile(profile_id, authData.user_id)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete profile or profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[profiles API] DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
