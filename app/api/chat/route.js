import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { searchDocuments } from '@/lib/searchDocs'
import { sanitizeString, sanitizeCounty, sanitizeMessages } from '@/lib/sanitize'
import { logError, logInfo } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland']

// Simple rate limiting (in-memory)
const RATE_LIMITS = new Map()

function checkRateLimit(userId) {
  const now = Date.now()
  const key = userId
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 20

  let userLimit = RATE_LIMITS.get(key)

  if (!userLimit || now > userLimit.resetTime) {
    userLimit = {
      count: 0,
      resetTime: now + windowMs
    }
    RATE_LIMITS.set(key, userLimit)
  }

  if (userLimit.count >= maxRequests) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000)
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: userLimit.resetTime,
      retryAfter
    }
  }

  userLimit.count++
  RATE_LIMITS.set(key, userLimit)

  return {
    allowed: true,
    remainingRequests: maxRequests - userLimit.count,
    resetTime: userLimit.resetTime,
    retryAfter: 0
  }
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
  if (typeof response !== 'string') {
    throw new Error('Invalid response format')
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
    return 'An error occurred processing your request. Please try again.'
  }
  return error.message || 'An error occurred'
}

// NEW: Improved image validation function
function validateImageData(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    throw new Error('Invalid image data format')
  }

  // Check if it's a valid data URL
  if (!imageData.startsWith('data:image/')) {
    throw new Error('Image must be a data URL')
  }

  // Extract MIME type
  const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/)
  if (!mimeMatch) {
    throw new Error('Invalid image format')
  }

  const mimeType = mimeMatch[1]
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Image type ${mimeType} not supported. Use JPEG, PNG, or WebP.`)
  }

  // Extract base64 data
  const base64Data = imageData.split(',')[1]
  if (!base64Data || base64Data.length < 100) {
    throw new Error('Image data is too small or corrupted')
  }

  // Check size (rough estimate)
  const sizeInBytes = (base64Data.length * 3) / 4
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (sizeInBytes > maxSize) {
    throw new Error('Image is too large. Maximum size is 5MB.')
  }

  return { mimeType, base64Data }
}

export async function POST(request) {
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateCheck = checkRateLimit(session.user.id)
  
  if (!rateCheck.allowed) {
    const retryAfter = Math.ceil((rateCheck.resetTime - Date.now()) / 1000)
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please wait before sending another message.',
        resetTime: rateCheck.resetTime,
        remainingRequests: 0
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
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

    // Parse and sanitize request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { messages, image, county } = requestBody
    
    // Sanitize and validate all inputs
    let sanitizedMessages
    try {
      sanitizedMessages = sanitizeMessages(messages)
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    // Sanitize county - server-side validation
    const sanitizedCounty = sanitizeCounty(county || profile.county)

    // NEW: Improved image validation
    let validatedImage = null
    if (image) {
      if (profile.images_used >= limits.images) {
        return NextResponse.json({ 
          error: 'Monthly image analysis limit reached. Please upgrade your plan.' 
        }, { status: 429 })
      }

      try {
        validatedImage = validateImageData(image)
        console.log('✅ Image validated:', validatedImage.mimeType)
      } catch (e) {
        console.error('❌ Image validation failed:', e.message)
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
    }

    const lastUserMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || ""
    const userCounty = sanitizedCounty

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
    let contextText = ""
    let usedDocs = []

    // Document search
    if (lastUserMessage.trim().length > 0 || validatedImage) {
      try {
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
        } else {
          searchQueries = [
            lastUserMessage,
            `${lastUserMessage} requirements regulations`,
            `${lastUserMessage} violations standards`
          ]
        }

        const allResults = []
        for (const query of searchQueries) {
          if (query.trim()) {
            const results = await searchDocuments(query.trim(), 10, userCounty)
            allResults.push(...results)
          }
        }

        const uniqueResults = []
        const seenContent = new Set()
        
        for (const doc of allResults) {
          const contentKey = doc.text.substring(0, 100)
          if (!seenContent.has(contentKey) && doc.score > 0.3) {
            seenContent.add(contentKey)
            uniqueResults.push(doc)
          }
        }

        const topResults = uniqueResults
          .sort((a, b) => b.score - a.score)
          .slice(0, 30)
        
        if (topResults.length > 0) {
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
        }
      } catch (searchErr) {
        logError(searchErr, { context: 'Document search failed' })
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    
    const systemInstructionText = `You are ProtocolLM, a Food Safety Compliance Assistant for ${countyName}.

Think like an FDA-trained inspector, not a lawyer. Your job is to help restaurant operators understand and apply food safety regulations in real-world situations.

═══════════════════════════════════════════════════════════════════
HOW INSPECTORS ACTUALLY REASON (YOUR CORE METHODOLOGY):
═══════════════════════════════════════════════════════════════════

Real inspectors don't just quote codes - they apply PRINCIPLES to SITUATIONS using JUDGMENT.

**The Inspector's 3-Step Framework:**

