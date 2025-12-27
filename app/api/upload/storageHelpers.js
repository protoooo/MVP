import { ensureBucketExists as baseEnsureBucketExists, getPublicUrl as baseGetPublicUrl } from '../../../backend/utils/storage'

export async function ensureBucketExists(supabase, bucket, options = { public: true }) {
  return baseEnsureBucketExists(bucket, options, supabase)
}

export async function getPublicUrlSafe(supabase, bucket, filePath) {
  return baseGetPublicUrl(bucket, filePath, supabase)
}
