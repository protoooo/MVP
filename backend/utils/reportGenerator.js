import PDFDocument from 'pdfkit'

// Constants for excerpt lengths
const EXCERPT_LENGTH_JSON = 200
const EXCERPT_LENGTH_PDF = 150

/**
 * Generate a professional compliance report with violations and citations
 * from Michigan food safety regulations
 */
export async function generateReport(sessionId, results) {
  // Categorize results by severity
  const violations = results.filter(r => r.violation && r.severity !== 'info')
  const compliant = results.filter(r => !r.violation || r.severity === 'info')
  
  const summary = {
    total_items_analyzed: results.length,
    violations_found: violations.length,
    compliant_items: compliant.length,
    critical: results.filter((r) => r.severity === 'critical').length,
    major: results.filter((r) => r.severity === 'major').length,
    minor: results.filter((r) => r.severity === 'minor').length,
    info: results.filter((r) => r.severity === 'info' || !r.severity).length,
    overall_status: violations.length === 0 ? 'COMPLIANT' : 
                    results.some(r => r.severity === 'critical') ? 'CRITICAL VIOLATIONS' :
                    results.some(r => r.severity === 'major') ? 'MAJOR VIOLATIONS' : 'MINOR VIOLATIONS'
  }

  // Collect all unique citations
  const allCitations = []
  const citationMap = new Map()
  
  results.forEach(r => {
    if (r.citations && Array.isArray(r.citations)) {
      r.citations.forEach(c => {
        const key = `${c.source}-${c.page}`
        if (!citationMap.has(key)) {
          citationMap.set(key, c)
          allCitations.push(c)
        }
      })
    }
    // Also handle single citation format
    if (r.citation && typeof r.citation === 'string') {
      const key = r.citation
      if (!citationMap.has(key)) {
        citationMap.set(key, { source: r.citation, page: 'N/A' })
        allCitations.push({ source: r.citation, page: 'N/A' })
      }
    }
  })

  const jsonReport = {
    sessionId,
    generatedAt: new Date().toISOString(),
    summary,
    violations: violations.map(v => ({
      media_id: v.media_id,
      violation: v.violation,
      violation_type: v.violation_type || v.type || 'General',
      category: v.category || 'Core',
      severity: v.severity,
      confidence: v.confidence,
      citation: v.citation,
      findings: v.findings || [],
      citations: v.citations || []
    })),
    compliant_items: compliant.length,
    citations_referenced: allCitations.map(c => ({
      source: c.source,
      page: c.page,
      excerpt: c.excerpt?.slice(0, EXCERPT_LENGTH_JSON) || ''
    }))
  }

  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err) => reject(err))

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Food Safety Compliance Report', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica').text('Michigan Food Safety Audit', { align: 'center' })
    doc.moveDown()
    
    // Horizontal line
    doc.strokeColor('#333333').lineWidth(1)
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke()
    doc.moveDown()

    // Report Info
    doc.fontSize(11).font('Helvetica')
    doc.text(`Generated: ${new Date().toLocaleString('en-US', { 
      dateStyle: 'full', 
      timeStyle: 'short' 
    })}`)
    doc.moveDown()

    // Summary Box
    const statusColor = summary.overall_status === 'COMPLIANT' ? '#28a745' :
                        summary.overall_status === 'CRITICAL VIOLATIONS' ? '#dc3545' :
                        summary.overall_status === 'MAJOR VIOLATIONS' ? '#fd7e14' : '#ffc107'
    
    doc.fontSize(14).font('Helvetica-Bold').fillColor(statusColor)
    doc.text(`Status: ${summary.overall_status}`, { align: 'center' })
    doc.fillColor('#000000')
    doc.moveDown()

    // Summary Stats
    doc.fontSize(12).font('Helvetica-Bold').text('Summary')
    doc.fontSize(10).font('Helvetica')
    doc.text(`• Total Items Analyzed: ${summary.total_items_analyzed}`)
    doc.text(`• Violations Found: ${summary.violations_found}`)
    if (summary.critical > 0) doc.fillColor('#dc3545').text(`  - Critical: ${summary.critical}`).fillColor('#000000')
    if (summary.major > 0) doc.fillColor('#fd7e14').text(`  - Major: ${summary.major}`).fillColor('#000000')
    if (summary.minor > 0) doc.fillColor('#ffc107').text(`  - Minor: ${summary.minor}`).fillColor('#000000')
    doc.text(`• Compliant Items: ${summary.compliant_items}`)
    doc.moveDown()

    // Violations Section
    if (violations.length > 0) {
      doc.strokeColor('#333333').lineWidth(0.5)
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke()
      doc.moveDown()
      
      doc.fontSize(14).font('Helvetica-Bold').text('Violations Identified')
      doc.moveDown(0.5)

      violations.forEach((v, idx) => {
        // Severity color
        const sevColor = v.severity === 'critical' ? '#dc3545' :
                        v.severity === 'major' ? '#fd7e14' : '#ffc107'
        
        doc.fontSize(11).font('Helvetica-Bold')
        doc.text(`${idx + 1}. `, { continued: true })
        doc.fillColor(sevColor).text(`[${(v.severity || 'minor').toUpperCase()}]`, { continued: true })
        doc.fillColor('#000000').text(` ${v.violation_type || v.type || 'General'} - ${v.category || 'Core'}`)
        
        doc.fontSize(10).font('Helvetica')
        
        // Main violation description
        if (v.violation) {
          doc.text(`   Finding: ${v.violation}`)
        }
        
        // Detailed findings (avoid redundant first bullet if it repeats the violation)
        if (v.findings && v.findings.length > 0) {
          v.findings.forEach((f, fIdx) => {
            // Skip first finding if it's redundant with the violation description
            if (fIdx === 0 && v.violation && f.description && 
                v.violation.toLowerCase().includes(f.description.toLowerCase().slice(0, 30))) {
              // Skip redundant first finding
              return
            }
            if (f.description) doc.text(`   • ${f.description}`)
            if (f.location) doc.text(`     Location: ${f.location}`)
            if (f.concern) doc.text(`     Concern: ${f.concern}`)
          })
        }
        
        // Inline citations with excerpts (immediately after violation)
        if (v.citations && v.citations.length > 0) {
          doc.font('Helvetica-Bold').text('   Regulatory References:')
          doc.font('Helvetica')
          v.citations.slice(0, 3).forEach(c => {
            doc.text(`   • ${c.source}${c.page && c.page !== 'N/A' ? ` (p. ${c.page})` : ''}`)
            if (c.excerpt) {
              const excerpt = c.excerpt.slice(0, EXCERPT_LENGTH_PDF).replace(/\s+/g, ' ').trim()
              doc.fontSize(9).fillColor('#666666')
              doc.text(`     "${excerpt}..."`, { width: 450 })
              doc.fontSize(10).fillColor('#000000')
            }
          })
        } else if (v.citation) {
          // Fallback to old citation format if new format not available
          doc.font('Helvetica-Oblique').text(`   Citation: ${v.citation}`)
          doc.font('Helvetica')
        }
        
        // Confidence score
        if (v.confidence) {
          doc.fillColor('#666666').text(`   Confidence: ${(v.confidence * 100).toFixed(0)}%`)
          doc.fillColor('#000000')
        }
        
        doc.moveDown(0.5)
      })
    } else {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#28a745')
      doc.text('✓ No Violations Found', { align: 'center' })
      doc.fillColor('#000000')
      doc.moveDown()
      doc.fontSize(10).font('Helvetica')
      doc.text('All analyzed items appear to be in compliance with Michigan food safety regulations.', { align: 'center' })
    }
    
    doc.moveDown()

    // Compliant Items Summary (if violations exist, add brief compliant summary)
    if (violations.length > 0 && compliant.length > 0) {
      doc.strokeColor('#333333').lineWidth(0.5)
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke()
      doc.moveDown()
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#28a745').text('✓ Compliant Areas')
      doc.fillColor('#000000')
      doc.moveDown(0.5)
      doc.fontSize(10).font('Helvetica')
      
      // Generate summary of compliant categories
      const compliantCategories = new Set()
      compliant.forEach(c => {
        if (c.overall_assessment) {
          compliantCategories.add(c.overall_assessment)
        } else if (c.area) {
          compliantCategories.add(c.area)
        }
      })
      
      if (compliantCategories.size > 0) {
        const summary = Array.from(compliantCategories).slice(0, 5).join(', ')
        doc.text(`${compliant.length} item${compliant.length !== 1 ? 's' : ''} reviewed with no violations detected. These areas appear to be in good standing: ${summary}.`)
      } else {
        doc.text(`${compliant.length} item${compliant.length !== 1 ? 's' : ''} reviewed with no violations detected.`)
      }
      doc.moveDown()
    }

    // Footer
    doc.moveDown(2)
    doc.strokeColor('#333333').lineWidth(0.5)
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke()
    doc.moveDown(0.5)
    doc.fontSize(8).fillColor('#666666')
    doc.text('This report was generated by ProtocolLM, a food safety compliance analysis tool.', { align: 'center' })
    doc.text('This is a preliminary assessment and should not replace official health department inspections.', { align: 'center' })
    doc.fillColor('#000000')

    doc.end()
  })

  return { jsonReport, pdfBuffer }
}
