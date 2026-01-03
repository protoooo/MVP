import { CohereClient } from "cohere-ai";

// Initialize Cohere client
export const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

// Get model names from environment variables with fallbacks
const CHAT_MODEL = process.env.COHERE_CHAT_MODEL || "c4ai-aya-expanse-32b";
const EMBED_MODEL = process.env.COHERE_EMBED_MODEL || "embed-english-v3.0";
const RERANK_MODEL = process.env.COHERE_RERANK_MODEL || "rerank-v3.5";

// Generate text response
export async function generateText(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  try {
    const response = await cohere.generate({
      model: options?.model || CHAT_MODEL,
      prompt,
      temperature: options?.temperature || 0.7,
      maxTokens: options?.maxTokens || 500,
    });
    return response.generations[0]?.text || "";
  } catch (error) {
    console.error("Cohere generate error:", error);
    throw error;
  }
}

// Chat with Cohere
export async function chat(message: string, chatHistory?: Array<{ role: string; message: string }>) {
  try {
    const response = await cohere.chat({
      model: CHAT_MODEL,
      message,
      chatHistory: chatHistory?.map(h => ({
        role: h.role as "USER" | "CHATBOT",
        message: h.message,
      })),
    });
    return response.text;
  } catch (error) {
    console.error("Cohere chat error:", error);
    throw error;
  }
}

// Classify text
export async function classifyText(inputs: string[], examples: Array<{ text: string; label: string }>) {
  try {
    const response = await cohere.classify({
      model: EMBED_MODEL,
      inputs,
      examples,
    });
    return response.classifications;
  } catch (error) {
    console.error("Cohere classify error:", error);
    throw error;
  }
}

// Generate embeddings
export async function generateEmbeddings(texts: string[], inputType: "search_document" | "search_query" | "classification" | "clustering" = "search_document") {
  try {
    const response = await cohere.embed({
      model: EMBED_MODEL,
      texts,
      inputType,
    });
    return response.embeddings;
  } catch (error) {
    console.error("Cohere embed error:", error);
    throw error;
  }
}

// Rerank documents
export async function rerankDocuments(query: string, documents: string[], topN: number = 3) {
  try {
    const response = await cohere.rerank({
      model: RERANK_MODEL,
      query,
      documents,
      topN,
    });
    return response.results;
  } catch (error) {
    console.error("Cohere rerank error:", error);
    throw error;
  }
}

// Summarize text
export async function summarizeText(text: string, length: "short" | "medium" | "long" = "medium") {
  const lengthMap = {
    short: 100,
    medium: 300,
    long: 500,
  };
  
  const prompt = `Please provide a ${length} summary of the following text:\n\n${text}`;
  return generateText(prompt, { maxTokens: lengthMap[length] });
}
