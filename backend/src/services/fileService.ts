import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { query } from '../config/database';
import { cohereService } from './cohereService';
import { ocrService } from './ocrService';
import { supabaseStorageService } from './supabaseService';

// Always use Supabase for ProtocolLM
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!useSupabase) {
  console.warn('⚠️  WARNING: Supabase not configured! Using local filesystem (not recommended for production)');
}

// Storage limits by plan (in bytes)
const STORAGE_LIMITS = {
  personal: 500 * 1024 * 1024 * 1024, // 500GB
  business: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
  enterprise: Infinity, // Unlimited
};

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export const fileService = {
  // Check storage limit before upload
  async checkStorageLimit(userId: number, fileSize: number): Promise<void> {
    // Get user's plan
    const userResult = await query(
      `SELECT o.plan 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [userId]
    );

    const userPlan = userResult.rows[0]?.plan || 'personal';
    const storageLimit = STORAGE_LIMITS[userPlan as keyof typeof STORAGE_LIMITS];

    // Calculate current usage
    const usageResult = await query(
      `SELECT COALESCE(SUM(file_size), 0) as total_size 
       FROM files 
       WHERE user_id = $1`,
      [userId]
    );

    const currentUsage = parseInt(usageResult.rows[0]?.total_size || '0');
    const newTotal = currentUsage + fileSize;

    if (newTotal > storageLimit) {
      const limitGB = storageLimit / (1024 * 1024 * 1024);
      const usedGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2);
      throw new Error(
        `Storage limit exceeded. Your ${userPlan} plan includes ${limitGB}GB. ` +
        `You've used ${usedGB}GB. Please upgrade your plan or delete some files.`
      );
    }
  },

  // Process uploaded file with AI pipeline
  async processUploadedFile(file: Express.Multer.File, userId: number) {
    try {
      console.log(`\n=== Processing file: ${file.originalname} ===`);
      
      // ✅ Check storage limit BEFORE processing
      await this.checkStorageLimit(userId, file.size);
      console.log('✓ Storage limit check passed');

      // 1. Extract text content (OCR if needed)
      const { text: extractedText, confidence: ocrConfidence } = await ocrService.extractTextFromFile(
        file.path,
        file.mimetype
      );

      // 2. Generate Cohere embedding for text content
      console.log('Generating embedding...');
      const textEmbedding = await cohereService.generateEmbedding(extractedText || file.originalname);
      console.log(`✓ Embedding generated: ${textEmbedding.length} dimensions`);

      // 3. For images: analyze with Aya Vision
      let imageAnalysis = null;
      if (isImageMimeType(file.mimetype)) {
        console.log('Analyzing image with Aya Vision...');
        const imageBase64 = fs.readFileSync(file.path, { encoding: 'base64' });
        imageAnalysis = await cohereService.analyzeImage(imageBase64, file.originalname);
        console.log('✓ Image analysis complete');
      }

      // 4. Generate metadata using Command-R7b
      console.log('Generating metadata...');
      const metadata = await cohereService.generateFileMetadata(
        file.originalname,
        extractedText || '',
        file.mimetype
      );
      console.log('✓ Metadata generated');

      // 5. Upload to Supabase
      let storagePath = file.path;
      
      if (useSupabase) {
        const fileBuffer = fs.readFileSync(file.path);
        const supabasePath = `uploads/${userId}/${Date.now()}-${file.originalname}`;
        
        await supabaseStorageService.uploadFile(
          supabasePath,
          fileBuffer,
          'protocollm-files',
          file.mimetype
        );

        storagePath = supabasePath;
        
        // Delete local temp file after Supabase upload
        fs.unlinkSync(file.path);
        console.log(`✓ Uploaded to Supabase: ${supabasePath}`);
      } else {
        console.log(`✓ Stored locally: ${file.path}`);
      }

      // 6. Store in database
      console.log('Saving to database...');
      const fileResult = await query(
        `INSERT INTO files (user_id, original_filename, stored_filename, file_type, file_size, storage_path, uploaded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [userId, file.originalname, file.filename, file.mimetype, file.size, storagePath]
      );

      const fileRecord = fileResult.rows[0];

      // Convert embedding array to pgvector format
      const embeddingString = `[${textEmbedding.join(',')}]`;
      
      await query(
        `INSERT INTO file_content (file_id, extracted_text, text_embedding, image_analysis, ocr_confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [fileRecord.id, extractedText, embeddingString, imageAnalysis, ocrConfidence]
      );

      await query(
        `INSERT INTO file_metadata (file_id, category, tags, detected_entities, ai_description, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          fileRecord.id,
          metadata.category,
          metadata.tags,
          JSON.stringify(metadata.entities),
          imageAnalysis?.description || metadata.description,
          metadata.confidence,
        ]
      );

      console.log(`✓ File processed successfully: ID ${fileRecord.id}`);
      return fileRecord;
    } catch (error) {
      console.error('Error processing file:', error);
      // Clean up temp file if it still exists
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  },

  // Get storage usage for user
  async getStorageUsage(userId: number): Promise<{
    used: number;
    limit: number;
    plan: string;
    percentUsed: number;
  }> {
    // Get user's plan
    const userResult = await query(
      `SELECT o.plan 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [userId]
    );

    const plan = userResult.rows[0]?.plan || 'personal';
    const limit = STORAGE_LIMITS[plan as keyof typeof STORAGE_LIMITS];

    // Get current usage
    const usageResult = await query(
      `SELECT COALESCE(SUM(file_size), 0) as total_size 
       FROM files 
       WHERE user_id = $1`,
      [userId]
    );

    const used = parseInt(usageResult.rows[0]?.total_size || '0');
    const percentUsed = limit === Infinity ? 0 : (used / limit) * 100;

    return {
      used,
      limit,
      plan,
      percentUsed,
    };
  },

  // Get file by ID
  async getFileById(fileId: number, userId: number) {
    const result = await query(
      `SELECT f.*, fc.extracted_text, fm.tags, fm.category, fm.ai_description, fm.confidence_score
       FROM files f
       LEFT JOIN file_content fc ON f.id = fc.file_id
       LEFT JOIN file_metadata fm ON f.id = fm.file_id
       WHERE f.id = $1 AND f.user_id = $2`,
      [fileId, userId]
    );

    return result.rows[0] || null;
  },

  // List files for a user
  async listFiles(userId: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    
    const result = await query(
      `SELECT f.*, fm.tags, fm.category, fm.ai_description
       FROM files f
       LEFT JOIN file_metadata fm ON f.id = fm.file_id
       WHERE f.user_id = $1
       ORDER BY f.uploaded_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM files WHERE user_id = $1',
      [userId]
    );

    return {
      files: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  // Delete file
  async deleteFile(fileId: number, userId: number) {
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      throw new Error('File not found');
    }

    // Delete from Supabase or local filesystem
    if (useSupabase) {
      await supabaseStorageService.deleteFile(file.storage_path, 'protocollm-files');
      console.log(`✓ Deleted from Supabase: ${file.storage_path}`);
    } else {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
        console.log(`✓ Deleted from local: ${file.storage_path}`);
      }
    }

    // Delete from database (cascades to file_content and file_metadata)
    await query('DELETE FROM files WHERE id = $1 AND user_id = $2', [fileId, userId]);
  },

  // Get file stream for download
  async getFileStream(fileId: number, userId: number) {
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      throw new Error('File not found');
    }

    if (useSupabase) {
      // Download from Supabase and convert to stream
      const blob = await supabaseStorageService.downloadFile(file.storage_path, 'protocollm-files');
      const buffer = Buffer.from(await blob.arrayBuffer());
      
      // Create a readable stream from buffer
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      return stream;
    } else {
      // Read from local filesystem
      return fs.createReadStream(file.storage_path);
    }
  },
};
