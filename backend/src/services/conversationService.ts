import { cohereService } from './cohereService';
import { searchService } from './searchService';
import { query } from '../config/database';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ filename: string; excerpt: string; relevance: number }>;
  timestamp: Date;
}

interface ConversationContext {
  conversationId: string;
  userId: number;
  messages: Message[];
  referencedDocuments: Set<number>;
  lastActivity: Date;
}

// In-memory conversation storage (use Redis in production)
const activeConversations = new Map<string, ConversationContext>();

export const conversationService = {
  // Start a new conversation
  startConversation(userId: number): string {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    activeConversations.set(conversationId, {
      conversationId,
      userId,
      messages: [],
      referencedDocuments: new Set(),
      lastActivity: new Date(),
    });

    console.log(`Started conversation ${conversationId} for user ${userId}`);
    return conversationId;
  },

  // Handle user message in conversation
  async handleMessage(
    conversationId: string,
    userMessage: string,
    userId: number
  ): Promise<{
    response: string;
    sources: Array<{ filename: string; excerpt: string; relevance: number; fileId: number }>;
    suggestedFollowUps: string[];
  }> {
    try {
      let context = activeConversations.get(conversationId);
      
      // Create new conversation if doesn't exist
      if (!context) {
        conversationId = this.startConversation(userId);
        context = activeConversations.get(conversationId)!;
      }

      // Add user message to history
      context.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // Determine if this is a follow-up question
      const isFollowUp = context.messages.length > 1;

      let response: string;
      let sources: any[] = [];
      let relevantDocs: any[] = [];

      if (isFollowUp) {
        // Use conversation history for context
        response = await this.handleFollowUpQuestion(context, userMessage, userId);
        
        // Get documents from conversation context
        if (context.referencedDocuments.size > 0) {
          const docIds = Array.from(context.referencedDocuments);
          const docsResult = await query(
            `SELECT f.*, fc.extracted_text, fm.ai_description
             FROM files f
             LEFT JOIN file_content fc ON f.id = fc.file_id
             LEFT JOIN file_metadata fm ON f.id = fm.file_id
             WHERE f.id = ANY($1) AND f.user_id = $2
             LIMIT 5`,
            [docIds, userId]
          );
          
          relevantDocs = docsResult.rows;
        }
      } else {
        // Initial query - perform full search
        const searchResults = await searchService.search(userMessage, userId);
        relevantDocs = searchResults.results.slice(0, 5);
        
        // Track referenced documents
        relevantDocs.forEach(doc => context!.referencedDocuments.add(doc.id));
        
        // Generate conversational response
        response = await this.generateConversationalResponse(
          userMessage,
          relevantDocs,
          searchResults.extractedAnswer
        );
      }

      // Format sources
      sources = relevantDocs.map(doc => ({
        fileId: doc.id,
        filename: doc.original_filename,
        excerpt: (doc.extracted_text || doc.ai_description || '').substring(0, 200),
        relevance: doc.relevance_score || 0.8,
      }));

      // Add assistant response to history
      context.messages.push({
        role: 'assistant',
        content: response,
        sources,
        timestamp: new Date(),
      });

      context.lastActivity = new Date();

      // Generate follow-up suggestions
      const suggestedFollowUps = await this.generateFollowUpSuggestions(
        context,
        userMessage,
        response
      );

      // Log conversation turn
      await query(
        `INSERT INTO search_logs (user_id, query, results_count, searched_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, `[CONVERSATION] ${userMessage}`, sources.length]
      );

      return {
        response,
        sources,
        suggestedFollowUps,
      };
    } catch (error) {
      console.error('Error handling conversation message:', error);
      throw error;
    }
  },

  // Handle follow-up questions using conversation context
  async handleFollowUpQuestion(
    context: ConversationContext,
    question: string,
    userId: number
  ): Promise<string> {
    // Build conversation history for context
    const recentMessages = context.messages.slice(-6); // Last 3 exchanges
    const conversationHistory = recentMessages.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');

    // Get referenced documents
    const docIds = Array.from(context.referencedDocuments);
    let documentContext = '';
    
    if (docIds.length > 0) {
      const docsResult = await query(
        `SELECT f.original_filename, fc.extracted_text, fm.ai_description
         FROM files f
         LEFT JOIN file_content fc ON f.id = fc.file_id
         LEFT JOIN file_metadata fm ON f.id = fm.file_id
         WHERE f.id = ANY($1) AND f.user_id = $2`,
        [docIds, userId]
      );
      
      documentContext = docsResult.rows
        .map((doc, idx) => `[Document ${idx + 1}: ${doc.original_filename}]\n${(doc.extracted_text || doc.ai_description || '').substring(0, 1500)}`)
        .join('\n\n---\n\n');
    }

    const prompt = `You are a helpful business document assistant. You're having an ongoing conversation with a user about their business documents.

CONVERSATION HISTORY:
${conversationHistory}

CURRENT USER QUESTION:
${question}

RELEVANT DOCUMENTS:
${documentContext}

Instructions:
1. Answer the user's current question in the context of the ongoing conversation
2. If they're asking for more details ("tell me more", "what about X"), provide that information
3. If they're asking a comparison ("how does that compare to..."), make the comparison
4. If they're asking a clarifying question, provide clarification
5. Be conversational and natural - this is a chat, not a formal report
6. Keep responses concise but informative (2-3 short paragraphs max)
7. If referencing specific numbers or facts, mention which document they're from

Respond naturally as if continuing a conversation:`;

    const response = await cohereService.chat(prompt);
    return response;
  },

  // Generate conversational response for initial query
  async generateConversationalResponse(
    query: string,
    documents: any[],
    extractedAnswer: any
  ): Promise<string> {
    if (extractedAnswer && extractedAnswer.hasDirectAnswer) {
      // We have a direct answer - make it conversational
      return `${extractedAnswer.answer}\n\nI found this information in ${extractedAnswer.citations.length} of your documents. Would you like me to explain any specific part in more detail?`;
    }

    // No direct answer - provide overview
    const docSummary = documents
      .slice(0, 3)
      .map((doc, idx) => `${idx + 1}. ${doc.original_filename}: ${(doc.ai_description || '').substring(0, 100)}`)
      .join('\n');

    return `I found ${documents.length} relevant documents about "${query}":\n\n${docSummary}\n\nWhich of these would you like me to tell you more about? Or would you like me to summarize all of them?`;
  },

  // Generate follow-up suggestions
  async generateFollowUpSuggestions(
    context: ConversationContext,
    lastUserMessage: string,
    lastResponse: string
  ): Promise<string[]> {
    const conversationSummary = context.messages
      .slice(-4)
      .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
      .join('\n');

    const prompt = `Based on this conversation about business documents, suggest 3 natural follow-up questions the user might ask:

${conversationSummary}

Generate 3 short, specific follow-up questions (one line each) that would naturally continue this conversation. Return ONLY the 3 questions, one per line, no numbering or extra text.

Examples of good follow-ups:
- "What about the expenses from Q3?"
- "Can you compare that to last year?"
- "Which vendor contract expires soonest?"
- "Show me more details about that invoice"

Now generate 3 follow-ups for this conversation:`;

    try {
      const response = await cohereService.chat(prompt);
      const questions = response
        .split('\n')
        .filter(line => line.trim().length > 10)
        .slice(0, 3);
      
      return questions.length > 0 ? questions : [
        "Can you show me more details?",
        "What about related documents?",
        "Is there anything I should watch out for?"
      ];
    } catch (error) {
      console.error('Error generating follow-ups:', error);
      return [
        "Tell me more about this",
        "What else is related?",
        "Can you summarize the key points?"
      ];
    }
  },

  // Get conversation history
  getConversation(conversationId: string): ConversationContext | null {
    return activeConversations.get(conversationId) || null;
  },

  // Clear old conversations (call periodically)
  cleanupOldConversations(maxAgeMinutes: number = 60): number {
    const now = Date.now();
    const cutoff = maxAgeMinutes * 60 * 1000;
    let deleted = 0;

    for (const [id, context] of activeConversations.entries()) {
      if (now - context.lastActivity.getTime() > cutoff) {
        activeConversations.delete(id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} old conversations`);
    }

    return deleted;
  },

  // Export conversation for user
  async exportConversation(conversationId: string): Promise<string> {
    const context = activeConversations.get(conversationId);
    if (!context) {
      throw new Error('Conversation not found');
    }

    let transcript = `Conversation Export\n`;
    transcript += `Date: ${new Date().toLocaleString()}\n`;
    transcript += `Messages: ${context.messages.length}\n`;
    transcript += `\n${'='.repeat(60)}\n\n`;

    context.messages.forEach(msg => {
      transcript += `${msg.role.toUpperCase()} (${msg.timestamp.toLocaleTimeString()}):\n`;
      transcript += `${msg.content}\n`;
      
      if (msg.sources && msg.sources.length > 0) {
        transcript += `\nSources:\n`;
        msg.sources.forEach(source => {
          transcript += `  - ${source.filename}\n`;
        });
      }
      
      transcript += `\n${'-'.repeat(60)}\n\n`;
    });

    return transcript;
  },
};

// Cleanup job - run every 30 minutes
setInterval(() => {
  conversationService.cleanupOldConversations(60);
}, 30 * 60 * 1000);
