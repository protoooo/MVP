import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import imageHash from 'image-hash'

// Maximum video duration in seconds (25 minutes)
const MAX_VIDEO_DURATION_SECONDS = 25 * 60

/**
 * Get video metadata including duration
 * @param {string} videoPath - Path to video file
 * @returns {Promise<{duration: number, width: number, height: number}>}
 */
export async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }
      
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
      })
    })
  })
}

/**
 * Validate video duration is within allowed limits
 * @param {string} videoPath - Path to video file
 * @returns {Promise<{valid: boolean, duration: number, maxDuration: number, error?: string}>}
 */
export async function validateVideoDuration(videoPath) {
  try {
    const metadata = await getVideoMetadata(videoPath)
    const durationMinutes = Math.ceil(metadata.duration / 60)
    
    if (metadata.duration > MAX_VIDEO_DURATION_SECONDS) {
      return {
        valid: false,
        duration: metadata.duration,
        durationMinutes,
        maxDuration: MAX_VIDEO_DURATION_SECONDS,
        maxDurationMinutes: 25,
        error: `Video duration (${durationMinutes} minutes) exceeds maximum allowed length of 25 minutes. Please trim your video to 25 minutes or less.`
      }
    }
    
    return {
      valid: true,
      duration: metadata.duration,
      durationMinutes,
      maxDuration: MAX_VIDEO_DURATION_SECONDS,
      maxDurationMinutes: 25,
    }
  } catch (err) {
    return {
      valid: false,
      duration: 0,
      durationMinutes: 0,
      maxDuration: MAX_VIDEO_DURATION_SECONDS,
      maxDurationMinutes: 25,
      error: `Failed to validate video: ${err.message}`
    }
  }
}

export async function extractFrames(videoPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    
    ffmpeg(videoPath)
      .outputOptions(['-vf fps=1'])
      .save(path.join(outputDir, 'frame_%04d.jpg'))
      .on('end', () => resolve(outputDir))
      .on('error', (err) => {
        // Provide more helpful error message if ffmpeg is not found
        // Check for common ffmpeg-not-found error patterns
        if (err.code === 'ENOENT' || 
            (err.syscall === 'spawn' && String(err).includes('ffmpeg'))) {
          reject(new Error('Cannot find ffmpeg. Please ensure ffmpeg is installed on the system.'))
        } else {
          reject(err)
        }
      })
  })
}

export async function deduplicateFrames(framePaths) {
  const uniqueFrames = []
  const hashes = new Set()

  for (const framePath of framePaths) {
    const frameHash = await new Promise((resolve, reject) => {
      imageHash(framePath, 16, true, (error, data) => {
        if (error) reject(error)
        else resolve(data)
      })
    })

    if (!hashes.has(frameHash)) {
      hashes.add(frameHash)
      uniqueFrames.push(framePath)
    } else {
      try {
        fs.unlinkSync(framePath)
      } catch (unlinkErr) {
        console.error('Failed to remove duplicate frame', unlinkErr)
      }
    }
  }

  return uniqueFrames
}
