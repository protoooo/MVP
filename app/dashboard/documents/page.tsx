"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { FileText, Upload, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function DocumentsPage() {
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
      .in("document_type", ["contract", "agreement", "legal"])
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);
  };

  const handleDocumentMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are a Document Reviewer for small businesses. IMPORTANT: You ONLY analyze uploaded documents. You have NO external data sources or live integrations.\n\nYour core functions:\n1. Risk Identification: Flag legal, financial, compliance issues in uploaded documents\n2. Key Obligation Extraction: Pull out deadlines, rules, responsibilities\n3. Summary & Action Breakdown: Turn documents into 2-minute reads with action items\n4. Contradiction Detection: Find conflicts across multiple uploaded documents\n5. Readiness Scoring: Assess 'How prepared are you based on current docs?'\n\nWhen responding:\n- ALWAYS state which documents you analyzed (e.g., 'In your Vendor Contract dated...')\n- If you lack relevant documents, say: 'To provide a complete review, please upload: [specific documents needed]'\n- Never make assumptions about missing information\n- Generate concrete outputs: risk reports, obligation lists, summaries, contradiction alerts, readiness scores\n- Explain complex terms in plain English for small business owners\n\nYou turn documents into insight, not storage.",
        agentType: "document-reviewer",
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
          <div className="p-4 bg-clay-50 rounded-xl border border-clay-200">
            <FileText className="w-8 h-8 text-clay-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Document Reviewer</h1>
            <p className="text-text-secondary mt-1">
              Turn documents into insights and actions
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-clay-50 border border-clay-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-clay-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Ready to review your documents
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload your contracts, agreements, or legal documents and I'll help you understand them. I can summarize key points, extract important clauses, identify risks, and explain complex terms in plain language.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-clay-600 text-white rounded-full text-sm font-medium hover:bg-clay-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Documents
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
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Risk Identification</p>
                <p className="text-xs text-text-secondary">Legal, financial, compliance issues</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Key Obligation Extraction</p>
                <p className="text-xs text-text-secondary">Deadlines, rules, responsibilities</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Summary & Action Breakdown</p>
                <p className="text-xs text-text-secondary">"Read this in 2 minutes"</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Contradiction Detection</p>
                <p className="text-xs text-text-secondary">Across multiple documents</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Readiness Scoring</p>
                <p className="text-xs text-text-secondary">"How prepared are you based on current docs?"</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Plain Language Explanations</p>
                <p className="text-xs text-text-secondary">Translate complex terms for business owners</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleDocumentMessage}
          placeholder="Ask me to review a contract, summarize an agreement, or explain a clause..."
          welcomeMessage="Hi! I'm your Document Reviewer. I turn documents into insights by identifying risks, extracting obligations, creating summaries with action items, detecting contradictions, and scoring your readiness - all based strictly on your uploaded documents. What would you like me to review?"
          agentColor="clay"
          agentType="document-reviewer"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
