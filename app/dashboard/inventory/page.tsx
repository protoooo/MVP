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
        systemPrompt: "You are an inventory management specialist for small businesses. You analyze stock levels, predict demand patterns, identify optimization opportunities, and help find new suppliers. You provide clear, actionable recommendations with supporting data. You alert users to critical thresholds and supply chain risks. You can generate reorder lists, analyze inventory trends, research suppliers, and produce downloadable reports.",
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
              Track stock, predict demand, and manage suppliers
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
          <h3 className="font-semibold text-text-primary mb-4">I can help with:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Stock Tracking</div>
                <div className="text-xs text-text-secondary">Monitor inventory levels in real-time</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Demand Forecasting</div>
                <div className="text-xs text-text-secondary">Predict future inventory needs</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Reorder Automation</div>
                <div className="text-xs text-text-secondary">Generate smart reorder lists</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Supplier Research</div>
                <div className="text-xs text-text-secondary">Find and compare vendors</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Trend Analysis</div>
                <div className="text-xs text-text-secondary">Identify patterns and anomalies</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-sage-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Report Generation</div>
                <div className="text-xs text-text-secondary">Create downloadable inventory reports</div>
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
              welcomeMessage="Hi! I'm your Inventory Manager. I can track your stock, predict demand, generate reorder lists, research suppliers, and create reports. Ask me to do something or upload your inventory data to get started!"
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
