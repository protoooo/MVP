"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { TrendingUp, Upload, AlertCircle, BarChart3, FileText, DollarSign, Receipt, LineChart } from "lucide-react";

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
        systemPrompt: "You are a Finances agent for businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations with accounting software or real-time data access.\n\nYour core functions:\n1. Summarize Financial Activity: Create clear, concise summaries for accountants or partners\n2. Identify Patterns: Spot trends in expenses and revenues from uploaded documents\n3. Flag Anomalies: Identify unusual trends or areas to review\n4. Prepare Conservative Forecasts: When requested, provide labeled estimates\n5. Highlight Actionable Opportunities: Point out areas for cost savings or revenue growth from data\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'Based on your Q3 expense report...')\n- If you lack relevant documents, say: 'To analyze finances, please upload: [specific documents needed]'\n- Never assume missing data or fabricate numbers\n- Generate concrete outputs: financial summaries, anomaly reports, conservative forecasts, opportunity highlights\n- Keep summaries clear and concise - ready to share with accountants/partners\n- All outputs should be ready to review and use (Draft + Open App pattern)\n\nYou provide financial clarity without making things up.",
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
            <h1 className="text-2xl font-semibold text-text-primary">Finances</h1>
            <p className="text-text-secondary mt-1">
              Summarize expenses, revenues, and financial activity
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
                  Upload your financial files
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload expenses, invoices, revenue reports, and spreadsheets. I'll help you summarize financial activity, identify patterns and anomalies, and prepare conservative forecasts. All summaries are ready to share with your accountant or partners.
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

        {/* Quick Start Examples */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Quick Start Examples</h3>
          <div className="space-y-3">
            <div className="bg-honey-50 border border-honey-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-honey-600" />
                <p className="font-medium text-text-primary text-sm">Monthly P&L Generator</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Uploads receipts/invoices → Categorized P&L statement as PDF
              </p>
              <button className="text-xs text-honey-600 hover:text-honey-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-honey-50 border border-honey-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-honey-600" />
                <p className="font-medium text-text-primary text-sm">Vendor Contract Analyzer</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Upload vendor agreements → Comparison table with renewal dates, price increases, cancellation terms
              </p>
              <button className="text-xs text-honey-600 hover:text-honey-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-honey-50 border border-honey-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-honey-600" />
                <p className="font-medium text-text-primary text-sm">Cash Flow Forecaster</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Based on historical data → 90-day cash flow projection with scenarios
              </p>
              <button className="text-xs text-honey-600 hover:text-honey-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-honey-50 border border-honey-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-honey-600" />
                <p className="font-medium text-text-primary text-sm">Tax Prep Helper</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Year-end → Organized expense categories ready for accountant
              </p>
              <button className="text-xs text-honey-600 hover:text-honey-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-honey-50 border border-honey-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <LineChart className="w-4 h-4 text-honey-600" />
                <p className="font-medium text-text-primary text-sm">Budget vs Actual Reporter</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Upload budget → Monthly variance report with explanations
              </p>
              <button className="text-xs text-honey-600 hover:text-honey-700 font-medium">
                Try this example →
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleFinancialMessage}
              placeholder="Ask me to summarize finances, identify patterns, or prepare a forecast..."
              welcomeMessage="Hi! I'm your Finances agent. I work with your uploaded expenses, invoices, and revenue reports to summarize financial activity, identify patterns and anomalies, and prepare conservative forecasts. All insights are based strictly on your uploaded documents. What can I help you with?"
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
