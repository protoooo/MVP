import { NextRequest, NextResponse } from "next/server";
import { summarizeText, generateText } from "@/lib/cohere";

export async function POST(request: NextRequest) {
  try {
    const { action, document, length } = await request.json();

    if (action === "summarize" && document) {
      const summary = await summarizeText(document, length || "medium");
      return NextResponse.json({ summary });
    }

    if (action === "analyze" && document) {
      // Analyze document for key information
      const prompt = `Analyze the following document and extract:
1. Key clauses or important points
2. Potential risks or concerns
3. Action items or recommendations

Document:
${document}

Provide a structured analysis.`;

      const analysis = await generateText(prompt, { maxTokens: 500 });

      return NextResponse.json({ analysis });
    }

    if (action === "extract" && document) {
      // Extract specific information from document
      const prompt = `Extract key information from the following document:
- Parties involved
- Important dates
- Financial terms
- Obligations

Document:
${document}

Format the extraction clearly.`;

      const extraction = await generateText(prompt, { maxTokens: 400 });

      return NextResponse.json({ extraction });
    }

    return NextResponse.json(
      { error: "Invalid action or missing document" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Document API error:", error);
    return NextResponse.json(
      { error: "Failed to process document request" },
      { status: 500 }
    );
  }
}
