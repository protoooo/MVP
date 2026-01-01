"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { Brain, Upload, AlertCircle, Calendar, CheckSquare, Users, Sun, ClipboardList } from "lucide-react";

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
        systemPrompt: `You are the Today's Priorities agent - helping business owners focus on what matters most today.

IMPORTANT CONSTRAINTS:
- You ONLY know what has been uploaded to the system
- You have NO live integrations (no Stripe, email, POS, HR systems)
- You CANNOT access real-time data
- Uploaded documents are your ONLY source of truth

Your core functions:
1. Turn Vague Goals into Concrete Tasks: Convert unclear objectives into actionable, specific tasks
2. Highlight Tradeoffs and Sequencing: Show what should be done first and what can wait
3. Draft Daily Task Lists: Create practical, prioritized to-do lists
4. Highlight Urgent Items: Flag what needs immediate attention based on uploaded data
5. Suggest Task Delegation: Recommend which tasks could be delegated to team members

When responding:
- Use ONLY current context and uploaded files
- ALWAYS state which documents you used in your analysis
- CLEARLY explain when you lack sufficient data
- Suggest SPECIFIC documents to upload for better insights
- Never hallucinate or assume data you don't have
- Generate concrete outputs: daily task lists, delegation notes, priority briefs
- DO NOT give motivational advice or long-term planning
- Surface uncertainty when data is missing
- All outputs should be ready to review and use (Draft + Open App pattern)

You help business owners understand what deserves attention today based on what they've shared.`,
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
                  Upload your business files (schedules, invoices, employee info, to-do lists) and I'll help you turn vague goals into concrete tasks, highlight what's urgent, and suggest what can be delegated.
                </p>
                <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-100">
                  <p className="text-sm font-medium text-text-primary mb-2">I work better when you upload:</p>
                  <ul className="space-y-1 text-sm text-text-secondary">
                    <li>• Current to-do lists or project notes</li>
                    <li>• Staff schedules and availability</li>
                    <li>• Recent orders or customer requests</li>
                    <li>• Inspection reports or checklists</li>
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

        {/* Quick Start Examples */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Quick Start Examples</h3>
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <p className="font-medium text-text-primary text-sm">Weekly Schedule Generator</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                "We have 5 employees, these are their available hours [upload CSV], we're open Mon-Sat 9am-6pm" → Generates optimized schedule as downloadable PDF/Excel
              </p>
              <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <p className="font-medium text-text-primary text-sm">Task Sequencing</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                "I need to: restock inventory, respond to 3 customer complaints, review vendor contract, train new hire" → Prioritizes with time estimates and dependencies
              </p>
              <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <p className="font-medium text-text-primary text-sm">Delegation Recommender</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Analyzes tasks and suggests which ones can be delegated to which team members based on uploaded org chart/roles
              </p>
              <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-4 h-4 text-indigo-600" />
                <p className="font-medium text-text-primary text-sm">Daily Briefing</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Scans all uploaded documents for urgent items (expired licenses, low inventory alerts, pending deadlines) → Morning report
              </p>
              <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Try this example →
              </button>
            </div>
          </div>
        </div>

        {/* Chatbot */}
        <Chatbot
          onSendMessage={handleOperationsMessage}
          placeholder="Ask me to prioritize tasks, create a daily to-do list, or highlight what's urgent..."
          welcomeMessage="Hi! I'm your Today's Priorities agent. I help you turn vague goals into concrete tasks, highlight tradeoffs and sequencing, draft daily task lists, and suggest what can be delegated. I use only your uploaded files and current context - no motivational advice or long-term planning. What do you need help with today?"
          agentColor="indigo"
          agentType="operations"
          enableAutonomous={true}
        />
      </div>
    </div>
  );
}
