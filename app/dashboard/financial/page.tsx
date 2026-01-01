"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/Chatbot";
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
        systemPrompt: "You are a financial analyst for a small business. You help analyze revenue, sales, margins, COGS, expenses, and budgets. You categorize expenses, identify spending patterns, and forecast budget trajectories. You explain financial concepts clearly and flag anomalies or risks. You provide data-backed recommendations for financial optimization. When the user uploads financial data, you analyze it thoroughly and provide actionable insights.",
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
          <div className="p-4 bg-amber-50 rounded-xl">
            <TrendingUp className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Financial Analyst</h1>
            <p className="text-gray-600 mt-1">
              Analyze revenue, expenses, margins, and financial health
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Ready to analyze your finances
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Upload your financial data (sales reports, expense sheets, revenue data) to get detailed insights about your business finances including revenue analysis, cost tracking, margin calculations, and budget forecasting.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-full text-sm font-medium hover:bg-amber-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Financial Data
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Capabilities */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">I can help with:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Revenue Analysis</div>
                <div className="text-xs text-gray-600">Track sales and income trends</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Expense Categorization</div>
                <div className="text-xs text-gray-600">Automatically categorize costs</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Margin Calculations</div>
                <div className="text-xs text-gray-600">Gross margin and profit analysis</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">COGS Tracking</div>
                <div className="text-xs text-gray-600">Monitor cost of goods sold</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Budget Forecasting</div>
                <div className="text-xs text-gray-600">Predict future expenses</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Anomaly Detection</div>
                <div className="text-xs text-gray-600">Flag unusual transactions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleFinancialMessage}
              placeholder="Ask about your finances..."
              welcomeMessage="Hi! I'm your Financial Analyst. I can help you understand your revenue, expenses, margins, and overall financial health. Upload your financial data or ask me questions about managing your business finances."
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
