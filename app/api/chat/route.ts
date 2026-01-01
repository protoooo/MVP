import { NextRequest, NextResponse } from "next/server";
import { cohere } from "@/lib/cohere";

export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory, systemPrompt } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Prepare preamble with system prompt if provided
    const preamble = systemPrompt || "You are a helpful assistant.";

    // Convert chat history to Cohere format
    const formattedHistory = chatHistory?.map((h: { role: string; message: string }) => ({
      role: h.role as "USER" | "CHATBOT",
      message: h.message,
    })) || [];

    const response = await cohere.chat({
      model: "command-r-plus",
      message,
      chatHistory: formattedHistory,
      preamble,
    });

    return NextResponse.json({ response: response.text });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
