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

    // Convert to base64 for future vision API integration
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // NOTE: This is a simplified version. For production, integrate Cohere's vision API
    // when available, or use an alternative vision AI service to actually analyze the image.
    // Current implementation provides text-based guidance as a placeholder.
    const prompt = `Analyze this task completion photo. The photo is meant to verify task completion.
    
Based on typical task verification scenarios (like checking if a fridge is stocked, equipment is clean, or setup is complete):
- Output "PASS: [brief reason]" if the task appears to be completed properly
- Output "FAIL: [brief reason]" if there are issues

Be specific but concise in your assessment.

Note: In production, this should use actual image analysis. For now, providing general guidance.`;

    const response = await chat(prompt);

    // For demonstration purposes, we'll append a note about actual photo analysis
    const analysis = response + "\n\n[Note: Placeholder analysis - integrate vision API for actual photo verification]";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return NextResponse.json(
      { error: "Failed to analyze photo" },
      { status: 500 }
    );
  }
}
