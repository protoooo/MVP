"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload as UploadIcon, FileText, TrendingUp, Calendar, Download } from "lucide-react";

export default function ReportsPage() {
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData);
  };

  const reports = [
    {
      name: "Weekly Agent Activity",
      description: "Summary of all agent interactions and tasks completed",
      icon: TrendingUp,
      color: "text-text-primary",
      bgColor: "bg-background-tertiary",
      available: false,
    },
    {
      name: "Financial Summary",
      description: "Expense categorization and budget analysis",
      icon: FileText,
      color: "text-honey-600",
      bgColor: "bg-honey-50",
      available: false,
    },
    {
      name: "HR Metrics",
      description: "Recruitment activity and candidate pipeline",
      icon: FileText,
      color: "text-lavender-600",
      bgColor: "bg-lavender-50",
      available: false,
    },
    {
      name: "Inventory Analysis",
      description: "Stock levels, turnover, and reorder recommendations",
      icon: FileText,
      color: "text-sage-600",
      bgColor: "bg-sage-50",
      available: false,
    },
    {
      name: "Customer Support Insights",
      description: "Ticket volume, sentiment analysis, and response times",
      icon: FileText,
      color: "text-sky-600",
      bgColor: "bg-sky-50",
      available: false,
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-background-tertiary rounded-xl border border-border">
            <UploadIcon className="w-8 h-8 text-text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Reports</h1>
            <p className="text-text-secondary mt-1">
              View and download automated reports from your agents
            </p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-background-secondary border border-border rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Calendar className="w-6 h-6 text-text-secondary mt-1" />
            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                Automated Reports Coming Soon
              </h3>
              <p className="text-sm text-text-secondary">
                Our agents are learning about your business. Soon you'll be able to schedule and download automated reports including:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-text-secondary">
                <li>• Daily sales and activity summaries</li>
                <li>• Weekly performance metrics</li>
                <li>• Monthly financial snapshots</li>
                <li>• Custom agent-specific reports</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Available Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report, index) => {
              const Icon = report.icon;
              return (
                <div
                  key={index}
                  className="bg-surface rounded-xl border border-border p-6 hover:shadow-soft-md transition"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${report.bgColor}`}>
                      <Icon className={`w-6 h-6 ${report.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary mb-1">{report.name}</h3>
                      <p className="text-sm text-text-secondary mb-4">{report.description}</p>
                      
                      {report.available ? (
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-text-primary text-white rounded-full text-sm font-medium hover:bg-text-secondary transition">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      ) : (
                        <span className="inline-block px-4 py-2 bg-background-tertiary text-text-tertiary rounded-full text-sm font-medium">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Reports */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Custom Reports</h3>
          <p className="text-sm text-text-secondary mb-4">
            Need a specific report? Ask any of your agents to generate custom analytics and they'll create downloadable reports tailored to your needs.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <a
              href="/dashboard/customer-support"
              className="px-4 py-2 bg-sky-50 text-sky-700 rounded-full text-sm font-medium hover:bg-sky-100 transition text-center border border-sky-200"
            >
              Customer Support
            </a>
            <a
              href="/dashboard/hr"
              className="px-4 py-2 bg-lavender-50 text-lavender-700 rounded-full text-sm font-medium hover:bg-lavender-100 transition text-center border border-lavender-200"
            >
              HR Assistant
            </a>
            <a
              href="/dashboard/inventory"
              className="px-4 py-2 bg-sage-50 text-sage-700 rounded-full text-sm font-medium hover:bg-sage-100 transition text-center border border-sage-200"
            >
              Inventory
            </a>
            <a
              href="/dashboard/financial"
              className="px-4 py-2 bg-honey-50 text-honey-700 rounded-full text-sm font-medium hover:bg-honey-100 transition text-center border border-honey-200"
            >
              Financial
            </a>
            <a
              href="/dashboard/documents"
              className="px-4 py-2 bg-clay-50 text-clay-700 rounded-full text-sm font-medium hover:bg-clay-100 transition text-center border border-clay-200"
            >
              Documents
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
