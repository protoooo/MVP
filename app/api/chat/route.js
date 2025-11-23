import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { searchDocuments } from '@/lib/searchDocs'
import { sanitizeString, sanitizeCounty } from '@/lib/sanitize'
import { logError } from '@/lib/monitoring'
import { checkRateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

function createSupabaseServer() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
}

function validateEnvironment() {
  const required = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CREDENTIALS_JSON',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    logError(new Error('Missing environment variables'), { missing })
    return false
  }
  
  return true
}

function getVertexCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const cleanJson = process.env.GOOGLE_CREDENTIALS_JSON
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
      return JSON.parse(cleanJson)
    } catch (e) {
      logError(e, { context: 'Failed to parse GOOGLE_CREDENTIALS_JSON' })
    }
  }
  return null
}

/**
 * Cleans the response to ensure no markdown formatting remains
 * and ensures citations are spaced correctly.
 */
function cleanAIResponse(text) {
  if (!text) return ""
  
  let cleaned = text
    // Remove Markdown bold/italic markers
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*/g, '') // Remove single asterisks used for lists sometimes
    .replace(/`/g, '')
    
    // Remove HTML/Scripts
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')

    // Ensure space before citations
    .replace(/([a-zA-Z0-9.])\[/g, '$1 [')

  if (cleaned.length > 50000) {
    cleaned = cleaned.substring(0, 50000) + '\n\n...[Response truncated for length]'
  }
  
  return cleaned
}

function sanitizeError(error) {
  logError(error, { context: 'Chat API Error' })
  
  if (process.env.NODE_ENV === 'production') {
    if (error.message.includes('safety') || error.message.includes('content') || error.message.includes('format')) {
      return error.message
    }
    return 'An error occurred processing your request. Please try again.'
  }
  return error.message || 'An error occurred'
}

function validateImageData(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    throw new Error('Invalid image data format')
  }

  if (!imageData.startsWith('data:image/')) {
    throw new Error('Image must be a data URL')
  }

  const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/)
  if (!mimeMatch) {
    throw new Error('Invalid image format')
  }

  let mimeType = mimeMatch[1]
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg'

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Image type ${mimeType} not supported. Use JPEG, PNG, or WebP.`)
  }

  const base64Data = imageData.split(',')[1].replace(/\s/g, '')
  if (!base64Data || base64Data.length < 100) {
    throw new Error('Image data is too small or corrupted')
  }

  const sizeInBytes = (base64Data.length * 3) / 4
  const maxSize = 5 * 1024 * 1024

  if (sizeInBytes > maxSize) {
    throw new Error('Image is too large. Maximum size is 5MB.')
  }

  return { mimeType, base64Data }
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('Messages must be an array')
  if (messages.length > 100) throw new Error('Too many messages')

  return messages.map(msg => {
    if (!msg || typeof msg !== 'object') throw new Error('Invalid message format')
    
    const role = msg.role === 'user' ? 'user' : 'assistant'
    const content = typeof msg.content === 'string' ? sanitizeString(msg.content, 5000) : ''
    
    return {
      role,
      content,
      citations: Array.isArray(msg.citations) ? msg.citations : []
    }
  })
}

