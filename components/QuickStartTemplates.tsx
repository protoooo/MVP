"use client";

import { useState } from "react";
import { Mail, FileText, Calendar, TrendingUp, Package, Users, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface QuickStartTemplate {
  id: string;
  title: string;
  description: string;
  agent: string;
  agentHref: string;
  icon: React.ReactNode;
  color: string;
  timeSaved: string;
  example: string;
  prompt: string;
}

const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: "customer-email",
    title: "Draft a Customer Email",
    description: "Handle a refund request or complaint",
    agent: "Customer Service",
    agentHref: "/dashboard/customer-support",
    icon: <Mail className="w-5 h-5" />,
    color: "sky",
    timeSaved: "10 min",
    example: "Refund request email",
    prompt: "Draft a professional email responding to a customer who wants a refund because their order arrived late. Be empathetic and offer a solution based on our return policy.",
  },
  {
    id: "employee-schedule",
    title: "Create a Weekly Schedule",
    description: "Draft staff schedules for next week",
    agent: "HR",
    agentHref: "/dashboard/hr",
    icon: <Calendar className="w-5 h-5" />,
    color: "lavender",
    timeSaved: "30 min",
    example: "Staff work schedule",
    prompt: "Create a work schedule for next week for 5 employees. We're open Monday-Saturday, 9am-6pm. Make sure everyone gets at least 2 days off and no one works more than 40 hours.",
  },
  {
    id: "financial-summary",
    title: "Summarize This Month",
    description: "Get a clear financial overview",
    agent: "Finances",
    agentHref: "/dashboard/financial",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "honey",
    timeSaved: "20 min",
    example: "Monthly summary",
    prompt: "Based on the expense reports I uploaded, give me a summary of this month's spending. Highlight any unusual expenses and show me where most of the money is going.",
  },
  {
    id: "reorder-list",
    title: "What to Order This Week",
    description: "Get smart reorder suggestions",
    agent: "Inventory",
    agentHref: "/dashboard/inventory",
    icon: <Package className="w-5 h-5" />,
    color: "sage",
    timeSaved: "15 min",
    example: "Reorder list",
    prompt: "Based on my current stock list and past orders, what should I reorder this week? Show me quantities and flag anything that's running low.",
  },
  {
    id: "contract-summary",
    title: "Explain This Contract",
    description: "Understand key terms and dates",
    agent: "Contracts",
    agentHref: "/dashboard/documents",
    icon: <FileText className="w-5 h-5" />,
    color: "clay",
    timeSaved: "25 min",
    example: "Contract breakdown",
    prompt: "Summarize the key terms of this contract in plain English. What are my obligations? What are the renewal dates? Are there any clauses I should be aware of?",
  },
  {
    id: "daily-priorities",
    title: "Plan My Day",
    description: "Get a prioritized to-do list",
    agent: "Today's Priorities",
    agentHref: "/dashboard/operations",
    icon: <Users className="w-5 h-5" />,
    color: "indigo",
    timeSaved: "15 min",
    example: "Daily task list",
    prompt: "Based on what I have going on, help me prioritize what I should do today. What's urgent? What can wait? What can I delegate?",
  },
];

export default function QuickStartTemplates() {
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const handleCopyPrompt = async (templateId: string, prompt: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(templateId);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      sky: "bg-sky-50 border-sky-200 text-sky-700",
      lavender: "bg-lavender-50 border-lavender-200 text-lavender-700",
      honey: "bg-honey-50 border-honey-200 text-honey-700",
      sage: "bg-sage-50 border-sage-200 text-sage-700",
      clay: "bg-clay-50 border-clay-200 text-clay-700",
      indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    };
    return colors[color] || colors.sky;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-text-primary">Quick Wins - Get Started in Minutes</h2>
      </div>
      
      <p className="text-sm text-text-secondary">
        Try these common tasks to see immediate value. Each one saves you time and gets easier with more uploads.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_START_TEMPLATES.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-surface rounded-xl border border-border p-4 hover:shadow-soft-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${getColorClasses(template.color)}`}>
                {template.icon}
              </div>
              <span className="text-xs font-medium text-text-tertiary bg-background-secondary px-2 py-1 rounded">
                Saves {template.timeSaved}
              </span>
            </div>

            <h3 className="font-semibold text-text-primary mb-1">
              {template.title}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {template.description}
            </p>

            <div className="bg-background-secondary rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-text-tertiary mb-1">
                Example: {template.example}
              </p>
              <p className="text-xs text-text-secondary italic">
                "{template.prompt.slice(0, 100)}..."
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={template.agentHref}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-text-primary text-white rounded-lg text-sm font-medium hover:bg-text-secondary transition"
              >
                Try it now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleCopyPrompt(template.id, template.prompt)}
                className="px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-background-secondary transition"
                title="Copy prompt"
              >
                {copiedPrompt === template.id ? "✓" : "Copy"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
