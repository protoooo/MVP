import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- DEFINING MODES & PROMPTS ---
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
    const { messages, image, county, chatId, mode = 'chat' } = body

    // --- VERTEX AI AUTHENTICATION FOR RAILWAY ---
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID || 'food-safety-production'
    const location = 'us-central1'
    
    let vertexConfig = { project: projectId, location: location };

    // FIX: Handle Credential Parsing Robustly
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        
        // CRITICAL FIX: Replace escaped newlines with actual newlines
        const privateKey = credentials.private_key 
          ? credentials.private_key.replace(/\\n/g, '\n')
          : undefined;

        vertexConfig.googleAuthOptions = {
          credentials: {
            client_email: credentials.client_email,
            private_key: privateKey,
          }
        };
      } catch (e) {
        console.error("❌ Failed to parse GOOGLE_CREDENTIALS_JSON:", e);
        return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
      }
    }
    
    const vertex_ai = new VertexAI(vertexConfig);
    
    // FIXED: Updated to latest stable model
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        'maxOutputTokens': 2048,
        'temperature': 0.3,
        'topP': 0.95,
      },
    });

    // --- SUPABASE AUTH CHECK ---
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limitCheck = await checkRateLimit(session.user.id)
    if (!limitCheck.success) return NextResponse.json({ error: limitCheck.message, limitReached: true }, { status: 429 })
    
    if (image && limitCheck.currentImages >= limitCheck.imageLimit) {
      return NextResponse.json({ error: 'Image limit reached.', limitReached: true }, { status: 429 })
    }

    const lastMessage = messages[messages.length - 1]

    // Save User Message
    if (chatId) {
       await supabase.from('messages').insert({
         chat_id: chatId,
         role: 'user',
         content: lastMessage.content,
         image: image || null
       })
    }

    // RAG Logic
    let context = ''
    let citations = []
    if (lastMessage.content && !image) {
      try {
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        if (searchResults && searchResults.length > 0) {
           const countyDocs = searchResults.filter(d => d.docType === 'county')
           const stateDocs = searchResults.filter(d => d.docType === 'state')
           const federalDocs = searchResults.filter(d => d.docType === 'federal')
           
           let contextParts = []
           if (countyDocs.length > 0) contextParts.push('=== LOCAL COUNTY REGULATIONS ===\n' + countyDocs.map(d => `"${d.text}"`).join('\n'))
           if (stateDocs.length > 0) contextParts.push('=== MICHIGAN STATE CODE ===\n' + stateDocs.map(d => `"${d.text}"`).join('\n'))
           if (federalDocs.length > 0) contextParts.push('=== FDA GUIDANCE ===\n' + federalDocs.map(d => `"${d.text}"`).join('\n'))
           
           context = contextParts.join('\n\n')
           citations = searchResults.map(doc => ({ document: doc.source.replace('.pdf', ''), pages: [doc.page] }))
        }
      } catch (err) { console.error('Search Error:', err) }
    }

    const selectedSystemPrompt = PROMPTS[mode] || PROMPTS.chat

    // --- VERTEX PROMPT CONSTRUCTION ---
    const textPrompt = {
        text: `${selectedSystemPrompt}
        
        JURISDICTION: ${county || 'washtenaw'}
        
        OFFICIAL CONTEXT:
        ${context || 'No specific text context found. Use general knowledge.'}
        
        USER INPUT:
        ${lastMessage.content}`
    }

    const parts = [textPrompt]

    if (image) {
      const base64Data = image.split(',')[1]
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      })
      parts.push({ text: "Analyze this image based on the specific mode objectives defined above. Be specific about violations." })
    }

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: parts }]
    });
    
    const response = await result.response;
    let text = response.candidates[0].content.parts[0].text;

    // ADDED: Remove all asterisks from the response
    text = text.replace(/\*\*/g, '').replace(/\*/g, '');

    // Save Assistant Message
    if (chatId) {
      await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'assistant',
        content: text
      })
    }

    await supabase.rpc('increment_usage', { user_id: session.user.id, is_image: !!image })

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('Vertex AI Error:', error)
    return NextResponse.json({ error: 'System processing error. Please try again.', fallback: true }, { status: 500 })
  }
}
