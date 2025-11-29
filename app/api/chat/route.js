import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SYSTEM_PROMPT = `You are ProtocolLM, an expert food safety compliance assistant for Michigan restaurants.

**CORE OBJECTIVE:**
Help restaurant operators understand health codes and fix violations immediately. Be concise, authoritative, and helpful.

**HIERARCHY OF AUTHORITY:**
1. **LOCAL COUNTY CODE** (Washtenaw/Wayne/Oakland).
2. **MICHIGAN MODIFIED FOOD CODE**.
3. **FDA FOOD CODE 2022**.

**RESPONSE STRUCTURE:**
1. **DIRECT ANSWER:** Start with the specific rule.
2. **THE FIX:** Provide corrective actions for violations.
3. **EVIDENCE:** Cite sources as [Source Name, Page X].

**RULES:**
- No fluff.
- If unsure, say "Please verify with your inspector."
- Analyze images for Priority (Critical) violations first.`

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Server Error: Missing API Key' }, { status: 500 })
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: { temperature: 0.3, topK: 40, topP: 0.95, maxOutputTokens: 1024 }
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

    const limitCheck = await checkRateLimit(session.user.id)
    if (!limitCheck.success) return NextResponse.json({ error: limitCheck.message, limitReached: true }, { status: 429 })
    
    const body = await req.json()
    // CAPTURE CHAT ID
    const { messages, image, county, chatId } = body
    
    if (image && limitCheck.currentImages >= limitCheck.imageLimit) {
      return NextResponse.json({ error: 'Image limit reached.', limitReached: true }, { status: 429 })
    }

    // 1. SAVE USER MESSAGE TO DB (If chatId exists)
    const lastMessage = messages[messages.length - 1]
    if (chatId) {
       await supabase.from('messages').insert({
         chat_id: chatId,
         role: 'user',
         content: lastMessage.content,
         image: image || null // Store base64 or reference if you prefer
       })
    }

    // RAG Logic
    let context = ''
    let citations = []
    if (lastMessage.content) {
      try {
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        if (searchResults && searchResults.length > 0) {
           const countyDocs = searchResults.filter(d => d.docType === 'county')
           const stateDocs = searchResults.filter(d => d.docType === 'state')
           const federalDocs = searchResults.filter(d => d.docType === 'federal')
           
           let contextParts = []
           if (countyDocs.length > 0) contextParts.push('=== LOCAL COUNTY REGULATIONS ===\n' + countyDocs.map(d => `"${d.text}"`).join('\n'))
           if (stateDocs.length > 0) contextParts.push('=== MICHIGAN STATE CODE ===\n' + stateDocs.map(d => `"${d.text}"`).join('\n'))
           if (federalDocs.length > 0) contextParts.push('=== FDA GUIDANCE ===\n' + federalDocs.map(d => `"${d.text}"`).join('\n'))
           
           context = contextParts.join('\n\n')
           citations = searchResults.map(doc => ({ document: doc.source.replace('.pdf', ''), pages: [doc.page] }))
        }
      } catch (err) { console.error('Search Error:', err) }
    }

    const promptParts = [
      { text: SYSTEM_PROMPT },
      { text: `\nJURISDICTION: ${county || 'washtenaw'}\nCONTEXT:\n${context}` },
      { text: `\nQUESTION: ${lastMessage.content}` }
    ]

    if (image) {
      promptParts.push({ inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } })
      promptParts.push({ text: "\nAnalyze this image for health code violations based on the context." })
    }

    const result = await model.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    // 2. SAVE ASSISTANT MESSAGE TO DB
    if (chatId) {
      await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'assistant',
        content: text
      })
    }

    await supabase.rpc('increment_usage', { user_id: session.user.id, is_image: !!image })

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('Chat Error:', error)
    return NextResponse.json({ error: 'Processing error.', fallback: true }, { status: 500 })
  }
}
