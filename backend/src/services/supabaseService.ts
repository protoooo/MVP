import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const hasSupabaseCredentials = !!(supabaseUrl && supabaseKey);

if (!hasSupabaseCredentials) {
  console.warn('Supabase credentials not found. Storage will use local filesystem.');
}

export const supabase: SupabaseClient | null = hasSupabaseCredentials 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export const supabaseStorageService = {
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    bucketName: string = 'protocollm-files',
    contentType: string
  ): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
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

  getPublicUrl(filePath: string, bucketName: string = 'protocollm-files'): string {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

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

  async ensureBucketExists(bucketName: string = 'protocollm-files'): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    try {
      // First, try to list buckets to see if it exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        throw listError;
      }

      const bucketExists = buckets?.some((bucket: { name: string }) => bucket.name === bucketName);

      if (!bucketExists) {
        console.log(`Creating Supabase bucket: ${bucketName}...`);
        
        const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 52428800, // 50MB per file
          allowedMimeTypes: [
            'image/*',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
          ]
        });

        if (createError) {
          // Check if error is because bucket already exists
          if (createError.message.includes('already exists')) {
            console.log(`Bucket ${bucketName} already exists`);
            return;
          }
          console.error('Error creating bucket:', createError);
          throw createError;
        }

        console.log(`Supabase bucket created: ${bucketName}`);
      } else {
        console.log(`Supabase bucket ready: ${bucketName}`);
      }
    } catch (error: any) {
      console.error('Error ensuring bucket exists:', error);
      // Don't throw - allow the app to continue with local storage if bucket creation fails
      console.warn('Continuing with local filesystem storage');
    }
  },

  async getStorageStats(bucketName: string = 'protocollm-files'): Promise<{
    totalFiles: number;
    totalSize: number;
  }> {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    try {
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
