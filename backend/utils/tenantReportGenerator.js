import PDFDocument from 'pdfkit'

// Constants
const EXCERPT_LENGTH_JSON = 200
const EXCERPT_LENGTH_PDF = 150

/**
 * Generate a professional tenant condition report for Michigan rental units
 * Includes habitability violations, tenant rights, and landlord obligations
 */
export async function generateTenantReport(sessionId, results, metadata = {}) {
  // Categorize results by severity and confidence
  const violations = results.filter(r => r.violation && r.severity !== 'info')
  const noIssues = results.filter(r => !r.violation || r.severity === 'info')
  
  // Categorize by confidence level
  const clearViolations = violations.filter(r => r.confidence_level === 'clear_violation')
  const likelyIssues = violations.filter(r => r.confidence_level === 'likely_issue')
  const needsAssessment = violations.filter(r => r.confidence_level === 'requires_assessment')
  
  const summary = {
    total_photos: results.length,
    violations_found: violations.length,
    clear_violations: clearViolations.length,
    likely_issues: likelyIssues.length,
    needs_assessment: needsAssessment.length,
    no_issues: noIssues.length,
    high_severity: violations.filter(r => r.severity === 'high').length,
    medium_severity: violations.filter(r => r.severity === 'medium').length,
    low_severity: violations.filter(r => r.severity === 'low').length,
  }

  // Group violations by room/area
  const violationsByRoom = {}
  violations.forEach(v => {
    const room = v.room_area || 'General'
    if (!violationsByRoom[room]) {
      violationsByRoom[room] = []
    }
    violationsByRoom[room].push(v)
  })

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
    if (r.citation && typeof r.citation === 'string') {
      const key = r.citation
      if (!citationMap.has(key)) {
        citationMap.set(key, { source: r.citation, page: 'N/A' })
        allCitations.push({ source: r.citation, page: 'N/A' })
      }
    }
  })

  const jsonReport = {
    reportType: 'tenant_condition_report',
    sessionId,
    generatedAt: new Date().toISOString(),
    metadata: {
      reportDate: metadata.reportDate || new Date().toLocaleDateString(),
      tenantIdentifier: metadata.tenantIdentifier || 'Anonymous',
      propertyAddress: metadata.propertyAddress || 'Not provided',
      totalPhotos: summary.total_photos
    },
    summary,
    violations: violations.map(v => ({
      media_id: v.media_id,
      violation: v.violation,
      violation_type: v.violation_type || 'General Habitability',
      severity: v.severity,
      confidence: v.confidence,
      confidence_level: v.confidence_level,
      room_area: v.room_area,
      landlord_action_required: v.findings?.[0]?.landlord_action_required || 'Address and repair this issue',
      citation: v.citation,
      findings: v.findings || [],
      citations: v.citations || []
    })),
    violations_by_room: violationsByRoom,
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

    // === COVER PAGE ===
    doc.fontSize(28).font('Helvetica-Bold').text('Michigan Tenant', { align: 'center' })
    doc.fontSize(28).font('Helvetica-Bold').text('Condition Report', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica').text('Habitability Inspection & Documentation', { align: 'center' })
    doc.moveDown(2)
    
    // Report metadata
    doc.fontSize(11).font('Helvetica')
    doc.text(`Report Date: ${metadata.reportDate || new Date().toLocaleDateString()}`)
    doc.text(`Property: ${metadata.propertyAddress || 'Not provided'}`)
    doc.text(`Report ID: ${metadata.tenantIdentifier || 'Anonymous'}`)
    doc.text(`Total Photos Analyzed: ${summary.total_photos}`)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`)
    doc.moveDown(2)
    
    // Horizontal line
    doc.strokeColor('#333333').lineWidth(1)
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke()
    doc.moveDown()

    // === DISCLAIMER ===
    doc.fontSize(10).font('Helvetica-Bold').text('IMPORTANT DISCLAIMER', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(9).font('Helvetica').fillColor('#333333')
    doc.text(
      'This report is a documentation tool that analyzes visible conditions in photographs of a rental unit. ' +
      'It is NOT legal advice and does not create an attorney-client relationship. The findings are based on ' +
      'AI analysis of photographs and may not capture all issues. Tenants should consult with a qualified attorney ' +
      'or local housing authority for legal advice. This report analyzes VISIBLE conditions only and cannot detect ' +
      'issues like heating/cooling functionality, hot water, working electrical outlets, gas leaks, or other non-visible problems.',
      { align: 'justify' }
    )
    doc.fillColor('#000000')
    doc.moveDown(2)

    // === EXECUTIVE SUMMARY ===
    doc.addPage()
    doc.fontSize(16).font('Helvetica-Bold').text('Executive Summary')
    doc.moveDown()
    
    doc.fontSize(11).font('Helvetica')
    doc.text(`This report documents the analysis of ${summary.total_photos} photograph(s) of a rental unit in Michigan.`)
    doc.moveDown()
    
    // Summary stats
    doc.fontSize(12).font('Helvetica-Bold').text('Findings Summary')
    doc.fontSize(10).font('Helvetica')
    doc.text(`• Total Potential Issues Identified: ${summary.violations_found}`)
    if (summary.clear_violations > 0) {
      doc.fillColor('#dc3545').text(`  - Clear Violations: ${summary.clear_violations}`)
    }
    if (summary.likely_issues > 0) {
      doc.fillColor('#fd7e14').text(`  - Likely Issues: ${summary.likely_issues}`)
    }
    if (summary.needs_assessment > 0) {
      doc.fillColor('#ffc107').text(`  - Requires Professional Assessment: ${summary.needs_assessment}`)
    }
    doc.fillColor('#000000')
    doc.moveDown()
    
    doc.text(`• Severity Distribution:`)
    if (summary.high_severity > 0) doc.text(`  - High: ${summary.high_severity}`)
    if (summary.medium_severity > 0) doc.text(`  - Medium: ${summary.medium_severity}`)
    if (summary.low_severity > 0) doc.text(`  - Low: ${summary.low_severity}`)
    doc.text(`• Photos with No Issues: ${summary.no_issues}`)
    doc.moveDown()

    // === VIOLATIONS BY ROOM/AREA ===
    if (violations.length > 0) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text('Identified Issues by Location')
      doc.moveDown()

      Object.keys(violationsByRoom).sort().forEach(room => {
        const roomViolations = violationsByRoom[room]
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c3e50')
        doc.text(room.toUpperCase())
        doc.fillColor('#000000')
        doc.moveDown(0.3)

        roomViolations.forEach((v, idx) => {
          // Confidence level indicator
          const confidenceColor = v.confidence_level === 'clear_violation' ? '#dc3545' :
                                   v.confidence_level === 'likely_issue' ? '#fd7e14' : '#ffc107'
          const confidenceLabel = v.confidence_level === 'clear_violation' ? 'CLEAR VIOLATION' :
                                  v.confidence_level === 'likely_issue' ? 'LIKELY ISSUE' : 'NEEDS ASSESSMENT'
          
          doc.fontSize(11).font('Helvetica-Bold')
          doc.fillColor(confidenceColor).text(`[${confidenceLabel}]`, { continued: true })
          doc.fillColor('#000000').text(` ${v.violation_type || 'General Habitability'}`)
          
          doc.fontSize(10).font('Helvetica')
          
          // Issue description
          if (v.violation) {
            doc.text(`Observed: ${v.violation}`)
          }
          
          // Severity
          const sevColor = v.severity === 'high' ? '#dc3545' :
                          v.severity === 'medium' ? '#fd7e14' : '#28a745'
          doc.fillColor(sevColor).text(`Severity: ${(v.severity || 'medium').toUpperCase()}`)
          doc.fillColor('#000000')
          
          // Landlord action required
          if (v.findings && v.findings.length > 0 && v.findings[0].landlord_action_required) {
            doc.font('Helvetica-Bold').text('Required Landlord Action:')
            doc.font('Helvetica').text(`  ${v.findings[0].landlord_action_required}`)
          }
          
          // Legal references
          if (v.citations && v.citations.length > 0) {
            doc.font('Helvetica-Bold').text('Legal Requirements:')
            doc.font('Helvetica')
            v.citations.slice(0, 2).forEach(c => {
              doc.text(`  • ${c.source}${c.page && c.page !== 'N/A' ? ` (p. ${c.page})` : ''}`)
              if (c.excerpt) {
                const excerpt = c.excerpt.slice(0, EXCERPT_LENGTH_PDF).replace(/\s+/g, ' ').trim()
                doc.fontSize(9).fillColor('#555555')
                doc.text(`    "${excerpt}..."`, { width: 450 })
                doc.fontSize(10).fillColor('#000000')
              }
            })
          }
          
          doc.moveDown(0.5)
        })
        
        doc.moveDown()
      })
    }

    // === LANDLORD OBLIGATIONS & TIMELINES ===
    doc.addPage()
    doc.fontSize(16).font('Helvetica-Bold').text('Landlord Obligations Under Michigan Law')
    doc.moveDown()
    
    doc.fontSize(10).font('Helvetica')
    doc.text(
      'Under Michigan law, landlords have specific obligations to maintain rental units in habitable condition. ' +
      'The following outlines general requirements based on the issues identified in this report.',
      { align: 'justify' }
    )
    doc.moveDown()
    
    // General timeline requirements
    doc.fontSize(12).font('Helvetica-Bold').text('Response Timelines:')
    doc.fontSize(10).font('Helvetica')
    doc.text('• Emergency Issues (no heat, no water, gas leak): 24 hours')
    doc.text('• Urgent Repairs (broken locks, major leaks): 72 hours')
    doc.text('• Standard Repairs (minor issues): Reasonable time (typically 30 days)')
    doc.text('• Routine Maintenance: As needed to prevent habitability violations')
    doc.moveDown()
    
    doc.fontSize(12).font('Helvetica-Bold').text('Tenant Rights:')
    doc.fontSize(10).font('Helvetica')
    doc.text('• Withhold rent if landlord fails to make necessary repairs (with proper legal process)')
    doc.text('• Repair and deduct costs from rent (subject to specific legal requirements)')
    doc.text('• Report violations to local housing code enforcement')
    doc.text('• Terminate lease for serious habitability violations')
    doc.text('• Sue for damages resulting from uninhabitable conditions')
    doc.moveDown()

    // === CONSEQUENCES IF NOT CORRECTED ===
    doc.addPage()
    doc.fontSize(16).font('Helvetica-Bold').text('Consequences if Issues Are Not Corrected')
    doc.moveDown()
    
    doc.fontSize(10).font('Helvetica')
    doc.text('If the landlord fails to address the identified habitability violations, potential consequences include:')
    doc.moveDown(0.5)
    
    doc.text('• Rent Abatement: Tenant may be entitled to reduced rent')
    doc.text('• Repair and Deduct: Tenant may repair and deduct costs from rent')
    doc.text('• Lease Termination: Tenant may terminate lease without penalty')
    doc.text('• Code Enforcement: Local authorities may issue citations or fines')
    doc.text('• Housing Court: Tenant may file lawsuit for damages')
    doc.text('• Health Department Action: For health/safety violations')
    doc.moveDown()
    
    doc.fillColor('#666666').fontSize(9)
    doc.text(
      'Note: Before taking any action, tenants should provide written notice to the landlord ' +
      'and consult with a qualified attorney or local tenant rights organization.',
      { align: 'justify' }
    )
    doc.fillColor('#000000').fontSize(10)
    doc.moveDown()

    // === NON-VISIBLE ISSUES CHECKLIST ===
    doc.addPage()
    doc.fontSize(16).font('Helvetica-Bold').text('Additional Issues Checklist')
    doc.moveDown()
    
    doc.fontSize(10).font('Helvetica')
    doc.text(
      'This report analyzed VISIBLE conditions from photographs. The following common habitability issues ' +
      'CANNOT be detected from photos alone. Please review and note any additional issues:',
      { align: 'justify' }
    )
    doc.moveDown()
    
    doc.fontSize(11).font('Helvetica-Bold').text('Issues Not Detected by Photos:')
    doc.fontSize(10).font('Helvetica')
    doc.text('☐ Heat/HVAC not working or inadequate')
    doc.text('☐ No hot water or inadequate hot water')
    doc.text('☐ Electrical outlets not working')
    doc.text('☐ Gas leaks or gas smell')
    doc.text('☐ Poor ventilation (no visible mold/damage)')
    doc.text('☐ Excessive noise from neighbors or outside')
    doc.text('☐ Pest infestations not visible in photos')
    doc.text('☐ Security concerns (neighborhood issues)')
    doc.text('☐ Inadequate lighting')
    doc.text('☐ Water pressure issues')
    doc.moveDown()
    
    doc.fillColor('#666666').fontSize(9)
    doc.text(
      'If you have any of these issues, document them separately and include in your communication with the landlord.',
      { align: 'justify' }
    )
    doc.fillColor('#000000').fontSize(10)

    // === MICHIGAN TENANT RESOURCES ===
    doc.addPage()
    doc.fontSize(16).font('Helvetica-Bold').text('Michigan Tenant Resources')
    doc.moveDown()
    
    doc.fontSize(11).font('Helvetica-Bold').text('Legal Aid & Tenant Organizations:')
    doc.fontSize(10).font('Helvetica')
    doc.text('• Michigan Legal Help: www.michiganlegalhelp.org')
    doc.text('• Legal Services of South Central Michigan')
    doc.text('• Detroit Metro Fair Housing Center')
    doc.text('• Michigan Poverty Law Program')
    doc.moveDown()
    
    doc.fontSize(11).font('Helvetica-Bold').text('Government Resources:')
    doc.fontSize(10).font('Helvetica')
    doc.text('• Local Building/Housing Code Enforcement Office')
    doc.text('• Michigan Department of Health and Human Services')
    doc.text('• Local Health Department')
    doc.moveDown()
    
    doc.fontSize(11).font('Helvetica-Bold').text('Important Michigan Laws:')
    doc.fontSize(10).font('Helvetica')
    doc.text('• Michigan Truth in Renting Act (MCL 554.601-554.616)')
    doc.text('• Michigan Landlord-Tenant Law')
    doc.text('• State Housing Development Authority (MSHDA) codes')
    doc.text('• Local city/county housing ordinances')

    // === LEGAL CITATIONS APPENDIX ===
    if (allCitations.length > 0) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text('Legal Citations Referenced')
      doc.moveDown()
      
      doc.fontSize(9).font('Helvetica')
      allCitations.slice(0, 10).forEach((c, idx) => {
        doc.fontSize(10).font('Helvetica-Bold')
        doc.text(`${idx + 1}. ${c.source}${c.page && c.page !== 'N/A' ? ` (p. ${c.page})` : ''}`)
        doc.fontSize(9).font('Helvetica')
        if (c.excerpt) {
          doc.text(c.excerpt.slice(0, 400).replace(/\s+/g, ' ').trim() + '...', { align: 'justify' })
        }
        doc.moveDown(0.5)
      })
    }

    // === FINAL PAGE - HOW TO USE THIS REPORT ===
    doc.addPage()
    doc.fontSize(16).font('Helvetica-Bold').text('How to Use This Report')
    doc.moveDown()
    
    doc.fontSize(10).font('Helvetica')
    doc.text('1. Review all identified issues and their severity levels')
    doc.text('2. Document any additional non-visible issues from the checklist')
    doc.text('3. Send written notice to your landlord describing all issues')
    doc.text('4. Keep copies of all communications and this report')
    doc.text('5. Allow reasonable time for landlord to respond and repair')
    doc.text('6. If issues persist, contact local code enforcement or legal aid')
    doc.text('7. Consider consulting with a tenant rights attorney')
    doc.moveDown()
    
    doc.fillColor('#dc3545').fontSize(11).font('Helvetica-Bold')
    doc.text('REMEMBER: This is documentation, not legal advice. Consult an attorney before taking legal action.')
    doc.fillColor('#000000')
    
    // Footer on last page
    doc.moveDown(2)
    doc.fontSize(8).fillColor('#999999').text(
      `Report ID: ${sessionId} | Generated: ${new Date().toISOString()}`,
      50, doc.page.height - 70,
      { align: 'center' }
    )

    doc.end()
  })

  return { jsonReport, pdfBuffer }
}
