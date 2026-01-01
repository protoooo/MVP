"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { Users, Upload, AlertCircle, Calendar, FileText, HandshakeIcon, FileEdit, Star } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function HRPage() {
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
      .in("document_type", ["manual", "policy", "procedure"])
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);
  };

  const handleHRMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are an HR agent for businesses. IMPORTANT: You ONLY use uploaded documents as your source of truth. You have NO live integrations or real-time data access.\n\nYour core functions:\n1. Draft Schedules: Create employee schedules based on availability and operating hours from uploaded docs\n2. Screen Resumes: Check resumes for inconsistencies or AI-generated content\n3. Create Onboarding Materials: Draft onboarding emails, checklists, and training materials\n4. Policy Q&A: Answer 'How do we handle X?' using uploaded HR content\n5. Rewrite & Organize: Summarize or reorganize internal processes from uploaded handbooks\n\nWhen responding:\n- ALWAYS state which documents you used (e.g., 'Based on your Employee Handbook...')\n- If you lack relevant documents, say: 'To provide accurate HR guidance, please upload: [specific documents needed]'\n- Never give legal or compliance advice - only explain uploaded content\n- Generate concrete outputs: schedules, onboarding emails, training checklists, resume screening reports\n- All outputs should be ready to review and use (Draft + Open App pattern)\n\nYou help with people management without making things up.",
        agentType: "hr",
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
          <div className="p-4 bg-lavender-50 rounded-xl border border-lavender-200">
            <Users className="w-8 h-8 text-lavender-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">HR</h1>
            <p className="text-text-secondary mt-1">
              Work with onboarding docs, schedules, and employee materials
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-lavender-50 border border-lavender-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-lavender-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  Upload your HR documents
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload employee handbooks, training materials, schedules, and policies. I'll help you draft schedules, screen resumes, create onboarding emails, and answer "How do we handle X?" using your uploaded content.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-lavender-600 text-white rounded-full text-sm font-medium hover:bg-lavender-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Company Documents
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Quick Start Examples */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Quick Start Examples</h3>
          <div className="space-y-3">
            <div className="bg-lavender-50 border border-lavender-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-lavender-600" />
                <p className="font-medium text-text-primary text-sm">Resume Screener</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Upload 10 resumes → Ranks by fit, flags AI-generated content, highlights red flags
              </p>
              <button className="text-xs text-lavender-600 hover:text-lavender-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-lavender-50 border border-lavender-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-lavender-600" />
                <p className="font-medium text-text-primary text-sm">Interview Scheduler</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                "Schedule interviews for 3 candidates next week, avoid conflicts with [upload calendar]" → Sends calendar invites with interview guides
              </p>
              <button className="text-xs text-lavender-600 hover:text-lavender-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-lavender-50 border border-lavender-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HandshakeIcon className="w-4 h-4 text-lavender-600" />
                <p className="font-medium text-text-primary text-sm">Onboarding Packet Creator</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                "New hire starts Monday as line cook" → Generates first-day checklist, training schedule, paperwork list
              </p>
              <button className="text-xs text-lavender-600 hover:text-lavender-700 font-medium">
                Try this example →
              </button>
            </div>
            
            <div className="bg-lavender-50 border border-lavender-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileEdit className="w-4 h-4 text-lavender-600" />
                <p className="font-medium text-text-primary text-sm">Employee Handbook Updater</p>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                "We're changing our vacation policy to..." → Drafts updated section with track changes
              </p>
              <button className="text-xs text-lavender-600 hover:text-lavender-700 font-medium">
                Try this example →
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleHRMessage}
              placeholder="Ask me to draft a schedule, screen a resume, or create onboarding materials..."
              welcomeMessage="Hi! I'm your HR agent. I help with onboarding, schedules, and employee materials using your uploaded documents. I can draft schedules, screen resumes for inconsistencies or AI usage, create onboarding emails and checklists, answer policy questions, and organize internal processes. What do you need help with?"
              agentColor="purple"
              agentType="hr"
              enableAutonomous={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
