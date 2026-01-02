"use client";

import { useState, useEffect } from "react";
import { Clock, FileText, CheckCircle, Calendar, Mail, Receipt, TrendingUp, Plus, Sparkles } from "lucide-react";

interface DashboardProps {
  userName?: string;
  onCreateSchedule?: () => void;
  onDraftEmail?: () => void;
  onCreateInvoice?: () => void;
  onGenerateReport?: () => void;
  onBrowseAutomations?: () => void;
}

export default function Dashboard({
  userName = "there",
  onCreateSchedule,
  onDraftEmail,
  onCreateInvoice,
  onGenerateReport,
  onBrowseAutomations,
}: DashboardProps) {
  const [timeOfDay, setTimeOfDay] = useState("morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("morning");
    else if (hour < 18) setTimeOfDay("afternoon");
    else setTimeOfDay("evening");
  }, []);

  const greeting = `Good ${timeOfDay}, ${userName} 👋`;

  // Mock data - in a real app, this would come from the database
  const stats = {
    hoursSavedThisWeek: 14.5,
    documentsGenerated: 23,
    tasksAutomated: 8,
  };

  const quickActions = [
    {
      icon: Calendar,
      label: "Create schedule",
      lastUsed: "2 days ago",
      avgTime: "5 min",
      onClick: onCreateSchedule,
    },
    {
      icon: Mail,
      label: "Draft customer email",
      lastUsed: "4 hours ago",
      avgTime: "2 min",
      onClick: onDraftEmail,
    },
    {
      icon: Receipt,
      label: "Create invoice",
      lastUsed: "Yesterday",
      avgTime: "3 min",
      onClick: onCreateInvoice,
    },
    {
      icon: FileText,
      label: "Generate report",
      lastUsed: "This morning",
      avgTime: "1 min",
      onClick: onGenerateReport,
    },
  ];

  const recentWork = [
    {
      icon: Calendar,
      title: "Week Schedule - March 15-21",
      meta: "Created 2 hours ago • Saved 3h 45m",
    },
    {
      icon: Mail,
      title: "Quote Response - Johnson Wedding",
      meta: "Created yesterday • Saved 25m",
    },
    {
      icon: Receipt,
      title: "Invoice #2847 - Smith Construction",
      meta: "Created 3 days ago • Saved 15m",
    },
  ];

  const breakdown = [
    { label: "Scheduling", value: 7.5, color: "bg-blue-500" },
    { label: "Email drafting", value: 4, color: "bg-green-500" },
    { label: "Invoicing", value: 2, color: "bg-purple-500" },
    { label: "Reports", value: 1, color: "bg-orange-500" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{greeting}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.hoursSavedThisWeek} hours</div>
                <div className="text-sm text-gray-600">saved this week</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.documentsGenerated}</div>
                <div className="text-sm text-gray-600">documents generated</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.tasksAutomated}</div>
                <div className="text-sm text-gray-600">tasks automated</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">What do you need to do today?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className="group bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg transition">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <div className="font-semibold text-gray-900 mb-1">{action.label}</div>
                <div className="text-xs text-gray-500 mb-1">Last used: {action.lastUsed}</div>
                <div className="text-xs text-indigo-600 font-medium">~{action.avgTime} average</div>
              </button>
            );
          })}

          <button
            onClick={onBrowseAutomations}
            className="group bg-white rounded-xl p-5 border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-gray-100 group-hover:bg-indigo-100 rounded-lg transition">
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
              </div>
            </div>
            <div className="font-semibold text-gray-700 group-hover:text-indigo-700 mb-1">
              Browse all automations
            </div>
            <div className="text-xs text-gray-500">250+ time-saving features</div>
          </button>
        </div>
      </div>

      {/* Recent Work */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your recent work</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {recentWork.map((work, index) => {
            const Icon = work.icon;
            return (
              <div key={index} className="p-4 hover:bg-gray-50 transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{work.title}</div>
                    <div className="text-sm text-gray-500">{work.meta}</div>
                  </div>
                  <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Summary */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">This week's impact</h2>
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-5xl font-bold mb-2">{stats.hoursSavedThisWeek}</div>
              <div className="text-lg text-indigo-100">hours saved this week</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {breakdown.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-indigo-100">{item.label}</span>
                  <span className="font-semibold">{item.value}h</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color}`}
                    style={{ width: `${(item.value / stats.hoursSavedThisWeek) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4" />
              <span>
                That's almost 2 full workdays back! You could use that time to serve 15 more customers.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
