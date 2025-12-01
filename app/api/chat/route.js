import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

function validateMessages(messages) {
  if (!Array.isArray(messages)) return []
  if (messages.length > 100) return messages.slice(-100)
  
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeString(msg.content, 5000),
    image: msg.image || null
  }))
}

// --- SYSTEM PROMPTS ---
const PROMPTS = {
  chat: `You are ProtocolLM, an expert food safety compliance assistant for Michigan restaurants.
  OBJECTIVE: Help operators understand codes and fix violations.
  HIERARCHY: 1. Local County Code (Washtenaw). 2. Michigan Modified Food Code. 3. FDA Food Code.
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
    const chatId = body.chatId || null
    const mode = ['chat', 'image', 'audit', 'critical', 'training', 'sop'].includes(body.mode) 
      ? body.mode 
      : 'chat'

    console.log('📝 Chat API Request:', { mode, hasImage: !!image, messageCount: messages.length })

    // --- VERTEX AI SETUP ---
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
    const location = 'us-central1'
    
    if (!projectId) {
      console.error('❌ Missing GOOGLE_CLOUD_PROJECT_ID')
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
        console.error('❌ Credential parse error', e)
      }
    }
    
    const vertex_ai = new VertexAI(vertexConfig)
    
    const generativeModel = vertex_ai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.3,
        topP: 0.95,
      },
    })

    console.log('✅ Vertex AI initialized with gemini-2.0-flash')

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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.email)

    // Check Terms
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError)
      return NextResponse.json({ error: 'Account error' }, { status: 500 })
    }

    if (!profile.accepted_terms || !profile.accepted_privacy) {
      console.log('⚠️ Terms not accepted')
      return NextResponse.json({ error: 'Please accept terms', requiresTerms: true }, { status: 403 })
    }

    // ✅ STRICT SUBSCRIPTION CHECK
    console.log('🔍 Checking subscription status...')
    
    const { data: activeSub, error: subError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, plan, stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (subError || !activeSub) {
      console.log('❌ Subscription validation failed:', {
        user: user.email,
        hasError: !!subError,
        hasSubscription: !!activeSub,
        errorMessage: subError?.message
      })
      return NextResponse.json({ 
        error: 'Active subscription required', 
        requiresSubscription: true 
      }, { status: 402 })
    }

    // Validate subscription hasn't expired
    if (!activeSub.current_period_end) {
      console.error('❌ Subscription missing expiration date:', activeSub)
      return NextResponse.json({ 
        error: 'Invalid subscription data', 
        requiresSubscription: true 
      }, { status: 402 })
    }

    const periodEnd = new Date(activeSub.current_period_end)
    const now = new Date()
    
    if (periodEnd < now) {
      console.log('❌ Subscription expired:', {
        user: user.email,
        expiredOn: periodEnd.toISOString()
      })
      
      await supabase
        .from('subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('stripe_subscription_id', activeSub.stripe_subscription_id)
      
      return NextResponse.json({ 
        error: 'Subscription expired', 
        requiresSubscription: true 
      }, { status: 402 })
    }

    const VALID_STATUSES = ['active', 'trialing']
    if (!VALID_STATUSES.includes(activeSub.status)) {
      console.log('❌ Invalid subscription status:', activeSub.status)
      return NextResponse.json({ 
        error: 'Invalid subscription status', 
        requiresSubscription: true 
      }, { status: 402 })
    }

    console.log('✅ Valid subscription verified:', {
      user: user.email,
      plan: activeSub.plan,
      status: activeSub.status,
      expires: periodEnd.toLocaleDateString()
    })

    // Check Rate Limits
    const limitCheck = await checkRateLimit(user.id)
    if (!limitCheck.success) {
      console.log('⚠️ Rate limit exceeded:', limitCheck.message)
      return NextResponse.json({ error: limitCheck.message, limitReached: true }, { status: 429 })
    }
    if (image && limitCheck.currentImages >= limitCheck.imageLimit) {
      console.log('⚠️ Image limit exceeded')
      return NextResponse.json({ error: 'Image limit reached', limitReached: true }, { status: 429 })
    }

    // --- RAG SEARCH (Fixed to always use washtenaw) ---
    const lastMessage = messages[messages.length - 1]
    let context = ''
    let citations = []

    if (lastMessage.content && !image) {
      try {
        console.log('🔍 Searching documents for:', lastMessage.content.substring(0, 50))
        const searchResults = await searchDocuments(lastMessage.content, 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
            const countyDocs = searchResults.filter((d) => d.docType === 'county')
            const stateDocs = searchResults.filter((d) => d.docType === 'state')
            const federalDocs = searchResults.filter((d) => d.docType === 'federal')
            
            console.log('📚 Search results:', {
              county: countyDocs.length,
              state: stateDocs.length,
              federal: federalDocs.length
            })
            
            let contextParts = []
            if (countyDocs.length > 0) contextParts.push('=== WASHTENAW COUNTY REGULATIONS ===\n' + countyDocs.map((d) => `"${d.text}"`).join('\n'))
            if (stateDocs.length > 0) contextParts.push('=== MICHIGAN STATE CODE ===\n' + stateDocs.map((d) => `"${d.text}"`).join('\n'))
            if (federalDocs.length > 0) contextParts.push('=== FDA GUIDANCE ===\n' + federalDocs.map((d) => `"${d.text}"`).join('\n'))
            
            context = contextParts.join('\n\n')
            citations = searchResults.map((doc) => ({
                document: doc.source.replace('.pdf', ''),
                pages: [doc.page],
            }))
        } else {
          console.log('⚠️ No search results found')
        }
      } catch (err) {
        console.error('❌ Search error:', err)
      }
    }

    const selectedSystemPrompt = PROMPTS[mode] || PROMPTS.chat
    let promptText = `${selectedSystemPrompt}\n\nJURISDICTION: Washtenaw County, Michigan\n\nOFFICIAL CONTEXT:\n${context || 'No specific text context found.'}\n\nUSER INPUT:\n${lastMessage.content}`

    // --- BUILD REQUEST ---
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

    // --- EXECUTE ---
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    console.log('🚀 Sending request to Vertex AI...')
    
    try {
      const result = await generativeModel.generateContent({
          contents: [reqContent]
      })
      clearTimeout(timeoutId)

      console.log('✅ Response received from Vertex AI')

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

      console.log('✅ Request completed successfully')

      return NextResponse.json({
        message: text,
        citations: citations,
      })
    } catch (apiError) {
      clearTimeout(timeoutId)
      console.error('❌ Vertex AI API Error:', apiError)
      
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again.' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('❌ Chat API Error:', error)
    
    return NextResponse.json(
      { error: 'Service error. Please try again.' },
      { status: 500 }
    )
  }
}
