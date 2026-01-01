// Document Processing and Embedding Utilities
// This module handles document chunking, embedding generation, and semantic search

import { CohereClient } from "cohere-ai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

// Helper to create Supabase client
function getSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface DocumentChunk {
  chunk_index: number;
  chunk_text: string;
  metadata?: any;
}

export interface EmbeddingSearchResult {
  chunk_text: string;
  document_id: string;
  document_name?: string;
  similarity: number;
  metadata?: any;
}

// ========================================
// DOCUMENT CHUNKING
// ========================================

/**
 * Split a document into smaller chunks for embedding
 * Uses a simple approach: split by paragraphs, combine into ~500 token chunks
 */
export function chunkDocument(
  text: string,
  maxChunkSize: number = 500,
  overlap: number = 50
): DocumentChunk[] {
  // Split by double newlines (paragraphs) or single newlines
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    // Rough token estimate: ~4 characters per token
    const currentTokens = currentChunk.length / 4;
    const paragraphTokens = trimmedParagraph.length / 4;

    if (currentTokens + paragraphTokens > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        chunk_index: chunkIndex++,
        chunk_text: currentChunk.trim(),
      });

      // Start new chunk with overlap from previous
      if (overlap > 0) {
        const words = currentChunk.split(" ");
        const overlapWords = words.slice(-Math.min(overlap, words.length));
        currentChunk = overlapWords.join(" ") + "\n\n" + trimmedParagraph;
      } else {
        currentChunk = trimmedParagraph;
      }
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedParagraph;
    }
  }

  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunk_index: chunkIndex,
      chunk_text: currentChunk.trim(),
    });
  }

  return chunks;
}

// ========================================
// EMBEDDING GENERATION
// ========================================

/**
 * Generate embeddings for text chunks using Cohere Embed v3
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: "search_document" | "search_query" = "search_document"
): Promise<number[][] | null> {
  try {
    const response = await cohere.embed({
      texts: texts,
      model: "embed-english-v3.0",
      inputType: inputType,
      embeddingTypes: ["float"],
    });

    // Handle the response properly - embeddings can be returned directly
    if (Array.isArray(response.embeddings)) {
      return response.embeddings as number[][];
    }
    
    // Or check if it has a float property
    if (response.embeddings && typeof response.embeddings === 'object' && 'float' in response.embeddings) {
      return (response.embeddings as any).float || null;
    }

    return null;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return null;
  }
}

// ========================================
// DOCUMENT PROCESSING
// ========================================

/**
 * Process a document: chunk it and generate embeddings
 */
export async function processDocument(
  userId: string,
  documentId: string,
  documentText: string,
  metadata?: any
): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    // 1. Chunk the document
    const chunks = chunkDocument(documentText);
    
    if (chunks.length === 0) {
      console.error("No chunks generated from document");
      return false;
    }

    // 2. Generate embeddings for all chunks
    const chunkTexts = chunks.map(c => c.chunk_text);
    const embeddings = await generateEmbeddings(chunkTexts, "search_document");

    if (!embeddings || embeddings.length !== chunks.length) {
      console.error("Failed to generate embeddings");
      return false;
    }

    // 3. Store chunks with embeddings in database
    const embeddingRecords = chunks.map((chunk, idx) => ({
      user_id: userId,
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      embedding: embeddings[idx],
      metadata: { ...metadata, ...chunk.metadata },
    }));

    const { error } = await supabase
      .from("document_embeddings")
      .insert(embeddingRecords);

    if (error) {
      console.error("Error storing embeddings:", error);
      return false;
    }

    // 4. Mark document as processed
    await supabase
      .from("business_documents")
      .update({ processed: true })
      .eq("id", documentId);

    return true;
  } catch (error) {
    console.error("Error processing document:", error);
    return false;
  }
}

// ========================================
// SEMANTIC SEARCH
// ========================================

/**
 * Search for relevant document chunks using semantic similarity
 */
