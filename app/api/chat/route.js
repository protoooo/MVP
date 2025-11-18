import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const maxDuration = 60;

export async function POST(request) {
  const startTime = Date.now();

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ Missing GEMINI_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    const userQuery = lastMessage.content;

    if (!userQuery || userQuery.trim().length === 0) {
      return NextResponse.json({ error: 'Empty message content' }, { status: 400 });
    }

    if (userQuery.length > 10000) {
      return NextResponse.json({ error: 'Message too long (max 10000 characters)' }, { status: 400 });
    }

    // Load knowledge base from filesystem
    console.log('📄 Loading knowledge base...');
    let knowledgeContext = '';
    
    try {
      const knowledgeDir = path.join(process.cwd(), 'knowledge-base');
      const files = await fs.readdir(knowledgeDir);
      
      for (const file of files) {
        if (file.endsWith('.txt') || file.endsWith('.md')) {
          const content = await fs.readFile(path.join(knowledgeDir, file), 'utf-8');
          knowledgeContext += `\n\n[${file}]\n${content}`;
        }
      }
      
      console.log('✅ Knowledge base loaded');
    } catch (err) {
      console.log('⚠️ No knowledge base found or error loading:', err.message);
    }

    // Build system context
    const systemContext = `You are a compliance assistant for Washtenaw County food service establishments and restaurants. 
Your role is to help restaurant owners, managers, and food service workers understand and comply with:
- Michigan Food Code regulations
- Washtenaw County Health Department requirements
- Food safety protocols
- Licensing and permit requirements
- Inspection preparation

Always provide accurate, helpful information. If you're unsure about specific regulations, advise consulting the Washtenaw County Health Department directly.

Knowledge Base:
${knowledgeContext}

Based on the above information, please answer questions accurately and helpfully.`;

    const geminiContents = [];
    
    // Add system context as first user message
    geminiContents.push({
      role: 'user',
      parts: [{ text: systemContext }]
    });
    
    geminiContents.push({
      role: 'model',
      parts: [{ text: 'I understand. I will assist with Washtenaw County food service compliance questions using the provided knowledge base.' }]
    });
    
    // Add conversation history
    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      geminiContents.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    }

    console.log('🤖 Calling Gemini API...');

    let response;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
              }
            }),
          }
        );

        if (response.ok) {
          break;
        }

        const errorData = await response.json();
        console.error('❌ Gemini error:', errorData);
        lastError = new Error(errorData.error?.message || `API error: ${response.status}`);
        
        if (response.status >= 400 && response.status < 500) {
          throw lastError;
        }

        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
        }
      } catch (error) {
        lastError = error;
        retries--;
        if (retries === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Failed to get response from Gemini API');
    }

    const data = await response.json();
    console.log('✅ Gemini response received');
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const assistantResponse = data.candidates[0].content.parts[0].text;

    return NextResponse.json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantResponse,
        },
      }]
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    
    let errorMessage = 'Failed to process request';
    let statusCode = 500;

    if (error.message.includes('API error')) {
      errorMessage = 'AI service temporarily unavailable';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out';
      statusCode = 504;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
