import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
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

function validateApiResponse(response) {
  if (!response || typeof response !== 'string') {
    return "I analyzed the image but couldn't generate a text description. Please try asking a specific question about it."
  }
  
  let cleaned = response
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
  
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
  
  if (mimeType === 'image/jpg') {
    mimeType = 'image/jpeg'
  }

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
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array')
  }

  if (messages.length > 100) {
    throw new Error('Too many messages')
  }

  return messages.map(msg => {
    if (!msg || typeof msg !== 'object') {
      throw new Error('Invalid message format')
    }

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

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.log('❌ No session found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('✅ User authenticated:', session.user.email)

  const rateCheck = await checkRateLimit(session.user.id, 'chat')
  
  if (!rateCheck.allowed) {
    console.log('⏱️  Rate limit exceeded')
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please wait before sending another message.',
        resetTime: rateCheck.resetTime,
        remainingRequests: 0
      },
      { 
        status: 429,
        headers: {
          'Retry-After': rateCheck.retryAfter.toString(),
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor(rateCheck.resetTime / 1000).toString()
        }
      }
    )
  }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used, images_used, county')
      .eq('id', session.user.id)
      .single()

    console.log('📊 User profile:', {
      subscribed: profile?.is_subscribed,
      requests: profile?.requests_used,
      county: profile?.county
    })

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
        error: 'Monthly request limit reached. Please upgrade your plan or wait for the next billing cycle.' 
      }, { status: 429 })
    }

    let requestBody
    try {
      requestBody = await request.json()
    } catch (e) {
      console.error('❌ Invalid JSON:', e)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { messages, image, county } = requestBody
    
    let sanitizedMessages = []
    try {
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages are required')
      }
      sanitizedMessages = sanitizeMessages(messages)
      console.log('✅ Messages sanitized:', sanitizedMessages.length)
    } catch (e) {
      console.error('❌ Message validation error:', e)
      return NextResponse.json({ error: 'Invalid message format: ' + e.message }, { status: 400 })
    }

    const sanitizedCounty = sanitizeCounty(county || profile.county)

    let validatedImage = null
    if (image) {
      console.log('📷 Image detected in request')
      
      if (profile.images_used >= limits.images) {
        return NextResponse.json({ 
          error: 'Monthly image analysis limit reached. Please upgrade your plan.' 
        }, { status: 429 })
      }

      try {
        validatedImage = validateImageData(image)
        console.log('✅ Image validated:', validatedImage.mimeType)
      } catch (e) {
        console.error('❌ Image validation error:', e)
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
    }

    const lastUserMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || ""
    const userCounty = sanitizedCounty

    console.log('🎯 Query details:', {
      message: lastUserMessage.substring(0, 100),
      county: userCounty,
      hasImage: !!validatedImage
    })

    const credentials = getVertexCredentials()
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID || credentials?.project_id
    
    if (!credentials || !project) {
      throw new Error('System configuration error: Google Cloud Credentials missing.')
    }

    const vertex_ai = new VertexAI({
      project: project,
      location: 'us-central1',
      googleAuthOptions: { credentials }
    })

    const model = 'gemini-2.0-flash-exp'

    // RAG / Document Search - ENHANCED LOGGING
    let contextText = ""
    let usedDocs = []

    if (lastUserMessage.trim().length > 0 || validatedImage) {
      try {
        console.log('🔍 Starting document search...')
        console.log('   Query:', lastUserMessage.substring(0, 100))
        console.log('   County:', userCounty)
        console.log('   Has image:', !!validatedImage)
        
        let searchQueries = []
        
        if (validatedImage) {
          searchQueries = [
            'equipment maintenance repair good working order',
            'physical facilities walls floors ceilings surfaces',
            'plumbing water supply sewage drainage',
            'sanitation cleaning procedures requirements',
            'food contact surfaces utensils equipment',
            lastUserMessage
          ]
          console.log('   Using IMAGE search queries')
        } else {
          searchQueries = [
            lastUserMessage,
            `${lastUserMessage} requirements regulations`,
            `${lastUserMessage} violations standards`
          ]
          console.log('   Using TEXT search queries')
        }

        const allResults = []
        let queryCount = 0
        
        for (const query of searchQueries) {
          if (query && query.trim()) {
            queryCount++
            console.log(`   📝 Search query ${queryCount}:`, query.substring(0, 60))
            
            try {
              const results = await searchDocuments(query.trim(), 10, userCounty)
              console.log(`   ✅ Query ${queryCount} returned ${results.length} results`)
              
              if (results.length > 0) {
                console.log(`      Top result: ${results[0].source} (score: ${results[0].score})`)
              }
              
              allResults.push(...results)
            } catch (searchError) {
              console.error(`   ❌ Query ${queryCount} failed:`, searchError.message)
            }
          }
        }

        console.log(`   📊 Total results collected: ${allResults.length}`)

        const uniqueResults = []
        const seenContent = new Set()
        
        for (const doc of allResults) {
          const contentKey = doc.text.substring(0, 100)
          if (!seenContent.has(contentKey) && doc.score > 0.3) {
            seenContent.add(contentKey)
            uniqueResults.push(doc)
          }
        }

        console.log(`   🔄 Unique results after deduplication: ${uniqueResults.length}`)

        const topResults = uniqueResults
          .sort((a, b) => b.score - a.score)
          .slice(0, 30)
        
        console.log(`   🎯 Final top results: ${topResults.length}`)
        
        if (topResults.length > 0) {
          console.log('   ✅ Building context text...')
          
          contextText = topResults.map((doc, idx) => `[DOCUMENT ${idx + 1}]
SOURCE: ${doc.source || 'Unknown'}
PAGE: ${doc.page || 'N/A'}
COUNTY: ${COUNTY_NAMES[userCounty]}
RELEVANCE: ${(doc.score * 100).toFixed(1)}%
CONTENT: ${doc.text}`).join("\n---\n\n")
          
          usedDocs = topResults.map(r => ({ 
            document: r.source, 
            pages: r.page,
            relevance: r.score 
          }))
          
          console.log(`   📄 Context text length: ${contextText.length} chars`)
          console.log(`   📚 Documents in context:`, usedDocs.map(d => d.document).join(', '))
        } else {
          console.warn('   ⚠️  No results met threshold (score > 0.3)')
        }
      } catch (searchErr) {
        console.error('   ❌ Document search failed:', searchErr)
        console.error('   Stack:', searchErr.stack)
        logError(searchErr, { context: 'Document search failed' })
      }
    } else {
      console.log('🔍 Skipping document search (empty query and no image)')
    }

    console.log('📝 Context summary:')
    console.log('   Has context:', contextText.length > 0)
    console.log('   Documents used:', usedDocs.length)

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    
    const systemInstructionText = `You are ProtocolLM, a Food Safety Compliance Assistant for ${countyName}.

Think like an FDA-trained inspector, not a lawyer. Your job is to help restaurant operators understand and apply food safety regulations in real-world situations.

═══════════════════════════════════════════════════════════════════
THE REASONING FRAMEWORK (USE THIS FOR EVERY RESPONSE):
═══════════════════════════════════════════════════════════════════

**For Specific Questions (temp, time, procedures):**
→ Find the exact regulation
→ Quote it with citation
→ Explain how to apply it
→ Add practical tips

**For Image Analysis (equipment, facilities):**
→ Describe what you observe
→ Identify potential food safety hazards
→ Apply general maintenance/sanitation principles
→ Cite the relevant standard
→ Make specific recommendations

**For Scenarios Not Directly Addressed:**
→ Be honest about what's in the documents
→ Apply related principles with clear reasoning
→ Recommend verification

═══════════════════════════════════════════════════════════════════
CRITICAL ACCURACY RULES:
═══════════════════════════════════════════════════════════════════

**ALWAYS cite when you:**
- Give specific numbers (temperatures, times, concentrations)
- Quote regulations directly
- State what's required, prohibited, or allowed
- Reference inspection criteria

**CLEARLY flag when you're:**
- Applying a general principle to a specific case
- Making reasonable inferences
- Giving recommendations vs. requirements
- Unsure or lacking specific guidance

═══════════════════════════════════════════════════════════════════
RETRIEVED CONTEXT (Your Knowledge Base):
═══════════════════════════════════════════════════════════════════

${contextText || 'WARNING: No relevant documents retrieved. You MUST inform the user that you need more specific information or cannot find regulations on their topic.'}`

    console.log('🤖 Initializing Vertex AI model...')

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 20
      }
    })

    let fullPromptText = ""

    if (sanitizedMessages.length > 1) {
      const historyText = sanitizedMessages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n')
      fullPromptText += `CONVERSATION HISTORY:\n${historyText}\n\n`
    }

    fullPromptText += `USER QUESTION: ${lastUserMessage.trim() || "Analyze this image for compliance violations."}`

    if (validatedImage) {
      fullPromptText += `\n\nINSTRUCTIONS FOR IMAGE ANALYSIS:
1. First, describe what you see in the image objectively
2. Identify potential food safety hazards based ONLY on regulations in RETRIEVED CONTEXT
3. For each issue, cite the specific regulation
4. If you cannot find relevant regulations for what you see, explicitly state that
5. Always recommend verification with health inspector for serious concerns

Analyze this image against the sanitation, equipment maintenance, and physical facility standards in the RETRIEVED CONTEXT.`
    }

    const parts = []

    if (validatedImage) {
      parts.push({
        inlineData: {
          mimeType: validatedImage.mimeType,
          data: validatedImage.base64Data
        }
      })
      console.log('📷 Image added to request')
    }

    parts.push({ text: fullPromptText })

    const requestPayload = {
      contents: [{ role: 'user', parts: parts }]
    }

    console.log('🚀 Calling Vertex AI...')
    const result = await generativeModel.generateContent(requestPayload)
    const response = await result.response
    
    let text = ""
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
        text = response.candidates[0].content.parts[0].text
        console.log('✅ Received AI response:', text.length, 'chars')
    } else if (response.promptFeedback && response.promptFeedback.blockReason) {
        throw new Error(`AI Safety Block: ${response.promptFeedback.blockReason}`)
    } else {
        throw new Error("AI response was empty or blocked.")
    }

    const validatedText = validateApiResponse(text)

    const hasCitations = /\*\*\[.*?,\s*Page/.test(validatedText)
    const makesFactualClaims = /violat|requir|must|shall|prohibit|standard/i.test(validatedText)
    
    if (makesFactualClaims && !hasCitations && !validatedText.includes('cannot find') && !validatedText.includes('do not directly address')) {
      console.warn('⚠️  Response lacks required citations')
      logInfo('Response lacks required citations', { 
        preview: validatedText.substring(0, 200),
        userId: session.user.id 
      })
    }

    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (validatedImage) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    const citations = []
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match
    while ((match = citationRegex.exec(validatedText)) !== null) {
      citations.push({ document: match[1], pages: match[2], county: userCounty })
    }

    console.log('✅ Response generated successfully')
    console.log('   Response length:', validatedText.length)
    console.log('   Citations found:', citations.length)
    console.log('   Documents searched:', usedDocs.length)

    return NextResponse.json({ 
      message: validatedText,
      county: userCounty,
      citations: citations,
      documentsSearched: usedDocs.length,
      contextQuality: usedDocs.length > 0 ? 'good' : 'insufficient',
      rateLimit: {
        remaining: rateCheck.remainingRequests,
        resetTime: rateCheck.resetTime
      }
    }, {
      headers: {
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': rateCheck.remainingRequests.toString(),
        'X-RateLimit-Reset': Math.floor(rateCheck.resetTime / 1000).toString()
      }
    })

  } catch (error) {
    console.error('❌ Chat API Error:', error)
    console.error('   Stack:', error.stack)
    return NextResponse.json({ 
      error: sanitizeError(error)
    }, { status: 500 })
  }
}
