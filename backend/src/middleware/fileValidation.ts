// backend/src/middleware/fileValidation.ts
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// MIME type whitelist - CRITICAL FOR SECURITY
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// File signatures (magic numbers) for validation
const FILE_SIGNATURES: { [key: string]: { signature: Buffer; offset: number } } = {
  'image/jpeg': { signature: Buffer.from([0xFF, 0xD8, 0xFF]), offset: 0 },
  'image/png': { signature: Buffer.from([0x89, 0x50, 0x4E, 0x47]), offset: 0 },
  'application/pdf': { signature: Buffer.from([0x25, 0x50, 0x44, 0x46]), offset: 0 },
  'image/gif': { signature: Buffer.from([0x47, 0x49, 0x46]), offset: 0 },
};

// Dangerous file extensions - BLOCK THESE
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.msi', '.app', '.deb', '.rpm', '.sh', '.bash', '.ps1', '.dll', '.so',
];

export class FileValidator {
  // Validate file before upload
  static async validateFile(file: Express.Multer.File): Promise<{ valid: boolean; error?: string }> {
    try {
      // 1. Check file exists
      if (!file || !file.path) {
        return { valid: false, error: 'No file provided' };
      }

      // 2. Check file size (50MB max)
      const MAX_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File too large (max 50MB)' };
      }

      // 3. Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'File type not allowed for security reasons' };
      }

      // 4. Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return { valid: false, error: `File type ${file.mimetype} not allowed` };
      }

      // 5. Verify file signature (magic number) matches MIME type
      const isValidSignature = await this.validateFileSignature(file.path, file.mimetype);
      if (!isValidSignature) {
        return { valid: false, error: 'File content does not match file type (possible spoofing)' };
      }

      // 6. Scan for suspicious content in filename
      if (this.hasSuspiciousFilename(file.originalname)) {
        return { valid: false, error: 'Filename contains suspicious characters' };
      }

      // 7. Calculate file hash for deduplication
      const fileHash = await this.calculateFileHash(file.path);
      (file as any).fileHash = fileHash;

      return { valid: true };
    } catch (error: any) {
      console.error('File validation error:', error);
      return { valid: false, error: 'File validation failed' };
    }
  }

  // Validate file signature (magic number)
  private static async validateFileSignature(filePath: string, mimeType: string): Promise<boolean> {
    const signature = FILE_SIGNATURES[mimeType];
    if (!signature) {
      // If we don't have a signature to check, allow it
      return true;
    }

    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(signature.signature.length);
      fs.readSync(fd, buffer, 0, signature.signature.length, signature.offset);
      fs.closeSync(fd);

      return buffer.equals(signature.signature);
    } catch (error) {
      console.error('Error reading file signature:', error);
      return false;
    }
  }

  // Check for suspicious filename patterns
  private static hasSuspiciousFilename(filename: string): boolean {
    const suspicious = [
      /\.\./,           // Directory traversal
      /[<>:"|?*]/,      // Invalid chars
      /\x00/,           // Null byte
      /^\.ht/,          // .htaccess, .htpasswd
      /^\.env/,         // Environment files
      /\.php\d?$/i,     // PHP files
      /\.asp$/i,        // ASP files
      /\.jsp$/i,        // JSP files
    ];

    return suspicious.some(pattern => pattern.test(filename));
  }

  // Calculate SHA-256 hash of file
  private static async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  // Clean filename (remove dangerous characters)
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace invalid chars
      .replace(/\.+/g, '.')               // Replace multiple dots
      .replace(/^\./, '')                 // Remove leading dot
      .substring(0, 255);                 // Limit length
  }
}

// Express middleware
export const validateFileMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validation = await FileValidator.validateFile(req.file);
    
    if (!validation.valid) {
      // Delete invalid file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: validation.error });
    }

    next();
  } catch (error: any) {
    console.error('File validation middleware error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'File validation failed' });
  }
};

// ========================================
// UPDATED backend/src/routes/files.ts
// ========================================
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validateFileMiddleware } from '../middleware/fileValidation';
import { apiLimiter } from '../middleware/rateLimiter';
import { fileService } from '../services/fileService';

const router = Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = FileValidator.sanitizeFilename(file.originalname);
    cb(null, uniqueSuffix + '-' + sanitizedName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
});

// Upload file - WITH VALIDATION
router.post(
  '/upload',
  authMiddleware,
  apiLimiter,
  upload.single('file'),
  validateFileMiddleware,  // <-- ADD THIS
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log(`Processing upload: ${req.file.originalname}`);
      const file = await fileService.processUploadedFile(req.file, req.user!.id);
      
      res.json({ 
        file, 
        message: 'File uploaded successfully',
        hash: (req.file as any).fileHash,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Check for storage limit error
      if (error.message?.includes('Storage limit exceeded')) {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Error uploading file' });
    }
  }
);

// ... rest of routes ...

export default router;
