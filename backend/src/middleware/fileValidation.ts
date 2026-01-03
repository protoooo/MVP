// backend/src/middleware/fileValidation.ts - COMPLETE VERSION
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ========================================
// SECURITY: MIME Type Whitelist
// ========================================
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

// ========================================
// SECURITY: File Signatures (Magic Numbers)
// ========================================
// Used to verify file content matches declared MIME type
const FILE_SIGNATURES: { [key: string]: { signature: Buffer; offset: number } } = {
  'image/jpeg': { signature: Buffer.from([0xFF, 0xD8, 0xFF]), offset: 0 },
  'image/png': { signature: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), offset: 0 },
  'application/pdf': { signature: Buffer.from([0x25, 0x50, 0x44, 0x46]), offset: 0 }, // %PDF
  'image/gif': { signature: Buffer.from([0x47, 0x49, 0x46, 0x38]), offset: 0 }, // GIF8
  'image/webp': { signature: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0 }, // RIFF
  // ZIP-based formats (DOCX, XLSX) start with PK
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    signature: Buffer.from([0x50, 0x4B, 0x03, 0x04]), 
    offset: 0 
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { 
    signature: Buffer.from([0x50, 0x4B, 0x03, 0x04]), 
    offset: 0 
  },
};

// ========================================
// SECURITY: Dangerous File Extensions
// ========================================
const DANGEROUS_EXTENSIONS = [
  // Executables
  '.exe', '.com', '.bat', '.cmd', '.scr', '.pif', '.app', '.vbs',
  '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh', '.ps1', '.psm1',
  
  // System files
  '.dll', '.so', '.dylib', '.sys', '.drv',
  
  // Archives that might contain executables
  '.zip', '.rar', '.7z', '.tar', '.gz',
  
  // Scripts
  '.sh', '.bash', '.csh', '.ksh', '.py', '.rb', '.pl', '.php', '.asp', '.aspx', '.jsp',
  
  // Database
  '.sql', '.db', '.sqlite',
  
  // Package files
  '.msi', '.deb', '.rpm', '.dmg', '.pkg', '.jar',
};

// ========================================
// Main File Validator Class
// ========================================
export class FileValidator {
  /**
   * Validate file before processing
   * Returns: { valid: boolean, error?: string }
   */
  static async validateFile(file: Express.Multer.File): Promise<{ 
    valid: boolean; 
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      // 1. Check file exists
      if (!file || !file.path) {
        return { valid: false, error: 'No file provided' };
      }

      if (!fs.existsSync(file.path)) {
        return { valid: false, error: 'File not found on server' };
      }

      // 2. Check file size (50MB max)
      const MAX_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return { 
          valid: false, 
          error: `File too large. Maximum size is 50MB (file is ${(file.size / 1024 / 1024).toFixed(2)}MB)` 
        };
      }

      // Warn if file is very small (might be empty or corrupt)
      if (file.size < 100) {
        warnings.push('File is very small and might be empty');
      }

