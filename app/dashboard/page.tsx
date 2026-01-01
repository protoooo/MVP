"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Users, Package, TrendingUp, FileText, Upload, TrendingUp as ChartUp, AlertCircle } from "lucide-react";
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

    // Load profile
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

    // Check for documents
    const { data: docs } = await supabase
      .from("business_documents")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    setHasDocuments((docs?.length ?? 0) > 0);

    // Load active nudges
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
      icon: <MessageSquare className="w-6 h-6" />,
      color: "blue",
      href: "/dashboard/customer-support",
    },
    {
      name: "HR Assistant",
      description: "Screen resumes and manage candidates",
      icon: <Users className="w-6 h-6" />,
      color: "purple",
      href: "/dashboard/hr",
    },
    {
      name: "Inventory Manager",
      description: "Track stock and predict demand",
      icon: <Package className="w-6 h-6" />,
      color: "green",
      href: "/dashboard/inventory",
    },
    {
      name: "Financial Analyst",
      description: "Analyze expenses and budgets",
      icon: <TrendingUp className="w-6 h-6" />,
      color: "amber",
      href: "/dashboard/financial",
    },
    {
      name: "Document Reviewer",
      description: "Review contracts and documents",
      icon: <FileText className="w-6 h-6" />,
      color: "red",
      href: "/dashboard/documents",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400",
    purple: "bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-400",
    green: "bg-green-50 text-green-600 border-green-200 hover:border-green-400",
    amber: "bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400",
    red: "bg-red-50 text-red-600 border-red-200 hover:border-red-400",
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Welcome back{profile?.business_name ? `, ${profile.business_name}` : ""}
          </h1>
          <p className="mt-2 text-gray-600">
            Your business automation platform for {profile?.industry || "your business"}
          </p>
        </div>

        {/* Getting Started / No Documents Alert */}
        {!hasDocuments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to get to know your business
                </h3>
                <p className="text-gray-700 mb-4">
                  Upload your business documents to help our agents understand your operations.
                  This includes reports, manuals, procedures, and any data you'd like to analyze.
                </p>
                <Link
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition"
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
            <h2 className="text-lg font-semibold text-gray-900">Agent Suggestions</h2>
            {nudges.map((nudge, index) => (
              <motion.div
                key={nudge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{nudge.message}</p>
                </div>
                <button
                  onClick={async () => {
                    await supabase
                      .from("agent_nudges")
                      .update({ dismissed: true })
                      .eq("id", nudge.id);
                    setNudges(nudges.filter(n => n.id !== nudge.id));
                  }}
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium"
                >
                  Dismiss
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Agents Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={agent.href}
                  className={`block p-6 rounded-xl border-2 transition ${
                    colorMap[agent.color]
                  }`}
                >
                  <div className={`inline-flex p-3 rounded-lg mb-4 ${agent.color === 'blue' ? 'bg-blue-100' : agent.color === 'purple' ? 'bg-purple-100' : agent.color === 'green' ? 'bg-green-100' : agent.color === 'amber' ? 'bg-amber-100' : 'bg-red-100'}`}>
                    {agent.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-gray-600">{agent.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Documents Uploaded</h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {hasDocuments ? "Active" : "0"}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Agent Interactions</h3>
              <ChartUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">Unlimited</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Plan Status</h3>
              <AlertCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">Active</p>
            <p className="text-xs text-gray-500 mt-1">$50/month unlimited</p>
          </div>
        </div>
      </div>
    </div>
  );
}
