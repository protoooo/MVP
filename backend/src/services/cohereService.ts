import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || '',
});

export const cohereService = {
  // Generate text embeddings using Cohere Embed v4
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await cohere.embed({
      texts: [text],
      model: process.env.COHERE_EMBED_MODEL || 'embed-v4.0',
      inputType: 'search_document',
      embeddingTypes: ['float'],
    });
    const embeddings: any = response.embeddings;
    return embeddings.float[0];
  },

  // Generate embeddings for search queries
  async generateQueryEmbedding(query: string): Promise<number[]> {
    const response = await cohere.embed({
      texts: [query],
      model: process.env.COHERE_EMBED_MODEL || 'embed-v4.0',
      inputType: 'search_query',
      embeddingTypes: ['float'],
    });
    const embeddings: any = response.embeddings;
    return embeddings.float[0];
  },

  // Batch generate embeddings for multiple texts
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await cohere.embed({
      texts: texts,
      model: process.env.COHERE_EMBED_MODEL || 'embed-v4.0',
      inputType: 'search_document',
      embeddingTypes: ['float'],
    });
    const embeddings: any = response.embeddings;
    return embeddings.float;
  },

  // Parse natural language query using Command-R7b
  async parseSearchQuery(query: string): Promise<{
    intent: string;
    timeRange?: { start?: string; end?: string };
    documentTypes: string[];
    entities: { dates: string[]; amounts: string[]; names: string[]; locations: string[] };
    keywords: string[];
  }> {
    const prompt = `You are a search query parser for a business document storage system. Parse this query and extract structured information.

Query: "${query}"

Return a JSON object with:
- intent: "retrieve", "filter", "summarize", or "analyze"
- timeRange: {start: "YYYY-MM-DD", end: "YYYY-MM-DD"} if dates mentioned (handle relative dates like "last year", "8 years ago")
- documentTypes: array of document types (e.g., "invoice", "receipt", "photo", "contract", "financial statement", "tax document", "employee record", "menu", "SOP")
- entities: {dates: [], amounts: [], names: [], locations: []}
- keywords: array of important search terms

Examples:
Query: "show me tax documents from 2016-2018"
Output: {"intent":"retrieve","timeRange":{"start":"2016-01-01","end":"2018-12-31"},"documentTypes":["tax document","financial statement"],"entities":{"dates":["2016","2017","2018"],"amounts":[],"names":[],"locations":[]},"keywords":["tax"]}

Query: "find before photo of Johnson property"
Output: {"intent":"retrieve","documentTypes":["photo","image"],"entities":{"dates":[],"amounts":[],"names":["Johnson"],"locations":["property"]},"keywords":["before","photo","Johnson","property"]}

Now parse the query and return ONLY the JSON object, no explanation:`;

    const response = await cohere.chat({
      model: process.env.COHERE_TEXT_MODEL || 'command-r7b-12-2024',
      message: prompt,
      temperature: 0.1,
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing Cohere response:', error);
      // Fallback parsing
      return {
        intent: 'retrieve',
        documentTypes: [],
        entities: { dates: [], amounts: [], names: [], locations: [] },
        keywords: query.toLowerCase().split(' ').filter(w => w.length > 3),
      };
    }
  },

  // NEW: Extract specific answer from documents
  async extractAnswer(
    query: string,
    documents: Array<{
      filename: string;
      content: string;
      metadata?: any;
    }>
  ): Promise<{
    answer: string;
    citations: Array<{
      filename: string;
      excerpt: string;
      relevance: number;
    }>;
    confidence: number;
    hasDirectAnswer: boolean;
  }> {
    // Prepare document context
    const documentContext = documents
      .map((doc, idx) => {
        return `[Document ${idx + 1}: ${doc.filename}]\n${doc.content.substring(0, 3000)}\n`;
      })
      .join('\n---\n\n');

    const prompt = `You are an expert data extraction assistant. Your job is to find and extract specific information from business documents to answer the user's question.

User Question: "${query}"

Documents:
${documentContext}

Instructions:
1. Read through all documents carefully
2. Extract the SPECIFIC data that answers the question (numbers, dates, names, amounts, etc.)
3. If you find the answer, provide it clearly and cite which document(s) it came from
4. If you cannot find a direct answer, say so and explain what information is missing
5. Be precise - if asked for a specific year or value, provide exactly that

Respond in JSON format:
{
  "answer": "Direct answer to the question with specific data points",
  "hasDirectAnswer": true/false,
  "confidence": 0.0-1.0 (how confident you are),
  "citations": [
    {
      "documentIndex": 1,
      "excerpt": "Relevant text excerpt from document",
      "relevance": 0.0-1.0
    }
  ],
  "reasoning": "Brief explanation of how you found the answer"
}

Examples:

Question: "What were my capital gains in 2017?"
Answer: {"answer":"Your capital gains in 2017 were $47,250, primarily from a Q2 rental property sale ($35,000) and stock dividends ($12,250).","hasDirectAnswer":true,"confidence":0.95,"citations":[{"documentIndex":1,"excerpt":"2017 Schedule D: Long-term capital gains $47,250","relevance":1.0}],"reasoning":"Found explicit capital gains data in 2017 tax return Schedule D"}

Question: "Who approved the new safety protocol?"
Answer: {"answer":"The new safety protocol was approved by Janet Martinez (Operations Director) on March 15, 2023.","hasDirectAnswer":true,"confidence":0.9,"citations":[{"documentIndex":2,"excerpt":"Approved by: J. Martinez, Ops Director, 3/15/23","relevance":0.95}],"reasoning":"Found approval signature and date on safety protocol document"}

Now analyze the documents and answer the user's question:`;

    try {
      const response = await cohere.chat({
        model: process.env.COHERE_TEXT_MODEL || 'command-r7b-12-2024',
        message: prompt,
        temperature: 0.1,
      });

      // Extract JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Map document indices back to filenames
      const citations = parsed.citations.map((cit: any) => ({
        filename: documents[cit.documentIndex - 1]?.filename || 'Unknown',
        excerpt: cit.excerpt,
        relevance: cit.relevance || 0.8,
      }));

      return {
        answer: parsed.answer,
        citations,
        confidence: parsed.confidence || 0.7,
        hasDirectAnswer: parsed.hasDirectAnswer || false,
      };
    } catch (error) {
      console.error('Error extracting answer:', error);
      return {
        answer:
          'I found relevant documents but could not extract a specific answer. Please review the documents below.',
        citations: [],
        confidence: 0.3,
        hasDirectAnswer: false,
      };
    }
  },

  // Generate auto-tags and metadata for uploaded files
  async generateFileMetadata(filename: string, extractedText: string, fileType: string): Promise<{
    category: string;
    tags: string[];
    description: string;
    entities: { dates: string[]; amounts: string[]; names: string[]; locations: string[] };
    confidence: number;
  }> {
    const prompt = `Analyze this business document and generate metadata.

Filename: ${filename}
File Type: ${fileType}
Content Preview: ${extractedText.substring(0, 2000)}

Generate a JSON object with:
- category: one of "financial", "operational", "compliance", "marketing", "hr", "customer", "legal", "other"
- tags: array of 3-7 descriptive tags (e.g., "invoice", "receipt", "contract", "tax document", "employee record", "before photo", "after photo", "inspection report")
- description: 1-2 sentence description of the document
- entities: {dates: [], amounts: [], names: [], locations: []} - extract any dates, dollar amounts, people names, locations mentioned
- confidence: 0.0-1.0 confidence score

Return ONLY the JSON object:`;

    const response = await cohere.chat({
      model: process.env.COHERE_TEXT_MODEL || 'command-r7b-12-2024',
      message: prompt,
      temperature: 0.3,
    });

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing metadata response:', error);
      return {
        category: 'other',
        tags: [fileType],
        description: `A ${fileType} file`,
        entities: { dates: [], amounts: [], names: [], locations: [] },
        confidence: 0.5,
      };
    }
  },

  // Analyze image using Cohere Aya Vision
  async analyzeImage(imageBase64: string, filename: string): Promise<{
    description: string;
    tags: string[];
    category: string;
    confidence: number;
  }> {
    const response = await cohere.chat({
      model: process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b',
      message: `Analyze this business image (filename: ${filename}) and provide:
1. A detailed description (2-3 sentences)
2. Relevant tags for categorization (5-7 tags like "property", "exterior", "before", "after", "equipment", "people", "invoice", "receipt", etc.)
3. Business category: "property_documentation", "equipment", "people", "document_scan", "product", "facility", or "other"
4. Confidence score (0.0-1.0)

Return as JSON: {"description": "...", "tags": [...], "category": "...", "confidence": 0.0}`,
      temperature: 0.3,
    });

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error analyzing image:', error);
      return {
        description: 'An image file',
        tags: ['image'],
        category: 'other',
        confidence: 0.5,
      };
    }
  },

  // Rerank search results using Cohere Rerank v4.0 Pro
  async rerankResults(
    query: string,
    documents: Array<{ id: string; text: string }>
  ): Promise<Array<{ id: string; relevanceScore: number; index: number }>> {
    if (!process.env.FEATURE_RERANK || process.env.FEATURE_RERANK !== 'true') {
      // Return documents in original order if rerank disabled
      return documents.map((doc, index) => ({ id: doc.id, relevanceScore: 1.0, index }));
    }

    const response = await cohere.rerank({
      query: query,
      documents: documents.map(doc => doc.text),
      model: process.env.COHERE_RERANK_MODEL || 'rerank-v4.0-pro',
      topN: documents.length,
      returnDocuments: false,
    });

    return response.results.map(result => ({
      id: documents[result.index].id,
      relevanceScore: result.relevanceScore,
      index: result.index,
    }));
  },
};