1. **IDENTIFY THE HAZARD**
   What food safety risk does this create?
   - Cross-contamination risk?
   - Temperature abuse?
   - Pathogen growth?
   - Physical/chemical hazard?
   - Sanitation breakdown?

2. **FIND THE PRINCIPLE**
   What general regulatory principle applies?
   Example: "Missing floor tiles in a dry area may not be a violation; but missing tiles 
   where you use pressure hoses could introduce bacterial hazards."
   
   The PRINCIPLE: "Surfaces must prevent contamination"
   APPLIED TO: Specific location and use case

3. **COMMUNICATE CONVERSATIONALLY**
   Don't sound robotic. Explain your reasoning like a helpful inspector would:
   ✓ "Here's what I see..."
   ✓ "The concern is..."
   ✓ "The regulation says [citation]..."
   ✓ "So in your situation..."
   ✓ "I'd recommend..."

═══════════════════════════════════════════════════════════════════
RESPONSE STYLE REQUIREMENTS:
═══════════════════════════════════════════════════════════════════

**BE CONVERSATIONAL:**
- Use natural language: "Let me explain", "Here's the thing", "Good question"
- Break down complex regulations into plain English
- Use examples: "Think of it like this..."
- Be helpful, not preachy

**BE PRACTICAL:**
- Focus on WHY rules exist (food safety), not just WHAT they say
- Offer actionable solutions: "To fix this, you could..."
- Acknowledge real-world constraints: "I know that's not always easy, but..."

**BE ACCURATE:**
- Every claim needs a citation: **[Document Name, Page X]**
- When applying general principles, explain your reasoning explicitly
- If documents don't address something, say so clearly

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

**For Vague/General Questions:**
→ Ask clarifying questions OR
→ Address the most common scenarios
→ Provide multiple possibilities if needed

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

**NEVER:**
- Invent section numbers, temperatures, or time limits
- Claim certainty when documents don't provide clear guidance
- Use phrases like "the code requires" without a citation
- Make up procedures not found in the documents

═══════════════════════════════════════════════════════════════════
UNCERTAINTY ACKNOWLEDGMENT:
═══════════════════════════════════════════════════════════════════

When you're not certain, use these phrases:
- "I don't see specific guidance on this in the documents"
- "Based on related principles..."
- "This would likely apply because..."
- "I'd recommend verifying this with your inspector"
- "The documents don't specifically mention [X], but..."
- "This is an area where interpretation matters"

Being honest about limits builds trust. Restaurants need accuracy, not false confidence.

═══════════════════════════════════════════════════════════════════
RETRIEVED CONTEXT (Your Knowledge Base):
═══════════════════════════════════════════════════════════════════

${contextText || 'WARNING: No relevant documents retrieved. You MUST inform the user that you need more specific information or cannot find regulations on their topic.'}

═══════════════════════════════════════════════════════════════════
REMEMBER:
═══════════════════════════════════════════════════════════════════

You're not just a search engine - you're a knowledgeable assistant who understands 
HOW regulations work and WHY they exist. Help users understand the principles behind 
the rules so they can make good decisions even in situations you haven't explicitly 
discussed.

But never sacrifice accuracy for helpfulness. "I don't know" is a valid and important 
answer when documents don't provide clear guidance.`

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

    let userMessageParts = []
    
    if (sanitizedMessages.length > 1) {
      const historyText = sanitizedMessages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n')
      userMessageParts.push({ text: `CONVERSATION HISTORY:\n${historyText}\n\n` })
    }

    userMessageParts.push({ text: `USER QUESTION: ${lastUserMessage}` })

    // NEW: Properly format image for Vertex AI
    if (validatedImage) {
      userMessageParts.push({
        inlineData: {
          mimeType: validatedImage.mimeType,
          data: validatedImage.base64Data
        }
      })
      
      userMessageParts.push({ 
        text: `INSTRUCTIONS FOR IMAGE ANALYSIS:
1. First, describe what you see in the image objectively
2. Identify potential food safety hazards based ONLY on regulations in RETRIEVED CONTEXT
3. For each issue, cite the specific regulation
4. If you cannot find relevant regulations for what you see, explicitly state that
5. Always recommend verification with health inspector for serious concerns

Analyze this image against the sanitation, equipment maintenance, and physical facility standards in the RETRIEVED CONTEXT.` 
      })
    }

    const requestPayload = {
      contents: [{ role: 'user', parts: userMessageParts }]
    }

    console.log('🚀 Sending request to Vertex AI...')
    const result = await generativeModel.generateContent(requestPayload)
    const response = await result.response
    const text = response.candidates[0].content.parts[0].text

    const validatedText = validateApiResponse(text)

    const hasCitations = /\*\*\[.*?,\s*Page/.test(validatedText)
    const makesFactualClaims = /violat|requir|must|shall|prohibit|standard/i.test(validatedText)
    
    if (makesFactualClaims && !hasCitations && !validatedText.includes('cannot find') && !validatedText.includes('do not directly address')) {
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

    console.log('✅ Request successful')

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
    return NextResponse.json({ 
      error: sanitizeError(error)
    }, { status: 500 })
  }
}
