import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 60;

// Validate environment variables on module load
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('CRITICAL: Missing ANTHROPIC_API_KEY environment variable');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('CRITICAL: Missing Supabase environment variables');
}

export async function POST(request) {
  try {
    // Validate environment variables
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      );
    }

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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.business_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { messages } = body;
    
    // Validate messages
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

    // Get relevant documents (limited to avoid token overflow)
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('name, content')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      // Continue without documents rather than failing
    }

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

    // Call Claude API with retry logic
    let response;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
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

        if (response.ok) {
          break; // Success, exit retry loop
        }

        const errorData = await response.json();
        lastError = new Error(errorData.error?.message || `API error: ${response.status}`);
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw lastError;
        }

        retries--;
        if (retries > 0) {
          // Exponential backoff: wait 1s, then 2s, then 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
        }
      } catch (error) {
        lastError = error;
        retries--;
        if (retries === 0) {
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Failed to get response from Claude API');
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

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
    
    // Return user-friendly error messages
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
