import { NextResponse } from 'next/server'
import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { question } = await request.json()

    if (!question || question.trim() === '') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Initialize clients only when route is called
    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Create embedding for the question using Cohere Embed 4.0
    const embedResponse = await cohere.embed({
      texts: [question],
      model: process.env.COHERE_EMBED_MODEL || 'embed-english-v3.0',
      inputType: 'search_query',
    })

    const queryEmbedding = embedResponse.embeddings[0]

    // Search for relevant documents in Supabase
    const { data: documents, error: searchError } = await supabase.rpc(
      'match_compliance_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 10,
      }
    )

    if (searchError) {
      console.error('Document search error:', searchError)
      return NextResponse.json(
        { error: 'Failed to search compliance documents' },
        { status: 500 }
      )
    }

    // If we have documents, use Rerank 4.0 to improve relevance
    let relevantDocs = documents || []
    
    if (relevantDocs.length > 0) {
      const rerankResponse = await cohere.rerank({
        model: process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0',
        query: question,
        documents: relevantDocs.map(doc => doc.chunk),
        topN: 5,
      })

      // Reorder documents based on rerank scores
      relevantDocs = rerankResponse.results.map(result => 
        relevantDocs[result.index]
      )
    }

    // Build context from relevant documents
    const context = relevantDocs.length > 0
      ? relevantDocs.map((doc, idx) => 
          `[${idx + 1}] ${doc.chunk} (Source: ${doc.source})`
        ).join('\n\n')
      : 'No relevant compliance documents found.'

    // Generate answer using Cohere AYA 32B
    const chatResponse = await cohere.chat({
      model: process.env.COHERE_VISION_MODEL || 'command-r-plus',
      message: question,
      preamble: `You are a Michigan food safety compliance expert. Answer questions based ONLY on the Michigan food safety regulations and health inspection codes provided below. Do not hallucinate or make up information. If the answer is not in the provided documents, clearly state that.

Your role is to help Michigan food service establishments (restaurants, cafes, food trucks, etc.) prepare for health inspections by providing accurate, document-grounded answers.

Michigan Food Safety Regulations:
${context}`,
    })

    // Create session record
    await supabase.from('analysis_sessions').insert({
      type: 'qa',
      status: 'completed',
      completed_at: new Date().toISOString(),
      input_metadata: { question },
      output_summary: { 
        answer: chatResponse.text,
        documents_used: relevantDocs.length 
      },
    })

    return NextResponse.json({
      answer: chatResponse.text,
      sources: relevantDocs.slice(0, 3).map(doc => ({
        source: doc.source,
        similarity: doc.similarity,
      })),
    })

  } catch (error) {
    console.error('Q&A error:', error)
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    )
  }
}
