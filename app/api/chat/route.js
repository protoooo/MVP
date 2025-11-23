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
    // RAG - MULTI-QUERY DOCUMENT RETRIEVAL STRATEGY
    // ═══════════════════════════════════════════════════════════════════
    let contextText = ""
    let usedDocs = []

    if (lastUserMessage.trim().length > 0 || validatedImage) {
      try {
        console.log(`🔍 RAG Search starting for ${userCountyName}...`)
        
        const searchQueries = []
        
        // Query 1: ALWAYS fetch county enforcement docs (MANDATORY)
        searchQueries.push({
          query: `${userCountyName} enforcement inspection procedures priority foundation`,
          weight: 1.0,
          purpose: 'county_enforcement'
        })
        
        // Query 2: County + user's actual question
        if (lastUserMessage.trim()) {
          searchQueries.push({
            query: `${userCountyName} ${lastUserMessage}`,
            weight: 0.9,
            purpose: 'county_specific'
          })
        }
        
        // Query 3: Pure user question (for general code)
        if (lastUserMessage.trim()) {
          searchQueries.push({
            query: lastUserMessage,
            weight: 0.7,
            purpose: 'general_code'
          })
        }
        
        // Query 4-5: Image-specific queries
        if (validatedImage) {
          searchQueries.push({
            query: `${userCountyName} equipment cleaning maintenance inspection requirements`,
            weight: 0.85,
            purpose: 'equipment_regs'
          })
          
          searchQueries.push({
            query: `physical facility standards enforcement ${userCountyName}`,
            weight: 0.85,
            purpose: 'facility_standards'
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
        
        // De-duplicate
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
        
        // Ensure county enforcement docs appear
        const countyEnforcementDocs = uniqueResults.filter(doc => {
          const source = doc.source.toLowerCase()
          return (
            doc.county === sanitizedCounty &&
            (source.includes('enforcement') || 
             source.includes('inspection') ||
             source.includes('food service'))
          )
        })
        
        const otherDocs = uniqueResults.filter(doc => {
          const source = doc.source.toLowerCase()
          return !(
            doc.county === sanitizedCounty &&
            (source.includes('enforcement') || 
             source.includes('inspection') ||
             source.includes('food service'))
          )
        })
        
        console.log(`🎯 County enforcement docs: ${countyEnforcementDocs.length}`)
        console.log(`📚 Other docs: ${otherDocs.length}`)
        
        // Final ranking: enforcement first, then by score
        const topCountyDocs = countyEnforcementDocs
          .sort((a, b) => b.adjustedScore - a.adjustedScore)
          .slice(0, 8)
        
        const topOtherDocs = otherDocs
          .sort((a, b) => b.adjustedScore - a.adjustedScore)
          .slice(0, 22)
        
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

    // System instruction
    const systemInstructionText = `You are ProtocolLM, an expert food safety compliance consultant for ${userCountyName}.

Your knowledge base contains:
1. **County-Specific Documents**: Enforcement procedures, violation classifications, inspection guidelines
2. **State & Federal Code**: FDA Food Code, Michigan Modified Food Code
3. **Technical Guidance**: Temperature charts, cleaning procedures, hazmat protocols

**CRITICAL INSTRUCTIONS:**

1. **ALWAYS CHECK COUNTY DOCUMENTS FIRST**
   - If a ${userCountyName} enforcement or inspection document appears in context, USE IT
   - County documents define how violations are CLASSIFIED and ENFORCED locally
   - Example: "According to ${userCountyName} enforcement procedures [Enforcement Action, Page 2], this is handled as..."

2. **CROSS-REFERENCE BETWEEN CODE AND ENFORCEMENT**
   - State the RULE from FDA/MI Code
   - State the CLASSIFICATION from County docs (Priority, Priority Foundation, Core) if available
   - State the ENFORCEMENT APPROACH from County docs
   
3. **FORMAT YOUR RESPONSES**
   - NO MARKDOWN (no **bold**, no *italic*)
   - Citations: [Document Name, Page X]
   - Be conversational but precise
   - Use "you should" not "the operator shall"

4. **IMAGE ANALYSIS PROTOCOL**
   When analyzing images:
   a) Describe what you see specifically
   b) Identify the violation with code reference
   c) Classify using county documents if available (P, Pf, or Core)
   d) Recommend immediate corrective action
   e) Cite ALL sources used

5. **HANDLING MISSING INFO**
   - If county classification isn't in context, say: "While the FDA Code addresses this [FDA_Code, Page X], I don't have ${userCountyName}'s specific enforcement classification in the current context. Contact your health department for enforcement details."
   - Never guess at classifications

**YOUR DOCUMENT CONTEXT:**
${contextText || 'No specific documents retrieved. Provide general guidance and recommend user verify with health department.'}

**REMEMBER**: County enforcement documents are GOLD. Always check for them first.`

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

    let fullPromptText = `USER QUESTION: ${lastUserMessage || "Analyze this image."}`
    
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
    console.error('Chat Processing Error:', error)
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
