// app/api/admin/health-check/route.js - Comprehensive health check for admin UI

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CohereClient } from 'cohere-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const checks = {
    supabase: false,
    cohere: false,
    documents_table: false,
    storage_buckets: false,
    env_vars: false,
  }

  const details = {}
  const errors = []

  try {
    // 1. Environment variables check
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'COHERE_API_KEY',
      'STRIPE_SECRET_KEY',
    ]

    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
    
    if (missingEnvVars.length === 0) {
      checks.env_vars = true
      details.env_vars = 'All required environment variables present'
    } else {
      errors.push(`Missing env vars: ${missingEnvVars.join(', ')}`)
      details.env_vars = `Missing: ${missingEnvVars.join(', ')}`
    }

    // 2. Supabase connection check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { error } = await supabase
          .from('documents')
          .select('id')
          .limit(1)

        if (error) throw error

        checks.supabase = true
        details.supabase = 'Connected successfully'
      } catch (err) {
        errors.push(`Supabase: ${err.message}`)
        details.supabase = err.message
      }
    } else {
      errors.push('Supabase credentials not configured')
      details.supabase = 'Missing credentials'
    }

    // 3. Cohere API check
    if (process.env.COHERE_API_KEY) {
      try {
        const cohere = new CohereClient({
          token: process.env.COHERE_API_KEY
        })

        const response = await cohere.embed({
          texts: ['health check'],
          model: process.env.COHERE_EMBED_MODEL || 'embed-v4.0',
          inputType: 'search_document',
          embeddingTypes: ['float'],
        })

        const dims = response.embeddings.float[0].length
        checks.cohere = true
        details.cohere = `Connected (${dims}D embeddings)`
        
        const expectedDims = Number(process.env.COHERE_EMBED_DIMS) || 1024
        if (dims !== expectedDims) {
          details.cohere += ` ⚠️ Dimension mismatch: ${dims} vs ${expectedDims}`
        }
      } catch (err) {
        errors.push(`Cohere: ${err.message}`)
        details.cohere = err.message
      }
    } else {
      errors.push('Cohere API key not configured')
      details.cohere = 'Missing API key'
    }

    // 4. Documents table check
    if (checks.supabase) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { count, error } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })

        if (error) throw error

        checks.documents_table = true
        details.documents_table = `Table accessible (${count || 0} documents)`
      } catch (err) {
        errors.push(`Documents table: ${err.message}`)
        details.documents_table = err.message
      }
    }

    // 5. Storage buckets check
    if (checks.supabase) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { data: buckets, error } = await supabase.storage.listBuckets()
        if (error) throw error

        const requiredBuckets = ['analysis-uploads', 'analysis-reports']
        const existingBuckets = buckets.map(b => b.name)
        const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b))

        if (missingBuckets.length === 0) {
          checks.storage_buckets = true
          details.storage_buckets = 'All required buckets present'
        } else {
          details.storage_buckets = `Missing buckets: ${missingBuckets.join(', ')}`
        }
      } catch (err) {
        errors.push(`Storage buckets: ${err.message}`)
        details.storage_buckets = err.message
      }
    }

    // Determine overall status
    const allPassed = Object.values(checks).every(v => v === true)

    return NextResponse.json({
      allPassed,
      checks,
      details,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    return NextResponse.json({
      allPassed: false,
      checks,
      details,
      errors: [...errors, error.message],
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
