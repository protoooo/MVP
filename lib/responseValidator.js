// lib/responseValidator.js
// Validates AI responses to prevent hallucinations

export class ResponseValidator {
  constructor() {
    // Regulatory patterns that should ALWAYS have citations
    this.requiresCitation = [
      /\d+\s*°[FC]/i,                    // Temperatures
      /\d+\s*(hour|minute|day)/i,         // Time periods
      /\d+\s*ppm/i,                       // Chemical concentrations
      /shall|must|required|prohibited/i,  // Regulatory language
      /violation|critical|non-critical/i, // Violation terms
      /minimum|maximum|at least/i         // Specific limits
    ]
    
    // Phrases that indicate uncertainty (GOOD - shows appropriate caution)
    this.uncertaintyIndicators = [
      'cannot find',
      'do not directly address',
      'not specifically mentioned',
      'should verify',
      'recommend checking',
      'consult with',
      'general principle',
      'based on similar'
    ]
    
    // Red flags for potential hallucinations
    this.hallucinationFlags = [
      /section \d+\.\d+/i,              // Section numbers without citations
      /chapter \d+/i,                    // Chapter references without source
      /according to the (code|regulation)/i, // Vague references
      /typically|usually|generally.*\d+/i,   // Hedged specific numbers
      /it is known that/i,               // Vague authority claims
      /standard practice.*\d+/i          // Unsubstantiated standards
    ]
  }

  // Main validation function
  validate(response, retrievedContext) {
    const issues = []
    const warnings = []
    let confidenceLevel = 'MEDIUM'

    // 1. Check if response makes regulatory claims
    const hasRegulatoryClaims = this.requiresCitation.some(pattern => 
      pattern.test(response)
    )

    // 2. Extract citations
    const citations = this.extractCitations(response)
    const hasCitations = citations.length > 0

    // 3. Check for uncertainty acknowledgment
    const acknowledgesUncertainty = this.uncertaintyIndicators.some(phrase =>
      response.toLowerCase().includes(phrase)
    )

    // 4. Check for hallucination red flags
    const hallucinationMatches = this.hallucinationFlags.filter(pattern =>
      pattern.test(response)
    )

    // VALIDATION LOGIC
    if (hasRegulatoryClaims && !hasCitations && !acknowledgesUncertainty) {
      issues.push({
        type: 'MISSING_CITATIONS',
        severity: 'CRITICAL',
        message: 'Response makes specific regulatory claims without citations or uncertainty acknowledgment'
      })
      confidenceLevel = 'LOW'
    }

    if (hallucinationMatches.length > 0) {
      issues.push({
        type: 'POTENTIAL_HALLUCINATION',
        severity: 'HIGH',
        message: 'Response contains patterns associated with hallucinations',
        patterns: hallucinationMatches.map(p => p.toString())
      })
      confidenceLevel = 'LOW'
    }

    // Check if citations match retrieved context
    if (hasCitations && retrievedContext) {
      const citationValidation = this.validateCitations(citations, retrievedContext)
      if (!citationValidation.allValid) {
        warnings.push({
          type: 'UNVERIFIED_CITATIONS',
          severity: 'MEDIUM',
          message: 'Some citations could not be verified in retrieved context',
          unverified: citationValidation.unverified
        })
      }
    }

    // Check if response is appropriately cautious
    if (!retrievedContext || retrievedContext.length === 0) {
      if (!acknowledgesUncertainty) {
        issues.push({
          type: 'INSUFFICIENT_CAUTION',
          severity: 'HIGH',
          message: 'No context retrieved but response does not acknowledge limitations'
        })
        confidenceLevel = 'LOW'
      }
    }

    // Check for specific numbers without context
    const numberMatches = response.match(/\d+\s*°[FC]|\d+\s*(hour|minute|day)|\d+\s*ppm/gi) || []
    if (numberMatches.length > 0 && citations.length === 0 && !acknowledgesUncertainty) {
      issues.push({
        type: 'UNCITED_SPECIFICATIONS',
        severity: 'CRITICAL',
        message: `Specific measurements without citations: ${numberMatches.join(', ')}`
      })
      confidenceLevel = 'LOW'
    }

    // Positive indicators
    if (hasCitations && citations.length >= 2) {
      confidenceLevel = 'HIGH'
    }

    if (acknowledgesUncertainty && citations.length > 0) {
      warnings.push({
        type: 'APPROPRIATE_CAUTION',
        severity: 'INFO',
        message: 'Response appropriately acknowledges limitations while providing cited information'
      })
    }

    return {
      isValid: issues.length === 0,
      confidenceLevel,
      issues,
      warnings,
      citationCount: citations.length,
      hasUncertaintyAcknowledgment: acknowledgesUncertainty
    }
  }

  // Extract all citations from response
  extractCitations(response) {
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    const citations = []
    let match

    while ((match = citationRegex.exec(response)) !== null) {
      citations.push({
        document: match[1],
        pages: match[2],
        fullMatch: match[0]
      })
    }

    return citations
  }

  // Validate that citations exist in retrieved context
  validateCitations(citations, contextText) {
    const unverified = []
    let validCount = 0

    for (const citation of citations) {
      // Check if the cited document appears in context
      const documentMentioned = contextText.includes(citation.document)
      
      if (documentMentioned) {
        validCount++
      } else {
        unverified.push(citation.document)
      }
    }

    return {
      allValid: unverified.length === 0,
      validCount,
      totalCount: citations.length,
      unverified
    }
  }

  // Generate user-facing confidence message
  generateConfidenceMessage(validationResult) {
    const { confidenceLevel, citationCount, hasUncertaintyAcknowledgment } = validationResult

    if (confidenceLevel === 'HIGH' && citationCount >= 2) {
      return '✓ High confidence - Multiple regulations cited'
    }

    if (confidenceLevel === 'MEDIUM' && citationCount >= 1) {
      return '→ Moderate confidence - Some regulations cited'
    }

    if (hasUncertaintyAcknowledgment) {
      return '⚠ Limited information - Verification recommended'
    }

    return '⚠ Low confidence - Please verify with inspector'
  }

  // Create amended response if validation fails
  amendResponse(originalResponse, validationResult) {
    if (validationResult.isValid) {
      return originalResponse
    }

    let amendment = '\n\n---\n**⚠️ IMPORTANT NOTICE:**\n'

    for (const issue of validationResult.issues) {
      if (issue.severity === 'CRITICAL') {
        amendment += `\n• ${issue.message}`
      }
    }

    amendment += '\n\n**This response should be verified with your local health inspector before taking action.**'

    return originalResponse + amendment
  }
}

// Usage example in chat route:
/*
import { ResponseValidator } from '@/lib/responseValidator'

const validator = new ResponseValidator()
const validationResult = validator.validate(aiResponse, contextText)

if (!validationResult.isValid) {
  console.warn('Response validation failed:', validationResult.issues)
  
  // Option 1: Block the response
  // return NextResponse.json({ error: 'Response quality check failed' }, { status: 500 })
  
  // Option 2: Amend the response with warnings
  aiResponse = validator.amendResponse(aiResponse, validationResult)
}

// Include confidence indicator
const confidenceMessage = validator.generateConfidenceMessage(validationResult)
*/
