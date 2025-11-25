import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

const SYSTEM_PROMPT = `You are ProtocolLM, a specialized regulatory intelligence engine for food safety compliance. 
Your role is to act as a strict, code-based consultant for restaurant owners and health inspectors.

CORE DIRECTIVES:
1.  **Strict Compliance:** Base all answers *only* on the provided context (FDA Food Code, Local County Ordinances). If the context doesn't cover it, state general FDA guidelines but mention it's a general rule.
2.  **Citations are Mandatory:** You MUST cite specific code sections (e.g., "FDA 3-501.16") for every claim. 
3.  **Priority Designation:** Always classify violations as Priority (P), Priority Foundation (Pf), or Core (C) if applicable.
4.  **No Fluff:** Be concise, professional, and direct. No "I hope this helps" or "Great question."
5.  **Mock Audits:** If asked for a mock audit, provide a structured checklist with specific "Look For" items and "Correction" actions.
6.  **Staff Memos:** If asked for a memo, use a formal "TO/FROM/DATE/SUBJECT" format and professional language suitable for posting.

FORMATTING:
- Use Markdown.
- When citing documents provided in context, use the format: [Document Name, Page X].
- Bold key terms and code numbers.`

export async function POST(req) {
  try {
    // 1. Initialize Supabase Client Inline (No extra file needed)
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignored for server components
            }
          },
        },
      }
    )

    // 2. Auth Check
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Rate Limit Check
    const { success, limitReached } = await checkRateLimit(session.user.id)
    if (!success) {
      return NextResponse.json({ error: limitReached ? 'Monthly request limit reached.' : 'Rate limit exceeded.' }, { status: 429 })
    }

    const body = await req.json()
    const { messages, image, county } = body
    const lastMessage = messages[messages.length - 1]

    let context = ''
    let citations = []

    // 4. Vector Search (if text only)
    if (lastMessage.content && !image) {
      const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
      context = searchResults.map(doc => 
        `[Source: ${doc.metadata.filename}, Page ${doc.metadata.page}]\nContent: ${doc.pageContent}`
      ).join('\n\n')
      
      citations = searchResults.map(doc => ({
        document: doc.metadata.filename.replace('.pdf', ''),
        pages: [doc.metadata.page]
      }))
    }

    // 5. Generate Content
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" })

    let promptParts = [
      { text: SYSTEM_PROMPT },
      { text: `CONTEXT FROM REGULATORY DATABASE:\n${context || 'No specific database context found. Rely on general FDA Food Code knowledge.'}` },
      { text: "USER INQUIRY:" }
    ]

    const recentMessages = messages.slice(-5) 
    recentMessages.forEach(msg => {
      promptParts.push({ text: `${msg.role === 'user' ? 'User' : 'System'}: ${msg.content}` })
    })

    if (image) {
      const base64Data = image.split(',')[1]
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      })
      promptParts.push({ text: "Analyze this image for health code violations based on FDA standards. Cite specific potential violations." })
    }

    const result = await model.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    // 6. Increment Usage
    const { error: updateError } = await supabase.rpc('increment_usage', { 
      user_id: session.user.id,
      is_image: !!image 
    })

    if (updateError) console.error('Usage update failed:', updateError)

    return NextResponse.json({ 
      message: text,
      citations: citations 
    })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'System processing error.' }, { status: 500 })
  }
}
