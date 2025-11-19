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
    const { messages, docContext } = await request.json()
    
    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // 3. Construct the Prompt
    // We combine the latest user question with the document context
    const lastMessage = messages[messages.length - 1].content
    
    const prompt = `
      You are a helpful food safety expert assistant for Washtenaw County restaurants.
      
      Context: The user is looking at the document: "${docContext}".
      
      User Question: ${lastMessage}
      
      Please answer the question professionally based on general food safety knowledge and the context of the document title provided. Keep it concise and helpful.
    `

    // 4. Generate Response
    const result = await model.generateContent(prompt)
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
