import PDFDocument from 'pdfkit'
import { addWatermarkToImage, generateManualVerificationNote } from './exifMetadata'
import fs from 'fs'
import path from 'path'
import os from 'os'

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
    doc.fontSize(32).font('Helvetica-Bold').text('FORENSIC EVIDENCE PACKAGE', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(24).font('Helvetica-Bold').text('Michigan Tenant', { align: 'center' })
    doc.fontSize(24).font('Helvetica-Bold').text('Habitability Report', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica').text('Legal Documentation of Rental Unit Conditions', { align: 'center' })
    doc.moveDown(2)
    
    // Report metadata
    doc.fontSize(11).font('Helvetica')
    doc.text(`Report Date: ${metadata.reportDate || new Date().toLocaleDateString()}`)
    doc.text(`Property Address: ${metadata.propertyAddress || 'Not provided'}`)
    doc.text(`Report ID: ${metadata.tenantIdentifier || 'Anonymous'}`)
    doc.text(`Total Photos Analyzed: ${summary.total_photos}`)
    doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`)
    doc.text(`Expires: ${metadata.expiresAt ? new Date(metadata.expiresAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : '48 hours from generation'}`)
    doc.moveDown(1.5)
    
    // Add burn notice
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc3545')
    doc.text('⚠ PRIVACY NOTICE: This report will be permanently deleted 48 hours after generation.', { align: 'center' })
    doc.text('Download and save your PDF immediately.', { align: 'center' })
    doc.fillColor('#000000').font('Helvetica')
    doc.moveDown(1)
    
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
    doc.moveDown(1)
    
    // === VERIFICATION OF AUTHENTICITY ===
    doc.fontSize(12).font('Helvetica-Bold').text('VERIFICATION OF AUTHENTICITY', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(9).font('Helvetica')
    doc.text(
      'I, the undersigned tenant, verify and affirm under penalty of perjury that:',
      { align: 'justify' }
    )
    doc.moveDown(0.3)
    doc.text(
      `1. The photographs contained in this report were captured at the property located at ${metadata.propertyAddress || '[Property Address]'}.`,
      { align: 'justify' }
    )
    doc.moveDown(0.2)
    doc.text(
      `2. Each photograph was taken on or about the dates shown in the timestamp watermarks, or if timestamps are not available, ` +
      `during the period from ${new Date(Date.now() - 30*24*60*60*1000).toLocaleDateString()} to ${new Date().toLocaleDateString()}.`,
      { align: 'justify' }
    )
    doc.moveDown(0.2)
    doc.text(
      '3. The photographs are accurate representations of the actual conditions present at the property at the time they were taken.',
      { align: 'justify' }
    )
    doc.moveDown(0.2)
    doc.text(
      '4. For photographs containing GPS coordinates, I verify that the coordinates reflect the actual location where the photo was taken.',
      { align: 'justify' }
    )
    doc.moveDown(0.2)
    doc.text(
      '5. For photographs without GPS metadata, I manually verify that the photo was taken at the property address listed above.',
      { align: 'justify' }
    )
    doc.moveDown(0.2)
    doc.text(
      '6. None of the photographs have been materially altered or manipulated in any way that would misrepresent the conditions shown.',
      { align: 'justify' }
    )
    doc.moveDown(1)
    doc.fontSize(8).fillColor('#555555')
    doc.text(
      'Note: Under Michigan Rules of Evidence (MRE 901), photographs may be authenticated by any witness familiar with the scene depicted. ' +
      'This verification serves to establish the photographs as admissible evidence of the property conditions.',
      { align: 'justify' }
    )
    doc.fillColor('#000000')
    doc.moveDown(1.5)
    
    doc.fontSize(9).font('Helvetica')
    doc.text('Tenant Signature: _________________________________    Date: ________________')
    doc.moveDown(0.5)
    doc.text('Printed Name: _________________________________')
    doc.moveDown(2)

    // === EXECUTIVE SUMMARY ===
    doc.addPage()
    doc.fontSize(18).font('Helvetica-Bold').text('Page 1: Executive Summary & Tier Triage')
    doc.moveDown()
    
    // Detroit context statistics
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
    doc.text(
      'CONTEXT: Studies show nearly 90% of evicting landlords in Detroit are not compliant with city codes, ' +
      'and only 10% of Detroit rentals meet full compliance standards. This report helps tenants document ' +
      'violations and assert their legal rights.',
      { align: 'justify' }
    )
    doc.fillColor('#000000')
    doc.moveDown(1)
    
    doc.fontSize(11).font('Helvetica')
    doc.text(`This forensic evidence package documents the analysis of ${summary.total_photos} photograph(s) ` +
             `of a rental unit located at ${metadata.propertyAddress || 'the specified property'}.`)
    doc.moveDown()
    
    // Tier Triage - Severity Classification
    doc.fontSize(12).font('Helvetica-Bold').text('Tier Triage - Issue Classification')
    doc.fontSize(10).font('Helvetica')
    doc.text(`• Total Potential Issues Identified: ${summary.violations_found}`)
    if (summary.clear_violations > 0) {
      doc.fillColor('#dc3545').text(`  - TIER 1 (Clear Violations): ${summary.clear_violations} - Immediate Action Required`)
    }
    if (summary.likely_issues > 0) {
      doc.fillColor('#fd7e14').text(`  - TIER 2 (Likely Issues): ${summary.likely_issues} - Professional Assessment Recommended`)
    }
    if (summary.needs_assessment > 0) {
      doc.fillColor('#ffc107').text(`  - TIER 3 (Requires Assessment): ${summary.needs_assessment} - Further Investigation Needed`)
    }
    doc.fillColor('#000000')
    doc.moveDown()
    
    doc.text(`• Severity Distribution:`)
    if (summary.high_severity > 0) doc.fillColor('#dc3545').text(`  - HIGH PRIORITY: ${summary.high_severity} issues`)
    if (summary.medium_severity > 0) doc.fillColor('#fd7e14').text(`  - MEDIUM PRIORITY: ${summary.medium_severity} issues`)
    if (summary.low_severity > 0) doc.fillColor('#28a745').text(`  - LOW PRIORITY: ${summary.low_severity} issues`)
    doc.fillColor('#000000')
    doc.text(`• Photos with No Issues Detected: ${summary.no_issues}`)
    doc.moveDown()
    
    // Statute Citations Summary
    if (allCitations.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Michigan Statute Citations Referenced')
      doc.fontSize(9).font('Helvetica')
      const uniqueCitations = [...new Set(allCitations.map(c => c.source))]
      uniqueCitations.slice(0, 5).forEach(citation => {
        doc.text(`• ${citation}`)
      })
      doc.moveDown()
    }
    
    // === PAGE 2: FORMAL DEMAND LETTER ===
    doc.addPage()
    doc.fontSize(18).font('Helvetica-Bold').text('Page 2: Formal Demand Letter')
    doc.moveDown(1.5)
    
    doc.fontSize(11).font('Helvetica')
    doc.text(`Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`)
    doc.moveDown()
    doc.text('To: [Landlord Name]')
    doc.text('[Landlord Address]')
    doc.moveDown()
    doc.text('RE: Notice of Habitability Violations and Demand for Repairs')
    doc.text(`Property Address: ${metadata.propertyAddress || '[Property Address]'}`)
    doc.moveDown(1.5)
    
    doc.text('Dear Landlord,', { continued: false })
    doc.moveDown()
    
    doc.text(
      `This letter serves as formal notice that the rental property located at ${metadata.propertyAddress || 'the above address'} ` +
      `has significant habitability violations that require immediate attention and correction. As documented in the attached ` +
      `photographic evidence package dated ${new Date().toLocaleDateString()}, the following issues have been identified:`,
      { align: 'justify' }
    )
    doc.moveDown()
    
    // List key violations
    if (summary.high_severity > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text(`HIGH PRIORITY ISSUES (${summary.high_severity}):`)
      doc.fontSize(10).font('Helvetica')
      violations.filter(v => v.severity === 'high').slice(0, 5).forEach(v => {
        doc.text(`• ${v.violation_type || 'Habitability violation'}: ${v.violation || 'See attached photos'}`)
      })
      doc.moveDown()
    }
    
    if (summary.medium_severity > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text(`MEDIUM PRIORITY ISSUES (${summary.medium_severity}):`)
      doc.fontSize(10).font('Helvetica')
      violations.filter(v => v.severity === 'medium').slice(0, 5).forEach(v => {
        doc.text(`• ${v.violation_type || 'Habitability violation'}`)
      })
      doc.moveDown()
    }
    
    doc.fontSize(10).font('Helvetica').text(
      'Under Michigan law, landlords are required to maintain rental properties in habitable condition and make necessary ' +
      'repairs within a reasonable timeframe. I hereby demand that all identified issues be corrected within the following timeframes:',
      { align: 'justify' }
    )
    doc.moveDown()
    
    doc.text('• Emergency issues (no heat, no water, gas leaks): Within 24 hours')
    doc.text('• Urgent repairs (broken locks, major leaks, structural hazards): Within 72 hours')
    doc.text('• Standard repairs (other habitability violations): Within 30 days')
    doc.moveDown()
    
    doc.text(
      'Please be advised that failure to make the required repairs may result in: (1) rent withholding or escrow, ' +
      '(2) repair and deduct remedies, (3) lease termination, (4) reporting to local housing code enforcement, ' +
      'and/or (5) legal action for damages and attorney fees.',
      { align: 'justify' }
    )
    doc.moveDown()
    
    doc.text(
      'I request that you contact me within 7 days to schedule repairs. Please send all correspondence regarding ' +
      'this matter to the email address on file.',
      { align: 'justify' }
    )
    doc.moveDown(1.5)
    
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('SEND VIA CERTIFIED MAIL, RETURN RECEIPT REQUESTED')
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
    doc.text('Proof of mailing and receipt is critical for legal documentation.')
    doc.fillColor('#000000')
    doc.moveDown(2)
    
    doc.fontSize(10).font('Helvetica')
    doc.text('Sincerely,')
    doc.moveDown(2)
    doc.text('_________________________________')
    doc.text('[Tenant Name]')
    doc.text('[Tenant Signature]')
    doc.text('[Date]')
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
