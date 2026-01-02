import { NextRequest, NextResponse } from "next/server";
import { summarizeText } from "@/lib/cohere";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, length = "medium" } = body;

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const summary = await summarizeText(text, length as "short" | "medium" | "long");

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error summarizing text:", error);
    return NextResponse.json(
      { error: "Failed to summarize text" },
      { status: 500 }
    );
  }
}
