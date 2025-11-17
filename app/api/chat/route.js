import { NextResponse } from 'next/server';

export async function POST(request) {
  const { messages, documents } = await request.json();

  const context = documents.map(doc => 
    `Document: ${doc.name}\n${doc.content}`
  ).join('\n\n---\n\n');

  const systemPrompt = `You are an employee assistant...
  
Company Documents:
${context}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  });

  const data = await response.json();
  return NextResponse.json(data);
}
