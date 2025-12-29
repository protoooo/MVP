/**
 * Prompt Assembly System for Visual Reasoning API
 * Implements three layers of intelligence:
 * 1. General Visual Reasoning (from base model)
 * 2. Task Context (controlled by API)
 * 3. Customer Expectations (optional, configurable)
 */

import { INDUSTRIES, TASK_TYPES, STRICTNESS_LEVELS, getIndustryBestPractices } from './standardsProfiles.js'

// Configuration constants
const MAX_RECOMMENDED_RULES = 50
const MAX_RECOMMENDED_DOCUMENT_CHUNKS = 10

/**
 * Assemble the prompt for visual analysis based on standards profile
 * @param {Object} profile - Standards profile containing evaluation criteria
 * @param {Array} documentChunks - Optional relevant document chunks (from RAG)
 * @param {Object} metadata - Additional context (location, task, timestamp, etc.)
 * @returns {String} - Assembled prompt for the AI model
 */
export function assembleAnalysisPrompt(profile, documentChunks = [], metadata = {}) {
  const sections = []
  
  // Section 1: Core task definition
  sections.push(buildTaskDefinition(profile, metadata))
  
  // Section 2: Evaluation criteria (layered intelligence)
  sections.push(buildEvaluationCriteria(profile, documentChunks))
  
  // Section 3: Output format instructions
  sections.push(buildOutputFormat(profile))
  
  return sections.join('\n\n')
}

/**
 * Build task definition section
 */
function buildTaskDefinition(profile, metadata) {
  const industry = profile.industry || 'general'
  const taskType = profile.task_type || 'general'
  const location = metadata.location || metadata.area || 'unspecified location'
  
  const taskDescriptions = {
    receiving: 'receiving or delivery verification',
    storage: 'storage area inspection',
    cleaning: 'cleaning verification',
    delivery: 'delivery completion verification',
    inspection: 'quality and safety inspection',
    general: 'general compliance verification'
  }
  
  const taskDesc = taskDescriptions[taskType] || 'compliance verification'
  
  return `You are evaluating an image taken during ${taskDesc} in a ${industry} setting at ${location}.

Your role is to act as a visual verification system that checks whether work is being done correctly, consistently, and according to standards.

Analyze the image to identify:
- What is present and what might be missing
- Conditions that may pose safety or quality risks
- Deviations from expected standards
- Items that appear out of place or improperly handled`
}

/**
 * Build evaluation criteria section (three layers of intelligence)
 */
function buildEvaluationCriteria(profile, documentChunks = []) {
  const sections = []
  
  // Layer 1: Base visual reasoning (implicit - always active)
  sections.push('**Base Visual Assessment:**')
  sections.push('Use your visual understanding to identify:')
  sections.push('- Objects, their condition, and organization')
  sections.push('- Cleanliness and maintenance levels')
  sections.push('- Safety hazards or risks')
  sections.push('- Damage, contamination, or deterioration')
  sections.push('- Common-sense correctness for the context')
  
  // Layer 2: Task context and industry best practices
  sections.push('\n**Industry Context:**')
  const industryPractices = getIndustryBestPractices(profile.industry || 'general')
  sections.push(`Apply ${profile.industry || 'general'} industry best practices: ${industryPractices}`)
  
  // Layer 3a: Plain language rules (if provided)
  if (profile.plain_language_rules && profile.plain_language_rules.length > 0) {
    sections.push('\n**Specific Requirements:**')
    sections.push('Check for compliance with these specific rules:')
    profile.plain_language_rules.forEach((rule, index) => {
      sections.push(`${index + 1}. ${rule}`)
    })
  }
  
  // Layer 3b: Document references (if provided - HIGHEST PRIORITY)
  if (documentChunks && documentChunks.length > 0) {
    sections.push('\n**AUTHORITATIVE DOCUMENTATION (OVERRIDE GENERAL REASONING):**')
    sections.push('The following documentation provides specific requirements that MUST be followed:')
    sections.push('If there is any conflict between general practices and these documents, defer to the documents.')
    sections.push('')
    documentChunks.forEach((chunk, index) => {
      sections.push(`Document ${index + 1}:`)
      sections.push(chunk.text || chunk.content)
      if (chunk.metadata?.source) {
        sections.push(`Source: ${chunk.metadata.source}`)
      }
      sections.push('')
    })
  }
  
  // Strictness guidance
  sections.push('\n**Strictness Level:**')
  const strictnessGuidance = getStrictnessGuidance(profile.strictness_level || 'medium')
  sections.push(strictnessGuidance)
  
  return sections.join('\n')
}

/**
 * Get strictness level guidance
 */
