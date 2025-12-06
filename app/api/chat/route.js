import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit, incrementUsage } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

function sanitizeString(input, maxLength = 5000) {
  if (typeof input !== 'string') return ''
  return input.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<iframe[^>]*>.*?<\/iframe>/gi, '').trim().substring(0, maxLength)
}

function validateMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages.slice(-6).map(msg => ({ 
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeString(msg.content, 5000),
    image: msg.image || null
  }))
}

const GENERATION_CONFIG = {
  maxOutputTokens: 8192, 
  temperature: 0.1, 
  topP: 0.8,
}

export async function POST(req) {
  try {
    const body = await req.json()
    const messages = validateMessages(body.messages || [])
    const image = body.image && typeof body.image === 'string' ? body.image : null
    const chatId = body.chatId || null
    const isDemo = body.isDemo || false // CHECK FOR DEMO FLAG

    // 1. AUTHENTICATION & GUEST HANDLING
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // ID for rate limiting: User ID OR IP Address if guest
    const userIdentifier = user ? user.id : (req.headers.get('x-forwarded-for') || 'guest_ip')

    // BLOCK if not logged in AND not a demo
    if ((authError || !user) && !isDemo) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    // BLOCK if logged in but no subscription (and not admin)
    if (user) {
        const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
        if (!isAdmin) {
            const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).in('status', ['active', 'trialing']).maybeSingle()
            if (!sub) return NextResponse.json({ error: 'Subscription required' }, { status: 402 })
        }
    }

    // 2. RATE LIMITING (Crucial for guests)
    // If it's a demo/guest, we treat them strictly in checkRateLimit logic (or rely on frontend localStorage for UX, backend for DDOS protection)
    const limitCheck = await checkRateLimit(userIdentifier, image ? 'image' : 'text') 
    if (!limitCheck.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

    // --- GOOGLE VERTEX SETUP ---
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
    let vertexConfig = { project: projectId, location: 'us-central1' }
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
      vertexConfig.googleAuthOptions = { credentials: { client_email: credentials.client_email, private_key: credentials.private_key?.replace(/\\n/g, '\n') } }
    }
    
    const vertex_ai = new VertexAI(vertexConfig)
    const model = vertex_ai.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: GENERATION_CONFIG })

    // --- INTELLIGENCE WORKFLOW ---
    let context = ''
    let searchTerms = ''

    if (image) {
        try {
            const visionPrompt = {
                role: 'user',
                parts: [
                    { text: "Analyze this image for food safety. Identify equipment, surface condition, and food placement. Output ONLY a search query for regulations." },
                    { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }
                ]
            }
            const visionResult = await model.generateContent({ contents: [visionPrompt] })
            searchTerms = visionResult.response.candidates[0].content.parts[0].text.trim()
        } catch (e) { searchTerms = "general sanitation cleaning frequency" }
    } else {
        searchTerms = messages[messages.length - 1].content
    }

    if (searchTerms) {
        try {
            const searchResults = await searchDocuments(`${searchTerms} Washtenaw Violation Types Enforcement`, 'washtenaw')
            if (searchResults && searchResults.length > 0) {
                context = searchResults.map(d => `SOURCE: ${d.metadata?.source}\nTEXT: "${d.content}"`).join('\n\n')
            }
        } catch (err) { console.error('Search error:', err) }
    }

    const SYSTEM_PROMPT = `
You are ProtocolLM, acting as an Official Health Inspector for Washtenaw County, MI.
YOUR AUTHORITY: Washtenaw County Enforcement Policies & Michigan Modified Food Code.
RESPONSE STRUCTURE:
1. OBSERVATION: Technical description.
2. VIOLATION TYPE: Priority (P), Priority Foundation (Pf), or Core (C).
3. ENFORCEMENT AUTHORITY: "Washtenaw County Health Department".
4. CITATION: "Michigan Modified Food Code § [Number]".
5. REQUIRED CORRECTION: Timeline and fix.
TONE: Strict, Professional.
`
    const finalPrompt = `${SYSTEM_PROMPT}\n\n=== OFFICIAL CONTEXT ===\n${context}\n\n=== QUERY ===\n${messages[messages.length - 1].content}`

    const reqContent = { role: 'user', parts: [{ text: finalPrompt }] }
    if (image) {
        const base64Data = image.split(',')[1]
        reqContent.parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
    }

    const result = await model.generateContent({ contents: [reqContent] })
    let text = result.response.candidates[0].content.parts[0].text
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').replace(/`/g, '')

    // Only save history if user is logged in
    if (user && chatId) {
      await supabase.from('messages').insert([
        { chat_id: chatId, role: 'user', content: messages[messages.length - 1].content, image: image ? 'stored' : null },
        { chat_id: chatId, role: 'assistant', content: text }
      ])
    }

    // Increment usage (tracks IP if guest)
    await incrementUsage(userIdentifier, image ? 'image' : 'text')

    return NextResponse.json({ message: text })

  } catch (error) {
    return NextResponse.json({ error: 'Service error', details: error.message }, { status: 500 })
  }
}
