import { NextRequest, NextResponse } from "next/server";
import { AutonomousAgent } from "@/lib/autonomous-agent";
import { createClient } from "@/lib/supabase/server";
import { getRelevantContext } from "@/lib/document-processing";

export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory, systemPrompt, agentType, useAutonomous } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get user ID for document context
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get relevant document context
    let documentContext = "";
    let documentsUsed: Array<{ id: string; name: string }> = [];
    
    if (agentType) {
      const contextResult = await getRelevantContext(
        user.id,
        message,
        agentType,
        5
      );
      documentContext = contextResult.context;
      documentsUsed = contextResult.documentsUsed;
    }

    // Enhance system prompt with document context
    let enhancedPrompt = systemPrompt || "You are a helpful assistant.";
    
    if (documentContext) {
      enhancedPrompt = `${systemPrompt}

IMPORTANT: Use the following uploaded documents as your knowledge base:

${documentContext}

When answering, cite specific documents when relevant (e.g., "Based on your Employee Handbook...").`;
    } else if (agentType) {
      enhancedPrompt = `${systemPrompt}

NOTE: No relevant documents were found for this query. If specific documents would help (like invoices, policies, reports), let the user know what they should upload.`;
    }

    // Use autonomous mode if requested
    if (useAutonomous && agentType) {
      const agent = new AutonomousAgent(agentType);
      
      // Track progress updates
      const progressUpdates: string[] = [];
      
      const response = await agent.processMessage(
        message,
        enhancedPrompt,
        (update) => {
          progressUpdates.push(update);
        }
      );

      return NextResponse.json({ 
        response,
        progressUpdates,
        autonomous: true,
        documentsUsed,
      });
    }

    // Fallback to regular chat
    const { cohere } = await import("@/lib/cohere");

    const formattedHistory = chatHistory?.map((h: { role: string; message: string }) => ({
      role: h.role as "USER" | "CHATBOT",
      message: h.message,
    })) || [];

    const cohereResponse = await cohere.chat({
      model: "command-r-plus",
      message,
      chatHistory: formattedHistory,
      preamble: enhancedPrompt,
    });

    return NextResponse.json({ 
      response: cohereResponse.text,
      documentsUsed,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// New endpoint for task execution
export async function PUT(request: NextRequest) {
  try {
    const { taskDescription, systemPrompt, agentType } = await request.json();

    if (!taskDescription || !agentType) {
      return NextResponse.json(
        { error: "Task description and agent type are required" },
        { status: 400 }
      );
    }

    const agent = new AutonomousAgent(agentType);
    
    const progressUpdates: string[] = [];
    
    const task = await agent.executeTask(
      taskDescription,
      systemPrompt || "You are a helpful assistant.",
      (update) => {
        progressUpdates.push(update);
      }
    );

    return NextResponse.json({ 
      task,
      progressUpdates,
    });
  } catch (error) {
    console.error("Task execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute task" },
      { status: 500 }
    );
  }
}