export async function POST(request) {
  console.log('🚀 Chat API called')
  
  if (!validateEnvironment()) {
    return NextResponse.json(
      { error: 'Service configuration error. Please contact support.' },
      { status: 500 }
    )
  }

  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateCheck = await checkRateLimit(session.user.id, 'chat')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please wait before sending another message.',
        resetTime: rateCheck.resetTime
      },
      { status: 429, headers: { 'Retry-After': rateCheck.retryAfter.toString() } }
    )
  }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used, images_used, county')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_subscribed) {
      return NextResponse.json({ error: 'Active subscription required.' }, { status: 403 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', session.user.id)
      .single()

    const limits = subscription?.plan === 'enterprise'
      ? { requests: 5000, images: 500 }
      : { requests: 500, images: 50 }

    if (profile.requests_used >= limits.requests) {
      return NextResponse.json({ 
        error: 'Monthly request limit reached.' 
      }, { status: 429 })
    }

    let requestBody
    try {
      requestBody = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { messages, image, county } = requestBody
    const sanitizedMessages = sanitizeMessages(messages)
    const sanitizedCounty = sanitizeCounty(county || profile.county)
    const userCountyName = COUNTY_NAMES[sanitizedCounty]

    let validatedImage = null
    if (image) {
      if (profile.images_used >= limits.images) {
        return NextResponse.json({ error: 'Monthly image analysis limit reached.' }, { status: 429 })
      }
      validatedImage = validateImageData(image)
    }

    const lastUserMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || ""

    const credentials = getVertexCredentials()
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID || credentials?.project_id
    const vertex_ai = new VertexAI({
      project: project,
      location: 'us-central1',
      googleAuthOptions: { credentials }
    })

    const model = 'gemini-2.0-flash-exp'

    // ═══════════════════════════════════════════════════════════════════
    // RAG - DOCUMENT RETRIEVAL
    // ═══════════════════════════════════════════════════════════════════
    let contextText = ""
    let usedDocs = []

    if (lastUserMessage.trim().length > 0 || validatedImage) {
      try {
        console.log(`🔍 Searching documents for ${userCountyName}...`)
        
        // Enhanced Search Strategy to target County Specifics
        let searchQueries = []
        
        if (validatedImage) {
          searchQueries = [
            `${userCountyName} physical facility maintenance requirements`,
            `${userCountyName} equipment cleaning standards`,
            'cross contamination prevention procedures',
            'sanitation standard operating procedures',
            lastUserMessage // Fallback to user text
          ]
        } else {
          searchQueries = [
            // Priority 1: Specific County Query
            `${lastUserMessage} ${userCountyName} regulations`,
            // Priority 2: Specific County Violation Types
            `${userCountyName} violation types priority foundation core`,
            // Priority 3: General Query
            lastUserMessage
          ]
        }

        const allResults = []
        
        for (const query of searchQueries) {
          if (query && query.trim()) {
            // We pass the county code (e.g. 'washtenaw') to the search function
            // to help filtering if supported, or just rely on semantic match
            const results = await searchDocuments(query.trim(), 10, sanitizedCounty)
            allResults.push(...results)
          }
        }

        // Deduplicate and Sort
        const seenContent = new Set()
        const uniqueResults = []
        
        for (const doc of allResults) {
          const contentKey = doc.text.substring(0, 100) // First 100 chars as signature
          if (!seenContent.has(contentKey)) {
            // Bonus score for documents that actually contain the county name in the source filename
            if (doc.source && doc.source.toLowerCase().includes(sanitizedCounty)) {
              doc.score += 0.15 // Boost local documents
            }
            
            if (doc.score > 0.20) { // Minimum relevance threshold
              seenContent.add(contentKey)
              uniqueResults.push(doc)
            }
          }
        }

        // Sort by score (descending)
        const topResults = uniqueResults.sort((a, b) => b.score - a.score).slice(0, 25)
        
        if (topResults.length > 0) {
          contextText = topResults.map((doc, idx) => 
            `[DOCUMENT ${idx + 1}]
SOURCE: ${doc.source}
PAGE: ${doc.page}
CONTENT: ${doc.text}`
          ).join("\n\n")
          
          usedDocs = topResults.map(r => ({ 
            document: r.source, 
            pages: r.page
          }))
        }
      } catch (searchErr) {
        console.error('Search failed:', searchErr)
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SYSTEM INSTRUCTION
    // ═══════════════════════════════════════════════════════════════════
    const systemInstructionText = `You are ProtocolLM, an expert food safety consultant for restaurants in ${userCountyName}.

Your goal is to provide clear, conversational, and highly accurate compliance advice. You help operators fix issues before an inspector walks in.

RULES FOR RESPONSE:
1. **NO MARKDOWN FORMATTING**: Do not use asterisks (**bold**), underscores (__italics__), or headers (##). Write in clean, plain text paragraphs. Use standard capitalization for emphasis if absolutely necessary.

2. **PRIORITIZE LOCAL REGULATIONS**: You have access to ${userCountyName} specific documents (e.g., "Violation Types | ${userCountyName}", "Enforcement Action"). ALWAYS cite these local documents first if they address the user's question.

3. **CONVERSATIONAL TONE**: Do not sound like a robot or an encyclopedia. Speak like a helpful, knowledgeable consultant standing in the kitchen with the manager.
   - Bad: "The FDA Food Code Section 4-201 states..."
   - Good: "According to the FDA Food Code [FDA_Food_Code, Page 45], you need to keep that equipment clean..."

4. **CITATION FORMAT**: You MUST cite your sources when stating a requirement. Use this exact format: [Document Name, Page X].
   - Place citations at the end of the sentence or clause they support.
   - Do not use footnotes or brackets alone.

5. **IMAGE ANALYSIS (If applicable)**:
   - Describe what you see plainly.
   - Identify violations based on the provided documents.
   - Suggest immediate corrective actions (e.g., "Wash this immediately," "Discard the food").

6. **HANDLING UNKNOWNS**: If the provided documents do not contain the answer, say: "I don't have the specific regulation for that in my current database, but generally..." and provide standard food safety advice, noting it as general guidance.

CONTEXT DOCUMENTS:
${contextText || 'No specific documents found. Rely on general food safety knowledge but admit the lack of specific citations.'}
`

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {
        temperature: 0.2, // Lower temperature for more factual adherence
        topP: 0.8,
        topK: 40
      }
    })

    let fullPromptText = `USER QUESTION: ${lastUserMessage || "Analyze this image."}`
    
    if (sanitizedMessages.length > 1) {
      // Add limited history for context
      const history = sanitizedMessages.slice(-3, -1).map(m => `${m.role}: ${m.content}`).join('\n')
      fullPromptText = `PREVIOUS CONVERSATION:\n${history}\n\n${fullPromptText}`
    }

    const parts = []
    if (validatedImage) {
      parts.push({
        inlineData: {
          mimeType: validatedImage.mimeType,
          data: validatedImage.base64Data
        }
      })
    }
    parts.push({ text: fullPromptText })

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: parts }]
    })

    const response = await result.response
    const rawText = response.candidates[0].content.parts[0].text

    // CLEAN THE OUTPUT
    const cleanText = cleanAIResponse(rawText)

    // Extract citations for the UI to make them clickable
    const citations = []
    const citationRegex = /\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]/g
    let match
    while ((match = citationRegex.exec(cleanText)) !== null) {
      citations.push({ 
        document: match[1].trim(), 
        pages: match[2].trim(), 
        county: sanitizedCounty 
      })
    }

    // Update Usage Stats
    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (validatedImage) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    return NextResponse.json({ 
      message: cleanText,
      citations: citations,
      county: sanitizedCounty
    })

  } catch (error) {
    console.error('Chat Processing Error:', error)
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
