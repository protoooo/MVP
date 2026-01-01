"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Users, Package, TrendingUp, FileText, Upload, Activity, AlertCircle, Brain } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import TrialBanner from "@/components/TrialBanner";
import QuickStartTemplates from "@/components/QuickStartTemplates";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [nudges, setNudges] = useState<any[]>([]);
  const [hasDocuments, setHasDocuments] = useState(false);
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

    const { data: docs } = await supabase
      .from("business_documents")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);

    const { data: nudgesData } = await supabase
      .from("agent_nudges")
      .select("*")
      .eq("user_id", user.id)
      .eq("dismissed", false)
      .order("created_at", { ascending: false });

    setNudges(nudgesData || []);
  };

  const agents = [
    {
      name: "Today's Priorities",
      description: "Turn vague goals into concrete tasks. See what needs attention today.",
      icon: <Brain className="w-5 h-5" />,
      color: "indigo",
      href: "/dashboard/operations",
      capabilities: ["Draft daily task lists", "Highlight urgent items", "Suggest task delegation"]
    },
    {
      name: "Customer Service",
      description: "Resolve customer questions and complaints using your policies.",
      icon: <MessageSquare className="w-5 h-5" />,
      color: "sky",
      href: "/dashboard/customer-support",
      capabilities: ["Draft email responses", "Handle refunds", "Generate FAQs"]
    },
    {
      name: "HR",
      description: "Work with onboarding docs, schedules, and employee materials.",
      icon: <Users className="w-5 h-5" />,
      color: "lavender",
      href: "/dashboard/hr",
      capabilities: ["Draft schedules", "Screen resumes", "Create onboarding emails"]
    },
    {
      name: "Inventory",
      description: "Track stock levels and identify what to order.",
      icon: <Package className="w-5 h-5" />,
      color: "sage",
      href: "/dashboard/inventory",
      capabilities: ["Suggest reorder quantities", "Flag discrepancies", "Analyze usage trends"]
    },
    {
      name: "Finances",
      description: "Summarize expenses, revenues, and financial activity.",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "honey",
      href: "/dashboard/financial",
      capabilities: ["Generate summaries", "Flag unusual trends", "Prepare forecasts"]
    },
    {
      name: "Contracts, Agreements & Policies",
      description: "Understand contracts, policies, and formal documents.",
      icon: <FileText className="w-5 h-5" />,
      color: "clay",
      href: "/dashboard/documents",
      capabilities: ["Extract renewal dates", "Summarize key terms", "Compare documents"]
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300",
    sky: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 hover:border-sky-300",
    lavender: "bg-lavender-100 text-lavender-700 border-lavender-200 hover:bg-lavender-200 hover:border-lavender-300",
    sage: "bg-sage-100 text-sage-700 border-sage-200 hover:bg-sage-200 hover:border-sage-300",
    honey: "bg-honey-100 text-honey-700 border-honey-200 hover:bg-honey-200 hover:border-honey-300",
    clay: "bg-clay-100 text-clay-700 border-clay-200 hover:bg-clay-200 hover:border-clay-300",
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Trial Banner */}
        <TrialBanner />

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Welcome back{profile?.business_name ? `, ${profile.business_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your daily business assistant for {profile?.industry || "your business"}
          </p>
        </div>

        {/* Getting Started */}
        {!hasDocuments && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background-secondary border border-border rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-background-tertiary flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-text-primary mb-2">
                  Get started by uploading your files
                </h3>
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                  Upload your business files manually - PDFs, spreadsheets, docs, images.
                  All files go into your shared Business Knowledge Hub. The more you upload, the more helpful your agents become.
                </p>
                <Link
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-text-primary text-white rounded-full text-sm font-medium hover:bg-text-secondary transition shadow-soft"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Start Templates */}
        {!hasDocuments && <QuickStartTemplates />}

        {/* Active Nudges */}
        {nudges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-text-primary">Suggestions</h2>
            {nudges.map((nudge, index) => (
              <motion.div
                key={nudge.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-honey-50 border border-honey-200 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-honey-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{nudge.message}</p>
                </div>
                <button
                  onClick={async () => {
                    await supabase
                      .from("agent_nudges")
                      .update({ dismissed: true })
                      .eq("id", nudge.id);
                    setNudges(nudges.filter(n => n.id !== nudge.id));
                  }}
                  className="text-sm text-honey-700 hover:text-honey-800 font-medium"
                >
                  Dismiss
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Agents Grid */}
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-4">What do you need help with?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <Link
                  href={agent.href}
                  className={`block p-6 rounded-2xl border-2 transition-all shadow-soft hover:shadow-soft-lg ${
                    colorMap[agent.color]
                  }`}
                >
                  <div className={`inline-flex p-3 rounded-xl mb-4 bg-white/80`}>
                    {agent.icon}
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-2">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4 leading-relaxed">{agent.description}</p>
                  
                  {/* Actionable capabilities */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Can do for you:</p>
                    {agent.capabilities.slice(0, 3).map((capability, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className={`w-1 h-1 rounded-full mt-1.5 ${agent.color === 'indigo' ? 'bg-indigo-500' : agent.color === 'sky' ? 'bg-sky-500' : agent.color === 'lavender' ? 'bg-lavender-500' : agent.color === 'sage' ? 'bg-sage-500' : agent.color === 'honey' ? 'bg-honey-500' : 'bg-clay-500'}`} />
                        <p className="text-xs text-text-secondary">{capability}</p>
                      </div>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary">Documents Uploaded</h3>
              <FileText className="w-5 h-5 text-text-tertiary" />
            </div>
            <p className="text-2xl font-semibold text-text-primary">
              {hasDocuments ? "Active" : "0"}
            </p>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary">Team Members</h3>
              <Activity className="w-5 h-5 text-text-tertiary" />
            </div>
            <p className="text-2xl font-semibold text-text-primary">Up to 5</p>
            <p className="text-xs text-text-tertiary mt-1">$10/month per additional member</p>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary">Plan Status</h3>
              <div className="w-2 h-2 rounded-full bg-success"></div>
            </div>
            <p className="text-2xl font-semibold text-text-primary">Active</p>
            <p className="text-xs text-text-tertiary mt-1">$25/month base</p>
          </div>
        </div>
      </div>
    </div>
  );
}
