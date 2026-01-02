"use client";

import { useState } from "react";
import { X, FileText, CheckSquare, Calendar, Users, Briefcase, BookOpen, Receipt, Mail, Coffee, Hammer, Laptop, UtensilsCrossed, Store, Clock } from "lucide-react";
import type { Template } from "@/lib/notion/types";

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const builtInTemplates: Omit<Template, "id" | "created_at" | "updated_at">[] = [
  // BAKERY / COFFEE SHOP TEMPLATES
  {
    name: "Daily Production Schedule",
    description: "What to bake when, based on your usual demand",
    category: "bakery",
    icon: "🥐",
    is_builtin: true,
    template_data: {
      page: { title: "Daily Production Schedule", icon: "🥐" },
      blocks: [
        { type: "heading1", content: { text: "Production Schedule" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 2 hours/day" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "schedule-generator", content: {}, position: 3 },
      ]
    }
  },
  {
    name: "Weekly Staff Schedule",
    description: "Opening, closing, and rush hour coverage",
    category: "bakery",
    icon: "📅",
    is_builtin: true,
    template_data: {
      page: { title: "Weekly Staff Schedule", icon: "📅" },
      blocks: [
        { type: "heading1", content: { text: "Staff Schedule" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 3 hours/week" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "schedule-generator", content: {}, position: 3 },
      ]
    }
  },
  {
    name: "Customer Catering Quote",
    description: "Professional quotes for catering orders",
    category: "bakery",
    icon: "💰",
    is_builtin: true,
    template_data: {
      page: { title: "Catering Quote", icon: "💰" },
      blocks: [
        { type: "heading1", content: { text: "Catering Quote" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 20 min/quote" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "invoice-builder", content: {}, position: 3 },
      ]
    }
  },

  // CONTRACTOR / TRADES TEMPLATES
  {
    name: "Project Estimate & Invoice",
    description: "Professional quotes that win jobs",
    category: "contractor",
    icon: "🔨",
    is_builtin: true,
    template_data: {
      page: { title: "Project Estimate", icon: "🔨" },
      blocks: [
        { type: "heading1", content: { text: "Project Estimate" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 45 min/estimate" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "invoice-builder", content: {}, position: 3 },
      ]
    }
  },
  {
    name: "Job Schedule & Crew Assignment",
    description: "Which crew goes where, when",
    category: "contractor",
    icon: "👷",
    is_builtin: true,
    template_data: {
      page: { title: "Job Schedule", icon: "👷" },
      blocks: [
        { type: "heading1", content: { text: "Job Schedule" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 2 hours/week" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "schedule-generator", content: {}, position: 3 },
      ]
    }
  },
  {
    name: "Customer Communication Log",
    description: "Track all customer conversations",
    category: "contractor",
    icon: "📧",
    is_builtin: true,
    template_data: {
      page: { title: "Customer Communications", icon: "📧" },
      blocks: [
        { type: "heading1", content: { text: "Customer Communications" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 1 hour/week" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "email-drafter", content: {}, position: 3 },
      ]
    }
  },

  // FREELANCER / CONSULTANT TEMPLATES
  {
    name: "Client Project Proposal",
    description: "Win more clients with professional proposals",
    category: "freelancer",
    icon: "📄",
    is_builtin: true,
    template_data: {
      page: { title: "Project Proposal", icon: "📄" },
      blocks: [
        { type: "heading1", content: { text: "Project Proposal" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 2 hours/proposal" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "heading2", content: { text: "Scope of Work" }, position: 3 },
        { type: "text", content: { text: "" }, position: 4 },
        { type: "heading2", content: { text: "Timeline" }, position: 5 },
        { type: "text", content: { text: "" }, position: 6 },
        { type: "heading2", content: { text: "Pricing" }, position: 7 },
        { type: "invoice-builder", content: {}, position: 8 },
      ]
    }
  },
  {
    name: "Monthly Invoice Batch",
    description: "Bill all your clients at once",
    category: "freelancer",
    icon: "💳",
    is_builtin: true,
    template_data: {
      page: { title: "Monthly Invoices", icon: "💳" },
      blocks: [
        { type: "heading1", content: { text: "Monthly Invoices" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 3 hours/month" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "invoice-builder", content: {}, position: 3 },
      ]
    }
  },
  {
    name: "Project Status Update",
    description: "Keep clients informed automatically",
    category: "freelancer",
    icon: "📊",
    is_builtin: true,
    template_data: {
      page: { title: "Project Update", icon: "📊" },
      blocks: [
        { type: "heading1", content: { text: "Project Status Update" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 1 hour/week" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "report-generator", content: {}, position: 3 },
      ]
    }
  },

  // RESTAURANT / BAR TEMPLATES
  {
    name: "Weekly Staff Schedule",
    description: "FOH and BOH shifts, all in one place",
    category: "restaurant",
    icon: "🍽️",
    is_builtin: true,
    template_data: {
      page: { title: "Staff Schedule", icon: "🍽️" },
      blocks: [
        { type: "heading1", content: { text: "Staff Schedule" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 4 hours/week" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "schedule-generator", content: {}, position: 3 },
      ]
    }
  },
  {
    name: "Weekend Sales Report",
    description: "How did the weekend go?",
    category: "restaurant",
    icon: "📈",
    is_builtin: true,
    template_data: {
      page: { title: "Weekend Sales Report", icon: "📈" },
      blocks: [
        { type: "heading1", content: { text: "Weekend Sales Report" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 2 hours/week" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "report-generator", content: {}, position: 3 },
      ]
    }
  },

  // RETAIL TEMPLATES
  {
    name: "Inventory Reorder List",
    description: "What to restock before you run out",
    category: "retail",
    icon: "📦",
    is_builtin: true,
    template_data: {
      page: { title: "Inventory Reorder", icon: "📦" },
      blocks: [
        { type: "heading1", content: { text: "Inventory Reorder List" }, position: 0 },
        { type: "text", content: { text: "⏱️ Time saved: 2 hours/week" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
        { type: "report-generator", content: {}, position: 3 },
      ]
    }
  },

  // GENERAL / ORIGINAL TEMPLATES
  // GENERAL / ORIGINAL TEMPLATES
  {
    name: "Meeting Notes",
    description: "Template for capturing meeting discussions and action items",
    category: "meeting",
    icon: "📝",
    is_builtin: true,
    template_data: {
      page: {
        title: "Meeting Notes",
        icon: "📝"
      },
      blocks: [
        { type: "heading2", content: { text: "Meeting Details" }, position: 0 },
        { type: "text", content: { text: "Date: " }, position: 1 },
        { type: "text", content: { text: "Attendees: " }, position: 2 },
        { type: "text", content: { text: "Agenda: " }, position: 3 },
        { type: "heading2", content: { text: "Discussion" }, position: 4 },
        { type: "text", content: { text: "" }, position: 5 },
        { type: "heading2", content: { text: "Action Items" }, position: 6 },
        { type: "bullet", content: { text: "" }, position: 7 },
      ]
    }
  },
  {
    name: "Project Tracker",
    description: "Organize and track project tasks and milestones",
    category: "project",
    icon: "🎯",
    is_builtin: true,
    template_data: {
      page: {
        title: "Project Tracker",
        icon: "🎯"
      },
      blocks: [
        { type: "heading1", content: { text: "Project Overview" }, position: 0 },
        { type: "text", content: { text: "Project Name: " }, position: 1 },
        { type: "text", content: { text: "Start Date: " }, position: 2 },
        { type: "text", content: { text: "Target Completion: " }, position: 3 },
        { type: "heading2", content: { text: "Objectives" }, position: 4 },
        { type: "bullet", content: { text: "" }, position: 5 },
        { type: "heading2", content: { text: "Key Milestones" }, position: 6 },
        { type: "bullet", content: { text: "" }, position: 7 },
      ]
    }
  },
  {
    name: "Team Wiki",
    description: "Central knowledge base for team documentation",
    category: "wiki",
    icon: "📚",
    is_builtin: true,
    template_data: {
      page: {
        title: "Team Wiki",
        icon: "📚"
      },
      blocks: [
        { type: "heading1", content: { text: "Welcome to the Team Wiki" }, position: 0 },
        { type: "text", content: { text: "This is your team's knowledge base. Add important information, processes, and resources here." }, position: 1 },
        { type: "heading2", content: { text: "Getting Started" }, position: 2 },
        { type: "bullet", content: { text: "Team overview" }, position: 3 },
        { type: "bullet", content: { text: "Onboarding guide" }, position: 4 },
        { type: "heading2", content: { text: "Processes" }, position: 5 },
        { type: "bullet", content: { text: "" }, position: 6 },
      ]
    }
  },
];

export default function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: null, label: "All Templates", icon: FileText },
    { id: "bakery", label: "Bakery / Coffee", icon: Coffee },
    { id: "contractor", label: "Contractor", icon: Hammer },
    { id: "freelancer", label: "Freelancer", icon: Laptop },
    { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
    { id: "retail", label: "Retail", icon: Store },
    { id: "general", label: "General", icon: Briefcase },
  ];

  const filteredTemplates = selectedCategory
    ? builtInTemplates.filter(t => t.category === selectedCategory)
    : builtInTemplates;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Template Gallery</h2>
              <p className="text-sm text-text-secondary mt-1">
                Start with a pre-built template to save time
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-secondary rounded-lg transition"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id || 'all'}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center gap-2
                    ${selectedCategory === cat.id 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "bg-background-secondary text-text-secondary hover:bg-background-tertiary"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => onSelect(template as Template)}
                className="group text-left p-5 border-2 border-border rounded-xl hover:border-indigo-400 
                  hover:bg-indigo-50/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{template.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary group-hover:text-indigo-700 transition">
                      {template.name}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                  {template.description}
                </p>
                {template.template_data.blocks.some(b => b.content?.text?.includes('Time saved')) && (
                  <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {template.template_data.blocks.find(b => b.content?.text?.includes('Time saved'))?.content.text}
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary">No templates found in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
