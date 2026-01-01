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
        systemPrompt: "You are an Inventory Manager for small businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations or real-time data access.\n\nYour core functions:\n1. Inventory Summary Extraction: Pull stock levels from uploaded reports\n2. Usage Pattern Detection: Identify trends across time-based documents\n3. Waste & Risk Flags: Detect expiring items, over-ordering clues from documents\n4. Reorder Guidance: Suggestions based on historical uploads\n5. Inventory Checklist Creation: Create weekly/monthly review lists from documents\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'Based on your October inventory report...')\n- If you lack relevant documents, say: 'To provide inventory insights, please upload: [specific documents needed]'\n- Never guess or make up inventory data\n- Generate concrete outputs: stock summaries, reorder lists, waste alerts, review checklists\n- Identify patterns only from uploaded historical data\n\nYou reduce guesswork in ordering and waste.",
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
            <h1 className="text-2xl font-semibold text-text-primary">Inventory Manager</h1>
            <p className="text-text-secondary mt-1">
              Document-driven inventory insights
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
                  Ready to track your inventory
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload your inventory data (stock levels, SKUs, supplier info) to get predictive insights, automated reorder alerts, demand forecasting, and supplier recommendations.
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
                <div className="font-medium text-text-primary text-sm">Inventory Summary Extraction</div>
                <div className="text-xs text-text-secondary">Pulls stock levels from uploaded reports</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Usage Pattern Detection</div>
                <div className="text-xs text-text-secondary">Identifies trends across time-based documents</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Waste & Risk Flags</div>
                <div className="text-xs text-text-secondary">Expiring items, over-ordering clues</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Reorder Guidance</div>
                <div className="text-xs text-text-secondary">Suggestions based on historical uploads</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Inventory Checklist Creation</div>
                <div className="text-xs text-text-secondary">Creates weekly/monthly review lists</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Document-Based Only</div>
                <div className="text-xs text-text-secondary">No live data, just your uploaded reports</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleInventoryMessage}
              placeholder="Ask about inventory..."
              welcomeMessage="Hi! I'm your Inventory Manager. I analyze your uploaded inventory reports to extract stock levels, detect usage patterns, flag waste risks, and provide reorder guidance. All insights are based strictly on your uploaded documents. What can I help you with?"
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
