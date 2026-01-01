"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Mail, Calendar, FileSpreadsheet, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface DraftOutputProps {
  title: string;
  content: string;
  outputType: "email" | "schedule" | "task_list" | "report" | "document" | "invoice";
  onEdit?: (newContent: string) => void;
}

export default function DraftOutput({ title, content, outputType, onEdit }: DraftOutputProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInApp = () => {
    // This creates a mailto link, calendar event, or downloads file
    switch (outputType) {
      case "email":
        // Extract subject and body from content
        const lines = editedContent.split('\n');
        const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
        const subject = subjectLine ? encodeURIComponent(subjectLine.replace(/^subject:\s*/i, '')) : encodeURIComponent(title);
        const bodyStart = lines.findIndex(l => l.toLowerCase().startsWith('subject:')) + 1;
        const body = encodeURIComponent(lines.slice(bodyStart).join('\n'));
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        break;
      
      case "schedule":
        // Create a downloadable CSV for schedule
        const blob = new Blob([editedContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
      
      case "task_list":
      case "report":
      case "document":
      case "invoice":
        // Create a downloadable text/markdown file
        const textBlob = new Blob([editedContent], { type: 'text/plain' });
        const textUrl = URL.createObjectURL(textBlob);
        const textLink = document.createElement('a');
        textLink.href = textUrl;
        textLink.download = `${title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(textLink);
        textLink.click();
        document.body.removeChild(textLink);
        URL.revokeObjectURL(textUrl);
        break;
    }
  };

  const handleSave = () => {
    if (onEdit) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  const getIcon = () => {
    switch (outputType) {
      case "email":
        return <Mail className="w-5 h-5" />;
      case "schedule":
        return <Calendar className="w-5 h-5" />;
      case "task_list":
        return <FileText className="w-5 h-5" />;
      case "invoice":
        return <FileSpreadsheet className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getAppName = () => {
    switch (outputType) {
      case "email":
        return "Email Client";
      case "schedule":
        return "Spreadsheet";
      case "task_list":
        return "Notes App";
      case "invoice":
        return "Spreadsheet";
      default:
        return "App";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border-2 border-border p-6 shadow-soft-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{title}</h3>
            <p className="text-xs text-text-tertiary">Review and use this draft</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-64 p-4 rounded-lg border border-border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
          />
        ) : (
          <div className="p-4 bg-background-secondary rounded-lg border border-border">
            <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
              {editedContent}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setEditedContent(content);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-background-secondary text-text-primary rounded-lg font-medium hover:bg-background-tertiary transition text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleOpenInApp}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in {getAppName()}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-background-secondary text-text-primary rounded-lg font-medium hover:bg-background-tertiary transition text-sm border border-border"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition text-sm font-medium"
            >
              Edit
            </button>
          </>
        )}
      </div>

      {/* Helper text */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-text-tertiary">
          💡 Review this draft, make any changes, then click "Open in {getAppName()}" to finalize and send/save.
        </p>
      </div>
    </motion.div>
  );
}
