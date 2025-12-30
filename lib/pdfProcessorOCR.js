/**
 * Enhanced PDF Processor with OCR Support
 * Falls back to OCR when native text extraction yields low coverage
 */

import pdf from 'pdf-parse/lib/pdf-parse.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { nanoid } from 'nanoid'

const execAsync = promisify(exec)

// Check if OCR is enabled
const OCR_ENABLED = process.env.ENABLE_OCR !== 'false' // Enabled by default

// Coverage threshold - below this triggers OCR
const LOW_COVERAGE_THRESHOLD = 70

// Expected characters per page for a typical document
const EXPECTED_CHARS_PER_PAGE = 2000

/**
 * Calculate text extraction coverage
 */
function calculateCoverage(text, pageCount) {
  const avgCharsPerPage = text.length / Math.max(1, pageCount)
  return Math.min(100, (avgCharsPerPage / EXPECTED_CHARS_PER_PAGE) * 100)
}

/**
 * Clean extracted text
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract text using native PDF parsing (fast, no OCR)
 */
async function extractNativeText(pdfPath) {
  try {
    const buffer = await fs.readFile(pdfPath)
    const parsed = await pdf(buffer)
    
    const cleanedText = cleanText(parsed.text)
    const coverage = calculateCoverage(cleanedText, parsed.numpages)
    
    return {
      text: cleanedText,
      pageCount: parsed.numpages,
      coverage,
      method: 'native',
      success: true
    }
  } catch (error) {
    console.error('Native extraction failed:', error.message)
    return {
      text: '',
      pageCount: 0,
      coverage: 0,
      method: 'native',
      success: false,
      error: error.message
    }
  }
}

/**
 * Check if OCR tools are available
 */
async function checkOCRAvailable() {
  if (!OCR_ENABLED) {
    return null
  }

  try {
    // Check for pdftotext (poppler-utils)
    await execAsync('which pdftotext')
    return 'pdftotext'
  } catch {
    try {
      // Check for tesseract
      await execAsync('which tesseract')
      return 'tesseract'
    } catch {
      try {
        // Check for Python OCR script
        await execAsync('which python3')
        const scriptPath = path.join(process.cwd(), 'scripts', 'ocr-enhance.py')
        try {
          await fs.access(scriptPath)
          return 'python-ocr'
        } catch {
          return null
        }
      } catch {
        return null
      }
    }
  }
}

/**
 * Extract text using pdftotext (best OCR alternative, faster than Tesseract)
 */
