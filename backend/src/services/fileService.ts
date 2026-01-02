import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { query } from '../config/database';
import { cohereService } from './cohereService';
import { ocrService } from './ocrService';
import { supabaseStorageService } from './supabaseService';

// Use Supabase if credentials are available, otherwise use local filesystem
const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

if (useSupabase) {
  console.log('✓ Using Supabase Storage for file uploads');
} else {
  console.log('⚠️  Using local filesystem for file uploads (development mode)');
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export const fileService = {
  // Process uploaded file with AI pipeline
  async processUploadedFile(file: Express.Multer.File, userId: number) {
    try {
      // 1. Extract text content (OCR if needed)
      const { text: extractedText, confidence: ocrConfidence } = await ocrService.extractTextFromFile(
        file.path,
        file.mimetype
      );

      // 2. Generate Cohere embedding for text content
      const textEmbedding = await cohereService.generateEmbedding(extractedText || file.originalname);

      // 3. For images: analyze with Aya Vision
      let imageAnalysis = null;
      if (isImageMimeType(file.mimetype)) {
        const imageBase64 = fs.readFileSync(file.path, { encoding: 'base64' });
        imageAnalysis = await cohereService.analyzeImage(imageBase64, file.originalname);
      }

      // 4. Generate metadata using Command-R7b
      const metadata = await cohereService.generateFileMetadata(
        file.originalname,
        extractedText || '',
        file.mimetype
      );

      // 5. Upload to Supabase or keep local
      let storagePath = file.path;
      
      if (useSupabase) {
        const fileBuffer = fs.readFileSync(file.path);
        const supabasePath = `uploads/${userId}/${Date.now()}-${file.originalname}`;
        
        await supabaseStorageService.uploadFile(
          supabasePath,
          fileBuffer,
          'bizmemory-files',
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
      const fileResult = await query(
        `INSERT INTO files (user_id, original_filename, stored_filename, file_type, file_size, storage_path, uploaded_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [userId, file.originalname, file.filename, file.mimetype, file.size, storagePath]
      );

      const fileRecord = fileResult.rows[0];

      await query(
        `INSERT INTO file_content (file_id, extracted_text, text_embedding, image_analysis, ocr_confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [fileRecord.id, extractedText, JSON.stringify(textEmbedding), imageAnalysis, ocrConfidence]
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
      await supabaseStorageService.deleteFile(file.storage_path);
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
      const blob = await supabaseStorageService.downloadFile(file.storage_path);
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
