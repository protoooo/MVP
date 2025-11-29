import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are ProtocolLM, a food safety compliance assistant for Michigan restaurants.

**CRITICAL RULES:**
1. **HIERARCHY**: Always follow this priority:
   - LOCAL COUNTY CODE (Washtenaw/Wayne/Oakland) = LAW
   - Michigan Modified Food Code = STATE LAW
   - FDA Food Code 2022 = FEDERAL GUIDANCE (use only if no local/state rule exists)

2. **SOURCE VERIFICATION**: You must cite the EXACT document name and page for every answer. Format: [Source Name, Page X]

3. **ACCURACY OVER SPEED**: If context doesn't have the answer, say "I don't see this specific rule in the county documents. Verify with your local health department."

4. **NEVER GUESS**: Don't extrapolate beyond what the documents explicitly state.

FORMATTING:
- Use Markdown
- Start with the direct answer
- Cite sources inline like this: [Washtenaw Enforcement, Page 3]
- If multiple sources conflict, explain the hierarchy`

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Server Error: Missing API Key' }, { status: 500 })
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

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

    if (lastMessage.content) {
      try {
        console.log(`🔍 Searching for context in: ${county}`)
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
           console.log(`✅ Found ${searchResults.length} documents`)
           
           // Group by source to show hierarchy
           const countyDocs = searchResults.filter(d => d.docType === 'county')
           const stateDocs = searchResults.filter(d => d.docType === 'state')
           const federalDocs = searchResults.filter(d => d.docType === 'federal')
           
           let contextParts = []
           
           if (countyDocs.length > 0) {
             contextParts.push('=== LOCAL COUNTY REGULATIONS (PRIMARY AUTHORITY) ===')
             countyDocs.forEach(doc => {
               contextParts.push(`[Source: ${doc.source}, Page ${doc.page}]\n${doc.text}`)
             })
           }
           
           if (stateDocs.length > 0) {
             contextParts.push('\n=== MICHIGAN STATE CODE (SECONDARY AUTHORITY) ===')
             stateDocs.forEach(doc => {
               contextParts.push(`[Source: ${doc.source}, Page ${doc.page}]\n${doc.text}`)
             })
           }
           
           if (federalDocs.length > 0) {
             contextParts.push('\n=== FDA GUIDANCE (USE IF NO LOCAL/STATE RULE) ===')
             federalDocs.forEach(doc => {
               contextParts.push(`[Source: ${doc.source}, Page ${doc.page}]\n${doc.text}`)
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

    const prompt = [
      { text: SYSTEM_PROMPT },
      { text: `USER JURISDICTION: ${county || 'washtenaw'}` },
      { text: `REGULATORY CONTEXT:\n${context || 'No specific documents found. Inform user to verify with health department.'}` },
      { text: `USER QUERY: ${lastMessage.content}` }
    ]

    if (image) {
      const base64Data = image.split(',')[1]
      prompt.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
      prompt.push({ text: "Analyze the image STRICTLY against the Regulatory Context. Cite sources." })
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Increment usage counter
    await supabase.rpc('increment_usage', { user_id: session.user.id, is_image: !!image })

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('Chat Route Error:', error)
    return NextResponse.json({ 
      error: 'Unable to process request. Please try again.',
      fallback: 'If this persists, contact support with timestamp: ' + new Date().toISOString()
    }, { status: 500 })
  }
}
