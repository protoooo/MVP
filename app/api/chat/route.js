import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ✅ IMPORT HELPERS
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit, incrementUsage } from '@/lib/rateLimit' // Added incrementUsage

export const dynamic = 'force-dynamic'

// --- 1. HELPER FUNCTIONS ---

function sanitizeString(input, maxLength = 5000) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, maxLength)
}

function validateMessages(messages) {
  if (!Array.isArray(messages)) return []
  if (messages.length > 100) return messages.slice(-100)
  
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeString(msg.content, 5000),
    image: msg.image || null
  }))
}

// --- 2. INTELLIGENCE CONFIG (PROMPTS & RULES) ---

const GLOBAL_RULES = `
PRIMARY JURISDICTION: Washtenaw County, Michigan.
HIERARCHY OF TRUTH: 
1. Washtenaw County Regulations (HIGHEST PRIORITY)
2. Michigan Modified Food Code (Act 92)
3. FDA Food Code 2022

INSTRUCTIONS:
- You are a specialized Compliance Engine for Washtenaw County.
- Use official context provided. Do not guess.
- Cite specific codes from the context.
`

const PROMPTS = {
  chat: `You are ProtocolLM, the Washtenaw County Food Safety Expert.
  ${GLOBAL_RULES}
  
  RESPONSE STRUCTURE:
  1. The Answer (Yes/No/It depends)
  2. The Rule (Cite specific code)
  3. The Action (What to do)
  
  FORMATTING: Use CAPS for critical values. No asterisks.`,
  
  image: `You are an AI Health Inspector.
  ${GLOBAL_RULES}
  
  ANALYSIS PROTOCOL:
  1. DETECT: Scan for defects
  2. CROSS-REFERENCE: Compare against context
  3. JUDGE: Determine violation status
  
  OUTPUT:
  - OBSERVATIONS
  - VIOLATION STATUS
  - CITATION
  - FIX`,

  audit: `You are a Strict Mock Auditor.
  ${GLOBAL_RULES}
  
  BEHAVIOR:
  - Act skeptical
  - Demand proof
  - Classify using Washtenaw types`,

  critical: `You are the Emergency Response System.
  ${GLOBAL_RULES}
  
  BEHAVIOR:
  - Prioritize safety
  - Advise closure if needed
  - Provide reopening steps`
}

// --- 3. MAIN ROUTE HANDLER ---

export async function POST(req) {
  try {
    const body = await req.json()
    
    const messages = validateMessages(body.messages || [])
    const image = body.image && typeof body.image === 'string' ? body.image : null
    const chatId = body.chatId || null
    const mode = ['chat', 'image', 'audit', 'critical'].includes(body.mode) ? body.mode : 'chat'

    // --- GOOGLE VERTEX SETUP ---
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
    if (!projectId) return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    
    let vertexConfig = { project: projectId, location: 'us-central1' }
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        const privateKey = credentials.private_key?.replace(/\\n/g, '\n')
        vertexConfig.googleAuthOptions = {
          credentials: {
            client_email: credentials.client_email,
            private_key: privateKey,
          },
        }
      } catch (e) { console.error('❌ Credential parse error', e) }
    }
    
    const vertex_ai = new VertexAI(vertexConfig)
    const generativeModel = vertex_ai.getGenerativeModel({
      model: image ? 'gemini-1.5-flash-001' : 'gemini-1.5-pro-001', // Use Flash for images (faster), Pro for text (smarter)
      generationConfig: { maxOutputTokens: 8192, temperature: 0.2, topP: 0.8 },
    })

    // --- SUPABASE SETUP ---
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    // --- AUTH CHECK ---
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Please sign in to continue', errorType: 'AUTH_REQUIRED' }, { status: 401 })

    // --- TERMS CHECK ---
    const { data: profile } = await supabase.from('user_profiles').select('accepted_terms, accepted_privacy').eq('id', user.id).single()
    if (!profile?.accepted_terms) return NextResponse.json({ error: 'Please accept terms', errorType: 'TERMS_REQUIRED' }, { status: 403 })

    // --- ADMIN BYPASS LOGIC (CRITICAL) ---
    // We check admin email here so Admins don't get blocked by the subscription check
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    
    if (!isAdmin) {
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      if (!activeSub || new Date(activeSub.current_period_end) < new Date()) {
        return NextResponse.json({ error: 'Subscription required', errorType: 'SUBSCRIPTION_REQUIRED' }, { status: 402 })
      }
    }

    // --- RATE LIMIT CHECK ---
    const usageType = image ? 'image' : 'text'
    const limitCheck = await checkRateLimit(user.id, usageType) // ✅ Passing type to your library
    
    if (!limitCheck.success) {
      return NextResponse.json({ error: limitCheck.message, errorType: 'RATE_LIMIT' }, { status: 429 })
    }

    // --- SEARCH & CONTEXT (RAG) ---
    const lastMessage = messages[messages.length - 1]
    let context = ''

    if (lastMessage.content && !image) {
      try {
        const searchResults = await searchDocuments(lastMessage.content, 'washtenaw')
        if (searchResults && searchResults.length > 0) {
          const countyDocs = searchResults.filter(d => d.docType === 'county')
          const stateDocs = searchResults.filter(d => d.docType === 'state')
          const federalDocs = searchResults.filter(d => d.docType === 'federal')
          
          let contextParts = []
          if (countyDocs.length > 0) contextParts.push('=== WASHTENAW COUNTY REGULATIONS ===\n' + countyDocs.map(d => `"${d.text}"`).join('\n'))
          if (stateDocs.length > 0) contextParts.push('=== MICHIGAN STATE CODE ===\n' + stateDocs.map(d => `"${d.text}"`).join('\n'))
          if (federalDocs.length > 0) contextParts.push('=== FDA GUIDANCE ===\n' + federalDocs.map(d => `"${d.text}"`).join('\n'))
          
          context = contextParts.join('\n\n')
        }
      } catch (err) { console.error('❌ Search error (Non-fatal):', err) }
    }

    // --- GENERATE CONTENT ---
    const selectedPrompt = PROMPTS[mode] || PROMPTS.chat
    let promptText = `${selectedPrompt}\n\nOFFICIAL CONTEXT:\n${context || 'No specific documents found.'}\n\nUSER INPUT:\n${lastMessage.content}`

    const reqContent = { role: 'user', parts: [{ text: promptText }] }

    if (image) {
      const base64Data = image.split(',')[1]
      reqContent.parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
    }

    const result = await generativeModel.generateContent({ contents: [reqContent] })
    const text = result.response.candidates[0].content.parts[0].text.replace(/\*\*/g, '').replace(/\*/g, '')

    // --- SAVE & INCREMENT ---
    if (chatId) {
      await supabase.from('messages').insert([
        { chat_id: chatId, role: 'user', content: lastMessage.content, image: image ? 'image_stored' : null },
        { chat_id: chatId, role: 'assistant', content: text }
      ])
    }

    // ✅ FIXED: Using imported library function instead of RPC
    await incrementUsage(user.id, usageType)

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('❌ Chat API error:', error)
    if (error.message?.includes('timeout')) return NextResponse.json({ error: 'Request timeout. Please try again.', errorType: 'TIMEOUT' }, { status: 504 })
    return NextResponse.json({ error: 'AI service temporarily unavailable', errorType: 'AI_ERROR' }, { status: 503 })
  }
}
