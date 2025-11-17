import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateEmbedding, generateQueryHash } from '../../../lib/embeddings';

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

    // Check cache first
    const queryHash = generateQueryHash(userQuery, profile.business_id);
    const { data: cachedResponse } = await supabase
      .from('query_cache')
      .select('*')
      .eq('business_id', profile.business_id)
      .eq('query_hash', queryHash)
      .single();

    if (cachedResponse) {
      // Update cache access stats
      await supabase
        .from('query_cache')
        .update({
          accessed_at: new Date().toISOString(),
          access_count: cachedResponse.access_count + 1,
        })
        .eq('id', cachedResponse.id);

      return NextResponse.json({
        choices: [{
          message: {
            role: 'assistant',
            content: cachedResponse.response,
          },
        }],
        cached: true,
      });
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(userQuery);

    // Search for relevant chunks using vector similarity
    const { data: relevantChunks, error: searchError } = await supabase
      .rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        filter_business_id: profile.business_id,
        match_threshold: 0.5, // Adjust this threshold as needed
        match_count: 5, // Get top 5 most relevant chunks
      });

    if (searchError) {
      console.error('Vector search error:', searchError);
    }

    // Build context from relevant chunks
    let context = '';
    const chunksUsed = [];
    
    if (relevantChunks && relevantChunks.length > 0) {
      context = 'Relevant information from your documents:\n\n';
      relevantChunks.forEach((chunk, idx) => {
        context += `[${idx + 1}] ${chunk.content}\n\n`;
        chunksUsed.push({
          id: chunk.id,
          similarity: chunk.similarity,
          preview: chunk.content.substring(0, 100),
        });
      });
      context += '\nBased on the above information, please answer the following question:\n\n';
    } else {
      context = 'No specific documents found. Please answer based on general knowledge:\n\n';
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

    // Cache the response
    try {
      await supabase
        .from('query_cache')
        .insert({
          business_id: profile.business_id,
          query_hash: queryHash,
          query_text: userQuery,
          response: assistantResponse,
          chunks_used: chunksUsed,
        });
    } catch (cacheError) {
      console.error('Cache insert error:', cacheError);
      // Don't fail the request if caching fails
    }

    return NextResponse.json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantResponse,
        },
      }],
      cached: false,
      chunksUsed: chunksUsed.length,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
