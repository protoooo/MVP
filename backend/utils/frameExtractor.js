import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import imageHash from 'image-hash'

export async function extractFrames(videoPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    
    ffmpeg(videoPath)
      .outputOptions(['-vf fps=1'])
      .save(path.join(outputDir, 'frame_%04d.jpg'))
      .on('end', () => resolve(outputDir))
      .on('error', (err) => {
        // Provide more helpful error message if ffmpeg is not found
        const errorMsg = err.message || String(err)
        if (errorMsg.includes('ffmpeg') || errorMsg.includes('spawn') || errorMsg.includes('ENOENT')) {
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
