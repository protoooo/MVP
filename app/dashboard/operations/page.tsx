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
            <h1 className="text-2xl font-semibold text-text-primary">Today's Priorities</h1>
            <p className="text-text-secondary mt-1">
              See what needs your attention today
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
                  Let's get you started
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload your business files (schedules, invoices, employee info, recipes) and I'll help you stay on top of what matters.
                </p>
                <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-100">
                  <p className="text-sm font-medium text-text-primary mb-2">I work better when you upload:</p>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    <li>• Staff schedules and handbooks</li>
                    <li>• Sales reports and receipts</li>
                    <li>• Customer policies and FAQs</li>
                    <li>• Inspection reports and checklists</li>
                  </ul>
                </div>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Your Files
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
                  Working on {documentCount} file{documentCount !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-text-secondary">
                  Upload more files to get even better help.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">What I can do for you</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Daily To-Do List</p>
                <p className="text-xs text-text-secondary">What needs attention today</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Spot Problems</p>
                <p className="text-xs text-text-secondary">Find mismatches in your files</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Create Task Lists</p>
                <p className="text-xs text-text-secondary">Turn findings into action items</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Weekly Check-Up</p>
                <p className="text-xs text-text-secondary">How things are going overall</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">What's Missing</p>
                <p className="text-xs text-text-secondary">Tells you what files would help</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Based on Your Files</p>
                <p className="text-xs text-text-secondary">Only uses what you've uploaded</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleOperationsMessage}
          placeholder="Ask me for today's priorities, a weekly check-up, or what files you should upload..."
          welcomeMessage="Hi! I help you stay on top of things. I can show you today's priorities, spot problems in your files, create task lists, and give you weekly check-ups. What do you need help with?"
          agentColor="indigo"
          agentType="operations"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
