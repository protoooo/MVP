import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit' 
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are ProtocolLM, a specialized regulatory intelligence engine.
Directives:
1. Strict Compliance: Base answers on FDA Food Code & Local Ordinances.
2. Citations: Cite specific code sections (e.g., "FDA 3-501.16").
3. Format: Use Markdown.
4. Mock Audits: If asked for an audit, output a Markdown Table with columns: [Item, Status, Code Ref, Correction].`

function initVertexAI() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON
  if (!projectId) throw new Error('Missing Project ID')
  
  if (credentialsJson) {
    const tempFile = path.join('/tmp', 'google-credentials.json')
    try {
      fs.writeFileSync(tempFile, credentialsJson)
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFile
    } catch (err) { console.error(err) }
  }
  return new VertexAI({ project: projectId, location: 'us-central1' })
}

export async function POST(req) {
  try {
    const vertex = initVertexAI()
    const model = vertex.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

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

    const body = await req.json()
    const { messages, image, county } = body
    
    // --- RATE LIMIT CHECK ---
    const limitCheck = await checkRateLimit(session.user.id)
    
    if (!limitCheck.success) {
      return NextResponse.json({ error: limitCheck.message || 'Subscription error.' }, { status: 429 })
    }
    
    // Special check for Images
    if (image) {
      if (limitCheck.currentImages >= limitCheck.imageLimit) {
        return NextResponse.json({ error: `Image limit reached for ${limitCheck.plan} plan. Upgrade for more.` }, { status: 429 })
      }
    }
    // ------------------------

    const lastMessage = messages[messages.length - 1]
    let context = ''
    let citations = []

    if (lastMessage.content && !image) {
      try {
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        if (searchResults?.length > 0) {
           context = searchResults.map(doc => `[Source: ${doc.metadata.filename}, Page ${doc.metadata.page}]\nContent: ${doc.pageContent}`).join('\n\n')
           citations = searchResults.map(doc => ({ document: doc.metadata.filename.replace('.pdf', ''), pages: [doc.metadata.page] }))
        }
      } catch (err) { console.error('Search Warning:', err) }
    }

    const request = {
      contents: [{ 
          role: 'user', 
          parts: [{ text: SYSTEM_PROMPT }, { text: `CONTEXT:\n${context}` }, { text: `QUERY:\n${lastMessage.content}` }] 
      }]
    }

    if (image) {
      const base64Data = image.split(',')[1]
      request.contents[0].parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } })
    }

    const streamingResp = await model.generateContentStream(request)
    const response = await streamingResp.response
    const text = response.candidates[0].content.parts[0].text

    // Increment Usage
    supabase.rpc('increment_usage', { user_id: session.user.id, is_image: !!image })

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: `System processing error: ${error.message}` }, { status: 500 })
  }
}
