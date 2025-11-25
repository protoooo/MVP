import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

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
  console.log('=== CHAT REQUEST STARTED ===')
  
  try {
    // CRITICAL: Use GEMINI_API_KEY from Railway
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      console.error('❌ CRITICAL: GEMINI_API_KEY is missing')
      return NextResponse.json({ 
        error: 'API configuration error. Please contact support.' 
      }, { status: 500 })
    }

    console.log('✅ API Key found:', apiKey.substring(0, 10) + '...')
    
    // Initialize Google AI
    let genAI
    try {
      genAI = new GoogleGenerativeAI(apiKey)
      console.log('✅ GoogleGenerativeAI initialized')
    } catch (initError) {
      console.error('❌ Failed to initialize GoogleGenerativeAI:', initError)
      return NextResponse.json({ 
        error: 'AI service initialization failed' 
      }, { status: 500 })
    }

    // Initialize Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) { 
            try { 
              cookiesToSet.forEach(({ name, value, options }) => 
                cookieStore.set(name, value, options)
              ) 
            } catch {} 
          },
        },
      }
    )

    // Auth Check
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      console.error('❌ Auth Error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', session.user.email)

    // Rate Limit Check
    try {
      const { success, limitReached } = await checkRateLimit(session.user.id)
      if (!success) {
        return NextResponse.json({ 
          error: limitReached ? 'Monthly request limit reached.' : 'Rate limit exceeded.' 
        }, { status: 429 })
      }
    } catch (err) {
      console.warn('⚠️ Rate limit check failed (proceeding):', err.message)
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid request format' 
      }, { status: 400 })
    }

    const { messages, image, county } = body
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: 'Invalid messages format' 
      }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    console.log('📝 User query:', lastMessage?.content?.substring(0, 100))

    let context = ''
    let citations = []

    // Vector Search for context
    if (lastMessage?.content && !image) {
      try {
        console.log(`🔍 Searching documents for: ${county || 'washtenaw'}`)
        const searchResults = await searchDocuments(
          lastMessage.content, 
          county || 'washtenaw',
          25
        )
        
        if (searchResults && searchResults.length > 0) {
          context = searchResults.map(doc => 
            `[Source: ${doc.source}, Page ${doc.page}]\n${doc.text}`
          ).join('\n\n---\n\n')
          
          citations = searchResults.map(doc => ({
            document: doc.source,
            pages: [doc.page]
          }))
          
          console.log(`✅ Found ${searchResults.length} context documents`)
        } else {
          console.log('⚠️ No relevant documents found')
        }
      } catch (searchError) {
        console.error('⚠️ Document search failed:', searchError)
        context = "Notice: Local database search unavailable. Relying on general FDA Food Code knowledge."
      }
    }

    // Generate AI Response
    try {
      console.log('🤖 Generating AI response...')
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-8b" 
      })

      let promptParts = [
        { text: SYSTEM_PROMPT },
        { 
          text: `CONTEXT FROM REGULATORY DATABASE:\n${
            context || 'No specific database context found. Rely on general FDA Food Code knowledge.'
          }` 
        },
        { text: "USER CONVERSATION:" }
      ]

      // Add recent message history
      const recentMessages = messages.slice(-5)
      recentMessages.forEach(msg => {
        promptParts.push({ 
          text: `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}` 
        })
      })

      // Handle image if present
      if (image) {
        try {
          const base64Data = image.split(',')[1]
          if (!base64Data) {
            throw new Error('Invalid image format')
          }
          
          promptParts.push({
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          })
          promptParts.push({ 
            text: "Analyze this image for health code violations based on FDA standards. Cite specific potential violations with code references." 
          })
          
          console.log('📷 Image added to prompt')
        } catch (imageError) {
          console.error('❌ Image processing error:', imageError)
          return NextResponse.json({ 
            error: 'Failed to process image. Please try again.' 
          }, { status: 400 })
        }
      }

      // Generate content
      let result
      try {
        result = await model.generateContent(promptParts)
      } catch (genError) {
        console.error('❌ Generation error:', genError)
        
        // Handle specific Gemini errors
        if (genError.message?.includes('API key')) {
          return NextResponse.json({ 
            error: 'API key configuration error. Please contact support.' 
          }, { status: 500 })
        }
        
        if (genError.message?.includes('quota')) {
          return NextResponse.json({ 
            error: 'Service temporarily unavailable. Please try again in a few moments.' 
          }, { status: 429 })
        }
        
        throw genError
      }

      const response = await result.response
      const text = response.text()
      
      console.log('✅ AI response generated:', text.substring(0, 100) + '...')

      // Update usage stats (fire and forget)
      supabase.rpc('increment_usage', { 
        user_id: session.user.id,
        is_image: !!image 
      }).then(({ error }) => {
        if (error) console.error('⚠️ Usage stat update failed:', error)
      })

      return NextResponse.json({ 
        message: text,
        citations: citations 
      })

    } catch (genError) {
      console.error('❌ Google AI Generation Error:', genError)
      return NextResponse.json({ 
        error: `AI processing failed: ${genError.message || 'Unknown error'}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ CRITICAL UNHANDLED ERROR:', error)
    return NextResponse.json({ 
      error: `System processing error: ${error.message}` 
    }, { status: 500 })
  }
}
