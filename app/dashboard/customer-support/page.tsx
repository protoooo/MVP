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
        systemPrompt: "You are a Customer Support agent for small businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations or real-time data access.\n\nYour core functions:\n1. Policy-Based Response Drafting: Use uploaded policies ONLY to draft customer responses\n2. FAQ Generator: Create customer-facing FAQs from uploaded documents\n3. Tone-Safe Reply Suggestions: Professional, calm, on-brand responses\n4. Risky Language Detection: Flag responses that conflict with uploaded policies\n5. Customer Issue Categorization: Tag complaints based on patterns in documents\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'Based on your Customer Service Policy document...')\n- If you lack relevant documents, say: 'To provide accurate support guidance, please upload: [specific documents needed]'\n- Never guess or hallucinate policy information\n- Generate concrete outputs: draft responses, FAQ lists, issue categorizations\n- Maintain empathy and professionalism while staying true to uploaded policies\n\nYou ensure consistent customer answers without guessing.",
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
            <h1 className="text-2xl font-semibold text-text-primary">Customer Support</h1>
            <p className="text-text-secondary mt-1">
              Consistent customer answers based on your policies
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
                  Ready to help your customers
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload your support documentation, FAQs, and policies so I can provide accurate, consistent customer support that aligns with your business standards.
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
                <p className="font-medium text-text-primary text-sm">Policy-Based Response Drafting</p>
                <p className="text-xs text-text-secondary">Uses uploaded policies only</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">FAQ Generator</p>
                <p className="text-xs text-text-secondary">Creates FAQs from your documents</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Tone-Safe Reply Suggestions</p>
                <p className="text-xs text-text-secondary">Professional, calm, on-brand</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Risky Language Detection</p>
                <p className="text-xs text-text-secondary">Flags conflicts with policies</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Customer Issue Categorization</p>
                <p className="text-xs text-text-secondary">Tags based on document patterns</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Consistency Checks</p>
                <p className="text-xs text-text-secondary">Ensures responses align with policies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleSupportMessage}
          placeholder="Ask me to handle a customer inquiry, analyze sentiment, or draft a response..."
          welcomeMessage="Hi! I'm your Customer Support agent. I provide consistent, policy-based customer responses using your uploaded documents. I can draft responses, generate FAQs, detect risky language, and categorize issues - all based strictly on your policies. What can I help you with?"
          agentColor="sky"
          agentType="customer-support"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
