// app/api/tenant-report/generate/route.js
import { NextResponse } from 'next/server'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { CohereClient } from 'cohere-ai'
import PDFDocument from 'pdfkit'
import { createWriteStream } from 'fs'

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
})

// Michigan housing habitability issues
const HABITABILITY_CATEGORIES = {
  'Water Damage': {
    keywords: ['water', 'leak', 'stain', 'moisture', 'damp', 'flood'],
    codes: ['MCL 554.139'],
  },
  'Mold': {
    keywords: ['mold', 'mildew', 'fungus', 'black spots'],
    codes: ['MCL 554.139'],
  },
  'Structural Issues': {
    keywords: ['crack', 'hole', 'damage', 'broken', 'deteriorat'],
    codes: ['MCL 125.401-MCL 125.543'],
  },
  'Electrical Hazards': {
    keywords: ['wiring', 'outlet', 'electrical', 'exposed wire'],
    codes: ['MCL 125.1504a'],
  },
  'Heating/Plumbing': {
    keywords: ['heat', 'cold', 'pipe', 'plumbing', 'water', 'drain'],
    codes: ['MCL 125.530'],
  },
  'Pest Infestation': {
    keywords: ['pest', 'bug', 'rodent', 'insect', 'roach', 'mice', 'rat'],
    codes: ['MCL 554.139'],
  },
  'Security Issues': {
    keywords: ['lock', 'door', 'window', 'broken', 'security'],
    codes: ['MCL 554.139'],
  },
}

async function analyzeImage(imagePath, filename) {
  try {
    const imageBuffer = await readFile(imagePath)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

    const response = await cohere.chat({
      model: 'command-r-plus-08-2024',
      message: `You are a neutral housing condition inspector analyzing a rental property photo for Michigan tenant documentation.

Analyze this image and identify any habitability issues based on Michigan housing standards. Focus on:
- Water damage, leaks, or moisture problems
- Mold or mildew
- Structural damage (cracks, holes, deterioration)
- Electrical hazards
- Heating or plumbing issues
- Pest evidence
- Broken locks or security issues

Provide a factual, neutral assessment. For each issue found:
1. Issue category
2. Severity (High/Medium/Low)
3. Brief factual description (2-3 sentences max)
4. Recommended action

If no issues are visible, state "No apparent habitability issues observed in this image."

Keep language neutral, factual, and professional. Avoid speculation.`,
      temperature: 0.3,
    })

    return response.text || 'Unable to analyze image'
  } catch (error) {
    console.error('Image analysis error:', error)
    return 'Unable to analyze image'
  }
}

function parseAnalysisText(text) {
  const findings = []
  
  // If no issues found
  if (text.toLowerCase().includes('no apparent') || text.toLowerCase().includes('no issues')) {
    return findings
  }

  // Simple parsing logic - look for severity indicators
  const severityPatterns = {
    High: /high severity|high priority|critical|urgent|immediate/gi,
    Medium: /medium severity|moderate|should be addressed/gi,
    Low: /low severity|minor|cosmetic/gi,
  }

  let currentSeverity = 'Medium'
  for (const [severity, pattern] of Object.entries(severityPatterns)) {
    if (pattern.test(text)) {
      currentSeverity = severity
      break
    }
  }

  // Extract category
  let category = 'General Condition'
  for (const [cat, config] of Object.entries(HABITABILITY_CATEGORIES)) {
    for (const keyword of config.keywords) {
      if (text.toLowerCase().includes(keyword)) {
        category = cat
        break
      }
    }
  }

  findings.push({
    category,
    severity: currentSeverity,
    description: text.trim(),
    codes: HABITABILITY_CATEGORIES[category]?.codes || [],
  })

  return findings
}

