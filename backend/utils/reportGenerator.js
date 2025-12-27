import PDFDocument from 'pdfkit'

export async function generateReport(sessionId, results) {
  const summary = {
    critical: results.filter((r) => r.severity === 'critical').length,
    minor: results.filter((r) => r.severity === 'minor').length,
    info: results.filter((r) => r.severity === 'info').length,
  }

  const jsonReport = {
    sessionId,
    generatedAt: new Date().toISOString(),
    summary,
    violations: results,
  }

  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err) => reject(err))

    doc.fontSize(20).text('Compliance Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(12).text(`Session: ${sessionId}`)
    doc.text(`Generated: ${new Date().toLocaleString()}`)
    doc.moveDown()

    results.forEach((r, idx) => {
      doc.fontSize(12).text(`Item ${idx + 1}`)
      if (r.media_id) doc.text(`Media ID: ${r.media_id}`)
      doc.text(`Finding: ${r.violation}`)
      if (r.citation) doc.text(`Citation: ${r.citation}`)
      if (r.severity) doc.text(`Severity: ${r.severity}`)
      if (r.confidence) doc.text(`Confidence: ${(r.confidence * 100).toFixed(1)}%`)
      doc.moveDown()
    })

    doc.fontSize(14).text('Summary')
    doc.fontSize(12).text(JSON.stringify(summary, null, 2))
    doc.end()
  })

  return { jsonReport, pdfBuffer }
}
