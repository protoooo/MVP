/**
 * Supabase Storage Upload Utilities
 * Handles file uploads to Supabase Storage with public URL retrieval
 */

import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey } from './supabaseConfig.js'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Upload a file to Supabase Storage
 * @param {Buffer|Blob} file - The file to upload
 * @param {string} fileName - The name for the file
 * @param {string} bucket - The storage bucket name (default: 'analysis-uploads')
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<{url: string, path: string}>} The public URL and storage path
 */
export async function uploadFile(file, fileName, bucket = 'analysis-uploads', contentType) {
  try {
    // Generate unique file path with timestamp to avoid collisions
    const timestamp = Date.now()
    const filePath = `${timestamp}-${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('File upload error:', error)
    throw error
  }
}

/**
 * Upload multiple files to Supabase Storage
 * @param {Array<{file: Buffer|Blob, fileName: string, contentType: string}>} files - Array of files to upload
 * @param {string} bucket - The storage bucket name
 * @returns {Promise<Array<{url: string, path: string, fileName: string}>>} Array of upload results
 */
export async function uploadMultipleFiles(files, bucket = 'analysis-uploads') {
  try {
    const uploadPromises = files.map(({ file, fileName, contentType }) =>
      uploadFile(file, fileName, bucket, contentType)
        .then(result => ({ ...result, fileName }))
    )

    const results = await Promise.all(uploadPromises)
    return results
  } catch (error) {
    console.error('Multiple file upload error:', error)
    throw error
  }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - The storage path of the file to delete
 * @param {string} bucket - The storage bucket name
 * @returns {Promise<void>}
 */
export async function deleteFile(filePath, bucket = 'analysis-uploads') {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      throw new Error(`Storage deletion failed: ${error.message}`)
    }
  } catch (error) {
    console.error('File deletion error:', error)
    throw error
  }
}

/**
 * Create a storage bucket if it doesn't exist
 * @param {string} bucketName - The name of the bucket to create
 * @param {boolean} isPublic - Whether the bucket should be public
 * @returns {Promise<void>}
 */
export async function createBucketIfNotExists(bucketName, isPublic = true) {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: isPublic,
        fileSizeLimit: 1024 * 1024 * 500 // 500MB limit
      })

      if (error && !error.message.includes('already exists')) {
        throw new Error(`Bucket creation failed: ${error.message}`)
      }
    }
  } catch (error) {
    console.error('Bucket creation error:', error)
    // Don't throw - bucket might already exist
  }
}