async function generatePDFReport(findings, photoCount, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const stream = createWriteStream(outputPath)

    doc.pipe(stream)

    // Cover Page
    doc.fontSize(24).text('Michigan Tenant Condition Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' })
    doc.text(`Photos Analyzed: ${photoCount}`, { align: 'center' })
    doc.moveDown(2)

    // Disclaimer
    doc.fontSize(10).fillColor('#666666')
    doc.text('DISCLAIMER: This report documents observed conditions in uploaded photos. It does not constitute legal advice or guarantee any particular outcome. Michigan housing laws and local enforcement may vary. For legal advice, consult a qualified attorney.', {
      align: 'justify',
    })
    doc.fillColor('#000000')
    doc.moveDown(2)

    // Summary
    doc.fontSize(16).text('Summary', { underline: true })
    doc.moveDown()
    doc.fontSize(11).text(`Total Findings: ${findings.length}`)
    
    const highSeverity = findings.filter(f => f.severity === 'High').length
    const mediumSeverity = findings.filter(f => f.severity === 'Medium').length
    const lowSeverity = findings.filter(f => f.severity === 'Low').length
    
    doc.text(`High Severity: ${highSeverity}`)
    doc.text(`Medium Severity: ${mediumSeverity}`)
    doc.text(`Low Severity: ${lowSeverity}`)
    doc.moveDown(2)

    // Findings
    doc.addPage()
    doc.fontSize(16).text('Detailed Findings', { underline: true })
    doc.moveDown()

    if (findings.length === 0) {
      doc.fontSize(11).text('No significant habitability issues were identified in the analyzed photos. This indicates the property appears to meet basic habitability standards based on the provided visual documentation.')
    } else {
      findings.forEach((finding, index) => {
        doc.fontSize(12).fillColor('#000000').text(`${index + 1}. ${finding.category}`, { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(10).fillColor('#666666').text(`Severity: ${finding.severity}`)
        doc.fillColor('#000000')
        doc.fontSize(11).text(finding.description, { align: 'justify' })
        
        if (finding.codes && finding.codes.length > 0) {
          doc.fontSize(9).fillColor('#666666').text(`Michigan Law References: ${finding.codes.join(', ')}`)
        }
        
        doc.moveDown(1.5)
      })
    }

    // Michigan Housing Standards Reference
    doc.addPage()
    doc.fontSize(16).text('Michigan Housing Standards Reference', { underline: true })
    doc.moveDown()
    doc.fontSize(10).text('This report is based on Michigan housing habitability standards including:')
    doc.moveDown(0.5)
    doc.fontSize(9)
    doc.text('• MCL 554.139 - Landlord obligations for fitness and habitability')
    doc.text('• MCL 125.401-125.543 - Housing Law of Michigan (Blight Standards)')
    doc.text('• MCL 125.1504a - Building Code enforcement')
    doc.text('• MCL 125.530 - Minimum standards for heating facilities')
    
    doc.end()

    stream.on('finish', () => resolve(outputPath))
    stream.on('error', reject)
  })
}

export async function POST(request) {
  try {
    const { sessionId, photoCount, stripeSessionId } = await request.json()

    if (!sessionId || !stripeSessionId) {
      return NextResponse.json(
        { error: 'Session ID and Stripe session ID required' },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), 'uploads', sessionId)
    const reportsDir = join(process.cwd(), 'reports')
    
    // Create reports directory if it doesn't exist
    await mkdir(reportsDir, { recursive: true })

    // Update status
    const statusFile = join(reportsDir, `${stripeSessionId}_status.json`)
    await writeFile(statusFile, JSON.stringify({ status: 'processing', progress: 20 }))

    // Read all photos
    if (!existsSync(uploadDir)) {
      await writeFile(statusFile, JSON.stringify({ 
        status: 'error', 
        error: 'Photos not found' 
      }))
      return NextResponse.json({ error: 'Photos not found' }, { status: 404 })
    }

    const files = await readdir(uploadDir)
    const imageFiles = files.filter(f => 
      f.toLowerCase().endsWith('.jpg') || 
      f.toLowerCase().endsWith('.jpeg') || 
      f.toLowerCase().endsWith('.png')
    )

    await writeFile(statusFile, JSON.stringify({ status: 'processing', progress: 30 }))

    // Analyze images
    const allFindings = []
    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i]
      const imagePath = join(uploadDir, filename)
      
      const analysis = await analyzeImage(imagePath, filename)
      const findings = parseAnalysisText(analysis)
      allFindings.push(...findings)

      // Update progress
      const progress = 30 + Math.floor((i / imageFiles.length) * 50)
      await writeFile(statusFile, JSON.stringify({ status: 'processing', progress }))
    }

    await writeFile(statusFile, JSON.stringify({ status: 'processing', progress: 85 }))

    // Generate PDF
    const reportFilename = `tenant_report_${stripeSessionId}.pdf`
    const reportPath = join(reportsDir, reportFilename)
    await generatePDFReport(allFindings, imageFiles.length, reportPath)

    // Final status
    const reportUrl = `/api/tenant-report/download?session_id=${stripeSessionId}`
    await writeFile(statusFile, JSON.stringify({ 
      status: 'completed', 
      progress: 100,
      reportUrl,
    }))

    return NextResponse.json({ 
      success: true,
      reportUrl,
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
