import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { searchDocuments } from '@/lib/searchDocs'
import { chatRateLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland']

// Validate environment variables on startup
function validateEnvironment() {
  const required = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CREDENTIALS_JSON',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
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
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON', e)
    }
  }
  return null
}

// Validate and sanitize API responses
function validateApiResponse(response) {
  if (typeof response !== 'string') {
    throw new Error('Invalid response format')
  }
  
  // Remove any potential script tags or dangerous content
  let cleaned = response
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
  
  // Limit response length to prevent memory issues
  if (cleaned.length > 50000) {
    cleaned = cleaned.substring(0, 50000) + '\n\n...[Response truncated for length]'
  }
  
  return cleaned
}

// Sanitize errors for production
function sanitizeError(error) {
  console.error('Chat API Error:', error)
  
  if (process.env.NODE_ENV === 'production') {
    // Don't expose internal error details in production
    return 'An error occurred processing your request. Please try again.'
  }
  return error.message || 'An error occurred'
}

export async function POST(request) {
  // Validate environment before processing
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

  // SERVER-SIDE RATE LIMITING
  const rateCheck = await chatRateLimiter.checkLimit(session.user.id, 'chat')
  
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
          'X-RateLimit-Limit': '10',
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

    // RATE LIMITING: Check usage limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', session.user.id)
      .single()

    const limits = subscription?.plan === 'enterprise'
      ? { requests: 5000, images: 500 }
      : { requests: 500, images: 50 }

    // Check request limit
    if (profile.requests_used >= limits.requests) {
      return NextResponse.json({ 
        error: 'Monthly request limit reached. Please upgrade your plan or wait for the next billing cycle.' 
      }, { status: 429 })
    }

    const { messages, image, county } = await request.json()
    
    // INPUT VALIDATION
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }

    // Validate county parameter
    if (county && !VALID_COUNTIES.includes(county)) {
      return NextResponse.json({ error: 'Invalid county parameter' }, { status: 400 })
    }

    // Validate message content
    const lastUserMessage = messages[messages.length - 1]?.content || ""
    if (typeof lastUserMessage !== 'string' || lastUserMessage.length > 5000) {
      return NextResponse.json({ error: 'Invalid message format or length' }, { status: 400 })
    }

    // Check image limit separately
    if (image && profile.images_used >= limits.images) {
      return NextResponse.json({ 
        error: 'Monthly image analysis limit reached. Please upgrade your plan.' 
      }, { status: 429 })
    }

    // Validate image format if provided
    if (image) {
      if (typeof image !== 'string' || !image.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
      }
      
      // Additional check for image size (already validated client-side, but double-check)
      const base64Length = image.split(',')[1]?.length || 0
      const sizeInBytes = (base64Length * 3) / 4
      if (sizeInBytes > 5 * 1024 * 1024) { // 5MB
        return NextResponse.json({ error: 'Image too large' }, { status: 400 })
      }
    }

    const userCounty = VALID_COUNTIES.includes(county || profile.county) ? (county || profile.county) : 'washtenaw'

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

    const model = 'gemini-2.5-flash'
    let contextText = ""
    let usedDocs = []

    // ENHANCED SEARCH STRATEGY
    if (lastUserMessage.trim().length > 0 || image) {
      try {
        let searchQueries = []
        
        if (image) {
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
        console.error("Search failed:", searchErr)
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    
    // CONVERSATIONAL + ACCURATE INSPECTOR-STYLE SYSTEM PROMPT
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
    
    if (messages.length > 1) {
      const historyText = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n')
      userMessageParts.push({ text: `CONVERSATION HISTORY:\n${historyText}\n\n` })
    }

    userMessageParts.push({ text: `USER QUESTION: ${lastUserMessage}` })

    if (image && image.includes('base64,')) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      userMessageParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
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

    const result = await generativeModel.generateContent(requestPayload)
    const response = await result.response
    const text = response.candidates[0].content.parts[0].text

    // VALIDATE API RESPONSE
    const validatedText = validateApiResponse(text)

    // Validation check
    const hasCitations = /\*\*\[.*?,\s*Page/.test(validatedText)
    const makesFactualClaims = /violat|requir|must|shall|prohibit|standard/i.test(validatedText)
    
    if (makesFactualClaims && !hasCitations && !validatedText.includes('cannot find') && !validatedText.includes('do not directly address')) {
      console.warn('⚠️ Response lacks required citations:', validatedText.substring(0, 200))
    }

    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (image) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    const citations = []
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match
    while ((match = citationRegex.exec(validatedText)) !== null) {
      citations.push({ document: match[1], pages: match[2], county: userCounty })
    }

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
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateCheck.remainingRequests.toString(),
        'X-RateLimit-Reset': Math.floor(rateCheck.resetTime / 1000).toString()
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: sanitizeError(error)
    }, { status: 500 })
  }
}
