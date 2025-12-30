import exifParser from 'exif-parser'
import sharp from 'sharp'
import fs from 'fs'

/**
 * Extract EXIF metadata from an image file
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - Parsed EXIF metadata
 */
export async function extractExifMetadata(filePath) {
  try {
    const buffer = fs.readFileSync(filePath)
    const parser = exifParser.create(buffer)
    const result = parser.parse()
    
    const metadata = {
      hasExif: false,
      dateTime: null,
      latitude: null,
      longitude: null,
      make: null,
      model: null,
      raw: result
    }
    
    // Extract date/time
    if (result.tags && result.tags.DateTimeOriginal) {
      metadata.dateTime = new Date(result.tags.DateTimeOriginal * 1000).toISOString()
      metadata.hasExif = true
    } else if (result.tags && result.tags.DateTime) {
      metadata.dateTime = new Date(result.tags.DateTime * 1000).toISOString()
      metadata.hasExif = true
    }
    
    // Extract GPS coordinates
    if (result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
      metadata.latitude = result.tags.GPSLatitude
      metadata.longitude = result.tags.GPSLongitude
      metadata.hasExif = true
    }
    
    // Extract camera info
    if (result.tags && result.tags.Make) {
      metadata.make = result.tags.Make
      metadata.hasExif = true
    }
    if (result.tags && result.tags.Model) {
      metadata.model = result.tags.Model
      metadata.hasExif = true
    }
    
    return metadata
  } catch (error) {
    console.error('[exif-metadata] Error extracting EXIF:', error)
    return {
      hasExif: false,
      dateTime: null,
      latitude: null,
      longitude: null,
      make: null,
      model: null,
      error: error.message
    }
  }
}

/**
 * Calculate distance between two GPS coordinates in miles
 * Uses Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Validate GPS coordinates against property address
 * @param {number} photoLat - Photo GPS latitude
 * @param {number} photoLon - Photo GPS longitude
 * @param {number} propertyLat - Property GPS latitude
 * @param {number} propertyLon - Property GPS longitude
 * @param {number} maxDistanceMiles - Maximum allowed distance in miles (default 0.5)
 * @returns {Object} - Validation result with distance and validity
 */
export function validateGpsLocation(photoLat, photoLon, propertyLat, propertyLon, maxDistanceMiles = 0.5) {
  if (!photoLat || !photoLon || !propertyLat || !propertyLon) {
    return {
      valid: false,
      distance: null,
      warning: 'GPS coordinates missing'
    }
  }
  
  const distance = calculateDistance(photoLat, photoLon, propertyLat, propertyLon)
  
  return {
    valid: distance <= maxDistanceMiles,
    distance: distance,
    warning: distance > maxDistanceMiles 
      ? `Photo location is ${distance.toFixed(2)} miles from property. Ensure you are at the property when documenting.`
      : null
  }
}

/**
 * Add watermark to image with timestamp and GPS coordinates
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {Object} metadata - Metadata to watermark (timestamp, GPS, etc.)
 * @returns {Promise<void>}
 */
export async function addWatermarkToImage(inputPath, outputPath, metadata) {
  try {
    const { dateTime, latitude, longitude, serverTimestamp } = metadata
    
    // Create watermark text
    const watermarkLines = []
    
    if (serverTimestamp) {
      watermarkLines.push(`Uploaded: ${new Date(serverTimestamp).toLocaleString('en-US', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      })}`)
    }
    
    if (dateTime) {
      watermarkLines.push(`Photo taken: ${new Date(dateTime).toLocaleString('en-US', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      })}`)
    }
    
    if (latitude && longitude) {
      watermarkLines.push(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
    }
    
    const watermarkText = watermarkLines.join(' | ')
    
    // Get image dimensions
    const image = sharp(inputPath)
    const imageMetadata = await image.metadata()
    
    // Create SVG watermark
    const fontSize = Math.max(12, Math.floor(imageMetadata.width / 60))
    const padding = 10
    const svgWatermark = `
      <svg width="${imageMetadata.width}" height="${imageMetadata.height}">
        <rect x="0" y="${imageMetadata.height - fontSize - padding * 2}" 
              width="${imageMetadata.width}" height="${fontSize + padding * 2}" 
              fill="rgba(0, 0, 0, 0.7)"/>
        <text x="${padding}" y="${imageMetadata.height - padding}" 
              font-family="Arial, sans-serif" font-size="${fontSize}" 
              fill="white" font-weight="bold">${watermarkText}</text>
      </svg>
    `
    
    // Composite watermark onto image
    await image
      .composite([{
        input: Buffer.from(svgWatermark),
        top: 0,
        left: 0
      }])
      .toFile(outputPath)
    
    console.log('[exif-metadata] Watermark added successfully')
  } catch (error) {
    console.error('[exif-metadata] Error adding watermark:', error)
    // If watermark fails, just copy the original
    fs.copyFileSync(inputPath, outputPath)
  }
}

/**
 * Generate manual verification note when EXIF is missing
 * @param {string} propertyAddress - Property address
 * @param {string} dateTime - Manually verified date/time
 * @returns {string} - Verification note text
 */
export function generateManualVerificationNote(propertyAddress, dateTime) {
  return `Tenant manually verified this photo was taken at ${propertyAddress} on ${dateTime}. ` +
    `Photo metadata was not available or was removed prior to upload.`
}
