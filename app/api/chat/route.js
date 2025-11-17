import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.business_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { messages } = await request.json();
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    const userQuery = lastMessage.content;

    // Get all documents for context (simple approach without embeddings)
    const { data: documents } = await supabase
      .from('documents')
      .select('name, content')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(5); // Limit to 5 most recent documents

    // Build context from documents
    let context = '';
    if (documents && documents.length > 0) {
      context = 'Here are relevant documents from your knowledge base:\n\n';
      documents.forEach((doc, idx) => {
        // Truncate each document to avoid token limits
        const truncatedContent = doc.content.substring(0, 2000);
        context += `[Document ${idx + 1}: ${doc.name}]\n${truncatedContent}\n\n`;
      });
      context += 'Based on the above documents, please answer the following question:\n\n';
    }

    // Prepare messages for Claude with context
    const contextualMessages = [
      {
        role: 'user',
        content: context + userQuery,
      },
    ];

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: contextualMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Claude API error');
    }

    const data = await response.json();
    const assistantResponse = data.content[0].text;

    return NextResponse.json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantResponse,
        },
      }],
      documentsUsed: documents?.length || 0,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
