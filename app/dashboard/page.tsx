"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Send } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import ProtoIntroduction from "@/components/ProtoIntroduction";
import ChatbotEnhanced from "@/components/ChatbotEnhanced";
import ProtoIcon from "@/components/ProtoIcon";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

    // Show onboarding if user hasn't completed it
    if (profileData && !profileData.onboarding_completed) {
      setShowOnboarding(true);
    }

    const { data: docs } = await supabase
      .from("business_documents")
      .select("id")
      .eq("user_id", user.id);

    const count = docs?.length ?? 0;
    setDocumentCount(count);
    setHasDocuments(count > 0);
  };

  const handleOnboardingComplete = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Store onboarding data as Proto memories via API
    await fetch("/api/proto/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    // Update profile to mark onboarding as complete
    await supabase
      .from("user_profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    setShowOnboarding(false);
  };

  const handleProtoMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/proto/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ 
          role: h.role === "user" ? "USER" : "CHATBOT", 
          message: h.content 
        })),
      }),
    });

    const data = await response.json();
    return data;
  };

  if (showOnboarding) {
    return (
      <ProtoIntroduction 
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Proto Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="relative">
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(99, 102, 241, 0.4)",
                  "0 0 0 10px rgba(99, 102, 241, 0)",
                  "0 0 0 0 rgba(99, 102, 241, 0)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white"
            >
              <ProtoIcon className="w-7 h-7" animated={true} />
            </motion.div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Hi, I'm Proto 👋
            </h1>
            <p className="text-sm text-text-secondary">
              Grow with your business to grow your business
            </p>
          </div>
        </motion.div>

        {/* Document Status Banner */}
        {!hasDocuments ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-50 border border-indigo-200 rounded-xl p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  Let me learn about your business
                </h3>
                <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                  Upload your business documents so I can help you better. I'll analyze contracts, invoices, schedules, and more to give you personalized insights.
                </p>
                <Link
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-50 border border-indigo-200 rounded-xl p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  Working with {documentCount} document{documentCount !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-text-secondary">
                  I remember everything about your business. The more you upload, the better I can help.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Proto Chat Interface */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface border border-border rounded-2xl shadow-notion-sm overflow-hidden"
          style={{ height: "600px" }}
        >
          <ChatbotEnhanced
            onSendMessage={handleProtoMessage}
            placeholder="Ask me anything about your business, or tell me what you need help with..."
            welcomeMessage={`Hi! I'm Proto, your adaptive business assistant. I can help you with:

✓ Drafting emails and customer responses
✓ Creating staff schedules and managing availability
✓ Analyzing contracts and documents for issues
✓ Solving problems when you're short-staffed
✓ Coordinating with your team on any challenge
✓ Working autonomously on complex tasks

I remember everything we discuss about your business. What can I help you with today?`}
            agentColor="indigo"
            agentType="proto"
            enableAutonomous={true}
          />
        </motion.div>

        {/* Quick Access */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard/uploads"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary rounded-md transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload files
          </Link>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary rounded-md transition"
          >
            View my memories
          </Link>
        </div>
      </div>
    </div>
  );
}
