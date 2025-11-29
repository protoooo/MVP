import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

// OPTIMIZED PROMPT FOR CLARITY AND ACTIONABILITY
const SYSTEM_PROMPT = `You are ProtocolLM, an expert food safety compliance assistant for Michigan restaurants.

**CORE OBJECTIVE:**
Help restaurant operators understand health codes and fix violations immediately. Be concise, authoritative, and helpful.

**HIERARCHY OF AUTHORITY (CRITICAL):**
1. **LOCAL COUNTY CODE** (Washtenaw/Wayne/Oakland) is the supreme law.
2. **MICHIGAN MODIFIED FOOD CODE** applies if the county is silent.
3. **FDA FOOD CODE 2022** is guidance only if local/state rules don't exist.
*If sources conflict, apply the STRICTER standard.*

**RESPONSE STRUCTURE:**
1. **DIRECT ANSWER:** Start with the specific rule (Yes/No/The Number).
2. **THE FIX (For Violations):** If the user asks about a violation or "fixing" something, provide the specific "Corrective Action" required by the code.
3. **EVIDENCE:** Cite sources exactly as: [Source Name, Page X].

**RULES:**
- **NO FLUFF:** Do not lecture. Do not say "It is important to..." just state the rule.
- **UNCERTAINTY:** If the provided context is missing the answer, say: "This specific detail isn't in your county's loaded documents. Please verify with your inspector."
- **IMAGE ANALYSIS:** If an image is provided, identify potential "Priority" (Critical) violations first.

**FORMATTING:**
Use Markdown. Use bolding for temperatures and critical numbers.`

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Server Error: Missing API Key' }, { status: 500 })
    
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Using gemini-2.0-flash-exp for speed and multimodal capabilities
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.3, // Lower temperature for more factual/compliant answers
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024, // Keep answers concise
      }
    })

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check rate limits
    const limitCheck = await checkRateLimit(session.user.id)
    if (!limitCheck.success) {
      return NextResponse.json({ 
        error: limitCheck.message || 'Usage limit reached',
        limitReached: true 
      }, { status: 429 })
    }
    
    const body = await req.json()
    const { messages, image, county } = body
    
    // Check image limits
    if (image) {
      if (limitCheck.currentImages >= limitCheck.imageLimit) {
        return NextResponse.json({ 
          error: `Image analysis limit reached for ${limitCheck.plan} plan.`,
          limitReached: true 
        }, { status: 429 })
      }
    }

    const lastMessage = messages[messages.length - 1]
    let context = ''
    let citations = []

    // RAG: Document Search Logic
    if (lastMessage.content) {
      try {
        console.log(`🔍 Searching for context in: ${county}`)
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
           console.log(`✅ Found ${searchResults.length} documents`)
           
           // Sort documents to ensure Local matches are top of context
           const countyDocs = searchResults.filter(d => d.docType === 'county')
           const stateDocs = searchResults.filter(d => d.docType === 'state')
           const federalDocs = searchResults.filter(d => d.docType === 'federal')
           
           let contextParts = []
           
           if (countyDocs.length > 0) {
             contextParts.push('=== 1. LOCAL COUNTY REGULATIONS (HIGHEST AUTHORITY) ===')
             countyDocs.forEach(doc => {
               contextParts.push(`SOURCE: ${doc.source} (Page ${doc.page}):\n"${doc.text}"`)
             })
           }
           
           if (stateDocs.length > 0) {
             contextParts.push('\n=== 2. MICHIGAN STATE CODE (SECONDARY AUTHORITY) ===')
             stateDocs.forEach(doc => {
               contextParts.push(`SOURCE: ${doc.source} (Page ${doc.page}):\n"${doc.text}"`)
             })
           }
           
           if (federalDocs.length > 0) {
             contextParts.push('\n=== 3. FDA GUIDANCE (FALLBACK AUTHORITY) ===')
             federalDocs.forEach(doc => {
               contextParts.push(`SOURCE: ${doc.source} (Page ${doc.page}):\n"${doc.text}"`)
             })
           }
           
           context = contextParts.join('\n\n')
          
           citations = searchResults.map(doc => ({
             document: doc.source.replace('.pdf', ''),
             pages: [doc.page],
             authority: doc.docType
           }))
        } else {
          console.log('⚠️ No local documents matched.')
        }
      } catch (err) {
        console.error('Search Error:', err)
      }
    }

    // Construct the Prompt
    const promptParts = [
      { text: SYSTEM_PROMPT },
      { text: `\nUSER JURISDICTION: ${county || 'washtenaw'}` },
      { text: `\nOFFICIAL REGULATORY CONTEXT FOUND:\n${context || 'No exact text match found in database. Rely on general Michigan Food Code knowledge but disclaimer it.'}` },
      { text: `\nUSER QUESTION: ${lastMessage.content}` }
    ]

    // Handle Image Input
    if (image) {
      const base64Data = image.split(',')[1]
      promptParts.push({ 
        inlineData: { 
          mimeType: 'image/jpeg', 
          data: base64Data 
        } 
      })
      promptParts.push({ text: "\nTASK: Analyze this image for health code violations. If you see a violation, cite the specific code from the Context above that prohibits it." })
    }

    // Generate content
    const result = await model.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    // Increment usage counter in Supabase
    const { error: usageError } = await supabase.rpc('increment_usage', { 
      user_id: session.user.id, 
      is_image: !!image 
    })

    if (usageError) {
      console.error('❌ Failed to increment usage:', usageError)
    }

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('Chat Route Error:', error)
    
    // Handle specific Gemini API errors
    if (error.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ 
        error: 'High traffic. Please try again in 10 seconds.',
        fallback: true
      }, { status: 429 })
    }
    
    return NextResponse.json({ 
      error: 'We encountered an issue processing your request. Please try again.',
      fallback: true
    }, { status: 500 })
  }
}
