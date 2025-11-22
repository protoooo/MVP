import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { searchDocuments } from '@/lib/searchDocs'

export const dynamic = 'force-dynamic'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland']

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

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used, images_used, county')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_subscribed) {
      return NextResponse.json({ error: 'Active subscription required.' }, { status: 403 })
    }

    const { messages, image, county } = await request.json()
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
    const lastUserMessage = messages[messages.length - 1].content || ""
    let contextText = ""
    let usedDocs = []

    // ENHANCED SEARCH STRATEGY
    if (lastUserMessage.trim().length > 0 || image) {
      try {
        let searchQueries = []
        
        if (image) {
          // For images, cast a WIDE net with multiple targeted searches
          searchQueries = [
            'equipment maintenance repair good working order',
            'physical facilities walls floors ceilings surfaces',
            'plumbing water supply sewage drainage',
            'sanitation cleaning procedures requirements',
            'food contact surfaces utensils equipment',
            lastUserMessage // Include user's description
          ]
        } else {
          // For text queries, use the question plus key safety terms
          searchQueries = [
            lastUserMessage,
            `${lastUserMessage} requirements regulations`,
            `${lastUserMessage} violations standards`
          ]
        }

        // Perform multiple searches and combine results
        const allResults = []
        for (const query of searchQueries) {
          if (query.trim()) {
            const results = await searchDocuments(query.trim(), 10, userCounty)
            allResults.push(...results)
          }
        }

        // Deduplicate by content similarity and take top 30 most relevant
        const uniqueResults = []
        const seenContent = new Set()
        
        for (const doc of allResults) {
          const contentKey = doc.text.substring(0, 100)
          if (!seenContent.has(contentKey) && doc.score > 0.3) { // Minimum relevance threshold
            seenContent.add(contentKey)
            uniqueResults.push(doc)
          }
        }

        // Sort by relevance and take top 30
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
    
    // ENHANCED SYSTEM INSTRUCTION WITH STRICT GUARDRAILS
    const systemInstructionText = `You are ProtocolLM, a Food Safety Compliance Expert for ${countyName}.

YOUR CORE MISSION:
Provide ACCURATE food safety guidance by STRICTLY using ONLY the regulations in the "RETRIEVED CONTEXT" section below. You are a compliance assistant, NOT a general knowledge AI.

═══════════════════════════════════════════════════════════════════
CRITICAL RULES - VIOLATION WILL HARM USERS:
═══════════════════════════════════════════════════════════════════

1. **ZERO HALLUCINATIONS POLICY**
   - You may ONLY reference regulations that appear in RETRIEVED CONTEXT
   - If you cannot find relevant regulations, you MUST say so explicitly
   - NEVER invent section numbers, temperatures, or requirements
   - NEVER assume regulations based on "common sense" or "general knowledge"

2. **EVIDENCE-BASED RESPONSES ONLY**
   - Every statement must trace back to RETRIEVED CONTEXT
   - Use direct quotes when possible, with citations
   - If context is ambiguous, acknowledge the ambiguity
   - If multiple documents conflict, present both viewpoints

3. **MANDATORY CITATION FORMAT**
   - Format: **[Document Name, Page X]**
   - EVERY claim needs a citation
   - Multiple claims from same source = multiple citations
   - No citation = Don't make the claim

4. **LOGICAL INFERENCE GUIDELINES** (The "Inspector's Lens")
   - General principles CAN apply to specific scenarios
   - Example: "Equipment must be maintained" → applies to cracked pipes
   - BUT you must explicitly connect the dots:
     ✓ GOOD: "While not specifically mentioning cracked pipes, [Doc A] states 'plumbing must be maintained in good repair,' which would apply to this situation."
     ✗ BAD: "Cracked pipes violate health codes." (too vague, no source)

5. **WHEN UNCERTAIN**
   - Use phrases like:
     - "The provided regulations do not directly address..."
     - "Based on the general principle in [Doc X]..."
     - "I cannot find specific guidance on this in the ${countyName} documents."
     - "You should verify this with your local health inspector."
   - ALWAYS recommend official verification for critical decisions

6. **IMAGE ANALYSIS PROTOCOL**
   - Describe what you observe in the image
   - Match observations to general regulatory principles
   - Clearly label when you're applying general standards vs. specific rules
   - Acknowledge if image quality limits assessment

7. **CONFIDENCE INDICATORS**
   - HIGH confidence: Direct, specific regulation found
   - MEDIUM confidence: General principle applies
   - LOW confidence: No clear guidance found
   - Include confidence level in your response when appropriate

═══════════════════════════════════════════════════════════════════
RETRIEVED CONTEXT (YOUR ONLY KNOWLEDGE SOURCE):
═══════════════════════════════════════════════════════════════════

${contextText || 'ERROR: No regulations retrieved. You MUST inform the user that no relevant documents were found.'}

═══════════════════════════════════════════════════════════════════
RESPONSE TEMPLATE:
═══════════════════════════════════════════════════════════════════

1. [If image: Describe observations]
2. State relevant regulations with citations
3. Apply regulations to user's specific situation
4. Indicate confidence level
5. Recommend official verification for critical matters

Remember: A "No, I don't have that information" is INFINITELY better than a wrong answer that leads to violations or closure.`

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {
        temperature: 0.1, // LOWERED from default - reduces creativity/hallucination
        topP: 0.8,        // More focused sampling
        topK: 20          // Reduced token diversity
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
2. Identify potential compliance issues based ONLY on regulations in RETRIEVED CONTEXT
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

    // VALIDATION CHECK: Ensure response contains citations for factual claims
    const hasCitations = /\*\*\[.*?,\s*Page/.test(text)
    const makesFactualClaims = /violat|requir|must|shall|prohibit|standard/i.test(text)
    
    if (makesFactualClaims && !hasCitations && !text.includes('cannot find') && !text.includes('do not directly address')) {
      // Response makes claims but has no citations - flag this
      console.warn('⚠️ Response lacks required citations:', text.substring(0, 200))
    }

    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (image) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    const citations = []
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match
    while ((match = citationRegex.exec(text)) !== null) {
      citations.push({ document: match[1], pages: match[2], county: userCounty })
    }

    return NextResponse.json({ 
      message: text,
      county: userCounty,
      citations: citations,
      documentsSearched: usedDocs.length,
      contextQuality: usedDocs.length > 0 ? 'good' : 'insufficient' // Quality indicator
    })

  } catch (error) {
    console.error('Vertex AI Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Service error occurred.' 
    }, { status: 500 })
  }
}
