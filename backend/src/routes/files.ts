// backend/src/routes/files.ts - PROPERLY FIXED
import { Router, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateFileMiddleware, FileValidator } from '../middleware/fileValidation';
import { uploadLimiter, apiLimiter } from '../middleware/rateLimiter';
import { fileService } from '../services/fileService';

const router = Router();

// ========================================
// Configure Multer for File Uploads
// ========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with sanitized original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = FileValidator.sanitizeFilename(file.originalname);
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 1, // 1 file at a time
    fields: 10, // Max form fields
    parts: 12, // Max parts (fields + files)
  },
  fileFilter: (req, file, cb) => {
    // Basic pre-check before upload (full validation happens in middleware)
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Block obviously dangerous extensions immediately
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.so'];
    if (blocked.includes(ext)) {
      console.error(`🚨 SECURITY: Blocked dangerous file extension: ${ext}`);
      return cb(new Error('File type not allowed'));
    }
    
    cb(null, true);
  },
});

// Handle multer errors - USING EXPRESS ERROR HANDLER TYPE
const handleMulterError: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ 
        error: 'File too large. Maximum size is 50MB.' 
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({ 
        error: 'Too many files. Upload one file at a time.' 
      });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  
  if (err) {
    console.error('Upload error:', err);
    res.status(400).json({ error: err.message || 'Upload failed' });
    return;
  }
  
  next();
};

// ========================================
// ROUTE: Upload File
// ========================================
router.post(
  '/upload',
  authMiddleware,           // Must be authenticated
  uploadLimiter,            // Rate limit uploads
  upload.single('file'),    // Handle file upload
  handleMulterError,        // Handle upload errors
  validateFileMiddleware,   // Validate file security
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log(`\n📤 Processing upload: ${req.file.originalname} (${req.file.mimetype})`);
      console.log(`   Size: ${(req.file.size / 1024).toFixed(2)} KB`);
      console.log(`   User: ${req.user!.id}`);

      // Process and store file
      const file = await fileService.processUploadedFile(req.file, req.user!.id);
      
      console.log(`✅ File uploaded successfully: ID ${file.id}`);

      res.json({ 
        file,
        message: 'File uploaded and processed successfully',
        hash: (req.file as any).fileHash,
        warnings: (req.file as any).validationWarnings,
      });
    } catch (error: any) {
      console.error('❌ Upload processing error:', error);
      
      // Check for specific error types
      if (error.message?.includes('Storage limit exceeded')) {
        return res.status(403).json({ 
          error: error.message,
          code: 'STORAGE_LIMIT_EXCEEDED'
        });
      }
      
      if (error.message?.includes('Invalid file')) {
        return res.status(400).json({ 
          error: error.message,
          code: 'INVALID_FILE'
        });
      }
      
      res.status(500).json({ 
        error: 'Error processing file upload',
        code: 'PROCESSING_ERROR'
      });
    }
  }
);

// ========================================
// ROUTE: List Files
// ========================================
router.get('/', authMiddleware, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const collectionId = req.query.collectionId 
      ? parseInt(req.query.collectionId as string) 
      : undefined;

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ 
        error: 'Invalid pagination parameters' 
      });
    }

    const result = await fileService.listFiles(
      req.user!.id, 
      page, 
      limit,
      collectionId
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Error listing files' });
  }
});

// ========================================
// ROUTE: Get File Details
// ========================================
router.get('/:id', authMiddleware, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const file = await fileService.getFileById(fileId, req.user!.id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file });
  } catch (error: any) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Error getting file' });
  }
});

// ========================================
// ROUTE: Download File
// ========================================
// SECURITY: Accepts token in query param OR header
router.get('/:id/download', async (req, res) => {
  try {
    // Get token from query param OR Authorization header
    const token = (req.query.token as string) || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT token
    let decoded: { id: number; email: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { id: number; email: string };
    } catch (err) {
      console.warn('Invalid token for download attempt');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    // Get file metadata
    const file = await fileService.getFileById(fileId, decoded.id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stream
    const fileStream = await fileService.getFileStream(fileId, decoded.id);
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_filename)}"`);
    res.setHeader('Content-Type', file.file_type);
    res.setHeader('Content-Length', file.file_size);
    
    // Stream file to response
    fileStream.pipe(res);
    
    console.log(`📥 File downloaded: ${file.original_filename} by user ${decoded.id}`);
  } catch (error: any) {
    console.error('Download error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error downloading file' });
    }
  }
});

// ========================================
// ROUTE: Delete File
// ========================================
router.delete('/:id', authMiddleware, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    await fileService.deleteFile(fileId, req.user!.id);
    
    console.log(`🗑️  File deleted: ID ${fileId} by user ${req.user!.id}`);
    
    res.json({ 
      message: 'File deleted successfully',
      fileId 
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    
    if (error.message === 'File not found') {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.status(500).json({ error: 'Error deleting file' });
  }
});

// ========================================
// ROUTE: Batch Delete Files
// ========================================
router.post('/batch/delete', authMiddleware, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const { fileIds } = req.body;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'File IDs array is required' });
    }
    
    if (fileIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 files can be deleted at once' });
    }

    const results = {
      deleted: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const fileId of fileIds) {
      try {
        await fileService.deleteFile(fileId, req.user!.id);
        results.deleted.push(fileId);
      } catch (error: any) {
        results.failed.push({ 
          id: fileId, 
          error: error.message || 'Delete failed' 
        });
      }
    }

    console.log(`🗑️  Batch delete: ${results.deleted.length} deleted, ${results.failed.length} failed by user ${req.user!.id}`);

    res.json({
      message: `Deleted ${results.deleted.length} files`,
      results,
    });
  } catch (error: any) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: 'Error deleting files' });
  }
});

// ========================================
// ROUTE: Get Storage Stats
// ========================================
router.get('/stats/storage', authMiddleware, apiLimiter, async (req: AuthRequest, res) => {
  try {
    const stats = await fileService.getStorageUsage(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    console.error('Get storage stats error:', error);
    res.status(500).json({ error: 'Error getting storage statistics' });
  }
});

export default router;
