/**
 * PDF Report Generator with MI Health Inspection Branding
 * Generates professional PDF reports for inspection analysis
 */

import PDFDocument from 'pdfkit'
import { uploadFile } from './storage.js'
import { formatTimestamp } from './videoProcessor.js'
import fs from 'fs'
import { nanoid } from 'nanoid'

/**
 * Generate a PDF report for inspection analysis
 * @param {Object} data - Report data
 * @param {string} data.restaurantName - Name of the restaurant
 * @param {string} data.analysisType - Type of analysis ('image' or 'video')
 * @param {Array} data.violations - Array of violations
 * @param {Array} data.timeline - Timeline data for video analysis (optional)
 * @param {Object} data.metadata - Additional metadata
 * @returns {Promise<{pdfUrl: string, pdfPath: string}>}
 */
export async function generateInspectionReport(data) {
  const {
    restaurantName = 'Restaurant',
    analysisType = 'image',
    violations = [],
    timeline = [],
    metadata = {}
  } = data

  try {
    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    })

    // Create temporary file path
    const tempFilePath = `/tmp/report-${nanoid()}.pdf`
    const writeStream = fs.createWriteStream(tempFilePath)
    doc.pipe(writeStream)

    // Add header and branding
    addHeader(doc)

    // Add report title and metadata
    addReportTitle(doc, restaurantName, analysisType)
    addMetadata(doc, metadata)

    // Add violations section
    if (analysisType === 'video' && timeline.length > 0) {
      addTimelineViolations(doc, timeline)
    } else {
      addViolations(doc, violations)
    }

    // Add references section
    addReferences(doc)

    // Add footer
    addFooter(doc)

    // Finalize PDF
    doc.end()

    // Wait for PDF to be written
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    // Upload PDF to Supabase Storage
    const pdfBuffer = await fs.promises.readFile(tempFilePath)
    const uploadResult = await uploadFile(
      pdfBuffer,
      `inspection-report-${Date.now()}.pdf`,
      'analysis-reports',
      'application/pdf'
    )

    // Clean up temporary file
    await fs.promises.unlink(tempFilePath).catch(() => {})

    return {
      pdfUrl: uploadResult.url,
      pdfPath: uploadResult.path
    }
  } catch (error) {
    console.error('PDF generation error:', error)
    throw new Error(`Failed to generate PDF report: ${error.message}`)
  }
}

/**
 * Add header with MI Health Inspection branding
 * @param {PDFDocument} doc - PDF document
 */
function addHeader(doc) {
  // Add logo placeholder (using text for now - logo can be added later)
  doc.fontSize(24)
    .fillColor('#4F7DF3')
    .text('MI Health Inspection', 50, 50)
    .moveDown(0.5)

  // Add tagline
  doc.fontSize(10)
    .fillColor('#475569')
    .text('Michigan Food Safety Compliance Analysis', 50, doc.y)
    .moveDown(1)

  // Add horizontal line
  doc.strokeColor('#E5E7EB')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(562, doc.y)
    .stroke()
    .moveDown(1)
}

/**
 * Add report title and basic info
 * @param {PDFDocument} doc - PDF document
 * @param {string} restaurantName - Restaurant name
 * @param {string} analysisType - Analysis type
 */
function addReportTitle(doc, restaurantName, analysisType) {
  doc.fontSize(18)
    .fillColor('#0F172A')
    .text('Health Inspection Analysis Report', { align: 'center' })
    .moveDown(1)

  doc.fontSize(12)
    .fillColor('#475569')
    .text(`Restaurant: ${restaurantName}`, { align: 'left' })
    .text(`Analysis Type: ${analysisType === 'video' ? 'Video Analysis' : 'Image Analysis'}`)
    .text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
    .moveDown(1.5)
}

/**
 * Add metadata section
 * @param {PDFDocument} doc - PDF document
 * @param {Object} metadata - Metadata object
 */
function addMetadata(doc, metadata) {
  if (Object.keys(metadata).length === 0) return

  doc.fontSize(10)
    .fillColor('#475569')

  if (metadata.imageCount) {
    doc.text(`Images Analyzed: ${metadata.imageCount}`)
  }

  if (metadata.videoDuration) {
    doc.text(`Video Duration: ${formatTimestamp(metadata.videoDuration)}`)
  }

  if (metadata.framesAnalyzed) {
    doc.text(`Frames Analyzed: ${metadata.framesAnalyzed}`)
  }

  doc.moveDown(1)
}

/**
 * Add violations section for image analysis
 * @param {PDFDocument} doc - PDF document
 * @param {Array} violations - Violations array
 */