async function extractWithPdftotext(pdfPath) {
  const tempDir = `/tmp/pdf-ocr-${nanoid()}`
  
  try {
    await fs.mkdir(tempDir, { recursive: true })
    const outputPath = path.join(tempDir, 'output.txt')
    
    // Use pdftotext with layout preservation
    await execAsync(`pdftotext -layout "${pdfPath}" "${outputPath}"`)
    
    const text = await fs.readFile(outputPath, 'utf-8')
    const cleanedText = cleanText(text)
    
    // Get page count
    const { stdout: pageInfo } = await execAsync(`pdfinfo "${pdfPath}" | grep "Pages:"`)
    const pageCount = parseInt(pageInfo.match(/\d+/)?.[0] || '0')
    
    const coverage = calculateCoverage(cleanedText, pageCount)
    
    return {
      text: cleanedText,
      pageCount,
      coverage,
      method: 'pdftotext',
      success: true
    }
  } catch (error) {
    console.error('pdftotext extraction failed:', error.message)
    return {
      text: '',
      pageCount: 0,
      coverage: 0,
      method: 'pdftotext',
      success: false,
      error: error.message
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Extract text using Tesseract OCR (slower but works on scanned PDFs)
 */
async function extractWithTesseract(pdfPath) {
  const tempDir = `/tmp/pdf-ocr-${nanoid()}`
  
  try {
    await fs.mkdir(tempDir, { recursive: true })
    
    // Convert PDF to images (one per page)
    console.log('   🖼️  Converting PDF to images...')
    const imagesPattern = path.join(tempDir, 'page')
    await execAsync(`pdftoppm -png "${pdfPath}" "${imagesPattern}"`)
    
    // Get list of generated images
    const files = await fs.readdir(tempDir)
    const imageFiles = files.filter(f => f.endsWith('.png')).sort()
    
    if (imageFiles.length === 0) {
      throw new Error('No images generated from PDF')
    }
    
    console.log(`   📄 Processing ${imageFiles.length} pages with OCR...`)
    
    // OCR each page
    const pageTexts = []
    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = path.join(tempDir, imageFiles[i])
      const outputBase = path.join(tempDir, `ocr-${i}`)
      
      try {
        // Run Tesseract
        await execAsync(`tesseract "${imagePath}" "${outputBase}" --psm 1 --oem 3`)
        
        // Read output
        const ocrText = await fs.readFile(`${outputBase}.txt`, 'utf-8')
        pageTexts.push(ocrText)
        
        // Progress indicator
        if ((i + 1) % 10 === 0 || i === imageFiles.length - 1) {
          console.log(`   📊 OCR progress: ${i + 1}/${imageFiles.length} pages`)
        }
      } catch (err) {
        console.error(`   ⚠️  Page ${i + 1} OCR failed:`, err.message)
        pageTexts.push('')
      }
    }
    
    const fullText = pageTexts.join('\n\n')
    const cleanedText = cleanText(fullText)
    const coverage = calculateCoverage(cleanedText, imageFiles.length)
    
    return {
      text: cleanedText,
      pageCount: imageFiles.length,
      coverage,
      method: 'tesseract',
      success: true
    }
  } catch (error) {
    console.error('Tesseract extraction failed:', error.message)
    return {
      text: '',
      pageCount: 0,
      coverage: 0,
      method: 'tesseract',
      success: false,
      error: error.message
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Extract text using Python OCR script (if available)
 */
async function extractWithPythonOCR(pdfPath) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'ocr-enhance.py')
    
    // Check if script exists
    try {
      await fs.access(scriptPath)
    } catch {
      throw new Error('Python OCR script not found')
    }
    
    console.log('   🐍 Using Python OCR script...')
    const { stdout } = await execAsync(`python3 "${scriptPath}" "${pdfPath}" --json`)
    
    const result = JSON.parse(stdout)
    const cleanedText = cleanText(result.text)
    const coverage = calculateCoverage(cleanedText, result.pages)
    
    return {
      text: cleanedText,
      pageCount: result.pages,
      coverage,
      method: 'python-ocr',
      success: true
    }
  } catch (error) {
    console.error('Python OCR failed:', error.message)
    return {
      text: '',
      pageCount: 0,
      coverage: 0,
      method: 'python-ocr',
      success: false,
      error: error.message
    }
  }
}

/**
 * Main extraction function with automatic OCR fallback
 */
export async function extractPDFText(pdfPath, forceOCR = false) {
  console.log(`\n📄 Extracting text from: ${path.basename(pdfPath)}`)
  
  // Try native extraction first (unless OCR is forced)
  let result = null
  
  if (!forceOCR) {
    console.log('   📖 Attempting native text extraction...')
    result = await extractNativeText(pdfPath)
    
    if (result.success && result.coverage >= LOW_COVERAGE_THRESHOLD) {
      console.log(`   ✅ Native extraction successful (${result.coverage.toFixed(0)}% coverage)`)
      return result
    }
    
    if (result.success && result.coverage > 0) {
      console.log(`   ⚠️  Low coverage detected (${result.coverage.toFixed(0)}%)`)
      console.log('   🔄 Falling back to OCR...')
    } else {
      console.log('   ⚠️  Native extraction failed, trying OCR...')
    }
  } else {
    console.log('   🔄 OCR forced, skipping native extraction...')
  }
  
  // Check if OCR is available
  if (!OCR_ENABLED) {
    console.log('   ⚠️  OCR disabled (set ENABLE_OCR=true to enable)')
    return result || {
      text: '',
      pageCount: 0,
      coverage: 0,
      method: 'none',
      success: false,
      error: 'OCR disabled'
    }
  }

  // Check which OCR tools are available
  const ocrTool = await checkOCRAvailable()
  
  if (!ocrTool) {
    console.error('   ❌ No OCR tools available!')
    console.error('   Install one of:')
    console.error('     - poppler-utils (pdftotext): apt-get install poppler-utils')
    console.error('     - tesseract: apt-get install tesseract-ocr')
    console.error('     - Python packages: pip3 install PyMuPDF pytesseract Pillow')
    return result || {
      text: '',
      pageCount: 0,
      coverage: 0,
      method: 'none',
      success: false,
      error: 'No OCR tools available'
    }
  }
  
  // Try OCR methods in order of preference
  const ocrMethods = []
  
  if (ocrTool === 'pdftotext') {
    ocrMethods.push(extractWithPdftotext)
  }
  
  if (ocrTool === 'python-ocr') {
    ocrMethods.push(extractWithPythonOCR)
  }
  
  if (ocrTool === 'tesseract') {
    ocrMethods.push(extractWithTesseract)
  }
  
  // Try each OCR method
  for (const method of ocrMethods) {
    const ocrResult = await method(pdfPath)
    
    if (ocrResult.success && ocrResult.coverage > (result?.coverage || 0)) {
      result = ocrResult
      
      if (ocrResult.coverage >= LOW_COVERAGE_THRESHOLD) {
        console.log(`   ✅ OCR successful with ${ocrResult.method} (${ocrResult.coverage.toFixed(0)}% coverage)`)
        return result
      }
    }
  }
  
  // Return best result we got
  if (result && result.success) {
    console.log(`   ⚠️  Best extraction: ${result.method} (${result.coverage.toFixed(0)}% coverage)`)
    return result
  }
  
  console.error('   ❌ All extraction methods failed')
  return {
    text: '',
    pageCount: 0,
    coverage: 0,
    method: 'failed',
    success: false,
    error: 'All extraction methods failed'
  }
}

/**
 * Batch process multiple PDFs with progress tracking
 */
export async function batchExtractPDFs(pdfPaths, options = {}) {
  const results = []
  const { forceOCR = false, progressCallback = null } = options
  
  for (let i = 0; i < pdfPaths.length; i++) {
    const result = await extractPDFText(pdfPaths[i], forceOCR)
    results.push({
      path: pdfPaths[i],
      ...result
    })
    
    if (progressCallback) {
      progressCallback(i + 1, pdfPaths.length, result)
    }
  }
  
  return results
}