export async function searchDocuments(
  userId: string,
  query: string,
  limit: number = 10,
  documentTypes?: string[]
): Promise<EmbeddingSearchResult[]> {
  const supabase = getSupabaseClient();

  try {
    // 1. Generate embedding for the query
    const queryEmbeddings = await generateEmbeddings([query], "search_query");
    
    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      console.error("Failed to generate query embedding");
      return [];
    }

    const queryEmbedding = queryEmbeddings[0];

    // 2. Build the query
    let rpcQuery = supabase.rpc("search_document_embeddings", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: limit,
      filter_user_id: userId,
    });

    const { data, error } = await rpcQuery;

    if (error) {
      console.error("Error searching documents:", error);
      return [];
    }

    // 3. Filter by document type if specified
    let results = data || [];
    
    if (documentTypes && documentTypes.length > 0) {
      // Join with business_documents to filter by type
      const { data: filteredData } = await supabase
        .from("document_embeddings")
        .select(`
          chunk_text,
          document_id,
          metadata,
          business_documents!inner(document_name, document_type)
        `)
        .in("id", results.map((r: any) => r.id))
        .in("business_documents.document_type", documentTypes);

      results = filteredData || [];
    }

    return results.map((r: any) => ({
      chunk_text: r.chunk_text,
      document_id: r.document_id,
      document_name: r.business_documents?.document_name,
      similarity: r.similarity || 0,
      metadata: r.metadata,
    }));
  } catch (error) {
    console.error("Error in semantic search:", error);
    return [];
  }
}

/**
 * Get relevant context from documents for an agent query
 */
export async function getRelevantContext(
  userId: string,
  query: string,
  agentType: string,
  maxChunks: number = 5
): Promise<{
  context: string;
  documentsUsed: Array<{ id: string; name: string }>;
}> {
  // Define preferred document types per agent
  const agentDocTypes: Record<string, string[]> = {
    operations: ["manual", "procedure", "policy", "report", "inspection"],
    "customer-support": ["policy", "faq", "manual"],
    hr: ["policy", "manual", "procedure"],
    inventory: ["inventory_data", "report"],
    financial: ["financial_data", "report"],
    document: ["contract", "agreement", "legal"],
  };

  const documentTypes = agentDocTypes[agentType];

  // Search for relevant chunks
  const results = await searchDocuments(userId, query, maxChunks, documentTypes);

  if (results.length === 0) {
    return {
      context: "",
      documentsUsed: [],
    };
  }

  // Combine chunks into context
  const context = results
    .map((r, idx) => `[Document ${idx + 1}: ${r.document_name || "Unknown"}]\n${r.chunk_text}`)
    .join("\n\n---\n\n");

  // Track which documents were used
  const documentsUsed = Array.from(
    new Set(results.map(r => JSON.stringify({ id: r.document_id, name: r.document_name })))
  ).map(str => JSON.parse(str));

  return {
    context,
    documentsUsed,
  };
}

// ========================================
// DOCUMENT DELETION
// ========================================

/**
 * Delete all embeddings for a document
 */
export async function deleteDocumentEmbeddings(
  documentId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("document_embeddings")
    .delete()
    .eq("document_id", documentId);

  if (error) {
    console.error("Error deleting document embeddings:", error);
    return false;
  }

  return true;
}

// ========================================
// BATCH PROCESSING
// ========================================

/**
 * Process multiple documents in batch
 */
export async function batchProcessDocuments(
  userId: string,
  documents: Array<{ id: string; text: string; metadata?: any }>
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (const doc of documents) {
    const success = await processDocument(userId, doc.id, doc.text, doc.metadata);
    if (success) {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed };
}

// ========================================
// RPC FUNCTION FOR SUPABASE
// ========================================

/*
To enable semantic search, create this function in Supabase SQL editor:

CREATE OR REPLACE FUNCTION search_document_embeddings(
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.chunk_text,
    de.metadata,
    1 - (de.embedding <=> query_embedding) as similarity
  FROM document_embeddings de
  WHERE de.user_id = filter_user_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
*/
