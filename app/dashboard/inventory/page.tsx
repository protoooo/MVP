"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { Package, Upload, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function InventoryPage() {
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
      .eq("document_type", "inventory_data")
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);
  };

  const handleInventoryMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are an Inventory agent for businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations or real-time data access.\n\nYour core functions:\n1. Identify Shortages & Overstock: Analyze uploaded stock lists and flag issues\n2. Suggest Reorder Quantities: Based on historical usage in uploaded documents\n3. Flag Discrepancies: Find inconsistencies between different inventory counts\n4. Analyze Usage Trends: Identify patterns from uploaded order sheets and invoices\n5. Provide Conservative Forecasts: When explicitly requested, label as estimates\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'Based on your October stock count...')\n- If you lack relevant documents, say: 'To provide inventory insights, please upload: [specific documents needed]'\n- Never forecast unless explicitly requested and always label forecasts as estimates\n- Never assume missing data or fabricate inventory numbers\n- Generate concrete outputs: reorder lists, discrepancy reports, usage trend summaries\n- All outputs should be ready to review and use (Draft + Open App pattern)\n\nYou help reason about what to order and review without guessing.",
        agentType: "inventory",
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
          <div className="p-4 bg-sage-50 rounded-xl border border-sage-200">
            <Package className="w-8 h-8 text-sage-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Inventory</h1>
            <p className="text-text-secondary mt-1">
              Track stock levels and identify what to order
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-sage-50 border border-sage-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-sage-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Upload your inventory files
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload stock lists, order sheets, vendor invoices, or inventory counts. I'll help identify shortages, overstock, inconsistencies, and suggest what to order based on your uploaded data.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-sage-600 text-white rounded-full text-sm font-medium hover:bg-sage-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Inventory Data
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Try asking me to:</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              "Generate a reorder list for low stock items",
              "Analyze inventory trends for the past month",
              "Find suppliers for [product name]",
              "Predict demand for [product] next month",
              "Create an inventory report",
              "Alert me about items below reorder point"
            ].map((example, index) => (
              <button
                key={index}
                className="text-left p-3 rounded-lg border border-border hover:border-green-300 hover:bg-sage-50 transition text-sm text-text-secondary"
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>

        {/* Capabilities */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Powered by your uploaded documents</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Identify Shortages & Overstock</div>
                <div className="text-xs text-text-secondary">Flag stock issues from uploads</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Suggest Reorder Quantities</div>
                <div className="text-xs text-text-secondary">Based on historical usage</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Flag Discrepancies</div>
                <div className="text-xs text-text-secondary">Find inconsistencies in counts</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Analyze Usage Trends</div>
                <div className="text-xs text-text-secondary">Patterns from uploaded data</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Conservative Forecasts</div>
                <div className="text-xs text-text-secondary">When requested, labeled as estimates</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleInventoryMessage}
              placeholder="Ask me to identify shortages, suggest reorder quantities, or analyze trends..."
              welcomeMessage="Hi! I'm your Inventory agent. I work with your uploaded stock lists, order sheets, vendor invoices, and counts to identify shortages, overstock, inconsistencies, and suggest what to order. All insights are based strictly on your uploaded documents. What can I help you with?"
              agentColor="green"
              agentType="inventory"
              enableAutonomous={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
