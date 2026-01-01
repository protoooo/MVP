"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { Brain, Upload, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function OperationsIntelligencePage() {
  const [hasDocuments, setHasDocuments] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
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
      .eq("user_id", user.id);

    const count = docs?.length ?? 0;
    setDocumentCount(count);
    setHasDocuments(count > 0);
  };

  const handleOperationsMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: `You are the Operations Intelligence agent - the brain that reasons across all uploaded business documents.

IMPORTANT CONSTRAINTS:
- You ONLY know what has been uploaded to the system
- You have NO live integrations (no Stripe, email, POS, HR systems)
- You CANNOT access real-time data
- Uploaded documents are your ONLY source of truth

Your core functions:
1. Daily Priority Brief: Analyze all documents to identify what deserves immediate attention
2. Cross-Document Issue Detection: Find mismatches, risks, or contradictions across documents (e.g., SOP says X but financial report suggests Y)
3. Auto Task Suggestions: Convert findings into actionable tasks
4. Weekly Business Health Summary: Provide signals across operations, finance, HR, and compliance
5. What's Missing Detector: Identify gaps in uploaded data and suggest specific documents to upload next

When responding:
- ALWAYS state which documents you used in your analysis
- CLEARLY explain when you lack sufficient data
- Suggest SPECIFIC documents to upload for better insights
- Never hallucinate or assume data you don't have
- Generate concrete outputs: summaries, reports, task lists, checklists
- Surface uncertainty when data is missing

You help business owners understand what matters most based on what they've shared.`,
        agentType: "operations",
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
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <Brain className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Operations Intelligence</h1>
            <p className="text-text-secondary mt-1">
              Turns your documents into daily actions and priorities
            </p>
          </div>
        </div>

        {/* Document Status */}
        {!hasDocuments ? (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-indigo-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Ready to become your business brain
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  I analyze all your uploaded documents to tell you what matters. Upload SOPs, financial reports, policies, inspection reports, and more. The more you upload, the smarter I become.
                </p>
                <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-100">
                  <p className="text-sm font-medium text-text-primary mb-2">Get better insights by uploading:</p>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    <li>• SOPs and procedures → better operational advice</li>
                    <li>• P&L and financial statements → better financial insights</li>
                    <li>• HR policies and handbooks → better people management</li>
                    <li>• Inspection and compliance reports → better risk detection</li>
                  </ul>
                </div>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Your First Documents
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Brain className="w-6 h-6 text-indigo-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Analyzing {documentCount} document{documentCount !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-text-secondary">
                  I'm ready to help! Upload more documents to improve my understanding of your business.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Powered by your uploaded documents</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Daily Priority Brief</p>
                <p className="text-xs text-text-secondary">What deserves attention based on your docs</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Cross-Document Issue Detection</p>
                <p className="text-xs text-text-secondary">Find mismatches and risks across files</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Auto Task Suggestions</p>
                <p className="text-xs text-text-secondary">Convert findings into actionable tasks</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Weekly Business Health Summary</p>
                <p className="text-xs text-text-secondary">Operations, finance, HR, compliance signals</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">What's Missing Detector</p>
                <p className="text-xs text-text-secondary">Suggests what to upload for better insights</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Document-Based Analysis Only</p>
                <p className="text-xs text-text-secondary">No live data, just your uploaded files</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleOperationsMessage}
          placeholder="Ask me for a priority brief, business health check, or what documents you should upload..."
          welcomeMessage="Hi! I'm your Operations Intelligence agent. I analyze all your uploaded documents to tell you what matters most. I can create daily priority briefs, detect issues across documents, suggest tasks, and help you understand your business health. What would you like to know?"
          agentColor="indigo"
          agentType="operations"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
