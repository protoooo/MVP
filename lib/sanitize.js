// Input sanitization utilities

export function sanitizeString(input, maxLength = 5000) {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }

  // Remove potential XSS attempts
  let sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()

  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

export function sanitizeCounty(county) {
  const validCounties = ['washtenaw', 'wayne', 'oakland']
  
  if (typeof county !== 'string') {
    return 'washtenaw' // default
  }

  const normalized = county.toLowerCase().trim()
  
  if (!validCounties.includes(normalized)) {
    return 'washtenaw' // default
  }

  return normalized
}

export function sanitizeImageData(imageData) {
  if (typeof imageData !== 'string') {
    throw new Error('Image data must be a string')
  }

  // Verify it's a valid data URL
  if (!imageData.startsWith('data:image/')) {
    throw new Error('Invalid image format')
  }

  // Check allowed types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const mimeType = imageData.split(';')[0].split(':')[1]
  
  if (!allowedTypes.includes(mimeType)) {
    throw new Error('Image type not allowed')
  }

  // Check size (base64)
  const base64Length = imageData.split(',')[1]?.length || 0
  const sizeInBytes = (base64Length * 3) / 4
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (sizeInBytes > maxSize) {
    throw new Error('Image too large')
  }

  return imageData
}

export function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array')
  }

  if (messages.length > 100) {
    throw new Error('Too many messages')
  }

  return messages.map(msg => {
    if (typeof msg !== 'object' || !msg.role || !msg.content) {
      throw new Error('Invalid message format')
    }

    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: sanitizeString(msg.content, 5000),
      citations: Array.isArray(msg.citations) ? msg.citations : []
    }
  })
}
