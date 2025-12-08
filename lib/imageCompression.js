const MAX_WIDTH = 1920
const MAX_HEIGHT = 1920
const QUALITY = 0.85
const MAX_FILE_SIZE = 10 * 1024 * 1024

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'image.jpg'
  let clean = filename.replace(/\.\./g, '')
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_')
  if (clean.length > 100) clean = clean.substring(0, 100)
  if (!clean.includes('.')) clean += '.jpg'
  return clean
}

export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are allowed'))
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('Image must be under 10MB'))
      return
    }

    const sanitizedFilename = sanitizeFilename(file.name)
    console.log('Processing image:', sanitizedFilename)

    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
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
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
        
        console.log('Image compressed:', {
          filename: sanitizedFilename,
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
