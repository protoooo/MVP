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
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*/g, '') 
    .replace(/`/g, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
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

  try {
    const binaryString = atob(base64Data.substring(0, 100))
    
    if (mimeType === 'image/jpeg') {
      const hasJPEGMarker = binaryString.charCodeAt(0) === 0xFF && 
                           binaryString.charCodeAt(1) === 0xD8
      
      if (!hasJPEGMarker) {
        throw new Error('Corrupted JPEG image')
      }
    }
    
    if (mimeType === 'image/png') {
      const hasPNGSignature = binaryString.charCodeAt(0) === 0x89 && 
                             binaryString.charCodeAt(1) === 0x50 &&
                             binaryString.charCodeAt(2) === 0x4E &&
                             binaryString.charCodeAt(3) === 0x47
      
      if (!hasPNGSignature) {
        throw new Error('Corrupted PNG image')
      }
      
      if (binaryString.length >= 24) {
        const width = (binaryString.charCodeAt(16) << 24) | 
                     (binaryString.charCodeAt(17) << 16) |
                     (binaryString.charCodeAt(18) << 8) | 
                     binaryString.charCodeAt(19)
        
        const height = (binaryString.charCodeAt(20) << 24) | 
                      (binaryString.charCodeAt(21) << 16) |
                      (binaryString.charCodeAt(22) << 8) | 
                      binaryString.charCodeAt(23)
        
        const maxDimension = 4096
        if (width > maxDimension || height > maxDimension) {
          throw new Error(`Image dimensions too large (max ${maxDimension}x${maxDimension}). Got ${width}x${height}.`)
        }
        
        if (width < 10 || height < 10) {
          throw new Error('Image dimensions too small')
        }
      }
    }
    
  } catch (decodeError) {
    if (decodeError.message.includes('dimensions') || decodeError.message.includes('Corrupted')) {
      throw decodeError
    }
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
    const project = credentials.project_id

    if (!project) {
      logError(new Error('No GCP project ID'), { credentials: '***' })
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const vertex_ai = new VertexAI({
      project: project,
      location: 'us-central1',
      googleAuthOptions: { credentials }
    })

    const model = 'gemini-2.0-flash-exp'

    let contextText = ""
    let usedDocs = []

    if (lastUserMessage.trim().length > 0 || validatedImage) {
      try {
        console.log(`🔍 RAG Search starting for ${userCountyName}...`)
        
        const searchQueries = []
        
        // 1. High priority: Enforcement, Violations, Inspection Procedures
        searchQueries.push({
          query: `${userCountyName} violation types priority core critical non-critical enforcement inspection`,
          weight: 1.0,
          purpose: 'county_enforcement'
        })
        
        // 2. Specific User Question
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
        
        // 3. Image Analysis Context (if applicable)
        if (validatedImage) {
          searchQueries.push({
            query: `${userCountyName} food storage temperatures equipment cleaning cross contamination`,
            weight: 0.85,
            purpose: 'visual_compliance'
          })
        }
        
        console.log(`📋 Executing ${searchQueries.length} search queries...`)
        
        const allResults = []
        
        for (const { query, weight, purpose } of searchQueries) {
          try {
            console.log(`   🔎 ${purpose}: "${query.substring(0, 60)}..."`)
            
            const results = await searchDocuments(query, 15, sanitizedCounty)
            
            for (const result of results) {
              result.searchWeight = weight
              result.searchPurpose = purpose
              result.adjustedScore = result.score * weight
              allResults.push(result)
            }
            
            console.log(`      ✓ Found ${results.length} docs (top score: ${results[0]?.score.toFixed(3) || 'N/A'})`)
            
          } catch (searchErr) {
            console.error(`   ✗ Search failed for ${purpose}:`, searchErr.message)
          }
        }
        
        console.log(`📊 Total retrieved: ${allResults.length} document chunks`)
        
        const seenContent = new Map()
        
        for (const doc of allResults) {
          const contentKey = doc.text.substring(0, 100)
          
          if (!seenContent.has(contentKey)) {
            seenContent.set(contentKey, doc)
          } else {
            const existing = seenContent.get(contentKey)
            if (doc.adjustedScore > existing.adjustedScore) {
              seenContent.set(contentKey, doc)
            }
          }
        }
        
        const uniqueResults = Array.from(seenContent.values())
        console.log(`📌 Unique documents: ${uniqueResults.length}`)
        
        // Prioritize County "Violation" and "Enforcement" docs
        const countyEnforcementDocs = uniqueResults.filter(doc => {
          const source = doc.source.toLowerCase()
          return (
            doc.county === sanitizedCounty &&
            (source.includes('violation') || 
             source.includes('enforcement') || 
             source.includes('inspection') ||
             source.includes('priority'))
          )
        })
        
        const otherDocs = uniqueResults.filter(doc => !countyEnforcementDocs.includes(doc))
        
        console.log(`🎯 County enforcement/violation docs: ${countyEnforcementDocs.length}`)
        console.log(`📚 Other docs: ${otherDocs.length}`)
        
        const topCountyDocs = countyEnforcementDocs
          .sort((a, b) => b.adjustedScore - a.adjustedScore)
          .slice(0, 10)
        
        const topOtherDocs = otherDocs
          .sort((a, b) => b.adjustedScore - a.adjustedScore)
          .slice(0, 20)
        
        const finalResults = [...topCountyDocs, ...topOtherDocs]
          .sort((a, b) => b.adjustedScore - a.adjustedScore)
          .slice(0, 30)
        
        console.log(`✅ Final context: ${finalResults.length} documents`)
        
        if (finalResults.length > 0) {
          console.log(`   Top doc: ${finalResults[0].source} (score: ${finalResults[0].adjustedScore.toFixed(3)})`)
          
          contextText = finalResults.map((doc, idx) => 
            `[DOCUMENT ${idx + 1}]
SOURCE: ${doc.source}
COUNTY: ${doc.county || sanitizedCounty}
PAGE: ${doc.page || 'N/A'}
CONTENT: ${doc.text}`
          ).join("\n\n")
          
          usedDocs = finalResults.map(r => ({ 
            document: r.source, 
            pages: r.page || 'N/A',
            county: r.county || sanitizedCounty
          }))
          
        } else {
          console.warn(`⚠️  No documents found for query`)
        }
        
      } catch (searchErr) {
        console.error('❌ RAG pipeline error:', searchErr)
        console.error('   Stack:', searchErr.stack)
      }
    }

    console.log(`📝 Context length: ${contextText.length} characters`)
    console.log(`📎 Documents in context: ${usedDocs.length}`)

    const systemInstructionText = `You are ProtocolLM, an expert food safety compliance consultant for ${userCountyName}.

Your goal is to help restaurants pass inspections and operate safely by identifying violations and citing the specific rules.

**INFORMATION HIERARCHY (Use in this order):**
1. **County-Specific Documents**: (HIGHEST PRIORITY) Look for "Violation Types", "Enforcement Actions", and local inspection guides.
2. **State Code**: Michigan Modified Food Code.
3. **Federal Code**: FDA Food Code.

**VIOLATION CLASSIFICATION LOGIC (Critical):**
You must classify violations using ${userCountyName}'s specific terminology found in the context documents.
- Most modern county documents (post-2012) use:
  - **Priority (P)**: Direct hazards to food safety (e.g., cooking temps, cross-contamination, handwashing). CORRECT IMMEDIATELY.
  - **Priority Foundation (Pf)**: Tools/training that support safety (e.g., missing thermometer, no soap, equipment repair). CORRECT WITHIN 10 DAYS.
  - **Core**: General sanitation/maintenance (e.g., dirty floors, lights out). CORRECT WITHIN 90 DAYS.
- **Rules:** 
  - If you see a violation, YOU MUST CLASSIFY IT (P, Pf, or Core) if the documents support it.
  - If the context defines "Critical" vs "Non-Critical", clarify which system the county is currently using based on the document dates.

**IMAGE ANALYSIS PROTOCOL:**
When the user uploads an image (e.g., a cooler, prep table, or sink):
1. **Observe**: Detail exactly what you see (e.g., "I see raw chicken stored above open vegetable containers").
2. **Identify**: Name the specific violation (e.g., "Cross-contamination risk").
3. **Classify**: Assign P, Pf, or Core based on the county documents.
   - Example: "According to [Violation Types, Page 1], cross-contamination is a **Priority Violation**."
4. **Remedy**: Tell them exactly how to fix it immediately.

**RESPONSE GUIDELINES:**
- **Tone**: Professional, authoritative, yet helpful. Use "You should" or "Ensure that," not "The operator shall."
- **Citations**: STRICTLY cite sources for every claim. Format: [Document Name, Page X].
- **Formatting**: Do NOT use markdown bold/italic (no **, *). Use plain text.
- **Unknowns**: If a specific county classification isn't in the provided text, refer to the FDA code but state: "Please verify the specific enforcement classification with ${userCountyName} health department."

**CONTEXT DOCUMENTS:**
${contextText || 'No specific documents retrieved. Provide general FDA guidance and recommend verification.'}

**REMEMBER**: You are protecting their business license. Be accurate. Violations are the enemy. Check ${userCountyName} enforcement docs first.`

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40
      }
    })

    let fullPromptText = `USER QUESTION: ${lastUserMessage || "Analyze this image for health code compliance."}`
    
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

    const response = await result.response
    const rawText = response.candidates[0].content.parts[0].text

    const cleanText = cleanAIResponse(rawText)

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

    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (validatedImage) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    return NextResponse.json({ 
      message: cleanText,
      citations: citations,
      county: sanitizedCounty
    })

  } catch (error) {
    logError(error, { context: 'Chat Processing Error', userId: session?.user?.id })
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
