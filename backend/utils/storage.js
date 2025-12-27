import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null

// Cache bucket checks for the current runtime to avoid repeated network lookups.
// If bucket visibility changes externally, restart the runtime to refresh.
const ensuredBuckets = new Set()

async function ensureBucketExists(bucket, options = { public: true }) {
  if (!supabase) throw new Error('Supabase client is not configured')
  if (ensuredBuckets.has(bucket)) return

  const { data, error } = await supabase.storage.getBucket(bucket)
  if (data && !error) {
    ensuredBuckets.add(bucket)
    return
  }

  if (error && error.status !== 404 && error.statusCode !== '404' && !/not found/i.test(error.message || '')) {
    throw error
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, options)
  if (createError && !/already exists/i.test(createError.message || '')) {
    throw createError
  }

  ensuredBuckets.add(bucket)
}

export async function uploadFile(bucket, filePath, fileBody, contentType) {
  if (!supabase) throw new Error('Supabase client is not configured')
  await ensureBucketExists(bucket, { public: true })
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBody, { upsert: true, contentType })
  if (error) throw error
  return data
}

export async function getPublicUrl(bucket, filePath) {
  if (!supabase) throw new Error('Supabase client is not configured')
  await ensureBucketExists(bucket, { public: true })
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data?.publicUrl || null
}

export async function downloadFile(bucket, filePath) {
  if (!supabase) throw new Error('Supabase client is not configured')
  await ensureBucketExists(bucket, { public: true })
  const { data, error } = await supabase.storage.from(bucket).download(filePath)
  if (error) throw error
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
