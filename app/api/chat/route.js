import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  // 1. Verify Session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { messages, image, docContext } = await request.json()
    
    // 2. Initialize Gemini (1.5 Flash for speed + vision)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const lastUserMessage = messages[messages.length - 1].content

    // 3. Strict System Prompt
    const systemPrompt = `
      You are "Protocol", a highly strict Food Safety Compliance Assistant for Washtenaw County, MI.
      
      CONTEXT:
      The user is referencing the official document: "${docContext}".
      
      YOUR INSTRUCTIONS:
      1. Answer ONLY based on Washtenaw County and FDA Food Code regulations.
      2. If the user asks about anything unrelated to food safety (e.g., "Write me a poem", "What is the capital of France"), politely REFUSE. State that you are only authorized to discuss restaurant compliance.
      3. When providing facts, EXPLICITLY reference the document "${docContext}" in **bold** format (e.g., "According to **${docContext}**...").
      4. Do NOT hallucinate. If the answer is not standard food safety knowledge or found in the context of compliance, say "I cannot find that specific regulation."
      5. Maintain a professional, inspector-like tone. No emojis. No slang.
    `

    // 4. Build Prompt Parts
    let promptParts = [systemPrompt]
    
    // Add conversation history
    messages.forEach(m => {
      promptParts.push(`${m.role}: ${m.content}`)
    })
    
    // Add the latest user input
    promptParts.push(`user: ${lastUserMessage}`)
    
    // 5. Handle Image Analysis
    if (image) {
      // Image format: "data:image/jpeg;base64,..."
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      })
      promptParts.push("INSTRUCTION: Analyze this image strictly for food safety violations, sanitary risks, or compliance issues based on Washtenaw County codes. Ignore non-food-safety elements.")
    }

    // 6. Generate Response
    const result = await model.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate response', 
      details: error.message 
    }, { status: 500 })
  }
}
