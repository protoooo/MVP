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
        systemPrompt: "You are a customer support specialist for small businesses. You help handle customer inquiries with empathy and professionalism, analyze sentiment, route complex issues appropriately, and maintain conversation context across interactions. You provide clear, helpful responses and can draft customer communications. You ensure all responses align with company policies and maintain a positive customer experience. When customer support documents, FAQs, or policies are available, you use them to provide accurate, consistent answers.",
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
              Handle inquiries, analyze sentiment, and route tickets
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
          <h3 className="font-semibold text-text-primary mb-4">I can help with:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Handle customer inquiries</p>
                <p className="text-xs text-text-secondary">Respond to questions with context and empathy</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Analyze sentiment</p>
                <p className="text-xs text-text-secondary">Detect customer satisfaction and concerns</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Route tickets</p>
                <p className="text-xs text-text-secondary">Prioritize and assign support requests</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Draft communications</p>
                <p className="text-xs text-text-secondary">Create professional customer responses</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Maintain context</p>
                <p className="text-xs text-text-secondary">Remember conversation history for continuity</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Policy compliance</p>
                <p className="text-xs text-text-secondary">Ensure responses align with company standards</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleSupportMessage}
          placeholder="Ask me to handle a customer inquiry, analyze sentiment, or draft a response..."
          welcomeMessage="Hi! I'm your Customer Support agent. I can help you handle customer inquiries, analyze sentiment, route tickets, and draft professional responses. What can I help you with?"
          agentColor="sky"
          agentType="customer-support"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
