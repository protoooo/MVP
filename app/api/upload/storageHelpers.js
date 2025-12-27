import { ensureBucketExists as baseEnsureBucketExists, getPublicUrl as baseGetPublicUrl } from '../../../backend/utils/storage'

export async function ensureBucketExists(bucket, options = { public: true }, supabase) {
  return baseEnsureBucketExists(bucket, options, supabase)
}

export async function getPublicUrlSafe(bucket, filePath, supabase) {
  return baseGetPublicUrl(bucket, filePath, supabase)
}
