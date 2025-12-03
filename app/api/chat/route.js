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
  // ✅ INCREASED LIMIT to prevent cut-off answers
  maxOutputTokens: 8192, 
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
      model: 'gemini-1.5-flash-001', 
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

    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!isAdmin) {
        const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).in('status', ['active', 'trialing']).maybeSingle()
        if (!sub) return NextResponse.json({ error: 'Subscription required', errorType: 'SUBSCRIPTION_REQUIRED' }, { status: 402 })
    }

    const limitCheck = await checkRateLimit(user.id, image ? 'image' : 'text') 
    if (!limitCheck.success) return NextResponse.json({ error: 'Rate limit exceeded', errorType: 'RATE_LIMIT' }, { status: 429 })

    // --- 🧠 INTELLIGENT WORKFLOW ---

    let context = ''
    let searchTerms = ''

    if (image) {
        try {
            const visionPrompt = {
                role: 'user',
                parts: [
                    { text: "Analyze this image for food safety. Identify the specific equipment, surface condition (scratches/grooves?), and food placement. Output ONLY a search query for regulations (e.g. 'cutting board scoring resurfacing requirements', 'ready to eat food in dirty sink violation')." },
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

    if (searchTerms) {
        try {
            // ✅ We append "Washtenaw Violation Types" to ensure we get the enforcement docs if relevant
            const searchResults = await searchDocuments(`${searchTerms} Washtenaw Violation Types Enforcement`, 'washtenaw')
            
            if (searchResults && searchResults.length > 0) {
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
                        text.includes('michigan') || text.includes('department of agriculture')
                    ) {
                        state.push(d)
                    } else {
                        federal.push(d)
                    }
                })
                
                context = `
=== PRIORITY 1: WASHTENAW COUNTY ENFORCEMENT & VIOLATION TYPES ===
${washtenaw.map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')}

=== PRIORITY 2: MICHIGAN MODIFIED FOOD CODE (THE RULES) ===
${state.map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')}

=== PRIORITY 3: FEDERAL STANDARDS ===
${federal.slice(0, 3).map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')}
`
            }
        } catch (err) { console.error('❌ Search error:', err) }
    }

    // --- FINAL GENERATION ---
    
    // ✅ MODERNIZED PROMPT: Uses Priority (P), Pf, and Core
    const SYSTEM_PROMPT = `
You are ProtocolLM, acting as an Official Health Inspector for Washtenaw County, MI.

YOUR AUTHORITY:
1. **Washtenaw County Enforcement Policies**: Use these to determine the SEVERITY and CONSEQUENCES.
2. **Michigan Modified Food Code**: Use this to cite the specific RULE (Section numbers).

MODERN TERMINOLOGY (MANDATORY):
Do not use "Critical" or "Non-Critical" unless quoting an older document. Use the modern Michigan/FDA terms:
- **Priority Item (P)**: Direct connection to foodborne illness (e.g., cooking temps, cross-contamination).
- **Priority Foundation Item (Pf)**: Supports Priority items (e.g., soap at sink, calibrated thermometer).
- **Core Item (C)**: General sanitation/maintenance (e.g., dirty floors, repair issues).

RESPONSE STRUCTURE:
1. OBSERVATION: Professional technical description.
2. VIOLATION TYPE: "Priority Item (P)", "Priority Foundation Item (Pf)", or "Core Item (C)".
3. ENFORCEMENT AUTHORITY: "Washtenaw County Health Department".
4. CITATION: "Michigan Modified Food Code § [Number]". (Use the exact section number. If the number isn't in the snippet, use your internal knowledge of the 2017/2022 Food Code).
5. CORRECTIVE ACTION: Detailed steps to fix it.

TONE: Strict, Professional, Educational.
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

    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').replace(/`/g, '')

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
