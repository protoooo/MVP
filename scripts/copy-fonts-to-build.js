#!/usr/bin/env node
/**
 * Post-build script: Copy PDFKit font files to Next.js build output
 * 
 * PDFKit uses fs.readFileSync(__dirname + '/data/Helvetica.afm') to load fonts.
 * In production builds, __dirname points to .next/server/app/api/upload/processSession/
 * So we need to copy fonts to: .next/server/app/api/upload/processSession/data/
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.resolve(__dirname, '..')

// Source: where fonts are stored in the repository
const sourceDir = path.join(projectRoot, 'app', 'api', 'upload', 'processSession', 'data')

// Target: where Next.js bundles the API route handler
const targetDir = path.join(projectRoot, '.next', 'server', 'app', 'api', 'upload', 'processSession', 'data')

try {
  // Check if .next directory exists (build has been run)
  const nextDir = path.join(projectRoot, '.next')
  if (!fs.existsSync(nextDir)) {
    console.log('ℹ️  .next directory not found - skipping font copy (build may not have run yet)')
    process.exit(0)
  }

  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source font directory not found: ${sourceDir}`)
    console.error('   Run "npm install" first to copy fonts from pdfkit to app/api/upload/processSession/data/')
    process.exit(1)
  }

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
    console.log(`📁 Created target directory: ${targetDir}`)
  }

  // Copy all .afm files
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.afm'))
  
  if (files.length === 0) {
    console.warn(`⚠️  No .afm files found in ${sourceDir}`)
    process.exit(0)
  }

  let copiedCount = 0
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file)
    const targetPath = path.join(targetDir, file)
    
    try {
      fs.copyFileSync(sourcePath, targetPath)
      copiedCount++
    } catch (err) {
      console.error(`❌ Failed to copy ${file}:`, err.message)
    }
  })

  console.log(`✅ Copied ${copiedCount}/${files.length} PDFKit font files to ${targetDir}`)
  console.log('   These fonts are required for PDF generation in production')
  
} catch (error) {
  console.error('❌ Error copying fonts to build output:', error.message)
  // Don't fail the build if font copy fails - fonts may be available via other means
  process.exit(0)
}
