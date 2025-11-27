import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are ProtocolLM, a specialized regulatory intelligence engine.

**CORE INSTRUCTIONS:**
1. **Visual & Textual Analysis:** When analyzing images, comparing the visual evidence strictly against the provided **Regulatory Context** (Local County Codes) and the FDA Food Code.
2. **Prioritize Local Data:** ALWAYS cite the Local/County document found in the context FIRST. 
3. **Resourcefulness:** If the image shows a specific equipment setup (e.g., a 3-comp sink), use the context to find the specific air-gap or plumbing rules for that county and verify if the image matches the rule.
4. **Citations:** Format citations as **[Source Name, Page X]**.

FORMATTING:
- Use Markdown.
- Be direct, professional, and authoritative.`

export async function POST(req) {
  try {
    // 1. Initialize Google AI
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Server Error: Missing API Key' }, { status: 500 })
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // 2. Initialize Supabase
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

    // 3. Rate Limit
    const limitCheck = await checkRateLimit(session.user.id)
    if (!limitCheck.success) {
      return NextResponse.json({ error: limitCheck.message || 'Limit reached' }, { status: 429 })
    }
    
    // Image Limit Check
    const body = await req.json()
    const { messages, image, county } = body
    
    if (image) {
      if (limitCheck.currentImages >= limitCheck.imageLimit) {
        return NextResponse.json({ error: `Image limit reached for ${limitCheck.plan} plan.` }, { status: 429 })
      }
    }

    const lastMessage = messages[messages.length - 1]
    let context = ''
    let citations = []

    // 4. SEARCH (Updated: Runs even if image exists, as long as there is text)
    if (lastMessage.content) {
      try {
        console.log(`🔍 Searching for context in: ${county}`)
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
           console.log(`✅ Found ${searchResults.length} documents`)
           context = searchResults.map(doc => 
            `[Source: ${doc.metadata.filename || doc.source}, Page ${doc.metadata.page || doc.page}]\nContent: ${doc.text || doc.content}`
          ).join('\n\n')
          
          citations = searchResults.map(doc => ({
            document: (doc.metadata.filename || doc.source).replace('.pdf', ''),
            pages: [doc.metadata.page || doc.page]
          }))
        } else {
          console.log('⚠️ No local documents matched.')
        }
      } catch (err) {
        console.error('Search Error:', err)
      }
    }

    // 5. Generate
    const prompt = [
      { text: SYSTEM_PROMPT },
      { text: `USER CURRENT JURISDICTION: ${county || 'washtenaw'}` },
      { text: `OFFICIAL REGULATORY CONTEXT:\n${context || 'No specific local documents found. Rely on FDA Food Code.'}` },
      { text: `USER QUERY: ${lastMessage.content}` }
    ]

    if (image) {
      const base64Data = image.split(',')[1]
      prompt.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
      prompt.push({ text: "Analyze the image above specifically against the Regulatory Context provided." })
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // 6. Update Usage
    supabase.rpc('increment_usage', { user_id: session.user.id, is_image: !!image })

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('Chat Route Error:', error)
    return NextResponse.json({ error: `System Error: ${error.message}` }, { status: 500 })
  }
}
