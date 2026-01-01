"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Chatbot from "@/components/Chatbot";
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
          <div className="p-4 bg-purple-50 rounded-xl">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">HR Assistant</h1>
            <p className="text-gray-600 mt-1">
              Screen resumes, match candidates, and manage hiring
            </p>
          </div>
        </div>

        {/* No Documents Alert */}
        {!hasDocuments && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-purple-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Ready to help with hiring
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Upload your company policies, procedures, and manuals so I can ensure all hiring recommendations align with your business standards. I'll also use this context to write better, more personalized communications.
                </p>
                <a
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Company Documents
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
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Resume Screening</div>
                <div className="text-xs text-gray-600">Analyze and verify resumes</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">AI Detection</div>
                <div className="text-xs text-gray-600">Check resumes for AI-generated content</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Candidate Matching</div>
                <div className="text-xs text-gray-600">Match candidates to job requirements</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Email Writing</div>
                <div className="text-xs text-gray-600">Draft professional HR emails</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Template Building</div>
                <div className="text-xs text-gray-600">Create reusable email templates</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Interview Scheduling</div>
                <div className="text-xs text-gray-600">Coordinate interview times</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
