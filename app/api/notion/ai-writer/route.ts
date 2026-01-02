import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Generate content using Cohere
    const response = await cohere.generate({
      model: "command-r-plus",
      prompt: `You are a helpful writing assistant. The user wants you to write the following:

${prompt}

Please write high-quality, well-structured content that fulfills their request. Be concise but thorough.`,
      maxTokens: 500,
      temperature: 0.7,
      stopSequences: [],
    });

    const result = response.generations[0]?.text?.trim() || "";

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("AI Writer error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
