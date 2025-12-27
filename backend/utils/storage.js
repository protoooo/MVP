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

export async function ensureBucketExists(bucket, options = { public: true }, client = supabase) {
  const activeClient = client ?? supabase
  if (!activeClient) throw new Error('Supabase client is not configured')
  if (ensuredBuckets.has(bucket)) return

  const { data, error } = await activeClient.storage.getBucket(bucket)
  if (data && !error) {
    ensuredBuckets.add(bucket)
    return
  }

  const status = Number(error?.status ?? error?.statusCode)
  const isMissing = status === 404 || (Number.isNaN(status) && /not found/i.test(error?.message || ''))
  if (error && !isMissing) throw error

  const { error: createError } = await activeClient.storage.createBucket(bucket, options)
  if (createError) {
    const createStatus = Number(createError?.status ?? createError?.statusCode)
    const alreadyExists =
      createStatus === 409 || createStatus === 400 || (Number.isNaN(createStatus) && /already exists/i.test(createError.message || ''))
    if (!alreadyExists) throw createError
  }

  ensuredBuckets.add(bucket)
}

export async function uploadFile(bucket, filePath, fileBody, contentType) {
  if (!supabase) throw new Error('Supabase client is not configured')
  await ensureBucketExists(bucket, { public: true }, supabase)
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBody, { upsert: true, contentType })
  if (error) throw error
  return data
}

export async function getPublicUrl(bucket, filePath, client = supabase) {
  const activeClient = client ?? supabase
  if (!activeClient) throw new Error('Supabase client is not configured')
  await ensureBucketExists(bucket, { public: true }, activeClient)
  const { data } = activeClient.storage.from(bucket).getPublicUrl(filePath)
  return data?.publicUrl || null
}

// Backwards-compatible, synchronous variant for callers that do not need bucket provisioning.
export function getPublicUrlSync(bucket, filePath) {
  if (!supabase) throw new Error('Supabase client is not configured')
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data?.publicUrl || null
}

export async function downloadFile(bucket, filePath) {
  if (!supabase) throw new Error('Supabase client is not configured')
  await ensureBucketExists(bucket, { public: true }, supabase)
  const { data, error } = await supabase.storage.from(bucket).download(filePath)
  if (error) throw error
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
