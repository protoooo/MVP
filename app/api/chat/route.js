import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
  const valid = messages.slice(-6).map(msg => ({ 
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeString(msg.content, 5000),
    image: msg.image || null
  }))
  return valid
}

// --- 2. INTELLIGENCE CONFIG ---

const GENERATION_CONFIG = {
  maxOutputTokens: 2048,
  temperature: 0.1, 
  topP: 0.8,
}

// --- 3. MAIN ROUTE HANDLER ---

export async function POST(req) {
  try {
    const body = await req.json()
    
    const messages = validateMessages(body.messages || [])
    const image = body.image && typeof body.image === 'string' ? body.image : null
    const chatId = body.chatId || null
    
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
    const model = vertex_ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash', 
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
        const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).in('status', ['active', 'trialing']).maybeSingle()
        if (!sub) return NextResponse.json({ error: 'Subscription required', errorType: 'SUBSCRIPTION_REQUIRED' }, { status: 402 })
    }

    // Rate Limit
    const limitCheck = await checkRateLimit(user.id, image ? 'image' : 'text') 
    if (!limitCheck.success) return NextResponse.json({ error: 'Rate limit exceeded', errorType: 'RATE_LIMIT' }, { status: 429 })

    // --- 🧠 INTELLIGENT WORKFLOW ---

    let context = ''
    let searchTerms = ''

    // STEP A: "See" the image
    if (image) {
        try {
            const visionPrompt = {
                role: 'user',
                parts: [
                    { text: "Analyze this image for food safety. Identify the equipment, surface type, and cleanliness state. Output ONLY a search query for regulations (e.g. 'commercial stove food debris accumulation violation')." },
                    { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }
                ]
            }
            const visionResult = await model.generateContent({ contents: [visionPrompt] })
            searchTerms = visionResult.response.candidates[0].content.parts[0].text.trim()
        } catch (e) {
            searchTerms = "general sanitation cleaning frequency"
        }
    } else {
        searchTerms = messages[messages.length - 1].content
    }

    // STEP B: Search (RAG) & Sort by Hierarchy
    if (searchTerms) {
        try {
            const searchResults = await searchDocuments(searchTerms, 'washtenaw')
            
            if (searchResults && searchResults.length > 0) {
                
                // ✅ SMARTER SORTING
                const washtenaw = []
                const state = []
                const federal = []

                searchResults.forEach(d => {
                    const src = (d.metadata?.source || '').toLowerCase()
                    const text = (d.content || '').toLowerCase()

                    if (src.includes('washtenaw') || text.includes('washtenaw')) {
                        washtenaw.push(d)
                    } else if (
                        src.includes('michigan') || src.includes('mi_') || src.includes('act') || src.includes('state') ||
                        text.includes('michigan') || text.includes('department of agriculture') || text.includes('mdard')
                    ) {
                        state.push(d)
                    } else {
                        federal.push(d)
                    }
                })
                
                context = `
=== PRIORITY 1: LOCAL ORDINANCES (WASHTENAW) ===
${washtenaw.map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')}

=== PRIORITY 2: MICHIGAN MODIFIED FOOD CODE (PRIMARY ENFORCEMENT) ===
${state.map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')}

=== PRIORITY 3: REGULATORY STANDARDS ===
${federal.slice(0, 3).map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')}
`
            }
        } catch (err) { console.error('❌ Search error:', err) }
    }

    // STEP C: Final Generation
    
    // 🔥 REALISTIC INSPECTOR LOGIC 🔥
    const SYSTEM_PROMPT = `
You are ProtocolLM, acting as an Official Health Inspector for Washtenaw County, MI.

YOUR AUTHORITY:
Washtenaw County adopts and enforces the **Michigan Modified Food Code (Act 92)**.
Unless a specific local "Washtenaw Ordinance" overrides it, YOUR PRIMARY CITATION SOURCE IS THE MICHIGAN MODIFIED FOOD CODE.

CITATION RULES:
1. If the rule comes from the "Michigan Modified Food Code" or "Act 92", cite it as such.
2. If the rule comes from Federal docs (FDA), cite it as: "Michigan Modified Food Code (Adopting FDA Standards)".
3. DO NOT cite "FDA" directly. We are in Washtenaw County; we cite the State Code.

FORMATTING RULES:
- Clean text only. NO asterisks (*), NO markdown bolding.
- Use numbered lists or capitalization for structure.

RESPONSE STRUCTURE:
1. OBSERVATION: Technical description of the issue.
2. VIOLATION STATUS: "CRITICAL" or "NON-CRITICAL" or "COMPLIANT".
3. ENFORCEMENT AUTHORITY: "Washtenaw County Health Department"
4. CITATION: The specific code section (e.g., "Michigan Modified Food Code § 4-601.11").
5. CORRECTIVE ACTION: Required steps to achieve compliance.

TONE: Professional, Regulatory, Enforcing.
`

    const finalPrompt = `
${SYSTEM_PROMPT}

=== OFFICIAL CONTEXT ===
${context || "No specific local regulations found. Referencing Michigan Modified Food Code Standards."}

=== USER QUERY/IMAGE ANALYSIS ===
${messages[messages.length - 1].content}
`

    const reqContent = { role: 'user', parts: [{ text: finalPrompt }] }
    if (image) {
        const base64Data = image.split(',')[1]
        reqContent.parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
    }

    const result = await model.generateContent({ contents: [reqContent] })
    let text = result.response.candidates[0].content.parts[0].text

    // ✅ CLEANUP
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').replace(/`/g, '')

    // --- SAVE & RETURN ---
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
