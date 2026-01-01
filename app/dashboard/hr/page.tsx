"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { Users, Upload, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function HRPage() {
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
      .in("document_type", ["manual", "policy", "procedure"])
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);
  };

  const handleHRMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are an HR Assistant for small businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations or real-time data access.\n\nYour core functions:\n1. Policy Q&A: Answer HR questions strictly from uploaded HR documents\n2. Onboarding Checklist Generator: Build checklists from internal policies\n3. Training Summary Creation: Turn long docs into short training guides\n4. Consistency Checks: Flag contradictions between policies\n5. Scenario Guidance: Based on your handbook, provide guidance on situations\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'According to your Employee Handbook...')\n- If you lack relevant documents, say: 'To provide accurate HR guidance, please upload: [specific documents needed]'\n- Never guess or make up policy information\n- Generate concrete outputs: checklists, training summaries, policy comparisons\n- Ensure all recommendations align with uploaded company standards\n\nYou help with people management without legal mistakes.",
        agentType: "hr",
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
          <div className="p-4 bg-lavender-50 rounded-xl border border-lavender-200">
            <Users className="w-8 h-8 text-lavender-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">HR Assistant</h1>
            <p className="text-text-secondary mt-1">
              People management based on your policies
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-lavender-50 border border-lavender-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-lavender-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Ready to help with hiring
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload your company policies, procedures, and manuals so I can ensure all hiring recommendations align with your business standards. I'll also use this context to write better, more personalized communications.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-lavender-600 text-white rounded-full text-sm font-medium hover:bg-lavender-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Company Documents
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
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Policy Q&A</p>
                <p className="text-xs text-text-secondary">Answers strictly from uploaded HR documents</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Onboarding Checklist Generator</p>
                <p className="text-xs text-text-secondary">Built from internal policies</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Training Summary Creation</p>
                <p className="text-xs text-text-secondary">Turns long docs into short training guides</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Consistency Checks</p>
                <p className="text-xs text-text-secondary">Flags contradictions between policies</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Scenario Guidance</p>
                <p className="text-xs text-text-secondary">Based on your handbook</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Document-Based Only</p>
                <p className="text-xs text-text-secondary">No guessing, just your policies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleHRMessage}
              placeholder="Ask about HR and recruiting..."
              welcomeMessage="Hello! I'm your HR assistant. I help with people management using your uploaded policies and handbooks. I can answer policy questions, generate onboarding checklists, create training summaries, check for policy contradictions, and provide scenario guidance - all based strictly on your documents. What can I help you with?"
              agentColor="purple"
              agentType="hr"
              enableAutonomous={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
