"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { MessageSquare, Upload, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function CustomerSupportPage() {
  const [hasDocuments, setHasDocuments] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkDocuments();
  }, []);

  const checkDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: docs } = await supabase
      .from("business_documents")
      .select("id")
      .eq("user_id", user.id)
      .in("document_type", ["manual", "policy", "faq"])
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);
  };

  const handleSupportMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are a Customer Service agent for businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations or real-time data access.\n\nYour core functions:\n1. Draft Professional Responses: Create professional, calm email responses or messages using uploaded policies\n2. Handle Complaints: Draft responses for refunds, complaints, disputes based on uploaded customer service policies\n3. Generate FAQs: Create customer-facing FAQs from uploaded documents\n4. Suggest Escalation Steps: When needed, outline escalation procedures from uploaded policies\n5. Ensure Consistency: All responses align with uploaded customer service standards\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'Based on your Customer Service Policy document...')\n- If you lack relevant documents, say: 'To provide accurate support guidance, please upload: [specific documents needed]'\n- Never invent policies or promises not in uploaded documents\n- Generate concrete outputs: draft email responses, FAQ lists, escalation steps\n- Maintain empathy and professionalism while staying true to uploaded policies\n- All outputs should be ready to review and use (Draft + Open App pattern)\n\nYou ensure consistent customer answers without guessing.",
        agentType: "customer-support",
        useAutonomous: true,
      }),
    });

    const data = await response.json();
    return data;
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
            <MessageSquare className="w-8 h-8 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Customer Service</h1>
            <p className="text-text-secondary mt-1">
              Resolve customer questions and complaints using your policies
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-sky-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Upload your customer service policies
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload customer service policies, FAQs, and support guidelines. I'll draft professional email responses, handle complaints, and suggest escalation steps based on your uploaded materials.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-sky-600 text-white rounded-full text-sm font-medium hover:bg-sky-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Support Documents
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Powered by your uploaded documents</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Draft Professional Responses</p>
                <p className="text-xs text-text-secondary">Calm, professional email drafts</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Handle Complaints</p>
                <p className="text-xs text-text-secondary">Refunds, disputes, escalations</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Generate FAQs</p>
                <p className="text-xs text-text-secondary">Create customer-facing FAQs</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Suggest Escalation Steps</p>
                <p className="text-xs text-text-secondary">When and how to escalate</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Ensure Consistency</p>
                <p className="text-xs text-text-secondary">Aligns with your policies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleSupportMessage}
          placeholder="Ask me to draft a customer response, handle a complaint, or create FAQs..."
          welcomeMessage="Hi! I'm your Customer Service agent. I help you resolve customer questions and complaints using your uploaded policies. I can draft professional email responses, handle refunds and disputes, generate FAQs, and suggest escalation steps - all based strictly on your policies. What customer issue can I help you with?"
          agentColor="sky"
          agentType="customer-support"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
