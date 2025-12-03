import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ✅ IMPORT HELPERS
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit, incrementUsage } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// --- 1. HELPER FUNCTIONS ---

function sanitizeString(input, maxLength = 5000) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .trim()
    .substring(0, maxLength)
}

function validateMessages(messages) {
  if (!Array.isArray(messages)) return []
  const valid = messages.slice(-6).map(msg => ({ // Keep last 6 context
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeString(msg.content, 5000),
    image: msg.image || null
  }))
  return valid
}

// --- 2. INTELLIGENCE CONFIG ---

const GENERATION_CONFIG = {
  maxOutputTokens: 2048,
  temperature: 0.2, // Low temp for factual accuracy
  topP: 0.8,
}

// --- 3. MAIN ROUTE HANDLER ---

export async function POST(req) {
  try {
    const body = await req.json()
    
    const messages = validateMessages(body.messages || [])
    const image = body.image && typeof body.image === 'string' ? body.image : null
    const chatId = body.chatId || null
    const mode = body.mode || 'chat' // chat, image, audit, critical

    // --- GOOGLE VERTEX SETUP ---
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
    
    let vertexConfig = { project: projectId, location: 'us-central1' }
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        vertexConfig.googleAuthOptions = {
          credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key?.replace(/\\n/g, '\n'),
          },
        }
      } catch (e) { console.error('❌ Credential parse error', e) }
    }
    
    const vertex_ai = new VertexAI(vertexConfig)
    
    // Use the Flash model for speed and multimodal
    const model = vertex_ai.getGenerativeModel({ 
      model: 'gemini-2.0-flash', 
      generationConfig: GENERATION_CONFIG 
    })

    // --- SUPABASE & AUTH SETUP ---
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Auth required', errorType: 'AUTH_REQUIRED' }, { status: 401 })

    // Check Subscription/Admin
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!isAdmin) {
        // Simple sub check (expand as needed)
        const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).in('status', ['active', 'trialing']).maybeSingle()
        if (!sub) return NextResponse.json({ error: 'Subscription required', errorType: 'SUBSCRIPTION_REQUIRED' }, { status: 402 })
    }

    // Rate Limit
    const limitCheck = await checkRateLimit(user.id, image ? 'image' : 'text') 
    if (!limitCheck.success) return NextResponse.json({ error: 'Rate limit exceeded', errorType: 'RATE_LIMIT' }, { status: 429 })


    // --- 🧠 THE "SMART" WORKFLOW ---

    let context = ''
    let searchTerms = ''

    // STEP A: If there is an Image, we need to "See" it first to know what to search for.
    if (image) {
        try {
            // 1. Ask Gemini to describe the image specifically for search keywords
            const visionPrompt = {
                role: 'user',
                parts: [
                    { text: "Analyze this image for food safety. Identify the specific equipment, the type of debris/issue, and the surface type. Output ONLY a search query string to find relevant regulations (e.g., 'commercial stove grease accumulation cleaning frequency')." },
                    { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }
                ]
            }
            const visionResult = await model.generateContent({ contents: [visionPrompt] })
            searchTerms = visionResult.response.candidates[0].content.parts[0].text.trim()
            console.log("👁️ AI Saw:", searchTerms)
        } catch (e) {
            console.error("Vision Pass Failed:", e)
            searchTerms = "general sanitation cleaning frequency" // Fallback
        }
    } else {
        // Just use the last user message
        searchTerms = messages[messages.length - 1].content
    }

    // STEP B: Perform the Search (RAG) using the terms found in Step A
    if (searchTerms) {
        try {
            const searchResults = await searchDocuments(searchTerms, 'washtenaw')
            
            if (searchResults && searchResults.length > 0) {
                // Prioritize Washtenaw County docs
                const county = searchResults.filter(d => d.metadata?.source?.toLowerCase().includes('washtenaw'))
                const others = searchResults.filter(d => !d.metadata?.source?.toLowerCase().includes('washtenaw'))
                
                // Construct high-quality context block
                context = `
=== WASHTENAW COUNTY REGULATIONS (PRIMARY AUTHORITY) ===
${county.map(d => `SOURCE: ${d.metadata?.source} (Page ${d.metadata?.page})\nTEXT: "${d.content}"`).join('\n\n')}

=== SUPPORTING CODES (FDA/MICHIGAN) ===
${others.slice(0, 3).map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')}
`
            }
        } catch (err) { console.error('❌ Search error:', err) }
    }

    // STEP C: Generate the Final "Expert" Response
    
    const SYSTEM_PROMPT = `
You are ProtocolLM, a specialized Food Safety Compliance Officer for Washtenaw County, MI.

YOUR AUTHORITY:
You rely STRICTLY on the provided "OFFICIAL CONTEXT". 
If the context contains a specific regulation code (e.g., "4-601.11"), YOU MUST CITE IT.
Do not be vague. Be precise, authoritative, and helpful.

RESPONSE FORMAT:
1. **Observation**: A professional technical description of the issue.
2. **Violation Status**: CLEARLY STATE if this is a violation (Critical/Non-Critical).
3. **Citation**: Cite the exact Code Section from the context provided. If the exact section isn't in the snippets, cite the "FDA Food Code General Sanitation Principles".
4. **Corrective Action**: Step-by-step instructions to fix it.

TONE: Professional, Firm, Educational.
`

    const finalPrompt = `
${SYSTEM_PROMPT}

=== OFFICIAL CONTEXT ===
${context || "No specific regulations found in database. Rely on general FDA Food Code principles."}

=== USER QUERY ===
${messages[messages.length - 1].content}
`

    const reqContent = { role: 'user', parts: [{ text: finalPrompt }] }
    
    // Re-attach image for the final pass so it can reference specific visual details
    if (image) {
        const base64Data = image.split(',')[1]
        reqContent.parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
    }

    const result = await model.generateContent({ contents: [reqContent] })
    const text = result.response.candidates[0].content.parts[0].text

    // --- SAVE & CLEANUP ---
    if (chatId) {
      await supabase.from('messages').insert([
        { chat_id: chatId, role: 'user', content: messages[messages.length - 1].content, image: image ? 'stored' : null },
        { chat_id: chatId, role: 'assistant', content: text }
      ])
    }

    await incrementUsage(user.id, image ? 'image' : 'text')

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ error: 'Service error', details: error.message }, { status: 500 })
  }
}
