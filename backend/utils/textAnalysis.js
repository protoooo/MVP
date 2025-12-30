// backend/utils/textAnalysis.js
// Text-based compliance analysis for documents, logs, checklists, and procedures

import { CohereClient } from 'cohere-ai'

const cohere = process.env.COHERE_API_KEY 
  ? new CohereClient({ token: process.env.COHERE_API_KEY })
  : null

/**
 * Analyze text content for compliance violations
 * Supports: checklists, logs, procedures, large documents
 */
export async function analyzeTextForCompliance(textContent, protocolPack, context = {}) {
  if (!cohere) {
    console.warn('[textAnalysis] Cohere API not configured')
    return {
      violation: null,
      findings: [],
      severity: 'info',
      confidence: 0,
      analyzed: false,
      error: 'AI service not configured',
    }
  }

  try {
    // Chunk large documents (Cohere has token limits)
    const chunks = chunkText(textContent, 4000) // ~4000 chars per chunk
    const allFindings = []

    for (const chunk of chunks) {
      const findings = await analyzeTextChunk(chunk, protocolPack, context)
      allFindings.push(...findings)
    }

    // Aggregate findings
    if (allFindings.length === 0) {
      return {
        violation: null,
        findings: [],
        severity: 'info',
        confidence: 0.95,
        analyzed: true,
        message: 'No compliance violations detected in text',
      }
    }

    // Find highest severity violation
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }
    const highestSeverity = allFindings.reduce((max, finding) => {
      return severityOrder[finding.severity] > severityOrder[max.severity] ? finding : max
    })

    return {
      violation: highestSeverity.description,
      findings: allFindings,
      severity: highestSeverity.severity,
      confidence: highestSeverity.confidence,
      analyzed: true,
      protocol_reference: highestSeverity.protocol_reference,
    }

  } catch (error) {
    console.error('[textAnalysis] Error analyzing text:', error)
    return {
      violation: null,
      findings: [],
      severity: 'info',
      confidence: 0,
      analyzed: false,
      error: error.message,
    }
  }
}

/**
 * Analyze a single text chunk
 */
async function analyzeTextChunk(textChunk, protocolPack, context) {
  const findings = []

  // Build compliance checking prompt
  const prompt = buildCompliancePrompt(textChunk, protocolPack, context)

  try {
    const response = await cohere.chat({
      model: 'command-r-plus',
      message: prompt,
      temperature: 0.3, // Lower temperature for deterministic compliance checking
      max_tokens: 2000,
    })

    const analysisText = response.text

    // Parse AI response for violations
    const violations = parseComplianceResponse(analysisText, protocolPack)
    findings.push(...violations)

  } catch (error) {
    console.error('[textAnalysis] Error in chunk analysis:', error)
  }

  return findings
}

/**
 * Build compliance checking prompt for text analysis
 */
function buildCompliancePrompt(textContent, protocolPack, context) {
  const standards = protocolPack.standards || []
  const standardsList = standards.map(s => 
    `- ${s.code}: ${s.title} (${s.severity})`
  ).join('\n')

  return `You are a compliance auditor for ${protocolPack.name}.

Your task is to analyze the following text content and identify any compliance violations or non-conformities with the established standards.

STANDARDS TO CHECK:
${standardsList}

TEXT CONTENT TO ANALYZE:
${textContent}

CONTEXT:
Location: ${context.location || 'Not specified'}
Timestamp: ${context.timestamp || 'Not specified'}

INSTRUCTIONS:
1. Review the text content carefully
2. Identify specific violations or non-conformities with the standards
3. For each violation found, provide:
   - The specific standard code violated
   - A clear description of the violation
   - The severity level (critical, high, medium, low)
   - Your confidence level (0.0 to 1.0)

4. If no violations are found, respond with "NO VIOLATIONS DETECTED"

5. Format your response as:
VIOLATION: [standard code]
DESCRIPTION: [what is wrong]
SEVERITY: [critical/high/medium/low]
CONFIDENCE: [0.0-1.0]

Provide your analysis now:`
}

/**
 * Parse AI response into structured findings
 */
function parseComplianceResponse(responseText, protocolPack) {
  const findings = []

  if (responseText.includes('NO VIOLATIONS DETECTED')) {
    return findings
  }

  // Parse violation blocks
  const violationBlocks = responseText.split(/VIOLATION:/i).slice(1)

  for (const block of violationBlocks) {
    try {
      const codeMatch = block.match(/^\s*([A-Z0-9\-\.]+)/i)
      const descMatch = block.match(/DESCRIPTION:\s*(.+?)(?=SEVERITY:|$)/is)
      const sevMatch = block.match(/SEVERITY:\s*(critical|high|medium|low)/i)
      const confMatch = block.match(/CONFIDENCE:\s*(0?\.\d+|1\.0|0)/i)

      if (codeMatch && descMatch && sevMatch) {
        const code = codeMatch[1].trim()
        const description = descMatch[1].trim()
        const severity = sevMatch[1].toLowerCase()
        const confidence = confMatch ? parseFloat(confMatch[1]) : 0.7

        findings.push({
          protocol_reference: code,
          description: description,
          severity: severity,
          confidence: confidence,
        })
      }
    } catch (error) {
      console.error('[textAnalysis] Error parsing violation block:', error)
    }
  }

  return findings
}

/**
 * Chunk large text into smaller pieces
 */
function chunkText(text, maxChunkSize = 4000) {
  if (text.length <= maxChunkSize) {
    return [text]
  }

  const chunks = []
  let currentChunk = ''
  const lines = text.split('\n')

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = ''
      }
      
      // If single line is too long, split it
      if (line.length > maxChunkSize) {
        const words = line.split(' ')
        for (const word of words) {
          if (currentChunk.length + word.length + 1 > maxChunkSize) {
            chunks.push(currentChunk)
            currentChunk = word
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word
          }
        }
      } else {
        currentChunk = line
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Extract text from common document formats
 */
export function extractTextFromDocument(documentContent, fileType) {
  // For now, assume documentContent is already text
  // Future: add PDF parsing, DOCX parsing, etc.
  
  if (typeof documentContent === 'string') {
    return documentContent
  }

  // Handle JSON documents (like checklists, forms)
  if (typeof documentContent === 'object') {
    return JSON.stringify(documentContent, null, 2)
  }

  return String(documentContent)
}

/**
 * Analyze checklist completion and compliance
 */
export async function analyzeChecklist(checklistData, protocolPack, context = {}) {
  // Convert checklist to text format
  let textContent = 'CHECKLIST ANALYSIS\n\n'
  
  if (Array.isArray(checklistData.items)) {
    checklistData.items.forEach((item, index) => {
      textContent += `${index + 1}. ${item.question || item.label}\n`
      textContent += `   Status: ${item.completed ? 'COMPLETED' : 'NOT COMPLETED'}\n`
      if (item.response) {
        textContent += `   Response: ${item.response}\n`
      }
      if (item.notes) {
        textContent += `   Notes: ${item.notes}\n`
      }
      textContent += '\n'
    })
  } else {
    textContent += JSON.stringify(checklistData, null, 2)
  }

  return analyzeTextForCompliance(textContent, protocolPack, context)
}

/**
 * Analyze procedure or SOP document
 */
export async function analyzeProcedureDocument(procedureText, protocolPack, context = {}) {
  // Add specific procedure analysis context
  const enhancedContext = {
    ...context,
    document_type: 'procedure',
  }

  return analyzeTextForCompliance(procedureText, protocolPack, enhancedContext)
}
