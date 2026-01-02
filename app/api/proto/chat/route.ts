import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CohereClient } from "cohere-ai";
import { getProtoMemories, getImportantMemories } from "@/lib/proto-memory";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!,
});

// Get chat model from environment variable
const CHAT_MODEL = process.env.COHERE_CHAT_MODEL || "command-r-plus";

// Proto system prompt with memory usage
const PROTO_SYSTEM_PROMPT = `You are Proto, an adaptive AI business assistant that grows with small businesses.

CORE PRINCIPLES:
1. Remember everything - use your memory system to recall past conversations, preferences, and business details
2. Be proactive - anticipate needs based on context and history
3. Think step-by-step - show your reasoning process
4. Produce tangible outputs - always aim for actionable deliverables
5. Adapt your expertise - shift between finance, HR, ops, customer service as needed

MEMORY USAGE:
- Before responding, check if you have relevant context about this user/business
- After significant conversations, store important details
- Reference past work when relevant ("Based on the schedule we created last week...")

OUTPUT TYPES:
- Schedules (Excel/CSV/PDF)
- Draft emails and messages
- Financial summaries and reports
- Analysis documents with specific findings
- Action plans with steps and deadlines
- Comparison tables and decision matrices

WORKING STYLE:
- Show your thinking process ("Let me analyze your uploaded invoices...")
- Provide progress updates for longer tasks
- Ask clarifying questions when needed
- Cite sources (uploaded documents)
- Acknowledge limitations honestly

CAPABILITIES:
✓ Draft professional emails and customer responses
✓ Create staff schedules and manage availability
✓ Analyze contracts, invoices, and documents for issues
✓ Help when you're short-staffed with smart solutions
✓ Coordinate between you and your team on any problem
✓ Work autonomously on complex tasks while keeping you updated

Your tagline: "Grow with your business to grow your business"`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, chatHistory = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get Proto's memories about this user
    const memories = await getImportantMemories(user.id, 10);
    
    // Build context from memories
    let memoryContext = "";
    if (memories.length > 0) {
      memoryContext = "\n\nRELEVANT MEMORIES ABOUT THIS BUSINESS:\n";
      memories.forEach(mem => {
        memoryContext += `- [${mem.memory_type}/${mem.category}] ${mem.key}: ${JSON.stringify(mem.value)}\n`;
      });
    }

    // Get user's uploaded documents for context
    const { data: documents } = await supabase
      .from("business_documents")
      .select("document_name, document_type")
      .eq("user_id", user.id)
      .eq("processed", true)
      .limit(20);

    let documentContext = "";
    if (documents && documents.length > 0) {
      documentContext = "\n\nAVAILABLE DOCUMENTS:\n";
      documents.forEach(doc => {
        documentContext += `- ${doc.document_name} (${doc.document_type})\n`;
      });
    }

    // Enhance system prompt with user context
    const enhancedSystemPrompt = PROTO_SYSTEM_PROMPT + memoryContext + documentContext;

    // Call Cohere Chat API
    const response = await cohere.chat({
      model: CHAT_MODEL,
      message: message,
      chatHistory: chatHistory.map((msg: any) => ({
        role: msg.role,
        message: msg.message,
      })),
      preamble: enhancedSystemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return NextResponse.json({
      response: response.text,
      autonomous: false,
    });
  } catch (error) {
    console.error("Proto chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
