/**
 * Cohere Vision API Integration
 * Analyzes images for health code violations using Cohere Vision
 */

import { CohereClientV2 } from 'cohere-ai'

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY
})

const VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b'

/**
 * Analyze a single image for health code violations
 * @param {string} imageUrl - Public URL of the image to analyze
 * @param {string} context - Additional context for the analysis
 * @returns {Promise<{violations: Array<{description: string, severity: string, citation: string}>, raw_analysis: string}>}
 */
export async function analyzeImage(imageUrl, context = '') {
  try {
    const prompt = buildAnalysisPrompt(context)

    // Call Cohere Vision API
    const response = await cohere.chat({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      maxTokens: 2000
    })

    const analysisText = response.message?.content?.[0]?.text || ''

    // Parse violations from the response
    const violations = parseViolations(analysisText)

    return {
      violations,
      raw_analysis: analysisText
    }
  } catch (error) {
    console.error('Image analysis error:', error)
    throw new Error(`Failed to analyze image: ${error.message}`)
  }
}

/**
 * Analyze multiple images in batch
 * @param {Array<string>} imageUrls - Array of public URLs to analyze
 * @param {string} context - Additional context for the analysis
 * @returns {Promise<Array<{image_url: string, violations: Array, raw_analysis: string}>>}
 */
export async function analyzeMultipleImages(imageUrls, context = '') {
  try {
    const analysisPromises = imageUrls.map(async (imageUrl) => {
      const result = await analyzeImage(imageUrl, context)
      return {
        image_url: imageUrl,
        ...result
      }
    })

    // Process in batches to avoid rate limits
    const batchSize = 5
    const results = []

    for (let i = 0; i < analysisPromises.length; i += batchSize) {
      const batch = analysisPromises.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch)
      results.push(...batchResults)

      // Add delay between batches
      if (i + batchSize < analysisPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  } catch (error) {
    console.error('Batch image analysis error:', error)
    throw error
  }
}

/**
 * Build the analysis prompt for Michigan health code violations
 * @param {string} context - Additional context
 * @returns {string} The analysis prompt
 */
function buildAnalysisPrompt(context) {
  return `You are a Michigan health inspection expert. Analyze this image for potential health code violations related to food safety and restaurant operations.

Focus on Michigan-specific health code violations including but not limited to:
- Food storage and temperature control
- Cross-contamination risks
- Personal hygiene and handwashing
- Equipment and utensil cleanliness
- Pest control
- Facility maintenance and sanitation
- Proper food handling procedures

For each violation found, provide:
1. A clear description of the violation
2. Severity level (Low, Medium, or High)
3. Citation reference to Michigan Food Code sections when applicable

${context ? `Additional context: ${context}` : ''}

Format your response as follows:
VIOLATION: [Description]
SEVERITY: [Low|Medium|High]
CITATION: [Michigan Food Code Section or "General Health Code"]
---

If no violations are found, respond with "NO VIOLATIONS DETECTED".

Be thorough but only report actual observable violations, not potential risks.`
}

/**
 * Parse violations from the AI response text
 * @param {string} text - The raw analysis text from Cohere
 * @returns {Array<{description: string, severity: string, citation: string}>}
 */
function parseViolations(text) {
  const violations = []

  if (!text || text.includes('NO VIOLATIONS DETECTED')) {
    return violations
  }

  // Split by separator
  const blocks = text.split('---').filter(block => block.trim())

  for (const block of blocks) {
    const violationMatch = block.match(/VIOLATION:\s*(.+?)(?:\n|$)/i)
    const severityMatch = block.match(/SEVERITY:\s*(Low|Medium|High)/i)
    const citationMatch = block.match(/CITATION:\s*(.+?)(?:\n|$)/i)

    if (violationMatch && severityMatch) {
      violations.push({
        description: violationMatch[1].trim(),
        severity: severityMatch[1],
        citation: citationMatch ? citationMatch[1].trim() : 'General Health Code'
      })
    }
  }

  // If parsing failed but we have text, try to extract at least one violation
  if (violations.length === 0 && text.length > 50) {
    violations.push({
      description: text.substring(0, 500).trim(),
      severity: classifySeverityFromText(text),
      citation: 'General Health Code'
    })
  }

  return violations
}

/**
 * Classify severity based on text content when explicit severity is not provided
 * @param {string} text - The violation text
 * @returns {string} Severity level
 */
function classifySeverityFromText(text) {
  const lowerText = text.toLowerCase()

  // High severity keywords
  const highKeywords = ['critical', 'immediate', 'contamination', 'pest', 'vermin', 'raw meat', 'temperature abuse', 'foodborne illness']
  if (highKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'High'
  }

  // Medium severity keywords
  const mediumKeywords = ['improper', 'inadequate', 'not properly', 'missing', 'dirty', 'unclean', 'poor']
  if (mediumKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'Medium'
  }

  return 'Low'
}
