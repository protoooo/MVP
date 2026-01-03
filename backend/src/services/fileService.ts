import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { query } from '../config/database';
import { cohereService } from './cohereService';
import { ocrService } from './ocrService';
import { supabaseStorageService } from './supabaseService';

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!useSupabase) {
  console.warn('⚠️  WARNING: Supabase not configured! Using local filesystem');
}

const STORAGE_LIMITS = {
  personal: 500 * 1024 * 1024 * 1024, // 500GB
  business: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
  enterprise: Infinity, // Unlimited
};

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export const fileService = {
  // ✅ FIXED: Check storage limit BEFORE any processing
  async processUploadedFile(file: Express.Multer.File, userId: number) {
    try {
      console.log(`\n=== Processing file: ${file.originalname} ===`);
      
      // 🔥 CRITICAL FIX: Check storage limit FIRST, before expensive operations
      console.log('Checking storage limit...');
      await this.checkStorageLimit(userId, file.size);
      console.log('✓ Storage limit check passed');

      // Now do expensive processing
      const { text: extractedText, confidence: ocrConfidence } = await ocrService.extractTextFromFile(
        file.path,
        file.mimetype
      );

      console.log('Generating embedding...');
      const textEmbedding = await cohereService.generateEmbedding(extractedText || file.originalname);
      console.log(`✓ Embedding generated: ${textEmbedding.length} dimensions`);

      let imageAnalysis = null;
      if (isImageMimeType(file.mimetype)) {
        console.log('Analyzing image with Aya Vision...');
        const imageBase64 = fs.readFileSync(file.path, { encoding: 'base64' });
        imageAnalysis = await cohereService.analyzeImage(imageBase64, file.originalname);
        console.log('✓ Image analysis complete');
      }

      console.log('Generating metadata...');
      const metadata = await cohereService.generateFileMetadata(
        file.originalname,
        extractedText || '',
        file.mimetype
      );
      console.log('✓ Metadata generated');

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
        fs.unlinkSync(file.path);
        console.log(`✓ Uploaded to Supabase: ${supabasePath}`);
      } else {
        console.log(`✓ Stored locally: ${file.path}`);
      }

      console.log('Saving to database...');
      const fileResult = await query(
        `INSERT INTO files (user_id, original_filename, stored_filename, file_type, file_size, storage_path, uploaded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [userId, file.originalname, file.filename, file.mimetype, file.size, storagePath]
      );

      const fileRecord = fileResult.rows[0];
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
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  },

  async checkStorageLimit(userId: number, fileSize: number): Promise<void> {
    const userResult = await query(
      `SELECT o.plan 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [userId]
    );

    const userPlan = userResult.rows[0]?.plan || 'personal';
    const storageLimit = STORAGE_LIMITS[userPlan as keyof typeof STORAGE_LIMITS];

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

  async getStorageUsage(userId: number): Promise<{
    used: number;
    limit: number;
    plan: string;
    percentUsed: number;
    filesCount: number;
    recentUploads: number;
  }> {
    const userResult = await query(
      `SELECT o.plan 
       FROM users u 
       LEFT JOIN organizations o ON u.organization_id = o.id 
       WHERE u.id = $1`,
      [userId]
    );

    const plan = userResult.rows[0]?.plan || 'personal';
    const limit = STORAGE_LIMITS[plan as keyof typeof STORAGE_LIMITS];

    const usageResult = await query(
      `SELECT 
         COALESCE(SUM(file_size), 0) as total_size,
         COUNT(*) as files_count,
         COUNT(*) FILTER (WHERE uploaded_at > NOW() - INTERVAL '7 days') as recent_uploads
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
      filesCount: parseInt(usageResult.rows[0]?.files_count || '0'),
      recentUploads: parseInt(usageResult.rows[0]?.recent_uploads || '0'),
    };
  },

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

  async listFiles(userId: number, page: number = 1, limit: number = 20, collectionId?: number) {
    const offset = (page - 1) * limit;
    
    let queryStr = `
      SELECT f.*, fm.tags, fm.category, fm.ai_description
      FROM files f
      LEFT JOIN file_metadata fm ON f.id = fm.file_id
      WHERE f.user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (collectionId) {
      queryStr = `
        SELECT f.*, fm.tags, fm.category, fm.ai_description
        FROM files f
        LEFT JOIN file_metadata fm ON f.id = fm.file_id
        INNER JOIN collection_files cf ON f.id = cf.file_id
        WHERE f.user_id = $1 AND cf.collection_id = $2
      `;
      params.push(collectionId);
    }
    
    queryStr += ` ORDER BY f.uploaded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await query(queryStr, params);

    const countQuery = collectionId
      ? `SELECT COUNT(*) FROM files f 
         INNER JOIN collection_files cf ON f.id = cf.file_id 
         WHERE f.user_id = $1 AND cf.collection_id = $2`
      : `SELECT COUNT(*) FROM files WHERE user_id = $1`;
    
    const countParams = collectionId ? [userId, collectionId] : [userId];
    const countResult = await query(countQuery, countParams);

    return {
      files: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async deleteFile(fileId: number, userId: number) {
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      throw new Error('File not found');
    }

    if (useSupabase) {
      await supabaseStorageService.deleteFile(file.storage_path, 'protocollm-files');
      console.log(`✓ Deleted from Supabase: ${file.storage_path}`);
    } else {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
        console.log(`✓ Deleted from local: ${file.storage_path}`);
      }
    }

    await query('DELETE FROM files WHERE id = $1 AND user_id = $2', [fileId, userId]);
  },

  async getFileStream(fileId: number, userId: number) {
    const file = await this.getFileById(fileId, userId);
    if (!file) {
      throw new Error('File not found');
    }

    if (useSupabase) {
      const blob = await supabaseStorageService.downloadFile(file.storage_path, 'protocollm-files');
      const buffer = Buffer.from(await blob.arrayBuffer());
      
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      return stream;
    } else {
      return fs.createReadStream(file.storage_path);
    }
  },
};
