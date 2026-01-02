"use client";

import { useState, useRef, useEffect } from "react";
import type { Block as BlockType, BlockType as BType } from "@/lib/notion/types";
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote,
  Code,
  Image as ImageIcon,
  File,
  Video,
  Divide,
  MessageSquare,
  ChevronRight,
  GripVertical,
  Plus,
  MoreHorizontal,
  Sparkles
} from "lucide-react";
import ImageBlock from "./blocks/ImageBlock";
import ToggleBlock from "./blocks/ToggleBlock";
import AIWriterBlock from "./blocks/AIWriterBlock";

interface BlockProps {
  block: BlockType;
  onUpdate: (id: string, content: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onCreateBelow: (afterId: string) => void;
  onTypeChange: (id: string, type: BType) => void;
}

export default function Block({
  block,
  onUpdate,
  onDelete,
  onCreateBelow,
  onTypeChange
}: BlockProps) {
  const [content, setContent] = useState(block.content.text || "");
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(block.content.text || "");
  }, [block.content.text]);

  const handleContentChange = (value: string) => {
    setContent(value);
    
    // Check for slash command
    if (value.startsWith("/")) {
      setShowBlockMenu(true);
    } else {
      setShowBlockMenu(false);
    }
  };

  const handleBlur = () => {
    if (content !== block.content.text) {
      onUpdate(block.id, { ...block.content, text: content });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
      onCreateBelow(block.id);
    } else if (e.key === "Backspace" && content === "" && block.type === "text") {
      e.preventDefault();
      onDelete(block.id);
    }
  };

  const selectBlockType = (type: BType) => {
    onTypeChange(block.id, type);
    setShowBlockMenu(false);
    setContent("");
    inputRef.current?.focus();
  };

  const blockTypeOptions = [
    { type: "text" as BType, label: "Text", icon: MessageSquare },
    { type: "heading1" as BType, label: "Heading 1", icon: Heading1 },
    { type: "heading2" as BType, label: "Heading 2", icon: Heading2 },
    { type: "heading3" as BType, label: "Heading 3", icon: Heading3 },
    { type: "bullet" as BType, label: "Bulleted list", icon: List },
    { type: "number" as BType, label: "Numbered list", icon: ListOrdered },
    { type: "toggle" as BType, label: "Toggle list", icon: ChevronRight },
    { type: "quote" as BType, label: "Quote", icon: Quote },
    { type: "code" as BType, label: "Code", icon: Code },
    { type: "image" as BType, label: "Image", icon: ImageIcon },
    { type: "ai_writer" as BType, label: "AI Writer", icon: Sparkles },
    { type: "divider" as BType, label: "Divider", icon: Divide },
  ];

  const renderBlockContent = () => {
    switch (block.type) {
      case "heading1":
        return (
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Heading 1"
            className="w-full bg-transparent border-none outline-none resize-none text-3xl font-bold text-text-primary overflow-hidden"
            rows={1}
            style={{ minHeight: "2.5rem" }}
          />
        );

      case "heading2":
        return (
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Heading 2"
            className="w-full bg-transparent border-none outline-none resize-none text-2xl font-bold text-text-primary overflow-hidden"
            rows={1}
            style={{ minHeight: "2rem" }}
          />
        );

      case "heading3":
        return (
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Heading 3"
            className="w-full bg-transparent border-none outline-none resize-none text-xl font-semibold text-text-primary overflow-hidden"
            rows={1}
            style={{ minHeight: "1.75rem" }}
          />
        );

      case "bullet":
        return (
          <div className="flex gap-2">
            <span className="text-text-secondary flex-shrink-0 mt-1">•</span>
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="List item"
              className="flex-1 bg-transparent border-none outline-none resize-none text-base text-text-primary overflow-hidden"
              rows={1}
            />
          </div>
        );

      case "number":
        return (
          <div className="flex gap-2">
            <span className="text-text-secondary flex-shrink-0 mt-1">1.</span>
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="List item"
              className="flex-1 bg-transparent border-none outline-none resize-none text-base text-text-primary overflow-hidden"
              rows={1}
            />
          </div>
        );

      case "quote":
        return (
          <div className="border-l-4 border-text-tertiary pl-4">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Quote"
              className="w-full bg-transparent border-none outline-none resize-none text-base text-text-secondary italic overflow-hidden"
              rows={1}
            />
          </div>
        );

      case "code":
        return (
          <div className="bg-background-secondary rounded-md p-4 font-mono text-sm">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="Code"
              className="w-full bg-transparent border-none outline-none resize-none text-text-primary overflow-hidden"
              rows={3}
            />
          </div>
        );

      case "toggle":
        return (
          <ToggleBlock
            content={block.content}
            onUpdate={(newContent) => onUpdate(block.id, newContent)}
          />
        );

      case "image":
        return (
          <ImageBlock
            content={block.content as any}
            onUpdate={(newContent) => onUpdate(block.id, newContent)}
            onDelete={() => onDelete(block.id)}
          />
        );

      case "ai_writer":
        return (
          <AIWriterBlock
            content={block.content}
            onUpdate={(newContent) => onUpdate(block.id, newContent)}
          />
        );

      case "divider":
        return <hr className="border-border my-4" />;

      case "callout":
        return (
          <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4 flex gap-3">
            <span className="text-2xl flex-shrink-0">{block.content.icon || "💡"}</span>
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Callout"
              className="flex-1 bg-transparent border-none outline-none resize-none text-base text-text-primary overflow-hidden"
              rows={1}
            />
          </div>
        );

      default:
        return (
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Type '/' for commands"
            className="w-full bg-transparent border-none outline-none resize-none text-base text-text-primary overflow-hidden"
            rows={1}
          />
        );
    }
  };

  return (
    <div className="group relative py-1">
      {/* Block Actions (show on hover) */}
      <div className="absolute left-0 top-1 -ml-10 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
        <button
          className="p-1 hover:bg-background-secondary rounded"
          onClick={() => setShowMenu(!showMenu)}
        >
          <GripVertical className="w-4 h-4 text-text-tertiary" />
        </button>
        <button
          className="p-1 hover:bg-background-secondary rounded"
          onClick={() => setShowBlockMenu(!showBlockMenu)}
        >
          <Plus className="w-4 h-4 text-text-tertiary" />
        </button>
      </div>

      {/* Block Content */}
      {renderBlockContent()}

      {/* Block Type Menu */}
      {showBlockMenu && (
        <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 w-64 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-2 py-1 mb-1">
              Basic Blocks
            </div>
            {blockTypeOptions.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => selectBlockType(type)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-background-secondary text-left"
              >
                <Icon className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <span className="text-sm text-text-primary">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
