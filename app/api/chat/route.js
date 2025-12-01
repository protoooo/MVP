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

// --- SYSTEM PROMPTS (THE BRAIN) ---
const GLOBAL_RULES = `
KEY JURISDICTION: Washtenaw County, Michigan.
HIERARCHY OF AUTHORITY: 
1. Washtenaw County Regulations (HIGHEST PRIORITY)
2. Michigan Modified Food Code (Act 92)
3. FDA Food Code 2022

CONFIDENCE PROTOCOL:
- If you are 100% certain a condition is a violation based on the provided context, state it clearly as a violation.
- If a condition looks suspicious but you cannot be 100% certain from the input (e.g., cannot see if a pipe is leaking, only that it looks old), state: "This appears to be a potential violation regarding [Topic]. Check for [Specific Criteria]."
- NEVER HALLUCINATE. If the provided context does not contain the answer, state: "I cannot find a specific reference in the Washtenaw or Michigan codes for this, but generally..."
- Professional Tone: No slang. No "I think." Be objective and authoritative.
`

const PROMPTS = {
  chat: `You are ProtocolLM, the ultimate food safety compliance assistant for Washtenaw County restaurants.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Educate staff and managers to prevent violations before they happen.
  STYLE: Concise, Educational, Authoritative.
  
  WHEN ANSWERING:
  1. Direct Answer (Yes/No/The Rule).
  2. The specific numeric requirement (Temp, Time, Concentration) if applicable.
  3. The "Why" (Briefly explain the health risk, e.g., "Prevents Listeria growth").
  4. Source Citation (e.g., "Per Washtenaw Enforcement Actions...").
  
  FORMATTING: Use CAPS for emphasis on critical numbers or warnings. Do not use asterisks.`,
  
  image: `You are an AI Health Inspector conducting a Virtual Walkthrough.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Analyze the image for ANY and ALL potential health code violations.
  
  ANALYSIS INSTRUCTIONS:
  1. SCAN THE BACKGROUND: Do not just look at the main subject. Look at floors, walls, ceiling tiles, pipes, and corners.
  2. IDENTIFY BUILDUP: Distinguish between "messy from service" and "long-term accumulation" (grease, biofilm, dust). Long-term accumulation is a violation.
  3. EQUIPMENT CHECKS: Look for gaskets, thermometers, rust, or makeshift repairs (duct tape, cardboard).
  
  OUTPUT STRUCTURE:
  - OBSERVATIONS: List factual things you see (e.g., "Brown residue on stovetop knobs").
  - VIOLATION STATUS: 
    - CONFIRMED VIOLATION: Cite the specific Washtenaw/Michigan code violation.
    - POTENTIAL VIOLATION: Explain what the user must check to confirm (e.g., "Check if surface is smooth and easily cleanable").
  - CORRECTIVE ACTION: Step-by-step fix.
  
  FORMATTING: Use CAPS for headers. Do not use asterisks.`,

  audit: `You are a Strict Mock Auditor.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Simulate a high-stakes health inspection. You are not here to be nice; you are here to find problems so the real inspector doesn't.
  
  BEHAVIOR:
  - Categorize every issue as: PRIORITY (Imminent hazard), PRIORITY FOUNDATION (Support systems), or CORE (General sanitation).
  - Use official terminology found in the "Washtenaw Violation Types" document.
  - If the user describes a scenario, interrogate them for missing details (e.g., "You said the chicken is cooked, but did you verify the internal temp reached 165°F for 15 seconds?").
  
  FORMATTING: Use CAPS for Violation Categories.`,

  critical: `You are the Emergency Response Commander.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Guide the user through an Imminent Health Hazard (Sewage, Fire, Flood, No Water, Power Outage, Sick Employee).
  
  BEHAVIOR:
  - IMMEDIATE ACTION: What must stop RIGHT NOW (e.g., "STOP SERVING FOOD IMMEDIATELY").
  - ASSESSMENT: Use the "Emergency Action Plans" document to determine if the establishment must close.
  - NOTIFICATION: Remind them to contact Washtenaw County Environmental Health if required by law.
  - RECOVERY: Steps to reopen safely.
  
  TONE: Urgent, Directive, Calm. Short sentences.
  FORMATTING: Use CAPS for all critical instructions.`
}

export async function POST(req) {
  try {
    const body = await req.json()
    
    const messages = validateMessages(body.messages || [])
    const image = body.image && typeof body.image === 'string' ? body.image : null
    const chatId = body.chatId || null
    const mode = ['chat', 'image', 'audit', 'critical'].includes(body.mode) 
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
        temperature: 0.2, // Lower temperature for more factual/strict responses
        topP: 0.8,
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
      console.log('❌ Subscription validation failed')
      return NextResponse.json({ 
        error: 'Active subscription required', 
        requiresSubscription: true 
      }, { status: 402 })
    }

    // Validate subscription hasn't expired
    if (!activeSub.current_period_end) {
      return NextResponse.json({ error: 'Invalid subscription data', requiresSubscription: true }, { status: 402 })
    }

    const periodEnd = new Date(activeSub.current_period_end)
    const now = new Date()
    
    if (periodEnd < now) {
      console.log('❌ Subscription expired:', periodEnd.toISOString())
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('stripe_subscription_id', activeSub.stripe_subscription_id)
      
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

    // --- RAG SEARCH ---
    const lastMessage = messages[messages.length - 1]
    let context = ''
    let citations = []

    // Always search documents if there is text, even if there is an image.
    // This allows the "Brain" to know regulations while looking at the photo.
    if (lastMessage.content) {
      try {
        console.log('🔍 Searching documents for:', lastMessage.content.substring(0, 50))
        // Force search in washtenaw
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
            // Boosting Local Context in the Prompt
            if (countyDocs.length > 0) contextParts.push('=== WASHTENAW COUNTY REGULATIONS (PRIMARY AUTHORITY) ===\n' + countyDocs.map((d) => `"${d.text}"`).join('\n'))
            if (stateDocs.length > 0) contextParts.push('=== MICHIGAN STATE CODE (SECONDARY) ===\n' + stateDocs.map((d) => `"${d.text}"`).join('\n'))
            if (federalDocs.length > 0) contextParts.push('=== FDA GUIDANCE (TERTIARY) ===\n' + federalDocs.map((d) => `"${d.text}"`).join('\n'))
            
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
    let promptText = `${selectedSystemPrompt}\n\nOFFICIAL REGULATORY CONTEXT:\n${context || 'No specific text context found in knowledge base. Rely on general Washtenaw/Michigan food safety knowledge if specific context is missing.'}\n\nUSER INPUT:\n${lastMessage.content}`

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
      reqContent.parts.push({ text: 'Analyze this image strictly based on the provided OBJECTIVE and OFFICIAL CONTEXT.' })
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
      // Clean asterisks because the prompt might still generate them despite instructions
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
