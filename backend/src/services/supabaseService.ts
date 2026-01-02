import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found. File storage will use local filesystem.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export const supabaseStorageService = {
  // Upload file to Supabase Storage
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    bucketName: string = 'bizmemory-files',
    contentType: string
  ): Promise<string> {
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
  getPublicUrl(filePath: string, bucketName: string = 'bizmemory-files'): string {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Download file from Supabase Storage
  async downloadFile(filePath: string, bucketName: string = 'bizmemory-files'): Promise<Blob> {
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
  async deleteFile(filePath: string, bucketName: string = 'bizmemory-files'): Promise<void> {
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
  async ensureBucketExists(bucketName: string = 'bizmemory-files'): Promise<void> {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        throw listError;
      }

      const bucketExists = buckets?.some(b => b.name === bucketName);

      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 52428800, // 50MB
        });

        if (createError) {
          throw createError;
        }

        console.log(`✓ Created Supabase storage bucket: ${bucketName}`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw error;
    }
  },
};