function addViolations(doc, violations) {
  doc.fontSize(16)
    .fillColor('#0F172A')
    .text('Violations Found', { underline: true })
    .moveDown(1)

  if (violations.length === 0) {
    doc.fontSize(12)
      .fillColor('#475569')
      .text('No violations detected in the analyzed images.')
      .moveDown(2)
    return
  }

  // Group by severity
  const high = violations.filter(v => v.severity === 'High')
  const medium = violations.filter(v => v.severity === 'Medium')
  const low = violations.filter(v => v.severity === 'Low')

  let violationNumber = 1

  // Add high severity violations
  if (high.length > 0) {
    addViolationGroup(doc, 'High Severity', high, violationNumber, '#DC2626')
    violationNumber += high.length
  }

  // Add medium severity violations
  if (medium.length > 0) {
    addViolationGroup(doc, 'Medium Severity', medium, violationNumber, '#F59E0B')
    violationNumber += medium.length
  }

  // Add low severity violations
  if (low.length > 0) {
    addViolationGroup(doc, 'Low Severity', low, violationNumber, '#10B981')
  }
}

/**
 * Add a group of violations with the same severity
 * @param {PDFDocument} doc - PDF document
 * @param {string} title - Group title
 * @param {Array} violations - Violations in this group
 * @param {number} startNumber - Starting violation number
 * @param {string} color - Color for severity indicator
 */
function addViolationGroup(doc, title, violations, startNumber, color) {
  doc.fontSize(14)
    .fillColor(color)
    .text(title, { continued: false })
    .moveDown(0.5)

  violations.forEach((violation, index) => {
    const num = startNumber + index

    // Check if we need a new page
    if (doc.y > 700) {
      doc.addPage()
      addHeader(doc)
    }

    doc.fontSize(12)
      .fillColor('#0F172A')
      .text(`${num}. `, { continued: true, indent: 20 })
      .fillColor('#475569')
      .text(violation.description, { indent: 35 })
      .moveDown(0.3)

    doc.fontSize(10)
      .fillColor('#64748B')
      .text(`Citation: ${violation.citation || 'General Health Code'}`, { indent: 35 })
      .moveDown(0.8)
  })

  doc.moveDown(0.5)
}

/**
 * Add timeline violations for video analysis
 * @param {PDFDocument} doc - PDF document
 * @param {Array} timeline - Timeline array with violations
 */
function addTimelineViolations(doc, timeline) {
  doc.fontSize(16)
    .fillColor('#0F172A')
    .text('Video Timeline Analysis', { underline: true })
    .moveDown(1)

  if (timeline.length === 0) {
    doc.fontSize(12)
      .fillColor('#475569')
      .text('No violations detected in the analyzed video.')
      .moveDown(2)
    return
  }

  timeline.forEach((entry, index) => {
    // Check if we need a new page
    if (doc.y > 680) {
      doc.addPage()
      addHeader(doc)
    }

    doc.fontSize(14)
      .fillColor('#4F7DF3')
      .text(`Timestamp: ${entry.timestamp}`, { indent: 20 })
      .moveDown(0.5)

    if (entry.violations && entry.violations.length > 0) {
      entry.violations.forEach((violation, vIndex) => {
        const severityColor = 
          violation.severity === 'High' ? '#DC2626' :
          violation.severity === 'Medium' ? '#F59E0B' :
          '#10B981'

        doc.fontSize(11)
          .fillColor('#0F172A')
          .text(`• `, { continued: true, indent: 35 })
          .fillColor(severityColor)
          .text(`[${violation.severity}] `, { continued: true })
          .fillColor('#475569')
          .text(violation.description)
          .moveDown(0.2)

        doc.fontSize(9)
          .fillColor('#64748B')
          .text(`Citation: ${violation.citation || 'General Health Code'}`, { indent: 40 })
          .moveDown(0.5)
      })
    } else {
      doc.fontSize(11)
        .fillColor('#475569')
        .text('No violations detected at this timestamp', { indent: 35 })
        .moveDown(0.5)
    }

    doc.moveDown(0.5)
  })
}

/**
 * Add references section
 * @param {PDFDocument} doc - PDF document
 */
function addReferences(doc) {
  // Check if we need a new page
  if (doc.y > 650) {
    doc.addPage()
    addHeader(doc)
  }

  doc.fontSize(14)
    .fillColor('#0F172A')
    .text('References', { underline: true })
    .moveDown(0.5)

  doc.fontSize(10)
    .fillColor('#475569')
    .text('• Michigan Food Law (Public Act 92 of 2000, as amended)')
    .text('• Michigan Modified Food Code')
    .text('• Michigan Department of Agriculture & Rural Development (MDARD)')
    .text('• FDA Food Code')
    .moveDown(1)

  doc.fontSize(9)
    .fillColor('#64748B')
    .text('For official regulations, visit: https://www.michigan.gov/mdard')
    .moveDown(2)
}

/**
 * Add footer to the document
 * @param {PDFDocument} doc - PDF document
 */
function addFooter(doc) {
  const bottomMargin = 50
  const pageHeight = doc.page.height

  doc.fontSize(8)
    .fillColor('#94A3B8')
    .text(
      'This report is for informational purposes only and does not constitute an official health inspection.',
      50,
      pageHeight - bottomMargin - 20,
      { align: 'center', width: 512 }
    )
}

/**
 * Generate a simple summary PDF (for testing)
 * @param {Object} summary - Summary data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateSummaryPDF(summary) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument()
      const chunks = []

      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(18).text('Analysis Summary')
      doc.moveDown()
      doc.fontSize(12).text(JSON.stringify(summary, null, 2))
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
