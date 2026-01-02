import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { fileService } from '../services/fileService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|heic|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Upload file
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = await fileService.processUploadedFile(req.file, req.user!.id);
    res.json({ file, message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// List files
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await fileService.listFiles(req.user!.id, page, limit);
    res.json(result);
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Error listing files' });
  }
});

// Get file details
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await fileService.getFileById(fileId, req.user!.id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Error getting file' });
  }
});

// Download file
router.get('/:id/download', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await fileService.getFileById(fileId, req.user!.id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileStream = await fileService.getFileStream(fileId, req.user!.id);
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);
    res.setHeader('Content-Type', file.file_type);
    
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// Delete file
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const fileId = parseInt(req.params.id);
    await fileService.deleteFile(fileId, req.user!.id);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Error deleting file' });
  }
});

export default router;
