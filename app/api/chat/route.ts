import { NextRequest, NextResponse } from "next/server";
import { AutonomousAgent } from "@/lib/autonomous-agent";

export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory, systemPrompt, agentType, useAutonomous } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Use autonomous mode if requested
    if (useAutonomous && agentType) {
      const agent = new AutonomousAgent(agentType);
      
      // Track progress updates
      const progressUpdates: string[] = [];
      
      const response = await agent.processMessage(
        message,
        systemPrompt || "You are a helpful assistant.",
        (update) => {
          progressUpdates.push(update);
        }
      );

      return NextResponse.json({ 
        response,
        progressUpdates,
        autonomous: true,
      });
    }

    // Fallback to regular chat
    const { cohere } = await import("@/lib/cohere");
    
    const preamble = systemPrompt || "You are a helpful assistant.";

    const formattedHistory = chatHistory?.map((h: { role: string; message: string }) => ({
      role: h.role as "USER" | "CHATBOT",
      message: h.message,
    })) || [];

    const cohereResponse = await cohere.chat({
      model: "command-r-plus",
      message,
      chatHistory: formattedHistory,
      preamble,
    });

    return NextResponse.json({ response: cohereResponse.text });
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
