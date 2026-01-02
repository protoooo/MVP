import { NextRequest, NextResponse } from "next/server";
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { purpose, recipient, context, tone } = body;

    if (!purpose || !context) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Purpose-specific templates
    const purposeTemplates: Record<string, string> = {
      customer_inquiry: "responding to a customer inquiry",
      meeting_followup: "following up after a meeting",
      quote_request: "responding to a quote request",
      appointment_confirmation: "confirming an appointment",
      thank_you: "thanking someone",
      complaint_response: "responding to a customer complaint",
      newsletter: "creating a newsletter",
      announcement: "making a team announcement",
      cold_outreach: "reaching out to a potential customer",
    };

    const purposeDesc = purposeTemplates[purpose] || purpose;

    // Create prompt for AI
    const prompt = `Write a professional email ${purposeDesc}.

Recipient: ${recipient || 'the recipient'}
Tone: ${tone}
Context and Details: ${context}

Generate a complete email with:
1. An appropriate subject line
2. Professional greeting
3. Well-structured body that addresses all points in the context
4. Appropriate closing

Return the email in the following format:
SUBJECT: [subject line]

BODY:
[email body with greeting, content, and closing]

Keep the tone ${tone} and ensure the email is clear, concise, and professional.`;

    const response = await cohere.generate({
      prompt,
      maxTokens: 1500,
      temperature: 0.7,
      model: "command",
    });

    const generatedText = response.generations[0]?.text || "";

    // Parse the response
    const subjectMatch = generatedText.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
    const bodyMatch = generatedText.match(/BODY:\s*([\s\S]+)/i);

    const emailSubject = subjectMatch ? subjectMatch[1].trim() : "Your Email";
    const emailBody = bodyMatch ? bodyMatch[1].trim() : generatedText;

    return NextResponse.json({
      email: {
        subject: emailSubject,
        body: emailBody,
      },
    });
  } catch (error) {
    console.error("Error generating email:", error);
    return NextResponse.json(
      { error: "Failed to generate email" },
      { status: 500 }
    );
  }
}
