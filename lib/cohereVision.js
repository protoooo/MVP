/**
 * Cohere Vision API Integration
 * Analyzes images for health code violations using Cohere Vision
 * Grounded in Michigan food safety documents from Supabase
 */

import { CohereClientV2 } from 'cohere-ai'
import { getVisionAnalysisContext } from './documentRetrieval.js'

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY
})

const VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b'

/**
 * Analyze a single image for health code violations
 * @param {string} imageUrl - Public URL of the image to analyze
 * @param {string} additionalContext - Additional context for the analysis
 * @param {boolean} useDocumentGrounding - Whether to retrieve and use compliance documents (default: true)
 * @returns {Promise<{violations: Array<{description: string, severity: string, citation: string}>, raw_analysis: string}>}
 */
export async function analyzeImage(imageUrl, additionalContext = '', useDocumentGrounding = true) {
  try {
    // Retrieve relevant compliance documents for grounding
    let documentContext = ''
    if (useDocumentGrounding) {
      documentContext = await getVisionAnalysisContext()
      console.log('Retrieved document context for grounding analysis')
    }

    const prompt = buildAnalysisPrompt(documentContext, additionalContext)

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
 * @param {boolean} useDocumentGrounding - Whether to retrieve and use compliance documents (default: true)
 * @returns {Promise<Array<{image_url: string, violations: Array, raw_analysis: string}>>}
 */
export async function analyzeMultipleImages(imageUrls, context = '', useDocumentGrounding = true) {
  try {
    // Retrieve document context once for all images to avoid redundant calls
    let documentContext = ''
    if (useDocumentGrounding) {
      documentContext = await getVisionAnalysisContext()
      console.log('Retrieved document context for batch analysis')
    }

    const analysisPromises = imageUrls.map(async (imageUrl) => {
      // Pass documentContext directly in prompt to avoid re-fetching
      const prompt = buildAnalysisPrompt(documentContext, context)
      
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
        temperature: 0.3,
        maxTokens: 2000
      })

      const analysisText = response.message?.content?.[0]?.text || ''
      const violations = parseViolations(analysisText)

      return {
        image_url: imageUrl,
        violations,
        raw_analysis: analysisText
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
 * @param {string} documentContext - Relevant compliance documents from database
 * @param {string} additionalContext - Additional context
 * @returns {string} The analysis prompt
 */
function buildAnalysisPrompt(documentContext = '', additionalContext = '') {
  return `You are a Michigan health inspection expert analyzing food service establishment images for health code violations.

Your analysis MUST be grounded in the Michigan food safety regulations provided below. Reference specific sections when identifying violations.

MICHIGAN FOOD SAFETY REGULATIONS:
${documentContext}

Focus on identifying violations in these areas:
- Food storage and temperature control
- Cross-contamination risks
- Personal hygiene and handwashing facilities
- Equipment and utensil cleanliness
- Pest control
- Facility maintenance and sanitation
- Proper food handling procedures

${additionalContext ? `Additional context: ${additionalContext}` : ''}

For each violation you identify in the image:
1. Provide a clear, specific description of what you observe
2. Assign severity (Low, Medium, or High) based on food safety risk
3. Cite the relevant Michigan Food Code section from the regulations above

Format your response EXACTLY as follows:
VIOLATION: [Clear description of what is wrong in the image]
SEVERITY: [Low|Medium|High]
CITATION: [Specific Michigan Food Code section from regulations above]
---

IMPORTANT:
- Only report violations you can actually SEE in the image
- Base citations on the regulations provided above
- If no violations are visible, respond with "NO VIOLATIONS DETECTED"
- Do NOT make assumptions about things not visible in the image`
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
