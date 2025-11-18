import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🎟️ Token preview:', token.substring(0, 20) + '...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.business_id) {
      console.error('❌ Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('✅ Profile found, business_id:', profile.business_id);

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

    console.log('📄 Fetching documents...');
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('name, content')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (docsError) {
      console.error('⚠️ Error fetching documents:', docsError);
    } else {
      console.log('✅ Documents fetched:', documents?.length || 0);
    }

    let context = '';
    if (documents && documents.length > 0) {
      context = 'Here are relevant documents from your knowledge base:\n\n';
      documents.forEach((doc, idx) => {
        const truncatedContent = doc.content.substring(0, 2000);
        context += `[Document ${idx + 1}: ${doc.name}]\n${truncatedContent}\n\n`;
      });
      context += 'Based on the above documents, please answer the following question:\n\n';
    }

    const geminiContents = [];
    
    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      geminiContents.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    }

    if (context && geminiContents.length > 0) {
      const lastIndex = geminiContents.length - 1;
      if (geminiContents[lastIndex].role === 'user') {
        geminiContents[lastIndex].parts[0].text = context + geminiContents[lastIndex].parts[0].text;
      }
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
                maxOutputTokens: 1024,
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
      }],
      documentsUsed: documents?.length || 0
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    
    let errorMessage = 'Failed to process request';
    let statusCode = 500;

    if (error.message.includes('Unauthorized')) {
      errorMessage = 'Authentication failed';
      statusCode = 401;
    } else if (error.message.includes('API error')) {
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
