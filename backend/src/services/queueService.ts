import { query } from '../config/database';
import { cohereService } from './cohereService';
import { ocrService } from './ocrService';
import fs from 'fs';

export type JobType = 'embed' | 'ocr' | 'analyze' | 'reindex';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface QueueJob {
  id: number;
  job_type: JobType;
  file_id: number;
  priority: number;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
}

export const queueService = {
  // Add job to queue
  async addJob(fileId: number, jobType: JobType, priority: number = 5): Promise<number> {
    const result = await query(
      `INSERT INTO processing_queue (file_id, job_type, priority, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [fileId, jobType, priority]
    );
    
    console.log(`Added ${jobType} job for file ${fileId} with priority ${priority}`);
    return result.rows[0].id;
  },

  // Get next job to process
  async getNextJob(): Promise<QueueJob | null> {
    const result = await query(
      `UPDATE processing_queue
       SET status = 'processing', started_at = NOW(), attempts = attempts + 1
       WHERE id = (
         SELECT id FROM processing_queue
         WHERE status = 'pending' AND attempts < max_attempts
         ORDER BY priority DESC, scheduled_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );

    return result.rows[0] || null;
  },

  // Mark job as completed
  async completeJob(jobId: number): Promise<void> {
    await query(
      `UPDATE processing_queue
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [jobId]
    );
    console.log(`Job ${jobId} completed successfully`);
  },

  // Mark job as failed
  async failJob(jobId: number, errorMessage: string): Promise<void> {
    await query(
      `UPDATE processing_queue
       SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1`,
      [jobId, errorMessage]
    );
    console.error(`Job ${jobId} failed:`, errorMessage);
  },

  // Process a single job
  async processJob(job: QueueJob): Promise<void> {
    try {
      console.log(`Processing ${job.job_type} job ${job.id} for file ${job.file_id}`);

      switch (job.job_type) {
        case 'embed':
          await this.processEmbedding(job.file_id);
          break;
        case 'ocr':
          await this.processOCR(job.file_id);
          break;
        case 'analyze':
          await this.processAnalysis(job.file_id);
          break;
        case 'reindex':
          await this.processReindex(job.file_id);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      await this.completeJob(job.id);
    } catch (error: any) {
      console.error(`Error processing job ${job.id}:`, error);
      
      if (job.attempts >= job.max_attempts) {
        await this.failJob(job.id, error.message);
      } else {
        // Reset to pending for retry
        await query(
          `UPDATE processing_queue
           SET status = 'pending', scheduled_at = NOW() + INTERVAL '5 minutes'
           WHERE id = $1`,
          [job.id]
        );
        console.log(`Job ${job.id} will be retried (attempt ${job.attempts}/${job.max_attempts})`);
      }
    }
  },

  // Process embedding generation
  async processEmbedding(fileId: number): Promise<void> {
    // Get file content
    const contentResult = await query(
      'SELECT extracted_text FROM file_content WHERE file_id = $1',
      [fileId]
    );

    if (!contentResult.rows[0] || !contentResult.rows[0].extracted_text) {
      throw new Error('No extracted text found for embedding');
    }

    const text = contentResult.rows[0].extracted_text;

    // Generate embedding
    const embedding = await cohereService.generateEmbedding(text);

    // Update file content with embedding
    await query(
      `UPDATE file_content
       SET text_embedding = $1, processing_status = 'completed', processed_at = NOW()
       WHERE file_id = $2`,
      [JSON.stringify(embedding), fileId]
    );

    console.log(`Generated embedding for file ${fileId}`);
  },

  // Process OCR
  async processOCR(fileId: number): Promise<void> {
    const fileResult = await query(
      'SELECT storage_path, file_type FROM files WHERE id = $1',
      [fileId]
    );

    if (!fileResult.rows[0]) {
      throw new Error('File not found');
    }

    const { storage_path, file_type } = fileResult.rows[0];

    // Extract text
    const { text, confidence } = await ocrService.extractTextFromFile(storage_path, file_type);

    // Update file content
    await query(
      `UPDATE file_content
       SET extracted_text = $1, ocr_confidence = $2, processing_status = 'completed', processed_at = NOW()
       WHERE file_id = $3`,
      [text, confidence, fileId]
    );

    console.log(`Processed OCR for file ${fileId}`);
  },

  // Process AI analysis
  async processAnalysis(fileId: number): Promise<void> {
    const fileResult = await query(
      `SELECT f.original_filename, f.file_type, fc.extracted_text
       FROM files f
       LEFT JOIN file_content fc ON f.id = fc.file_id
       WHERE f.id = $1`,
      [fileId]
    );

    if (!fileResult.rows[0]) {
      throw new Error('File not found');
    }

    const { original_filename, file_type, extracted_text } = fileResult.rows[0];

    // Generate metadata
    const metadata = await cohereService.generateFileMetadata(
      original_filename,
      extracted_text || '',
      file_type
    );

    // Update file metadata
    await query(
      `INSERT INTO file_metadata (file_id, category, tags, detected_entities, ai_description, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (file_id) DO UPDATE SET
         category = EXCLUDED.category,
         tags = EXCLUDED.tags,
         detected_entities = EXCLUDED.detected_entities,
         ai_description = EXCLUDED.ai_description,
         confidence_score = EXCLUDED.confidence_score`,
      [
        fileId,
        metadata.category,
        metadata.tags,
        JSON.stringify(metadata.entities),
        metadata.description,
        metadata.confidence,
      ]
    );

    console.log(`Processed AI analysis for file ${fileId}`);
  },

  // Process reindexing
  async processReindex(fileId: number): Promise<void> {
    // Reprocess OCR, embedding, and analysis
    await this.processOCR(fileId);
    await this.processEmbedding(fileId);
    await this.processAnalysis(fileId);
    console.log(`Reindexed file ${fileId}`);
  },

  // Start queue worker
  async startWorker(intervalMs: number = 5000): Promise<void> {
    console.log('Starting queue worker...');

    const processNext = async () => {
      const job = await this.getNextJob();
      if (job) {
        await this.processJob(job);
      }
    };

    // Process immediately, then on interval
    processNext();
    setInterval(processNext, intervalMs);
  },

  // Get queue statistics
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const result = await query(
      `SELECT 
         status,
         COUNT(*) as count
       FROM processing_queue
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY status`
    );

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    result.rows.forEach(row => {
      stats[row.status as keyof typeof stats] = parseInt(row.count);
    });

    return stats;
  },

  // Clean up old completed jobs (run daily)
  async cleanupOldJobs(daysOld: number = 7): Promise<number> {
    const result = await query(
      `DELETE FROM processing_queue
       WHERE status IN ('completed', 'failed')
       AND completed_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );

    console.log(`Cleaned up ${result.rows.length} old jobs`);
    return result.rows.length;
  },
};