      // 3. Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (!ext) {
        return { valid: false, error: 'File has no extension' };
      }

      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        console.error(`🚨 SECURITY: Blocked dangerous file type: ${ext} from ${file.originalname}`);
        return { 
          valid: false, 
          error: `File type ${ext} is not allowed for security reasons` 
        };
      }

      // 4. Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        console.warn(`File type not in whitelist: ${file.mimetype}`);
        return { 
          valid: false, 
          error: `File type "${file.mimetype}" is not supported. Allowed types: images, PDFs, Word, Excel, and text files.` 
        };
      }

      // 5. Verify file signature matches MIME type
      console.log(`Validating file signature for: ${file.originalname} (${file.mimetype})`);
      const isValidSignature = await this.validateFileSignature(file.path, file.mimetype);
      
      if (!isValidSignature) {
        console.error(`🚨 SECURITY: File signature mismatch for ${file.originalname}`);
        return { 
          valid: false, 
          error: 'File content does not match file type. The file may be corrupted or disguised.' 
        };
      }

      // 6. Scan for suspicious content in filename
      if (this.hasSuspiciousFilename(file.originalname)) {
        console.error(`🚨 SECURITY: Suspicious filename detected: ${file.originalname}`);
        return { 
          valid: false, 
          error: 'Filename contains invalid or suspicious characters' 
        };
      }

      // 7. Check for double extensions (like file.pdf.exe)
      const allExtensions = file.originalname.match(/\.[^.]+/g) || [];
      if (allExtensions.length > 1) {
        warnings.push('File has multiple extensions');
      }

      // 8. Calculate file hash for deduplication and integrity
      console.log('Calculating file hash...');
      const fileHash = await this.calculateFileHash(file.path);
      (file as any).fileHash = fileHash;
      (file as any).validationWarnings = warnings;

      console.log(`✅ File validated: ${file.originalname} (${file.mimetype})`);

      return { valid: true, warnings };

    } catch (error: any) {
      console.error('File validation error:', error);
      return { 
        valid: false, 
        error: 'File validation failed: ' + error.message 
      };
    }
  }

  /**
   * Validate file signature (magic number) matches MIME type
   * Prevents file type spoofing attacks
   */
  private static async validateFileSignature(
    filePath: string, 
    mimeType: string
  ): Promise<boolean> {
    const signature = FILE_SIGNATURES[mimeType];
    
    // If we don't have a signature for this type, allow it
    // (but it's already been validated against the MIME whitelist)
    if (!signature) {
      console.log(`No signature check for ${mimeType}, allowing`);
      return true;
    }

    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(signature.signature.length);
      
      fs.readSync(fd, buffer, 0, signature.signature.length, signature.offset);
      fs.closeSync(fd);

      const matches = buffer.equals(signature.signature);
      
      if (!matches) {
        console.error(`Signature mismatch for ${mimeType}:`);
        console.error(`Expected: ${signature.signature.toString('hex')}`);
        console.error(`Got: ${buffer.toString('hex')}`);
      }

      return matches;

    } catch (error: any) {
      console.error('Error reading file signature:', error);
      return false;
    }
  }

  /**
   * Check for suspicious patterns in filename
   */
  private static hasSuspiciousFilename(filename: string): boolean {
    const suspicious = [
      /\.\./,               // Directory traversal
      /[<>:"|?*\x00-\x1f]/,// Invalid/control characters
      /\x00/,               // Null byte injection
      /^\.ht/,              // .htaccess, .htpasswd
      /^\.env/i,            // Environment files
      /\.php\d?$/i,         // PHP files
      /\.asp$/i,            // ASP files
      /\.aspx$/i,           // ASPX files
      /\.jsp$/i,            // JSP files
      /\.cgi$/i,            // CGI scripts
      /^com\d$/i,           // Windows device names
      /^lpt\d$/i,           // Windows device names
      /^con$/i,             // Windows device name
      /^prn$/i,             // Windows device name
      /^aux$/i,             // Windows device name
      /^nul$/i,             // Windows device name
    ];

    return suspicious.some(pattern => pattern.test(filename));
  }

  /**
   * Calculate SHA-256 hash of file for deduplication and integrity
   */
  private static async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (error) => {
        console.error('Error calculating file hash:', error);
        reject(error);
      });
    });
  }

  /**
   * Sanitize filename - remove dangerous characters
   */
  static sanitizeFilename(filename: string): string {
    // Remove path components
    let sanitized = path.basename(filename);
    
    // Replace invalid characters with underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Replace multiple dots with single dot
    sanitized = sanitized.replace(/\.+/g, '.');
    
    // Remove leading dot
    sanitized = sanitized.replace(/^\./, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }

    // Ensure we still have a filename
    if (!sanitized || sanitized === '.') {
      sanitized = 'unnamed_file_' + Date.now();
    }

    return sanitized;
  }

  /**
   * Check if file already exists (by hash) to prevent duplicates
   */
  static async checkDuplicateHash(
    fileHash: string, 
    userId: number, 
    query: any
  ): Promise<{ isDuplicate: boolean; existingFile?: any }> {
    try {
      const result = await query(
        `SELECT f.id, f.original_filename, f.uploaded_at
         FROM files f
         WHERE f.user_id = $1
         LIMIT 1`,
        [userId]
      );

      // For now, just return false - we'd need to store hashes in DB
      // This is a placeholder for future duplicate detection
      return { isDuplicate: false };

    } catch (error) {
      console.error('Error checking duplicate:', error);
      return { isDuplicate: false };
    }
  }
}

// ========================================
// Express Middleware
// ========================================
export const validateFileMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`\n🔍 Validating file: ${req.file.originalname}`);

    const validation = await FileValidator.validateFile(req.file);
    
    if (!validation.valid) {
      console.error(`❌ File validation failed: ${validation.error}`);
      
      // Delete invalid file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️  Deleted invalid file');
      }
      
      return res.status(400).json({ error: validation.error });
    }

    // Log any warnings
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('⚠️  Validation warnings:', validation.warnings);
    }

    console.log('✅ File validation passed');

    next();
  } catch (error: any) {
    console.error('File validation middleware error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'File validation failed' });
  }
};

export default validateFileMiddleware;
