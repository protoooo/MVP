// Updated document-processing.ts with better error handling

import { CohereClient } from "cohere-ai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

// Get embed model from environment variable
const EMBED_MODEL = process.env.COHERE_EMBED_MODEL || "embed-english-v4.0";

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

// Check if embeddings table exists
async function checkEmbeddingsTableExists(): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  try {
    const { error } = await supabase
      .from("document_embeddings")
      .select("id")
      .limit(1);
    
    return !error || error.code !== "42P01"; // 42P01 = relation does not exist
  } catch (error) {
    console.error("Error checking embeddings table:", error);
    return false;
  }
}

export function chunkDocument(
  text: string,
  maxChunkSize: number = 500,
  overlap: number = 50
): DocumentChunk[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    const currentTokens = currentChunk.length / 4;
    const paragraphTokens = trimmedParagraph.length / 4;

    if (currentTokens + paragraphTokens > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        chunk_index: chunkIndex++,
        chunk_text: currentChunk.trim(),
      });

      if (overlap > 0) {
        const words = currentChunk.split(" ");
        const overlapWords = words.slice(-Math.min(overlap, words.length));
        currentChunk = overlapWords.join(" ") + "\n\n" + trimmedParagraph;
      } else {
        currentChunk = trimmedParagraph;
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedParagraph;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunk_index: chunkIndex,
      chunk_text: currentChunk.trim(),
    });
  }

  return chunks;
}

export async function generateEmbeddings(
  texts: string[],
  inputType: "search_document" | "search_query" = "search_document"
): Promise<number[][] | null> {
  try {
    const response = await cohere.embed({
      texts: texts,
      model: EMBED_MODEL,
      inputType: inputType,
      embeddingTypes: ["float"],
    });

    if (Array.isArray(response.embeddings)) {
      return response.embeddings as number[][];
    }
    
    if (response.embeddings && typeof response.embeddings === 'object' && 'float' in response.embeddings) {
      return (response.embeddings as any).float || null;
    }

    return null;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return null;
  }
}

export async function processDocument(
  userId: string,
  documentId: string,
  documentText: string,
  metadata?: any
): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    // Check if embeddings table exists
    const tableExists = await checkEmbeddingsTableExists();
    
    if (!tableExists) {
      console.warn("document_embeddings table does not exist. Skipping embedding generation.");
      
      // Still mark document as processed
      await supabase
        .from("business_documents")
        .update({ 
          processed: true,
          processing_error: "Embeddings disabled - table not found"
        })
        .eq("id", documentId);
      
      return true;
    }

    const chunks = chunkDocument(documentText);
    
    if (chunks.length === 0) {
      console.error("No chunks generated from document");
      return false;
    }

    const chunkTexts = chunks.map(c => c.chunk_text);
    const embeddings = await generateEmbeddings(chunkTexts, "search_document");

    if (!embeddings || embeddings.length !== chunks.length) {
      console.warn("Could not generate embeddings, but marking document as processed");
      
      await supabase
        .from("business_documents")
        .update({ 
          processed: true,
          processing_error: "Embeddings generation failed"
        })
        .eq("id", documentId);
      
      return true;
    }

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
      
      // Mark as processed anyway
      await supabase
        .from("business_documents")
        .update({ 
          processed: true,
          processing_error: `Storage error: ${error.message}`
        })
        .eq("id", documentId);
      
      return true;
    }

    await supabase
      .from("business_documents")
      .update({ processed: true, processing_error: null })
      .eq("id", documentId);

    return true;
  } catch (error) {
    console.error("Error processing document:", error);
    
    // Mark as processed with error
    try {
      await supabase
        .from("business_documents")
        .update({ 
          processed: true,
          processing_error: error instanceof Error ? error.message : "Unknown error"
        })
        .eq("id", documentId);
    } catch (updateError) {
      console.error("Could not update document status:", updateError);
    }
    
    return true; // Return true to prevent blocking
  }
}

export async function getRelevantContext(
  userId: string,
  query: string,
  agentType: string,
  maxChunks: number = 5
): Promise<{
  context: string;
  documentsUsed: Array<{ id: string; name: string }>;
}> {
  const supabase = getSupabaseClient();
  
  try {
    // Check if embeddings table exists
    const tableExists = await checkEmbeddingsTableExists();
    
    if (!tableExists) {
      return {
        context: "",
        documentsUsed: [],
      };
    }

    // Get documents for this agent type
    const agentDocTypes: Record<string, string[]> = {
      operations: ["manual", "procedure", "policy", "report", "inspection"],
      "customer-support": ["policy", "faq", "manual"],
      hr: ["policy", "manual", "procedure"],
      inventory: ["inventory_data", "report"],
      financial: ["financial_data", "report"],
      document: ["contract", "agreement", "legal"],
    };

    const documentTypes = agentDocTypes[agentType];

    // Get user's documents
    let docQuery = supabase
      .from("business_documents")
      .select("id, document_name, file_url")
      .eq("user_id", userId)
      .eq("processed", true);

    if (documentTypes) {
      docQuery = docQuery.in("document_type", documentTypes);
    }

    const { data: documents } = await docQuery.limit(10);

    if (!documents || documents.length === 0) {
      return {
        context: "",
        documentsUsed: [],
      };
    }

    // For now, return document names as context
    const context = documents
      .map((doc, idx) => `Document ${idx + 1}: ${doc.document_name}`)
      .join("\n");

    const documentsUsed = documents.map(doc => ({
      id: doc.id,
      name: doc.document_name,
    }));

    return {
      context,
      documentsUsed,
    };
  } catch (error) {
    console.error("Error getting relevant context:", error);
    return {
      context: "",
      documentsUsed: [],
    };
  }
}

export async function deleteDocumentEmbeddings(
  documentId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const tableExists = await checkEmbeddingsTableExists();
    
    if (!tableExists) {
      return true;
    }

    const { error } = await supabase
      .from("document_embeddings")
      .delete()
      .eq("document_id", documentId);

    if (error) {
      console.error("Error deleting document embeddings:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteDocumentEmbeddings:", error);
    return false;
  }
}
