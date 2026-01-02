"use client";

import { useState } from "react";
import { FileText, Link2, X } from "lucide-react";
import type { FileBlockContent } from "@/lib/notion/types";

interface PDFBlockProps {
  content: FileBlockContent;
  onUpdate: (content: FileBlockContent) => void;
  onDelete: () => void;
}

export default function PDFBlock({ content, onUpdate, onDelete }: PDFBlockProps) {
  const [showUrlInput, setShowUrlInput] = useState(!content.url);
  const [url, setUrl] = useState(content.url || "");

  const handleUrlSubmit = () => {
    if (url) {
      onUpdate({ ...content, url, name: content.name || 'PDF Document', type: 'application/pdf' });
      setShowUrlInput(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    // TODO: Implement Supabase storage upload
    // For now, just create a blob URL
    onUpdate({
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type
    });
    setShowUrlInput(false);
  };

  if (!content.url || showUrlInput) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="text-text-tertiary">
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Embed a PDF</p>
          </div>
          
          <div className="w-full max-w-md space-y-3">
            <label className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition cursor-pointer">
              <FileText className="w-4 h-4 mr-2" />
              Upload PDF
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-surface text-text-tertiary">or</span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                placeholder="Paste PDF URL..."
                className="flex-1 px-3 py-2 bg-background-secondary rounded-md text-sm
                  border border-border focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm
                  hover:bg-indigo-700 transition"
              >
                Embed
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="border border-border rounded-lg overflow-hidden bg-background-secondary">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">
              {content.name || 'PDF Document'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              Open in new tab
            </a>
            <button
              onClick={() => setShowUrlInput(true)}
              className="p-2 hover:bg-background rounded-md"
              title="Change PDF"
            >
              <Link2 className="w-4 h-4 text-text-secondary" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-background rounded-md"
              title="Delete"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
        
        <iframe
          src={`${content.url}#toolbar=0`}
          className="w-full"
          style={{ height: '600px' }}
          title={content.name || 'PDF Document'}
        />
      </div>
    </div>
  );
}