function getStrictnessGuidance(strictnessLevel) {
  const guidance = {
    low: 'Flag ONLY severe, obvious issues that pose immediate safety or quality risks. Avoid minor concerns. Be permissive and focus on critical violations only.',
    medium: 'Flag issues that represent clear violations or risks. Balance between catching real problems and avoiding false positives. Use reasonable judgment.',
    high: 'Flag all potential issues, even minor ones. Be conservative and thorough. When in doubt about whether something is an issue, include it.'
  }
  
  return guidance[strictnessLevel] || guidance.medium
}

/**
 * Build output format section
 */
function buildOutputFormat(profile) {
  return `**Output Format:**

Return your analysis as a structured JSON object with the following format:

{
  "findings": [
    {
      "type": "issue" | "confirmation",
      "severity": "critical" | "major" | "minor" | "info",
      "category": "category name",
      "description": "Clear description of the finding",
      "confidence": 0.0 to 1.0,
      "location": "specific area in image",
      "recommendation": "what should be done",
      "document_reference": "citation if from documentation"
    }
  ],
  "overall_assessment": {
    "compliant": true | false,
    "score": 0-100,
    "summary": "brief overall summary"
  }
}

Guidelines:
- Be specific and actionable in descriptions
- Use confidence scores honestly (lower for uncertain findings)
- Include both issues AND confirmations of good practices
- Reference documentation when findings are based on uploaded documents
- Keep language professional but clear (no jargon unless from documentation)
- Focus on what can be observed in the image`
}

/**
 * Assemble summary prompt for aggregating multiple image results
 */
export function assembleSummaryPrompt(results, profile) {
  return `You have analyzed ${results.length} images from a ${profile.industry || 'general'} ${profile.task_type || 'inspection'}.

Here are the individual findings:
${JSON.stringify(results, null, 2)}

Please provide:
1. An executive summary of key issues found
2. Overall compliance assessment
3. Priority recommendations
4. Any patterns or recurring issues

Keep the summary concise, actionable, and focused on the most important findings.`
}

/**
 * Build zero-config prompt (no profile provided)
 */
export function buildZeroConfigPrompt(metadata = {}) {
  const location = metadata.location || metadata.area || 'this location'
  
  return `You are evaluating an image taken during normal business operations at ${location}.

**Your Task:**
Analyze this image to verify that work is being done correctly and according to common standards.

**What to Check:**
- Safety: Are there any obvious safety hazards?
- Quality: Does the work appear complete and done properly?
- Organization: Is the area clean and organized?
- Damage: Are there any damaged items or equipment?
- Anomalies: Is there anything that looks out of place or incorrect?

**Approach:**
- Apply common sense and general best practices
- Flag only obvious issues that most people would agree are problems
- Avoid assumptions about specific industry requirements unless obvious
- Be conservative - when in doubt, note it as "informational" rather than a critical issue

**Output Format:**
Return a structured JSON with:
{
  "findings": [
    {
      "type": "issue" | "confirmation",
      "severity": "critical" | "major" | "minor" | "info",
      "category": "general category",
      "description": "what you observe",
      "confidence": 0.0 to 1.0,
      "recommendation": "suggested action"
    }
  ],
  "overall_assessment": {
    "compliant": true | false,
    "score": 0-100,
    "summary": "brief summary"
  }
}

Focus on being helpful without being overly critical. This is a safety net, not a replacement for human judgment.`
}

/**
 * Validate prompt assembly inputs
 */
export function validatePromptInputs(profile, documentChunks, metadata) {
  const warnings = []
  
  if (!profile) {
    warnings.push('No profile provided - using zero-config mode')
  }
  
  if (profile && !profile.industry) {
    warnings.push('Profile missing industry - defaulting to general')
  }
  
  if (profile && !profile.task_type) {
    warnings.push('Profile missing task_type - defaulting to general')
  }
  
  if (documentChunks && !Array.isArray(documentChunks)) {
    warnings.push('Document chunks must be an array')
  }
  
  if (profile?.plain_language_rules && profile.plain_language_rules.length > MAX_RECOMMENDED_RULES) {
    warnings.push(`Profile has ${profile.plain_language_rules.length} rules (max recommended: ${MAX_RECOMMENDED_RULES}) - may exceed token limits`)
  }
  
  if (documentChunks && documentChunks.length > MAX_RECOMMENDED_DOCUMENT_CHUNKS) {
    warnings.push(`${documentChunks.length} document chunks provided (max recommended: ${MAX_RECOMMENDED_DOCUMENT_CHUNKS}) - may exceed token limits`)
  }
  
  return warnings
}
