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
        systemPrompt: "You are a document review specialist for small businesses. You analyze contracts, agreements, and legal documents with precision. You summarize key points clearly, extract important clauses, identify potential risks and compliance issues, compare document versions, and flag critical terms that require attention. You provide objective assessments while highlighting areas that may need legal review. You help business owners understand complex documents in plain language.",
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
              Summarize contracts, extract clauses, and assess risks
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
          <h3 className="font-semibold text-text-primary mb-4">I can help with:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Summarize documents</p>
                <p className="text-xs text-text-secondary">Create clear, concise summaries of contracts</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Extract key clauses</p>
                <p className="text-xs text-text-secondary">Identify important terms and conditions</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Assess risks</p>
                <p className="text-xs text-text-secondary">Identify potential issues and red flags</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Compare versions</p>
                <p className="text-xs text-text-secondary">Analyze changes between document versions</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Flag critical terms</p>
                <p className="text-xs text-text-secondary">Highlight important dates and obligations</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-clay-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Plain language explanations</p>
                <p className="text-xs text-text-secondary">Translate legalese into clear English</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleDocumentMessage}
          placeholder="Ask me to review a contract, summarize an agreement, or explain a clause..."
          welcomeMessage="Hi! I'm your Document Reviewer. I can help you understand contracts, extract key clauses, identify risks, and explain complex legal terms in plain language. What document would you like me to review?"
          agentColor="clay"
          agentType="document-reviewer"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
