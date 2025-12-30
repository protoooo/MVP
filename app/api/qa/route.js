// app/api/qa/route.js - UPDATED with rate limiting and better error handling

import { NextResponse } from 'next/server'
import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request) {
  const startTime = Date.now()

  try {
    // 1. Rate limiting check
    const rateLimit = checkRateLimit(request, '/api/qa')
    
    if (!rateLimit.success) {
      logger.warn('Rate limit exceeded', { 
        endpoint: '/api/qa',
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
      })
      return createRateLimitResponse()
    }

    // 2. Parse and validate request
    let body
    try {
      body = await request.json()
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { question } = body

    // 3. Input validation
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    if (question.trim() === '') {
      return NextResponse.json(
        { error: 'Question cannot be empty' },
        { status: 400 }
      )
    }

    if (question.length > 1000) {
      return NextResponse.json(
        { error: 'Question too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    // 4. Initialize clients
    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 5. Create embedding for the question
    let queryEmbedding
    try {
      const embedResponse = await cohere.embed({
        texts: [question],
        model: process.env.COHERE_EMBED_MODEL || 'embed-v4.0',
        inputType: 'search_query',
        embeddingTypes: ['float'],
      })

      queryEmbedding = embedResponse.embeddings.float[0]

      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error('Invalid embedding response')
      }
    } catch (err) {
      logger.error('Embedding generation failed', { 
        error: err.message,
        question: question.substring(0, 100),
      })
      
      return NextResponse.json(
        { 
          error: 'Failed to process question',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        },
        { status: 500 }
      )
    }

    // 6. Search for relevant documents
    let documents = []
    try {
      const { data, error: searchError } = await supabase.rpc(
        'match_compliance_documents',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: 10,
        }
      )

      if (searchError) throw searchError
      documents = data || []
    } catch (err) {
      logger.error('Document search failed', { 
        error: err.message,
        question: question.substring(0, 100),
      })
      
      return NextResponse.json(
        { 
          error: 'Failed to search compliance documents',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        },
        { status: 500 }
      )
    }

    // 7. Rerank documents for better relevance
    let relevantDocs = documents
    
    if (relevantDocs.length > 0) {
      try {
        const rerankResponse = await cohere.rerank({
          model: process.env.COHERE_RERANK_MODEL || 'rerank-v4.0-pro',
          query: question,
          documents: relevantDocs.map(doc => doc.content),
          topN: Math.min(5, relevantDocs.length),
        })

        // Reorder documents based on rerank scores
        relevantDocs = rerankResponse.results.map(result => 
          relevantDocs[result.index]
        )
      } catch (err) {
        // Reranking is optional - continue with original order if it fails
        logger.warn('Reranking failed, using original order', { 
          error: err.message,
        })
      }
    }

    // 8. Build context from relevant documents
    const context = relevantDocs.length > 0
      ? relevantDocs.map((doc, idx) => 
          `[${idx + 1}] ${doc.content}\n(Source: ${doc.metadata?.source || 'Unknown'})`
        ).join('\n\n')
      : 'No relevant compliance documents found.'

    // 9. Generate answer using Cohere
    let answerText
    try {
      const chatResponse = await cohere.chat({
        model: process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b',
        message: question,
        preamble: `You are a Michigan food safety compliance expert. Answer questions based ONLY on the Michigan food safety regulations and health inspection codes provided below.

CRITICAL RULES:
1. Only use information from the provided documents
2. If the answer is not in the documents, clearly state that
3. Do not make up or hallucinate information
4. Be specific and cite relevant sections when possible
5. Keep answers clear and practical for food service establishments

Your role is to help Michigan food service establishments (restaurants, cafes, food trucks, etc.) prepare for health inspections by providing accurate, document-grounded answers.

Michigan Food Safety Regulations:
${context}`,
        temperature: 0.3,
        maxTokens: 1000,
      })

      answerText = chatResponse.text
    } catch (err) {
      logger.error('Answer generation failed', { 
        error: err.message,
        question: question.substring(0, 100),
      })
      
      return NextResponse.json(
        { 
          error: 'Failed to generate answer',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        },
        { status: 500 }
      )
    }

    // 10. Create session record (async, don't block response)
    supabase.from('analysis_sessions').insert({
      type: 'qa',
      status: 'completed',
      completed_at: new Date().toISOString(),
      input_metadata: { 
        question: question.substring(0, 500), // Truncate for storage
        documents_found: relevantDocs.length,
      },
      output_summary: { 
        answer_length: answerText.length,
        documents_used: relevantDocs.length,
      },
    }).then(() => {
      // Successfully created session record
    }).catch(err => {
      logger.warn('Failed to create session record', { error: err.message })
    })

    // 11. Prepare response
    const responseData = {
      answer: answerText,
      sources: relevantDocs.slice(0, 3).map(doc => ({
        source: doc.metadata?.source || 'Unknown',
        similarity: doc.similarity,
        collection: doc.metadata?.collection || 'michigan',
      })),
      metadata: {
        documents_searched: documents.length,
        documents_used: relevantDocs.length,
        processing_time_ms: Date.now() - startTime,
      }
    }

    // 12. Log success
    logger.info('Q&A completed', {
      question_length: question.length,
      documents_used: relevantDocs.length,
      answer_length: answerText.length,
      duration_ms: Date.now() - startTime,
    })

    // 13. Return response with rate limit headers
    const response = NextResponse.json(responseData)
    return addRateLimitHeaders(response, rateLimit)

  } catch (error) {
    // Catch-all error handler
    logger.error('Unexpected error in Q&A endpoint', { 
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
