// lib/imageCompression.js - Enhanced security validation
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1920
const QUALITY = 0.85
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Enhanced security validation
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'image.jpg'
  
  // Remove path traversal attempts
  let clean = filename.replace(/\.\./g, '')
  clean = clean.replace(/\//g, '') // Remove forward slashes
  clean = clean.replace(/\\/g, '') // Remove backslashes
  
  // Only allow safe characters
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  if (clean.length > 100) clean = clean.substring(0, 100)
  if (!clean.includes('.')) clean += '.jpg'
  
  return clean
}

// Validate image type by magic bytes (not just extension)
function validateImageType(base64String) {
  if (!base64String) return null
  
  const base64Data = base64String.includes(',') 
    ? base64String.split(',')[1] 
    : base64String
  
  // Decode first few bytes to check magic number
  try {
    const binary = atob(base64Data.substring(0, 32))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    
    // Check for valid image magic bytes
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    const isGIF = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46
    const isWebP = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    
    if (!isJPEG && !isPNG && !isGIF && !isWebP) {
      throw new Error('Invalid image format detected')
    }
    
    return base64Data
  } catch (err) {
    throw new Error('Failed to validate image type')
  }
}

/**
 * Compress and validate image with security checks
 * @param {File} file - Image file from user upload
 * @returns {Promise<string>} - Base64 encoded compressed image
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are allowed'))
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('Image must be under 10MB'))
      return
    }

    // Validate and sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name)

    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        // Validate image by magic bytes
        validateImageType(e.target.result)
        
        const img = new Image()
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height
            
            // Validate dimensions
            if (width > 10000 || height > 10000) {
              reject(new Error('Image dimensions too large'))
              return
            }
            
            // Calculate new dimensions while maintaining aspect ratio
            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width
                width = MAX_WIDTH
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height
                height = MAX_HEIGHT
              }
            }
            
            canvas.width = width
            canvas.height = height
            
            const ctx = canvas.getContext('2d', { alpha: false })
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)
            
            const compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
            
            // Final size check
            const finalSize = compressedDataUrl.length * 0.75
            if (finalSize > MAX_FILE_SIZE) {
              reject(new Error('Compressed image still too large'))
              return
            }
            
            resolve(compressedDataUrl)
          } catch (err) {
            reject(new Error('Failed to compress image'))
          }
        }
        
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target.result
      } catch (err) {
        reject(err)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
