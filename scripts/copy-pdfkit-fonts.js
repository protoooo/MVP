#!/usr/bin/env node
/**
 * Copy PDFKit font data files to the API route directory
 * This ensures fonts are available at runtime in production builds
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.resolve(__dirname, '..')
const sourceDir = path.join(projectRoot, 'node_modules', 'pdfkit', 'js', 'data')
const targetDir = path.join(projectRoot, 'app', 'api', 'upload', 'processSession', 'data')

try {
  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.warn(`⚠️  PDFKit font data directory not found at: ${sourceDir}`)
    console.warn('    This may indicate pdfkit is not properly installed.')
    console.warn('    Fonts will need to be available at runtime or PDF generation may fail.')
    process.exit(0)
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  // Copy all .afm files
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.afm'))
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file)
    const targetPath = path.join(targetDir, file)
    fs.copyFileSync(sourcePath, targetPath)
  })

  console.log(`✅ Copied ${files.length} PDFKit font files to ${targetDir}`)
} catch (error) {
  console.error('❌ Error copying PDFKit fonts:', error.message)
  console.error('   Path attempted:', sourceDir, '->', targetDir)
  console.error('   This may cause PDF generation failures at runtime.')
  // Don't fail the build if font copy fails - fonts may be available via other means
  process.exit(0)
}
