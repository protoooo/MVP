// lib/imageCompression.js

const MAX_WIDTH = 1920
const MAX_HEIGHT = 1920
const QUALITY = 0.85
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    // SECURITY: Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are allowed'))
      return
    }

    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('Image must be under 10MB'))
      return
    }

    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Calculate new dimensions
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
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
        
        console.log('Image compressed:', {
          originalSize: (file.size / 1024).toFixed(2) + 'KB',
          compressedSize: (compressedDataUrl.length * 0.75 / 1024).toFixed(2) + 'KB'
        })
        
        resolve(compressedDataUrl)
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
