import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const hasSupabaseCredentials = !!(supabaseUrl && supabaseKey);

if (!hasSupabaseCredentials) {
  console.warn('⚠️  Supabase credentials not found. ProtocolLM requires Supabase for unlimited storage.');
}

// Only create client if credentials are provided
export const supabase: SupabaseClient | null = hasSupabaseCredentials 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const supabaseStorageService = {
  // Upload file to Supabase Storage
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    bucketName: string = 'protocollm-files',
    contentType: string
  ): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      return data.path;
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
  },

  // Get public URL for a file
  getPublicUrl(filePath: string, bucketName: string = 'protocollm-files'): string {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Download file from Supabase Storage
  async downloadFile(filePath: string, bucketName: string = 'protocollm-files'): Promise<Blob> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Supabase download error:', error);
      throw error;
    }
  },

  // Delete file from Supabase Storage
  async deleteFile(filePath: string, bucketName: string = 'protocollm-files'): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
  },

  // Create storage bucket if it doesn't exist
  async ensureBucketExists(bucketName: string = 'protocollm-files'): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        throw listError;
      }

      const bucketExists = buckets?.some((bucket: { name: string; id: string; public: boolean }) => bucket.name === bucketName);

      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 524288000, // 500MB per file
        });

        if (createError) {
          throw createError;
        }

        console.log(`✓ Created Supabase storage bucket: ${bucketName}`);
      } else {
        console.log(`✓ Supabase storage bucket exists: ${bucketName}`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw error;
    }
  },

  // Get storage statistics
  async getStorageStats(bucketName: string = 'protocollm-files'): Promise<{
    totalFiles: number;
    totalSize: number;
  }> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
      // Note: This is a simplified version. In production, you'd want to
      // track this in your database for better performance
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list();

      if (error) {
        throw error;
      }

      const totalFiles = files?.length || 0;
      const totalSize = files?.reduce((acc: number, file: any) => acc + (file.metadata?.size || 0), 0) || 0;

      return { totalFiles, totalSize };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  },
};
