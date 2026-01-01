"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Users, Package, TrendingUp, FileText, Upload, Activity, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

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
      name: "Customer Support",
      description: "Handle inquiries and support tickets",
      icon: <MessageSquare className="w-5 h-5" />,
      color: "sky",
      href: "/dashboard/customer-support",
    },
    {
      name: "HR Assistant",
      description: "Screen resumes and manage candidates",
      icon: <Users className="w-5 h-5" />,
      color: "lavender",
      href: "/dashboard/hr",
    },
    {
      name: "Inventory Manager",
      description: "Track stock and predict demand",
      icon: <Package className="w-5 h-5" />,
      color: "sage",
      href: "/dashboard/inventory",
    },
    {
      name: "Financial Analyst",
      description: "Analyze expenses and budgets",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "honey",
      href: "/dashboard/financial",
    },
    {
      name: "Document Reviewer",
      description: "Review contracts and documents",
      icon: <FileText className="w-5 h-5" />,
      color: "clay",
      href: "/dashboard/documents",
    },
  ];

  const colorMap: Record<string, string> = {
    sky: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 hover:border-sky-300",
    lavender: "bg-lavender-100 text-lavender-700 border-lavender-200 hover:bg-lavender-200 hover:border-lavender-300",
    sage: "bg-sage-100 text-sage-700 border-sage-200 hover:bg-sage-200 hover:border-sage-300",
    honey: "bg-honey-100 text-honey-700 border-honey-200 hover:bg-honey-200 hover:border-honey-300",
    clay: "bg-clay-100 text-clay-700 border-clay-200 hover:bg-clay-200 hover:border-clay-300",
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Welcome back{profile?.business_name ? `, ${profile.business_name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your business automation platform for {profile?.industry || "your business"}
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
                  Get started with your business data
                </h3>
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                  Upload your business documents to help our agents understand your operations.
                  This includes reports, manuals, procedures, and any data you'd like to analyze.
                </p>
                <Link
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-text-primary text-white rounded-full text-sm font-medium hover:bg-text-secondary transition shadow-soft"
                >
                  <Upload className="w-4 h-4" />
                  Upload Documents
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Nudges */}
        {nudges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-text-primary">Agent Suggestions</h2>
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
          <h2 className="text-base font-semibold text-text-primary mb-4">Your Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={agent.href}
                  className={`block p-5 rounded-2xl border transition shadow-soft hover:shadow-soft-md ${
                    colorMap[agent.color]
                  }`}
                >
                  <div className={`inline-flex p-3 rounded-xl mb-3 bg-white/60`}>
                    {agent.icon}
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-1.5">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-text-secondary">{agent.description}</p>
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
              <h3 className="text-sm font-medium text-text-secondary">Agent Interactions</h3>
              <Activity className="w-5 h-5 text-text-tertiary" />
            </div>
            <p className="text-2xl font-semibold text-text-primary">Unlimited</p>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary">Plan Status</h3>
              <div className="w-2 h-2 rounded-full bg-success"></div>
            </div>
            <p className="text-2xl font-semibold text-text-primary">Active</p>
            <p className="text-xs text-text-tertiary mt-1">$50/month unlimited</p>
          </div>
        </div>
      </div>
    </div>
  );
}
