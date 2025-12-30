/**
 * Video Processing with FFmpeg
 * Extracts frames from videos for analysis
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { nanoid } from 'nanoid'

const execAsync = promisify(exec)

// Default video duration fallback when ffprobe fails (in seconds)
// This ensures video processing can continue even if metadata extraction fails
const DEFAULT_VIDEO_DURATION = 60

/**
 * Extract frames from a video file at specified intervals
 * @param {string} videoPath - Path to the video file
 * @param {number} framesPerSecond - Number of frames to extract per second (default: 1)
 * @param {string} outputDir - Directory to save extracted frames (default: temp directory)
 * @returns {Promise<{frames: Array<{path: string, timestamp: string}>, frameCount: number}>}
 */
export async function extractFrames(videoPath, framesPerSecond = 1, outputDir = null) {
  let tempDir = outputDir

  try {
    // Create temporary directory for frames if not provided
    if (!tempDir) {
      tempDir = `/tmp/video-frames-${nanoid()}`
      await fs.mkdir(tempDir, { recursive: true })
    }

    // Get video duration first
    const duration = await getVideoDuration(videoPath)
    console.log(`Video duration: ${duration} seconds`)

    // Calculate frame extraction rate
    const frameRate = `1/${Math.floor(1 / framesPerSecond)}`

    // Extract frames using FFmpeg
    const outputPattern = path.join(tempDir, 'frame_%04d.jpg')
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "fps=${frameRate}" -q:v 2 "${outputPattern}"`

    console.log(`Extracting frames with command: ${ffmpegCommand}`)
    await execAsync(ffmpegCommand)

    // Read extracted frames
    const files = await fs.readdir(tempDir)
    const frameFiles = files
      .filter(file => file.startsWith('frame_') && file.endsWith('.jpg'))
      .sort()

    // Calculate timestamps for each frame
    const frames = frameFiles.map((file, index) => {
      const frameNumber = index + 1
      const timestampSeconds = frameNumber / framesPerSecond
      const timestamp = formatTimestamp(timestampSeconds)

      return {
        path: path.join(tempDir, file),
        timestamp,
        frameNumber
      }
    })

    return {
      frames,
      frameCount: frames.length,
      tempDir
    }
  } catch (error) {
    console.error('Frame extraction error:', error)
    // Clean up temp directory on error
    if (tempDir && !outputDir) {
      await cleanupFrames(tempDir).catch(() => {})
    }
    throw new Error(`Failed to extract frames: ${error.message}`)
  }
}

/**
 * Get video duration in seconds
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} Duration in seconds
 */
export async function getVideoDuration(videoPath) {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    const { stdout } = await execAsync(command)
    return parseFloat(stdout.trim())
  } catch (error) {
    console.error('Failed to get video duration:', error)
    // Return default duration if ffprobe fails
    return DEFAULT_VIDEO_DURATION
  }
}

/**
 * Get video metadata (resolution, fps, codec, etc.)
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<{duration: number, width: number, height: number, fps: number}>}
 */
export async function getVideoMetadata(videoPath) {
  try {
    const command = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of json "${videoPath}"`
    const { stdout } = await execAsync(command)
    const data = JSON.parse(stdout)

    const stream = data.streams?.[0] || {}
    
    // Parse frame rate (format: "30000/1001" or "30/1")
    let fps = 30
    if (stream.r_frame_rate) {
      const [num, den] = stream.r_frame_rate.split('/').map(Number)
      fps = num / den
    }

    return {
      duration: parseFloat(stream.duration) || 0,
      width: stream.width || 0,
      height: stream.height || 0,
      fps: Math.round(fps)
    }
  } catch (error) {
    console.error('Failed to get video metadata:', error)
    return {
      duration: 0,
      width: 0,
      height: 0,
      fps: 30
    }
  }
}

/**
 * Format seconds to HH:MM:SS timestamp
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return [hours, minutes, secs]
    .map(val => String(val).padStart(2, '0'))
    .join(':')
}

/**
 * Clean up extracted frames directory
 * @param {string} tempDir - Directory containing extracted frames
 * @returns {Promise<void>}
 */
export async function cleanupFrames(tempDir) {
  try {
    if (tempDir && tempDir.startsWith('/tmp/')) {
      await fs.rm(tempDir, { recursive: true, force: true })
      console.log(`Cleaned up frames directory: ${tempDir}`)
    }
  } catch (error) {
    console.error('Failed to cleanup frames:', error)
    // Don't throw - cleanup is best effort
  }
}

/**
 * Validate video file format
 * @param {string} filePath - Path to video file
 * @returns {Promise<boolean>} True if valid video format
 */
export async function isValidVideoFormat(filePath) {
  try {
    const command = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    const { stdout } = await execAsync(command)
    return stdout.trim() === 'video'
  } catch (error) {
    return false
  }
}
