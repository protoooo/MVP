import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { searchDocuments } from '@/lib/searchDocs'
import { sanitizeString, sanitizeCounty } from '@/lib/sanitize'
import { logError, logInfo } from '@/lib/monitoring'
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
  if (!process.env.GOOGLE_CREDENTIALS_JSON) {
    throw new Error('GOOGLE_CREDENTIALS_JSON environment variable is missing')
  }

  try {
    const cleanJson = process.env.GOOGLE_CREDENTIALS_JSON
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
    
    const credentials = JSON.parse(cleanJson)
    
    if (!credentials.project_id || !credentials.private_key) {
      throw new Error('Google credentials missing required fields (project_id or private_key)')
    }
    
    return credentials
  } catch (e) {
    logError(e, { context: 'Failed to parse GOOGLE_CREDENTIALS_JSON' })
    throw new Error('Invalid Google Cloud credentials configuration')
  }
}

function cleanAIResponse(text) {
  if (!text) return ""
  
  let cleaned = text
    .replace(/\*\*/g, '') // Remove bold
    .replace(/__/g, '')   // Remove underline
    .replace(/\*/g, '')   // Remove bullets/italics
    .replace(/`/g, '')    // Remove code ticks
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/([a-zA-Z0-9.])\[/g, '$1 [')

  if (cleaned.length > 50000) {
    cleaned = cleaned.substring(0, 50000) + '\n\n...[Response truncated]'
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

  try {
    const binaryString = atob(base64Data.substring(0, 100))
    if (mimeType === 'image/jpeg') {
      if (binaryString.charCodeAt(0) !== 0xFF || binaryString.charCodeAt(1) !== 0xD8) {
        throw new Error('Corrupted JPEG image')
      }
    }
  } catch (decodeError) {
    throw new Error('Failed to validate image format')
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
    return NextResponse.json({ error: 'Service configuration error.' }, { status: 500 })
  }

  const supabase = createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateCheck = await checkRateLimit(session.user.id, 'chat')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.', resetTime: rateCheck.resetTime },
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

    // --- UPDATED PLAN LIMITS ---
    let limits = { requests: 100, images: 10 } // Default / Starter

    if (subscription?.plan === 'pro') {
      limits = { requests: 500, images: 50 }
    } else if (subscription?.plan === 'enterprise') {
      limits = { requests: 5000, images: 500 }
    }
    // ---------------------------

    if (profile.requests_used >= limits.requests) {
      return NextResponse.json({ error: 'Monthly request limit reached.' }, { status: 429 })
    }

    const requestBody = await request.json()
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
    
    const vertex_ai = new VertexAI({
      project: credentials.project_id,
      location: 'us-central1',
      googleAuthOptions: { credentials }
    })

    const model = 'gemini-2.0-flash-exp'
    let contextText = ""
    
    // RAG Search Logic
    if (lastUserMessage.trim().length > 0 || validatedImage) {
      try {
        const searchQueries = []
        
        searchQueries.push({
          query: `${userCountyName} violation definitions priority core enforcement inspection`,
          weight: 1.0,
          purpose: 'county_enforcement'
        })
        
        if (lastUserMessage.trim()) {
          searchQueries.push({
            query: `${userCountyName} ${lastUserMessage}`,
            weight: 0.9,
            purpose: 'county_specific'
          })
          searchQueries.push({
            query: lastUserMessage,
            weight: 0.7,
            purpose: 'general_code'
          })
        }
        
        if (validatedImage) {
          searchQueries.push({
            query: `${userCountyName} storage cleanliness equipment maintenance temperature violation`,
            weight: 0.85,
            purpose: 'visual_compliance'
          })
        }
        
        const allResults = []
        for (const { query, weight } of searchQueries) {
          const results = await searchDocuments(query, 15, sanitizedCounty)
          results.forEach(r => {
            r.adjustedScore = r.score * weight
            allResults.push(r)
          })
        }
        
        // Deduplicate
        const seenContent = new Map()
        for (const doc of allResults) {
          const key = doc.text.substring(0, 100)
          if (!seenContent.has(key) || doc.adjustedScore > seenContent.get(key).adjustedScore) {
            seenContent.set(key, doc)
          }
        }
        
        const uniqueResults = Array.from(seenContent.values())
        
        // Prioritize County Docs
        const countyDocs = uniqueResults.filter(doc => 
          doc.county === sanitizedCounty && 
          doc.source.toLowerCase().match(/(enforcement|violation|inspection)/)
        )
        const otherDocs = uniqueResults.filter(doc => !countyDocs.includes(doc))
        
        const finalResults = [
          ...countyDocs.sort((a,b) => b.adjustedScore - a.adjustedScore).slice(0, 10),
          ...otherDocs.sort((a,b) => b.adjustedScore - a.adjustedScore).slice(0, 20)
        ].sort((a,b) => b.adjustedScore - a.adjustedScore).slice(0, 30)

        contextText = finalResults.map((doc, idx) => 
          `[ID:${idx}] SOURCE: ${doc.source} (Page ${doc.page || 'N/A'})\n${doc.text}`
        ).join("\n\n")

      } catch (e) {
        console.error('RAG Error:', e)
      }
    }

    const systemInstructionText = `You are ProtocolLM, an expert food safety consultant for ${userCountyName}. Your goal is to help businesses be compliant at all times.

**CORE BEHAVIORS:**
1.  **Fluent & Natural:** Do NOT reference file names, page numbers, or "the documents" in your conversation. Speak like a knowledgeable human consultant. 
    - BAD: "According to the Washtenaw Enforcement Guide, Page 2..."
    - GOOD: "For Washtenaw County, this is considered a Priority violation because..."
2.  **No Hallucinations:** You only know what is in the Context Documents. 
3.  **Handling Unknowns:** If you do not know the answer based on the context:
    - Do NOT guess.
    - Do NOT tell them to "contact the health department."
    - Instead, say: "I'm not sure about that specific detail based on my current records. Could you elaborate or show me another angle?" Or provide a general safe example from the FDA code if applicable (e.g., standard temp zones).
4.  **County First:** Always prioritize ${userCountyName} enforcement rules over general state/federal code.

**VIOLATION CLASSIFICATION:**
Classify issues using specific county terms found in the context (Priority, Priority Foundation, Core). Explain *why* it fits that category based on the rules, but keep the explanation conversational.

**VISUAL ANALYSIS:**
If looking at an image, actively hunt for:
- **Storage:** FIFO issues, raw meat above ready-to-eat (cross-contamination), lack of labels.
- **Cleanliness:** Grease buildup, dust on vents, dirty gaskets, pest signs.
- **Maintenance:** Cracked tiles, gaps under doors, improvised repairs (duct tape).
- **Temps:** Signs of spoilage or improper cooling methods.
*If you see something, point it out gently and suggest the fix.*

**CITATION PROTOCOL (INTERNAL ONLY):**
You must track your sources for the system, but hide them from the user.
At the VERY END of your response, after your sign-off, create a hidden block listing sources used:
[[SOURCE: Document Name, Page Number]]
[[SOURCE: Document Name, Page Number]]

**CONTEXT DOCUMENTS:**
${contextText || 'No specific documents retrieved. Use general food safety knowledge.'}`

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      generationConfig: { temperature: 0.1, topP: 0.8, topK: 40 }
    })

    let fullPromptText = `USER QUESTION: ${lastUserMessage || "Analyze this image for compliance."}`
    
    if (sanitizedMessages.length > 1) {
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

    const rawText = await result.response.candidates[0].content.parts[0].text
    
    // Extract Citations for Metadata (Hidden from user text)
    const citations = []
    const citationRegex = /\[\[SOURCE:\s*(.*?),\s*Page\s*([\d\-, ]+|N\/A)\]\]/gi
    let match
    while ((match = citationRegex.exec(rawText)) !== null) {
      citations.push({ 
        document: match[1].trim(), 
        pages: match[2].trim(), 
        county: sanitizedCounty 
      })
    }

    // Clean text for display (Remove the [[SOURCE]] blocks and formatting)
    let cleanText = cleanAIResponse(rawText.replace(citationRegex, ''))
    cleanText = cleanText.trim()

    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (validatedImage) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    return NextResponse.json({ 
      message: cleanText,
      citations: citations, // Sent to UI for pills, but not in text
      county: sanitizedCounty
    })

  } catch (error) {
    logError(error, { context: 'Chat Processing Error', userId: session?.user?.id })
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
