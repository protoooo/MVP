"use client";

import { useState } from "react";
import { X, FileText, CheckSquare, Calendar, Users, Briefcase, BookOpen } from "lucide-react";
import type { Template } from "@/lib/notion/types";

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const builtInTemplates: Omit<Template, "id" | "created_at" | "updated_at">[] = [
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
  {
    name: "Product Roadmap",
    description: "Plan and track product development",
    category: "roadmap",
    icon: "🗺️",
    is_builtin: true,
    template_data: {
      page: {
        title: "Product Roadmap",
        icon: "🗺️"
      },
      blocks: [
        { type: "heading1", content: { text: "Product Roadmap" }, position: 0 },
        { type: "heading2", content: { text: "Vision" }, position: 1 },
        { type: "text", content: { text: "" }, position: 2 },
        { type: "heading2", content: { text: "Q1 Goals" }, position: 3 },
        { type: "bullet", content: { text: "" }, position: 4 },
        { type: "heading2", content: { text: "Q2 Goals" }, position: 5 },
        { type: "bullet", content: { text: "" }, position: 6 },
      ]
    }
  },
  {
    name: "Employee Directory",
    description: "Keep track of team member information",
    category: "directory",
    icon: "👥",
    is_builtin: true,
    template_data: {
      page: {
        title: "Employee Directory",
        icon: "👥"
      },
      blocks: [
        { type: "heading1", content: { text: "Team Directory" }, position: 0 },
        { type: "text", content: { text: "Contact information and roles for team members" }, position: 1 },
        { type: "divider", content: {}, position: 2 },
      ]
    }
  },
  {
    name: "Weekly Schedule",
    description: "Plan your weekly tasks and appointments",
    category: "schedule",
    icon: "📅",
    is_builtin: true,
    template_data: {
      page: {
        title: "Weekly Schedule",
        icon: "📅"
      },
      blocks: [
        { type: "heading1", content: { text: "Week of [Date]" }, position: 0 },
        { type: "heading2", content: { text: "Monday" }, position: 1 },
        { type: "bullet", content: { text: "" }, position: 2 },
        { type: "heading2", content: { text: "Tuesday" }, position: 3 },
        { type: "bullet", content: { text: "" }, position: 4 },
        { type: "heading2", content: { text: "Wednesday" }, position: 5 },
        { type: "bullet", content: { text: "" }, position: 6 },
      ]
    }
  },
];

export default function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: "meeting", label: "Meetings", icon: FileText },
    { id: "project", label: "Projects", icon: CheckSquare },
    { id: "wiki", label: "Documentation", icon: BookOpen },
    { id: "roadmap", label: "Planning", icon: Calendar },
    { id: "directory", label: "Team", icon: Users },
    { id: "schedule", label: "Scheduling", icon: Calendar },
  ];

  const filteredTemplates = selectedCategory
    ? builtInTemplates.filter(t => t.category === selectedCategory)
    : builtInTemplates;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Template Gallery</h2>
            <p className="text-sm text-text-secondary mt-1">
              Start with a pre-built template
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
        <div className="px-6 py-4 border-b border-border flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap
              ${!selectedCategory 
                ? "bg-indigo-100 text-indigo-700" 
                : "bg-background-secondary text-text-secondary hover:bg-background-tertiary"
              }`}
          >
            All Templates
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center gap-2
                ${selectedCategory === cat.id 
                  ? "bg-indigo-100 text-indigo-700" 
                  : "bg-background-secondary text-text-secondary hover:bg-background-tertiary"
                }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => onSelect(template as Template)}
                className="group text-left p-4 border border-border rounded-lg hover:border-indigo-300 
                  hover:bg-indigo-50/50 transition"
              >
                <div className="text-3xl mb-3">{template.icon}</div>
                <h3 className="font-medium text-text-primary mb-1 group-hover:text-indigo-700 transition">
                  {template.name}
                </h3>
                <p className="text-sm text-text-secondary line-clamp-2">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
