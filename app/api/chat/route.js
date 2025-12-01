import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic to ensure Auth cookies are read correctly every time
export const dynamic = 'force-dynamic'

// --- UTILITIES ---
function sanitizeString(input, maxLength = 5000) {
  if (typeof input !== 'string') return ''
  return input.replace(/<script[^>]*>.*?<\/script>/gi, '').trim().substring(0, maxLength)
}

function sanitizeCounty(county) {
  const valid = ['washtenaw', 'wayne', 'oakland']
  const norm = (county || '').toLowerCase().trim()
  return valid.includes(norm) ? norm : 'washtenaw'
}

function validateMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages.slice(-100).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeString(msg.content, 5000),
    image: msg.image || null
  }))
}

// --- PROMPTS ---
const PROMPTS = {
  chat: `You are ProtocolLM, an expert food safety compliance assistant. OBJECTIVE: Help operators understand codes. STYLE: Concise, authoritative.`,
  image: `You are an AI Health Inspector. OBJECTIVE: Analyze image for violations. STYLE: Direct.`,
  audit: `You are a strict Local Health Inspector. OBJECTIVE: Mock audit. STYLE: Formal, critical.`,
  critical: `You are an Emergency Response Protocol System. OBJECTIVE: Emergency guidance. STYLE: Imperative.`,
  training: `You are a Training Generator. OBJECTIVE: Create 1-page handout. STYLE: Simple.`,
  sop: `You are a Document Specialist. OBJECTIVE: Generate log sheet/SOP. FORMAT: Markdown table.`
}

export async function POST(req) {
  try {
    const body = await req.json()
    const messages = validateMessages(body.messages)
    const image = body.image
    const county = sanitizeCounty(body.county)
    const mode = PROMPTS[body.mode] ? body.mode : 'chat'
    const chatId = body.chatId

    // --- 1. AUTHENTICATION ---
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- 2. SUBSCRIPTION CHECK ---
    // We verify the user has an active/trialing subscription in the DB
    const { data: activeSub, error: subError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (subError || !activeSub) {
      console.error('Subscription Check Failed:', subError)
      return NextResponse.json({ error: 'Active subscription required.' }, { status: 402 })
    }

    // Check Expiry
    if (new Date(activeSub.current_period_end) < new Date()) {
      return NextResponse.json({ error: 'Subscription expired.' }, { status: 402 })
    }

    // --- 3. RATE LIMIT ---
    const limitCheck = await checkRateLimit(user.id)
    if (!limitCheck.success) {
      return NextResponse.json({ error: limitCheck.message }, { status: 429 })
    }
    if (image && limitCheck.currentImages >= limitCheck.imageLimit) {
      return NextResponse.json({ error: 'Image limit reached.' }, { status: 429 })
    }

    // --- 4. GOOGLE VERTEX AI ---
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    if (!projectId) throw new Error('Missing Project ID')

    let vertexConfig = { project: projectId, location: 'us-central1' }
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        vertexConfig.googleAuthOptions = {
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key.replace(/\\n/g, '\n'),
            }
        }
    }

    const vertex_ai = new VertexAI(vertexConfig)
    const generativeModel = vertex_ai.getGenerativeModel({
      model: 'gemini-2.0-flash-001',
      generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
    })

    // Build Prompt
    let promptText = `${PROMPTS[mode]}\n\nJURISDICTION: ${county}\n\nUSER INPUT:\n${messages[messages.length - 1].content}`

    // Check RAG if chat/audit
    if (!image && ['chat', 'audit'].includes(mode)) {
        try {
            const docs = await searchDocuments(messages[messages.length - 1].content, county)
            if (docs.length) {
                promptText += `\n\nOFFICIAL CONTEXT:\n${docs.map(d => d.text).join('\n\n')}`
            }
        } catch (e) { console.error('Search failed', e) }
    }

    const reqContent = { role: 'user', parts: [{ text: promptText }] }
    if (image) {
        reqContent.parts.push({ 
            inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } 
        })
    }

    // --- 5. GENERATE CONTENT ---
    const result = await generativeModel.generateContent({ contents: [reqContent] })
    const text = result.response.candidates[0].content.parts[0].text.replace(/\*\*/g, '').replace(/\*/g, '')

    // --- 6. SAVE & RETURN ---
    // Save User Message
    if (chatId) {
        await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'user',
            content: messages[messages.length - 1].content,
            image: image || null
        })
        // Save Assistant Message
        await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'assistant',
            content: text
        })
    }

    // Increment Usage
    await supabase.rpc('increment_usage', { user_id: user.id, is_image: !!image })

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'AI Service Error. Please try again.' }, { status: 500 })
  }
}
