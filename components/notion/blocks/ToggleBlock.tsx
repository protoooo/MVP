"use client";

import { useState, useRef } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface ToggleBlockProps {
  content: {
    title?: string;
    children?: any[];
  };
  onUpdate: (content: any) => void;
}

export default function ToggleBlock({ content, onUpdate }: ToggleBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(content.title || "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleTitleBlur = () => {
    onUpdate({ ...content, title });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTitleBlur();
    }
  };

  return (
    <div>
      <div className="flex items-start gap-2 group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 p-1 hover:bg-background-secondary rounded mt-0.5"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        
        <textarea
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Toggle"
          className="flex-1 bg-transparent border-none outline-none resize-none text-base text-text-primary overflow-hidden"
          rows={1}
        />
      </div>
      
      {isExpanded && (
        <div className="ml-6 mt-1 pl-4 border-l-2 border-border">
          <p className="text-sm text-text-tertiary py-2">
            Content area (nested blocks would go here)
          </p>
        </div>
      )}
    </div>
  );
}
