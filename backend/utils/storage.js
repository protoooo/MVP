import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null

export async function uploadFile(bucket, filePath, fileBody, contentType) {
  if (!supabase) throw new Error('Supabase client is not configured')
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBody, { upsert: true, contentType })
  if (error) throw error
  return data
}

export function getPublicUrl(bucket, filePath) {
  if (!supabase) throw new Error('Supabase client is not configured')
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

export async function downloadFile(bucket, filePath) {
  if (!supabase) throw new Error('Supabase client is not configured')
  const { data, error } = await supabase.storage.from(bucket).download(filePath)
  if (error) throw error
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
