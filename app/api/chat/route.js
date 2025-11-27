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
    console.log('🚀 Chat API called')
    
    // 1. Initialize Google AI
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      console.error('❌ Missing API Key')
      return NextResponse.json({ error: 'Server Error: Missing API Key' }, { status: 500 })
    }
    
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
          setAll(cookiesToSet) { 
            try { 
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) 
            } catch {} 
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', session.user.id)

    // 3. Rate Limit Check
    const limitCheck = await checkRateLimit(session.user.id)
    if (!limitCheck.success) {
      console.warn('⚠️ Rate limit hit:', limitCheck.message)
      return NextResponse.json({ error: limitCheck.message || 'Limit reached' }, { status: 429 })
    }
    
    // 4. Parse Request Body
    const body = await req.json()
    console.log('📥 Request body:', { hasMessage: !!body.message, hasImage: !!body.image, county: body.county })
    
    const { message, image, county } = body
    
    if (!message && !image) {
      return NextResponse.json({ error: 'Message or image required' }, { status: 400 })
    }
    
    // Image Limit Check
    if (image) {
      if (limitCheck.currentImages >= limitCheck.imageLimit) {
        console.warn('⚠️ Image limit reached')
        return NextResponse.json({ error: `Image limit reached for ${limitCheck.plan} plan.` }, { status: 429 })
      }
    }

    let context = ''
    let citations = []

    // 5. SEARCH for Context
    if (message) {
      try {
        console.log(`🔍 Searching for context in: ${county || 'washtenaw'}`)
        const searchResults = await searchDocuments(message, county || 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
          console.log(`✅ Found ${searchResults.length} documents`)
          context = searchResults.map(doc => 
            `[Source: ${doc.source}, Page ${doc.page}]\nContent: ${doc.text}`
          ).join('\n\n')
          
          citations = searchResults.map(doc => ({
            document: doc.source.replace('.pdf', ''),
            pages: [doc.page]
          }))
        } else {
          console.log('⚠️ No local documents matched.')
        }
      } catch (err) {
        console.error('❌ Search Error:', err)
      }
    }

    // 6. Build Prompt
    const prompt = [
      { text: SYSTEM_PROMPT },
      { text: `USER CURRENT JURISDICTION: ${county || 'washtenaw'}` },
      { text: `OFFICIAL REGULATORY CONTEXT:\n${context || 'No specific local documents found. Rely on FDA Food Code.'}` },
      { text: `USER QUERY: ${message}` }
    ]

    if (image) {
      const base64Data = image.split(',')[1]
      prompt.push({ 
        inlineData: { 
          mimeType: 'image/jpeg', 
          data: base64Data 
        } 
      })
      prompt.push({ text: "Analyze the image above specifically against the Regulatory Context provided." })
    }

    // 7. Generate Response
    console.log('🤖 Generating AI response...')
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    console.log('✅ AI response generated')

    // 8. Update Usage Counter
    try {
      await supabase.rpc('increment_usage', { 
        user_id: session.user.id, 
        is_image: !!image 
      })
      console.log('✅ Usage updated')
    } catch (usageError) {
      console.error('⚠️ Failed to update usage:', usageError)
      // Don't fail the request if usage tracking fails
    }

    return NextResponse.json({ 
      message: text, 
      citations: citations 
    })

  } catch (error) {
    console.error('❌ Chat Route Error:', error)
    return NextResponse.json({ 
      error: `System Error: ${error.message}` 
    }, { status: 500 })
  }
}
