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
  STRUCTURE: Direct Answer -> The Fix -> Evidence [Source, Page].`,
  
  // Fallback for image mode if not specifically defined
  image: `You are an AI Health Inspector. 
  OBJECTIVE: Analyze the provided image for any food safety violations or compliance issues. 
  STYLE: Direct and observational. 
  OUTPUT: List observations and potential violations.`,

  audit: `You are a strict Local Health Inspector performing a mock audit.
  OBJECTIVE: Analyze the user's input (or image) specifically for violations.
  STYLE: Formal, critical, observant.
  STRUCTURE: 
  1. Identify Potential Violations.
  2. Cite the specific code violation.
  3. Assign Priority (Priority, Priority Foundation, Core).
  4. Required Corrective Action.`,

  critical: `You are an Emergency Response Protocol System.
  OBJECTIVE: Guide the user through a food safety emergency (power outage, sewage backup, fire, sick employee).
  STYLE: Calm, imperative, step-by-step. Use bolding for critical actions.
  STRUCTURE:
  1. IMMEDIATE ACTION REQUIRED (What to do RIGHT NOW).
  2. ASSESSMENT (How to decide if you must close).
  3. REOPENING CRITERIA.
  4. WHO TO CALL.`,

  training: `You are an engaging Food Safety Trainer.
  OBJECTIVE: Create a short training script and quiz for kitchen staff based on the user's topic.
  STYLE: Engaging, simple language, encouraging. (Fluff is okay here).
  OUTPUT:
  1. "The 2-Minute Drill" (A short script for a manager to read).
  2. "Pop Quiz" (3 questions with answers at the bottom).`,

  sop: `You are a Documentation Specialist.
  OBJECTIVE: Generate a formal Standard Operating Procedure (SOP) or a Log Sheet.
  STYLE: Bureaucratic, clean, formatted.
  OUTPUT: strictly use Markdown Tables or Bulleted Lists that can be printed. Include fields for 'Date', 'Time', 'Manager Signature'.`
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
    
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-1.5-flash-001', 
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
    if (lastMessage.content && !image) { // Skip RAG for pure image analysis to save time/tokens
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
    const text = response.candidates[0].content.parts[0].text;

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
