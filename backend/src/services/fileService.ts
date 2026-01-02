import fs from 'fs';
import path from 'path';
import { S3 } from 'aws-sdk';
import { query } from '../config/database';
import { cohereService } from './cohereService';
import { ocrService } from './ocrService';

const useS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME);

const s3 = useS3
  ? new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    })
  : null;

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

      // 5. Upload to S3 or keep local
      let storagePath = file.path;
      if (useS3 && s3) {
        const fileContent = fs.readFileSync(file.path);
        const s3Key = `uploads/${userId}/${Date.now()}-${file.originalname}`;
        
        await s3
          .putObject({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: s3Key,
            Body: fileContent,
            ContentType: file.mimetype,
          })
          .promise();

        storagePath = s3Key;
        // Delete local file after S3 upload
        fs.unlinkSync(file.path);
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

    // Delete from S3 or local filesystem
    if (useS3 && s3) {
      await s3
        .deleteObject({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: file.storage_path,
        })
        .promise();
    } else {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
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

    if (useS3 && s3) {
      return s3
        .getObject({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: file.storage_path,
        })
        .createReadStream();
    } else {
      return fs.createReadStream(file.storage_path);
    }
  },
};
