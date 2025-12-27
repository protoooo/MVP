const ensuredBuckets = new Set()

export async function ensureBucketExists(supabase, bucket, options = { public: true }) {
  if (!supabase) throw new Error('Supabase client is not configured')
  if (ensuredBuckets.has(bucket)) return

  const { data, error } = await supabase.storage.getBucket(bucket)
  if (!error && data) {
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

export async function getPublicUrlSafe(supabase, bucket, filePath) {
  if (!supabase) throw new Error('Supabase client is not configured')
  await ensureBucketExists(supabase, bucket, { public: true })
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data?.publicUrl || null
}
