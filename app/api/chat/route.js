import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ✅ FIX: Force dynamic to prevent caching issues with Auth
export const dynamic = 'force-dynamic'

// --- UTILITIES ---
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

function sanitizeCounty(county) {
  const validCounties = ['washtenaw', 'wayne', 'oakland']
  if (typeof county !== 'string') return 'washtenaw'
  const normalized = county.toLowerCase().trim()
  return validCounties.includes(normalized) ? normalized : 'washtenaw'
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

// --- FULL SYSTEM PROMPTS (RESTORED) ---
const PROMPTS = {
  chat: `You are ProtocolLM, an expert food safety compliance assistant for Michigan restaurants.
  OBJECTIVE: Help operators understand codes and fix violations.
  HIERARCHY: 1. Local County Code (Washtenaw/Wayne/Oakland). 2. Michigan Modified Food Code. 3. FDA Food Code.
  STYLE: Concise, authoritative, helpful. No fluff.
  STRUCTURE: Direct Answer -> The Fix -> Evidence [Source, Page].
  FORMATTING: Do NOT use asterisks for bold or italics. Use CAPS for emphasis instead.`,
  
  image: `You are an AI Health Inspector. 
  OBJECTIVE: Analyze the provided image for any food safety violations or compliance issues. 
  STYLE: Direct and observational. 
  OUTPUT: List observations and potential violations.
  FORMATTING: Do NOT use asterisks. Use CAPS for emphasis.`,

  audit: `You are a strict Local Health Inspector performing a mock audit.
  OBJECTIVE: Analyze the user's input (or image) specifically for violations.
  STYLE: Formal, critical, observant.
  STRUCTURE: 
  1. Identify Potential Violations.
  2. Cite the specific code violation.
  3. Assign Priority (Priority, Priority Foundation, Core).
  4. Required Corrective Action.
  FORMATTING: Do NOT use asterisks. Use CAPS or underscores for emphasis.`,

  critical: `You are an Emergency Response Protocol System.
  OBJECTIVE: Guide the user through a food safety emergency (power outage, sewage backup, fire, sick employee).
  STYLE: Calm, imperative, step-by-step. Use CAPS for critical actions.
  STRUCTURE:
  1. IMMEDIATE ACTION REQUIRED (What to do RIGHT NOW).
  2. ASSESSMENT (How to decide if you must close).
  3. REOPENING CRITERIA.
  4. WHO TO CALL.
  FORMATTING: Do NOT use asterisks. Use CAPS for emphasis instead.`,

  training: `You are a Food Safety Training Document Generator.
  OBJECTIVE: Create a printable 1-page training handout for kitchen staff.
  STYLE: Simple bullet points, key terms in CAPS, visual cues.
  FORMAT:
  
  [TOPIC TITLE]
  
  📋 THE RULE:
  (2-3 sentences explaining the requirement in simple terms)
  
  ⚠️ WHY IT MATTERS:
  (1 sentence on health risks or consequences)
  
  ✅ HOW TO COMPLY:
  • [Action step 1]
  • [Action step 2]
  • [Action step 3]
  • [Action step 4]
  
  📝 MANAGER SIGN-OFF:
  Training completed by: _________________ Date: _________
  Manager signature: _________________
  
  Keep language at 6th grade reading level. Use emojis (✅ ⚠️ 🧼 🌡️ 🧤) for visual cues. Make it printer-friendly.
  FORMATTING: Do NOT use asterisks. Use CAPS for emphasis instead.`,

  sop: `You are a Food Safety Document Specialist.
  OBJECTIVE: Generate a PRINT-READY log sheet or Standard Operating Procedure.
  STYLE: Professional, regulatory-compliant, printer-friendly.
  
  FORMAT REQUIREMENTS:
  - Use simple Markdown tables with clear column headers
  - For LOG SHEETS: Include columns for Date | Time | Temp/Reading | Initials | Notes
  - For SOPs: Use numbered steps with checkboxes and clear action items
  - Add signature line at bottom: Manager Signature: _________ Date: _________
  - Design to fit on ONE PAGE when printed (8.5" x 11")
  - Use section headers in CAPS
  - Include space for 7-14 days of entries for logs
  
  EXAMPLE LOG FORMAT:
  | Date | Time | Temperature | Initials | Corrective Action |
  |------|------|-------------|----------|-------------------|
  |      |      |             |          |                   |
  
  EXAMPLE SOP FORMAT:
  [PROCEDURE NAME]
  1. [ ] Step one with clear action
  2. [ ] Step two with clear action
  3. [ ] Step three with clear action
  
  Always end with: 
  MANAGER APPROVAL:
  Signature: _________________ Date: _________
  
  FORMATTING: Do NOT use asterisks for bold. Use CAPS for headers and emphasis.`
}

export async function POST(req) {
  try {
    const body = await req.json()
    
    const messages = validateMessages(body.messages || [])
    const image = body.image && typeof body.image === 'string' ? body.image : null
    const county = sanitizeCounty(body.county)
    const chatId = body.chatId || null
    const mode = ['chat', 'image', 'audit', 'critical', 'training', 'sop'].includes(body.mode) 
      ? body.mode 
      : 'chat'

    // --- VERTEX AI SETUP ---
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
    const location = 'us-central1'
    
    if (!projectId) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    let vertexConfig = { project: projectId, location: location }
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
        const privateKey = credentials.private_key ? credentials.private_key.replace(/\\n/g, '\n') : undefined
        vertexConfig.googleAuthOptions = {
          credentials: {
            client_email: credentials.client_email,
            private_key: privateKey,
          },
        }
      } catch (e) {
        console.error('Credential error', e)
      }
    }
    
    const vertex_ai = new VertexAI(vertexConfig)
    const generativeModel = vertex_ai.getGenerativeModel({
      model: 'gemini-2.0-flash-001',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.3,
        topP: 0.95,
      },
    })

    // --- AUTHENTICATION & SUBSCRIPTION CHECK ---
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

    // ✅ FIX: Use getUser for strictly server-side auth validation
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Terms
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', user.id)
      .single()

    if (!profile?.accepted_terms || !profile?.accepted_privacy) {
      return NextResponse.json({ error: 'Please accept terms', requiresTerms: true }, { status: 403 })
    }

    // ✅ CRITICAL: Subscription Check
    const { data: activeSub, error: subError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (subError || !activeSub) {
      return NextResponse.json({ error: 'Active subscription required', requiresSubscription: true }, { status: 402 })
    }

    // Check Expiration
    if (new Date(activeSub.current_period_end) < new Date()) {
      return NextResponse.json({ error: 'Subscription expired', requiresSubscription: true }, { status: 402 })
    }

    // Check Rate Limits
    const limitCheck = await checkRateLimit(user.id)
    if (!limitCheck.success) {
      return NextResponse.json({ error: limitCheck.message, limitReached: true }, { status: 429 })
    }
    if (image && limitCheck.currentImages >= limitCheck.imageLimit) {
      return NextResponse.json({ error: 'Image limit reached', limitReached: true }, { status: 429 })
    }

    // --- PROMPT BUILDING ---
    const lastMessage = messages[messages.length - 1]
    let context = ''
    let citations = []

    // RAG (Search Documents) if not image mode
    if (lastMessage.content && !image) {
      try {
        const searchResults = await searchDocuments(lastMessage.content, county)
        if (searchResults && searchResults.length > 0) {
            const countyDocs = searchResults.filter((d) => d.docType === 'county')
            const stateDocs = searchResults.filter((d) => d.docType === 'state')
            const federalDocs = searchResults.filter((d) => d.docType === 'federal')
            
            let contextParts = []
            if (countyDocs.length > 0) contextParts.push('=== LOCAL COUNTY REGULATIONS ===\n' + countyDocs.map((d) => `"${d.text}"`).join('\n'))
            if (stateDocs.length > 0) contextParts.push('=== MICHIGAN STATE CODE ===\n' + stateDocs.map((d) => `"${d.text}"`).join('\n'))
            if (federalDocs.length > 0) contextParts.push('=== FDA GUIDANCE ===\n' + federalDocs.map((d) => `"${d.text}"`).join('\n'))
            
            context = contextParts.join('\n\n')
            citations = searchResults.map((doc) => ({
                document: doc.source.replace('.pdf', ''),
                pages: [doc.page],
            }))
        }
      } catch (err) {
        console.error('Search error:', err)
      }
    }

    const selectedSystemPrompt = PROMPTS[mode] || PROMPTS.chat
    let promptText = `${selectedSystemPrompt}\n\nJURISDICTION: ${county}\n\nOFFICIAL CONTEXT:\n${context || 'No specific text context found.'}\n\nUSER INPUT:\n${lastMessage.content}`

    // --- EXECUTE REQUEST ---
    const reqContent = {
      role: 'user',
      parts: [{ text: promptText }]
    }

    if (image) {
      const base64Data = image.split(',')[1]
      reqContent.parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      })
      reqContent.parts.push({ text: 'Analyze this image based on the mode objectives.' })
    }

    // Timeout Safety
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    const result = await generativeModel.generateContent({
        contents: [reqContent]
    })
    clearTimeout(timeoutId)

    const response = result.response
    const text = response.candidates[0].content.parts[0].text.replace(/\*\*/g, '').replace(/\*/g, '')

    // Save History
    if (chatId) {
      await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'user',
        content: lastMessage.content,
        image: image || null,
      })
      await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'assistant',
        content: text,
      })
    }

    // Increment Usage
    await supabase.rpc('increment_usage', {
      user_id: user.id,
      is_image: !!image,
    })

    return NextResponse.json({
      message: text,
      citations: citations,
    })

  } catch (error) {
    console.error('❌ Chat API Error:', error)
    return NextResponse.json(
      { error: 'Service error. Please try again.' },
      { status: 500 }
    )
  }
}
