"use client";

import { useState } from "react";
import { Upload, Link2, X, Download, File as FileIcon } from "lucide-react";
import type { FileBlockContent } from "@/lib/notion/types";

interface FileBlockProps {
  content: FileBlockContent;
  onUpdate: (content: FileBlockContent) => void;
  onDelete: () => void;
}

export default function FileBlock({ content, onUpdate, onDelete }: FileBlockProps) {
  const [showUrlInput, setShowUrlInput] = useState(!content.url);
  const [url, setUrl] = useState(content.url || "");
  const [name, setName] = useState(content.name || "");

  const handleUrlSubmit = () => {
    if (url) {
      const fileName = name || url.split('/').pop() || 'Untitled file';
      onUpdate({ ...content, url, name: fileName });
      setShowUrlInput(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Implement Supabase storage upload
    // For now, just store the file name
    onUpdate({
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type
    });
    setShowUrlInput(false);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!content.url || showUrlInput) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="text-text-tertiary">
            <Upload className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Upload or embed a file</p>
          </div>
          
          <div className="w-full max-w-md space-y-3">
            <label className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Upload file
              <input
                type="file"
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
                placeholder="Paste file URL..."
                className="flex-1 px-3 py-2 bg-background-secondary rounded-md text-sm
                  border border-border focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                placeholder="File name"
                className="w-32 px-3 py-2 bg-background-secondary rounded-md text-sm
                  border border-border focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm
                  hover:bg-indigo-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="border border-border rounded-lg p-4 hover:border-indigo-500 transition">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background-secondary rounded">
            <FileIcon className="w-5 h-5 text-text-secondary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-text-primary truncate">
              {content.name}
            </div>
            {content.size && (
              <div className="text-xs text-text-tertiary">
                {formatFileSize(content.size)}
                {content.type && ` • ${content.type}`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <a
              href={content.url}
              download={content.name}
              className="p-2 hover:bg-background-secondary rounded-md"
              title="Download"
            >
              <Download className="w-4 h-4 text-text-secondary" />
            </a>
            <button
              onClick={() => setShowUrlInput(true)}
              className="p-2 hover:bg-background-secondary rounded-md"
              title="Change file"
            >
              <Link2 className="w-4 h-4 text-text-secondary" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-background-secondary rounded-md"
              title="Delete"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
