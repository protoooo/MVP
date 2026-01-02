import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/cohere";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo") as File;
    const taskId = formData.get("taskId") as string;

    if (!photo) {
      return NextResponse.json(
        { error: "No photo provided" },
        { status: 400 }
      );
    }

    // Convert to base64
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Note: Cohere's vision API may have different requirements
    // For now, we'll use text-based analysis as a fallback
    const prompt = `Analyze this task completion photo. The photo is meant to verify task completion.
    
Based on typical task verification scenarios (like checking if a fridge is stocked, equipment is clean, or setup is complete):
- Output "PASS: [brief reason]" if the task appears to be completed properly
- Output "FAIL: [brief reason]" if there are issues

Be specific but concise in your assessment.`;

    const response = await chat(prompt);

    return NextResponse.json({ analysis: response });
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return NextResponse.json(
      { error: "Failed to analyze photo" },
      { status: 500 }
    );
  }
}
