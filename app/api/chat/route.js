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

// --- SYSTEM PROMPTS (THE BRAIN LOGIC) ---
// NOTE: No specific violation examples are hard-coded here. 
// All rules must be retrieved from the Vector Database (The "Brain").

const GLOBAL_RULES = `
PRIMARY JURISDICTION: Washtenaw County, Michigan.
HIERARCHY OF TRUTH: 
1. Washtenaw County Regulations (HIGHEST PRIORITY - Overrides all others)
2. Michigan Modified Food Code (Act 92)
3. FDA Food Code 2022

INSTRUCTIONS:
- You are NOT a generic AI. You are a specialized Compliance Engine for Washtenaw County.
- Do not use general internet knowledge if it contradicts the provided OFFICIAL CONTEXT.
- If the Context provided mentions specific Washtenaw enforcement procedures (e.g., specific fines, color-coded tags), USE THEM.
- If you are unsure based on the Context, admit it. Do not guess.
`

const PROMPTS = {
  chat: `You are ProtocolLM, the Washtenaw County Food Safety Expert.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Answer compliance questions strictly based on the retrieved regulations.
  STYLE: Direct, Professional, Localized.
  
  RESPONSE STRUCTURE:
  1. The Answer (Yes/No/It depends).
  2. The Rule (Cite the specific code or regulation from the Context).
  3. The Action (What the manager needs to do to be compliant).
  
  FORMATTING: Use CAPS for critical values (temps, times). No asterisks.`,
  
  image: `You are an AI Health Inspector performing a visual audit.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Analyze the image for compliance with Washtenaw/Michigan codes.
  
  ANALYSIS PROTOCOL:
  1. DETECT: Scan the entire image (foreground and background) for sanitary defects, structural issues, or unsafe food handling.
  2. CROSS-REFERENCE: Compare what you see against the text in the OFFICIAL CONTEXT provided below.
  3. JUDGE: Determine if the observed condition violates the specific codes found in the Context.
  
  OUTPUT:
  - OBSERVATIONS: Factual list of what is seen.
  - VIOLATION STATUS: "Confirmed Violation" (if code matches), "Potential Violation" (if unclear), or "Compliant".
  - CITATION: Quote the Washtenaw/Michigan code section from the Context that applies.
  - FIX: Immediate corrective action.
  
  FORMATTING: Use CAPS for headers. No asterisks.`,

  audit: `You are a Strict Mock Auditor for Washtenaw County.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Grill the user to find hidden violations.
  
  BEHAVIOR:
  - Act like a skepticism health inspector.
  - If the user gives a vague answer, demand proof (e.g., "Do you have the temperature logs to prove that?").
  - Classify every issue found using the official Washtenaw Violation Types (Priority, Priority Foundation, Core).
  
  FORMATTING: Use CAPS for priority levels.`,

  critical: `You are the Emergency Response System.
  ${GLOBAL_RULES}
  
  OBJECTIVE: Manage Imminent Health Hazards (Sewage, Fire, Flood, Power Outage).
  
  BEHAVIOR:
  - Prioritize PUBLIC SAFETY above all else.
  - If the condition meets the criteria for immediate closure (as defined in the Washtenaw Emergency Action Plans), tell them to CLOSE immediately.
  - Provide the exact steps required to reopen based on the County documents.
  
  TONE: Urgent, Directive.
  FORMATTING: Use CAPS for immediate actions (e.g., STOP SERVICE).`
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
        temperature: 0.2, // Low temp = High precision, less creativity
        topP: 0.8,
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Terms
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.accepted_terms || !profile.accepted_privacy) {
      return NextResponse.json({ error: 'Please accept terms', requiresTerms: true }, { status: 403 })
    }

    // Strict Subscription Check
    const { data: activeSub, error: subError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, plan, stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (subError || !activeSub) {
      return NextResponse.json({ error: 'Active subscription required', requiresSubscription: true }, { status: 402 })
    }

    if (!activeSub.current_period_end) {
      return NextResponse.json({ error: 'Invalid subscription data', requiresSubscription: true }, { status: 402 })
    }

    const periodEnd = new Date(activeSub.current_period_end)
    if (periodEnd < new Date()) {
      await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('stripe_subscription_id', activeSub.stripe_subscription_id)
      return NextResponse.json({ error: 'Subscription expired', requiresSubscription: true }, { status: 402 })
    }

    // Rate Limits
    const limitCheck = await checkRateLimit(user.id)
    if (!limitCheck.success) {
      return NextResponse.json({ error: limitCheck.message, limitReached: true }, { status: 429 })
    }
    if (image && limitCheck.currentImages >= limitCheck.imageLimit) {
      return NextResponse.json({ error: 'Image limit reached', limitReached: true }, { status: 429 })
    }

    // --- RAG SEARCH (THE BRAIN LOOKUP) ---
    const lastMessage = messages[messages.length - 1]
    let context = ''
    let citations = []

    // Always search context if there is text, allowing the Brain to work on image + text prompts
    if (lastMessage.content) {
      try {
        console.log('🔍 Accessing Knowledge Base for:', lastMessage.content.substring(0, 50))
        
        // This function searches your 6,746 document chunks in Supabase
        const searchResults = await searchDocuments(lastMessage.content, 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
            const countyDocs = searchResults.filter((d) => d.docType === 'county')
            const stateDocs = searchResults.filter((d) => d.docType === 'state')
            const federalDocs = searchResults.filter((d) => d.docType === 'federal')
            
            console.log('📚 Documents Retrieved:', {
              washtenaw: countyDocs.length,
              michigan: stateDocs.length,
              fda: federalDocs.length
            })
            
            // Organize context by Authority Level for the AI
            let contextParts = []
            if (countyDocs.length > 0) contextParts.push('=== WASHTENAW COUNTY REGULATIONS (HIGHEST AUTHORITY) ===\n' + countyDocs.map((d) => `"${d.text}"`).join('\n'))
            if (stateDocs.length > 0) contextParts.push('=== MICHIGAN STATE CODE (SECONDARY AUTHORITY) ===\n' + stateDocs.map((d) => `"${d.text}"`).join('\n'))
            if (federalDocs.length > 0) contextParts.push('=== FDA GUIDANCE (TERTIARY AUTHORITY) ===\n' + federalDocs.map((d) => `"${d.text}"`).join('\n'))
            
            context = contextParts.join('\n\n')
            citations = searchResults.map((doc) => ({
                document: doc.source.replace('.pdf', ''),
                pages: [doc.page],
            }))
        } else {
          console.log('⚠️ No relevant documents found in Knowledge Base')
        }
      } catch (err) {
        console.error('❌ Search error:', err)
      }
    }

    // Inject the dynamic context into the prompt
    const selectedSystemPrompt = PROMPTS[mode] || PROMPTS.chat
    let promptText = `${selectedSystemPrompt}\n\nOFFICIAL REGULATORY CONTEXT (RETRIEVED FROM DATABASE):\n${context || 'No specific text found in Knowledge Base. Proceed with caution and state that you are using general knowledge if necessary.'}\n\nUSER INPUT:\n${lastMessage.content}`

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

    try {
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
