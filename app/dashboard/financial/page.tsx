"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { TrendingUp, Upload, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function FinancialPage() {
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
      .eq("document_type", "financial_data")
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);
  };

  const handleFinancialMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are a Financial Analyst for small businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations with accounting software or real-time data access.\n\nYour core functions:\n1. Financial Summary Reports: Plain English explanations from uploaded financial documents\n2. Expense Category Analysis: From uploaded receipts/reports\n3. Trend Detection: Revenue up/down based on time-series documents\n4. Cost Risk Warnings: Flag abnormal changes in uploaded data\n5. Question-Driven Insights: Answer 'Why is X changing?' based on documents only\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'According to your Q3 P&L...')\n- If you lack relevant documents, say: 'To analyze finances, please upload: [specific documents needed]'\n- Never guess or make up financial data\n- Generate concrete outputs: financial summaries, expense breakdowns, trend reports, risk alerts\n- Explain financial concepts in plain English for small business owners\n\nYou provide financial clarity without accounting software.",
        agentType: "financial",
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
          <div className="p-4 bg-honey-50 rounded-xl border border-honey-200">
            <TrendingUp className="w-8 h-8 text-honey-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Financial Analyst</h1>
            <p className="text-text-secondary mt-1">
              Financial clarity from your reports
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-honey-50 border border-honey-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-honey-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Ready to analyze your finances
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload your financial data (sales reports, expense sheets, revenue data) to get detailed insights about your business finances including revenue analysis, cost tracking, margin calculations, and budget forecasting.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-honey-600 text-white rounded-full text-sm font-medium hover:bg-honey-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Financial Data
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
              <div className="w-2 h-2 bg-honey-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Financial Summary Reports</div>
                <div className="text-xs text-text-secondary">Plain English explanations</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-honey-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Expense Category Analysis</div>
                <div className="text-xs text-text-secondary">From uploaded receipts/reports</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-honey-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Trend Detection</div>
                <div className="text-xs text-text-secondary">Revenue up/down based on time-series docs</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-honey-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Cost Risk Warnings</div>
                <div className="text-xs text-text-secondary">Flags abnormal changes</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-honey-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Question-Driven Insights</div>
                <div className="text-xs text-text-secondary">"Why is food cost rising?" (doc-based only)</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-honey-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Document-Based Only</div>
                <div className="text-xs text-text-secondary">No accounting software needed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleFinancialMessage}
              placeholder="Ask about your finances..."
              welcomeMessage="Hi! I'm your Financial Analyst. I provide financial clarity by analyzing your uploaded financial documents. I create summaries in plain English, categorize expenses, detect trends, flag cost risks, and answer your financial questions - all based strictly on your documents. What would you like to know?"
              agentColor="amber"
              agentType="financial"
              enableAutonomous={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
