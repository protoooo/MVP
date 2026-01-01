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
        systemPrompt: "You are a Contracts, Agreements & Policies agent for businesses. IMPORTANT: You ONLY work with uploaded documents. You have NO external data sources or live integrations.\n\nYour core functions:\n1. Summarize Key Terms: Extract dates, obligations, responsibilities from uploaded contracts\n2. Compare Documents: When asked, compare multiple contracts for discrepancies\n3. Explain in Plain English: Translate complex legal language into simple terms\n4. Extract Renewal Dates & Obligations: Pull out important deadlines and clauses for follow-up\n5. Identify Issues: Flag potential concerns or unclear clauses in uploaded documents\n\nWhen responding:\n- ALWAYS state which documents you analyzed (e.g., 'In your Vendor Contract dated...')\n- If you lack relevant documents, say: 'To provide a complete review, please upload: [specific documents needed]'\n- DO NOT give legal conclusions or advice - only explain what's in the uploaded documents\n- Generate concrete outputs: summaries, comparison reports, plain English explanations, renewal date lists\n- All outputs should be ready to review and use (Draft + Open App pattern)\n\nYou help understand documents without giving legal advice.",
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
            <h1 className="text-2xl font-semibold text-text-primary">Contracts, Agreements & Policies</h1>
            <p className="text-text-secondary mt-1">
              Understand contracts, policies, and formal documents
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
                  Upload your contracts and policies
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload contracts, agreements, policies, and formal documents. I'll summarize key terms, dates, and obligations, compare documents when asked, explain them in plain English, and extract renewal dates and clauses for follow-up.
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

        {/* Quick Start Examples */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Quick Start Examples</h3>
          <div className="space-y-3">
            <div className="bg-clay-50 border border-clay-200 rounded-lg p-4">
              <p className="font-medium text-text-primary text-sm mb-2">🏢 Lease Negotiation Prep</p>
              <p className="text-xs text-text-secondary mb-3">
                Upload commercial lease → Key terms summary, market comparison, negotiation talking points
              </p>
              <button className="text-xs text-clay-600 hover:text-clay-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-clay-50 border border-clay-200 rounded-lg p-4">
              <p className="font-medium text-text-primary text-sm mb-2">📊 Vendor Contract Comparer</p>
              <p className="text-xs text-text-secondary mb-3">
                Upload 3 vendor proposals → Side-by-side comparison table
              </p>
              <button className="text-xs text-clay-600 hover:text-clay-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-clay-50 border border-clay-200 rounded-lg p-4">
              <p className="font-medium text-text-primary text-sm mb-2">🛡️ Insurance Policy Decoder</p>
              <p className="text-xs text-text-secondary mb-3">
                Upload policy → Plain English summary of coverage, gaps, recommendations
              </p>
              <button className="text-xs text-clay-600 hover:text-clay-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-clay-50 border border-clay-200 rounded-lg p-4">
              <p className="font-medium text-text-primary text-sm mb-2">📅 Licensing Deadline Tracker</p>
              <p className="text-xs text-text-secondary mb-3">
                Scans uploaded permits/licenses → Calendar of renewal deadlines
              </p>
              <button className="text-xs text-clay-600 hover:text-clay-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-clay-50 border border-clay-200 rounded-lg p-4">
              <p className="font-medium text-text-primary text-sm mb-2">⚠️ Legal Risk Flagging</p>
              <p className="text-xs text-text-secondary mb-3">
                Upload any contract → Highlights concerning clauses with explanations
              </p>
              <button className="text-xs text-clay-600 hover:text-clay-700 font-medium">
                Try this example →
              </button>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleDocumentMessage}
          placeholder="Ask me to summarize a contract, compare agreements, or explain clauses..."
          welcomeMessage="Hi! I'm your Contracts, Agreements & Policies agent. I work with your uploaded contracts, agreements, and policies to summarize key terms, compare documents, explain them in plain English, and extract renewal dates and obligations. I do not give legal advice - I only explain what's in your documents. What can I help you with?"
          agentColor="clay"
          agentType="document-reviewer"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
