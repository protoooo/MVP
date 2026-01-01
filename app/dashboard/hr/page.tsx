"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/ChatbotEnhanced";
import { Users, Upload, AlertCircle } from "lucide-react";

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
        systemPrompt: "You are an HR assistant specializing in recruitment for small businesses. You analyze resumes systematically, check them for legitimacy and AI usage, match candidates to role requirements, and coordinate scheduling efficiently. You can write professional emails, build email templates, and draft interview communications. You provide objective assessments while highlighting candidate strengths. You maintain compliance with hiring best practices. When business policies and procedures are uploaded, you ensure all recommendations align with company standards.",
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
            <h1 className="text-2xl font-semibold text-text-primary">HR Assistant</h1>
            <p className="text-text-secondary mt-1">
              Screen resumes, match candidates, and manage hiring
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
                  Ready to help with hiring
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Upload your company policies, procedures, and manuals so I can ensure all hiring recommendations align with your business standards. I'll also use this context to write better, more personalized communications.
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

        {/* Capabilities */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">I can help with:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Resume Screening</p>
                <p className="text-xs text-text-secondary">Analyze and verify resumes</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">AI Detection</p>
                <p className="text-xs text-text-secondary">Check resumes for AI-generated content</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Candidate Matching</p>
                <p className="text-xs text-text-secondary">Match candidates to job requirements</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Email Writing</p>
                <p className="text-xs text-text-secondary">Draft professional HR emails</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-lavender-500 rounded-full mt-2" />
              <div>
                <p className="font-medium text-text-primary text-sm">Template Building</p>
                <p className="text-xs text-text-secondary">Create reusable email templates</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-text-primary text-sm">Interview Scheduling</div>
                <div className="text-xs text-text-secondary">Coordinate interview times</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <Chatbot
              onSendMessage={handleHRMessage}
              placeholder="Ask about HR and recruiting..."
              welcomeMessage="Hello! I'm your HR assistant. I can help screen resumes, check them for legitimacy and AI usage, match candidates to roles, write professional emails, build templates, and schedule interviews. Upload resumes or company documents to get started, or ask me any HR-related questions."
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
