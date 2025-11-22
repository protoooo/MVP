import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchDocuments } from '@/lib/searchDocs'

export const dynamic = 'force-dynamic'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland']

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Check Subscription & Limits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used, images_used, county')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_subscribed) {
      return NextResponse.json({ error: 'Active subscription required.' }, { status: 403 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', session.user.id)
      .single()

    const limits = subscription?.plan === 'enterprise' 
      ? { requests: 5000, images: 500 }
      : { requests: 500, images: 50 }

    if (profile.requests_used >= limits.requests) {
      return NextResponse.json({ error: 'Monthly query limit reached.' }, { status: 429 })
    }

    const { messages, image, county } = await request.json()
    
    if (image && profile.images_used >= limits.images) {
      return NextResponse.json({ error: 'Monthly image limit reached.' }, { status: 429 })
    }

    const requestedCounty = county || profile.county || 'washtenaw'
    const userCounty = VALID_COUNTIES.includes(requestedCounty) ? requestedCounty : 'washtenaw'

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // FIX: Use "gemini-1.5-pro" (The evergreen tag for the smart model)
    // This fixes the 404 error you were seeing.
    const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const lastUserMessage = messages[messages.length - 1].content
    let contextText = ""
    let usedDocs = []

    // 3. Search Documents (Robust / No Crash)
    if (lastUserMessage && lastUserMessage.trim().length > 0) {
      try {
        let searchQuery = lastUserMessage
        if (image) searchQuery = `food safety violations equipment cleanliness sanitation ${lastUserMessage}`.trim()

        const results = await searchDocuments(searchQuery, 20, userCounty)
        
        if (results && results.length > 0) {
          contextText = results.map((doc, idx) => {
            const source = doc.source || 'Unknown Doc'
            const page = doc.page || 'N/A'
            const docKey = `${source}-${page}`
            if (!usedDocs.some(d => `${d.source}-${d.page}` === docKey)) {
              usedDocs.push({ source, page })
            }
            return `[DOCUMENT ${idx + 1}]
SOURCE: ${source}
PAGE: ${page}
COUNTY: ${COUNTY_NAMES[userCounty]}
CONTENT: ${doc.text}`
          }).join("\n---\n\n")
        }
      } catch (searchErr) {
        console.error("Search failed (using general knowledge):", searchErr)
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty

    // 4. Construct Prompt
    const systemPrompt = `You are protocolLM compliance assistant for ${countyName}.

CRITICAL: Cite every regulatory statement using: **[Document Name, Page X]**

RETRIEVED CONTEXT (${countyName}):
${contextText || 'No specific documents found (Answer based on general food safety knowledge).'}

${contextText ? `AVAILABLE DOCUMENTS:\n${usedDocs.map(d => `- ${d.source} (Page ${d.page})`).join('\n')}` : ''}

Always cite from documents using **[Document Name, Page X]** format.`

    let promptParts = [systemPrompt]
    messages.slice(0, -1).forEach(m => promptParts.push(`${m.role}: ${m.content}`))
    promptParts.push(`user: ${lastUserMessage}`)

    // 5. Handle Image
    if (image) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      })
      promptParts.push(`Analyze this image for potential food safety concerns based on FDA Food Code and Michigan regulations.`)
    }

    // 6. Generate Response
    const result = await chatModel.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    // 7. Update Usage Stats
    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (image) {
      updates.images_used = (profile.images_used || 0) + 1
    }
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    // 8. Extract Citations for UI
    const citations = []
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match
    while ((match = citationRegex.exec(text)) !== null) {
      citations.push({
        document: match[1],
        pages: match[2],
        county: userCounty
      })
    }

    return NextResponse.json({ 
      message: text,
      county: userCounty,
      citations: citations,
      documentsSearched: usedDocs.length
    })

  } catch (error) {
    console.error('Backend Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Service error occurred.' 
    }, { status: 500 })
  }
}
