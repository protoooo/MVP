const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

function generateReport(sessionId, results) {
    const summary = {
        critical: results.filter(r => r.severity==='critical').length,
        minor: results.filter(r => r.severity==='minor').length,
        info: results.filter(r => r.severity==='info').length
    };

    const jsonReport = {
        sessionId,
        violations: results,
        summary
    };

    // Generate PDF
    const pdfPath = path.join(__dirname, `../reports/${sessionId}.pdf`);
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.fontSize(20).text('Compliance Report', { align: 'center' });
    doc.fontSize(12).moveDown();

    results.forEach(r => {
        doc.text(`Media ID: ${r.media_id}`);
        doc.text(`Violation: ${r.violation}`);
        doc.text(`Citation: ${r.citation}`);
        doc.text(`Severity: ${r.severity}`);
        doc.text(`Confidence: ${r.confidence}`);
        doc.moveDown();
    });

    doc.text('Summary:');
    doc.text(JSON.stringify(summary, null, 2));
    doc.end();

    return { jsonReport, pdfPath };
}

module.exports = { generateReport };
