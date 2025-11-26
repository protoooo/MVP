import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are ProtocolLM, a specialized regulatory intelligence engine.

**CRITICAL INSTRUCTION: PRIORITIZE LOCAL DATA**
1. You have access to specific County Enforcement Manuals (Washtenaw, Wayne, Oakland) in your context.
2. **ALWAYS cite the Local/County document FIRST.** Only cite the FDA Food Code as a secondary backup.
3. If the context contains a document like "Washtenaw Enforcement Action", use it. Do NOT say "I don't have specific knowledge." The knowledge is in the context provided below.
4. If asked about violations, list the specific Priority (P) or Priority Foundation (Pf) items found in the context.

FORMATTING:
- Use Markdown.
- Format Citations as: **[Source Name, Page X]**
- Be direct and professional.`

export async function POST(req) {
  try {
    // 1. Initialize Google AI (Matches your Script)
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

    const body = await req.json()
    const { messages, image, county } = body
    const lastMessage = messages[messages.length - 1]

    let context = ''
    let citations = []

    // 4. Search (The Critical Step)
    if (lastMessage.content && !image) {
      try {
        console.log(`🔍 Searching for: "${lastMessage.content}" in ${county}`)
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
           console.log(`✅ Found ${searchResults.length} documents`)
           context = searchResults.map(doc => 
            `[Source: ${doc.metadata.filename}, Page ${doc.metadata.page}]\nContent: ${doc.pageContent}`
          ).join('\n\n')
          
          citations = searchResults.map(doc => ({
            document: doc.metadata.filename.replace('.pdf', ''),
            pages: [doc.metadata.page]
          }))
        } else {
          console.log('⚠️ No local documents matched. Falling back to general knowledge.')
        }
      } catch (err) {
        console.error('Search Error:', err)
      }
    }

    // 5. Generate
    const prompt = [
      { text: SYSTEM_PROMPT },
      { text: `USER CURRENT JURISDICTION: ${county || 'washtenaw'}` },
      { text: `RETRIEVED REGULATORY CONTEXT:\n${context || 'No specific local documents found. Use general FDA code.'}` },
      { text: `USER QUERY: ${lastMessage.content}` }
    ]

    if (image) {
      const base64Data = image.split(',')[1]
      prompt.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
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
