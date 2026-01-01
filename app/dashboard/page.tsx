"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Users, Package, TrendingUp, FileText, Upload, Brain, UserPlus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
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
  };

  const agents = [
    {
      name: "Today's Priorities",
      description: "See what needs your attention",
      icon: Brain,
      color: "indigo",
      href: "/dashboard/operations",
    },
    {
      name: "Customer Service",
      description: "Handle questions and reviews",
      icon: MessageSquare,
      color: "sky",
      href: "/dashboard/customer-support",
    },
    {
      name: "Staff & Hiring",
      description: "Manage onboarding and schedules",
      icon: Users,
      color: "lavender",
      href: "/dashboard/hr",
    },
    {
      name: "Stock & Orders",
      description: "Track inventory levels",
      icon: Package,
      color: "sage",
      href: "/dashboard/inventory",
    },
    {
      name: "Money & Expenses",
      description: "Review financial activity",
      icon: TrendingUp,
      color: "honey",
      href: "/dashboard/financial",
    },
    {
      name: "Contracts & Papers",
      description: "Understand documents",
      icon: FileText,
      color: "clay",
      href: "/dashboard/documents",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      indigo: "hover:bg-indigo-50/60 group-hover:text-indigo-700",
      sky: "hover:bg-sky-50/60 group-hover:text-sky-700",
      lavender: "hover:bg-lavender-50/60 group-hover:text-lavender-700",
      sage: "hover:bg-sage-50/60 group-hover:text-sage-700",
      honey: "hover:bg-honey-50/60 group-hover:text-honey-700",
      clay: "hover:bg-clay-50/60 group-hover:text-clay-700",
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            {profile?.business_name || "Your Business"}
          </h1>
          <p className="text-sm text-text-secondary">
            Choose what you need help with today
          </p>
        </div>

        {/* Quick Actions */}
        {!hasDocuments && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background-secondary rounded-lg p-5 border border-border"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded bg-text-primary/5 flex items-center justify-center">
                <Upload className="w-5 h-5 text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  Upload your first documents
                </h3>
                <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                  Add your business files to unlock personalized help from each agent
                </p>
                <Link
                  href="/dashboard/uploads"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-text-secondary transition"
                >
                  Get started
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Agents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                href={agent.href}
                className={`group block p-4 rounded-lg border border-border bg-surface transition-all hover:shadow-notion-sm ${getColorClasses(agent.color)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded bg-text-primary/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <agent.icon className="w-5 h-5 text-text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text-primary mb-0.5 tracking-tight">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard/uploads"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary rounded-md transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload files
          </Link>
          <Link
            href="/dashboard/team"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary rounded-md transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite team
          </Link>
        </div>
      </div>
    </div>
  );
}
