#!/usr/bin/env node
/**
 * Verify OCR Dependencies
 * Tests if all OCR tools are properly installed and functional
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

const checks = {
  node: false,
  python: false,
  tesseract: false,
  pdftotext: false,
  pdftoppm: false,
  pymupdf: false,
  pytesseract: false,
  pillow: false
}

async function checkCommand(cmd, label) {
  try {
    await execAsync(`which ${cmd}`)
    console.log(`✅ ${label}: installed`)
    return true
  } catch {
    console.log(`❌ ${label}: NOT FOUND`)
    return false
  }
}

async function checkPythonPackage(pkg, importName) {
  try {
    const { stdout } = await execAsync(`python3 -c "import ${importName}; print(${importName}.__version__)"`)
    console.log(`✅ ${pkg}: ${stdout.trim()}`)
    return true
  } catch (error) {
    console.log(`❌ ${pkg}: NOT INSTALLED`)
    return false
  }
}

async function testOCRScript() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'ocr-enhance.py')
    await fs.access(scriptPath)
    console.log(`✅ OCR script: found at ${scriptPath}`)
    
    // Test if script is executable
    const { stdout } = await execAsync(`python3 "${scriptPath}" --help`)
    if (stdout.includes('Extract text from PDF')) {
      console.log('✅ OCR script: functional')
      return true
    }
  } catch (error) {
    console.log(`❌ OCR script: ERROR - ${error.message}`)
  }
  return false
}

async function main() {
  console.log('='.repeat(70))
  console.log('🔍 MI Health Inspection - OCR Verification')
  console.log('='.repeat(70))
  console.log()

  // Check system commands
  console.log('📦 System Commands:')
  checks.node = await checkCommand('node', 'Node.js')
  checks.python = await checkCommand('python3', 'Python 3')
  checks.tesseract = await checkCommand('tesseract', 'Tesseract OCR')
  checks.pdftotext = await checkCommand('pdftotext', 'pdftotext (poppler)')
  checks.pdftoppm = await checkCommand('pdftoppm', 'pdftoppm (poppler)')
  console.log()

  // Check Python packages
  console.log('🐍 Python Packages:')
  checks.pymupdf = await checkPythonPackage('PyMuPDF', 'fitz')
  checks.pytesseract = await checkPythonPackage('pytesseract', 'pytesseract')
  checks.pillow = await checkPythonPackage('Pillow', 'PIL')
  console.log()

  // Check OCR script
  console.log('📜 OCR Script:')
  const scriptOk = await testOCRScript()
  console.log()

  // Summary
  console.log('='.repeat(70))
  console.log('📊 Summary:')
  console.log('='.repeat(70))

  const allChecks = Object.values(checks).every(v => v === true)
  
  if (allChecks && scriptOk) {
    console.log('✅ All OCR dependencies installed and functional!')
    console.log()
    console.log('You can now run document ingestion with OCR support:')
    console.log('  npm run ingest -- --collection michigan --force-ocr')
    process.exit(0)
  } else {
    console.log('⚠️  Some OCR dependencies are missing')
    console.log()
    
    if (!checks.python) {
      console.log('Install Python 3:')
      console.log('  apt-get install python3')
    }
    
    if (!checks.tesseract) {
      console.log('Install Tesseract:')
      console.log('  apt-get install tesseract-ocr')
    }
    
    if (!checks.pdftotext || !checks.pdftoppm) {
      console.log('Install Poppler Utils:')
      console.log('  apt-get install poppler-utils')
    }
    
    if (!checks.pymupdf || !checks.pytesseract || !checks.pillow) {
      console.log('Install Python packages:')
      console.log('  pip3 install PyMuPDF pytesseract Pillow')
    }
    
    console.log()
    console.log('OCR will be disabled until these dependencies are installed.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
