"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import type { AIBlockContent } from "@/lib/notion/types";

interface AIWriterBlockProps {
  content: AIBlockContent;
  onUpdate: (content: AIBlockContent) => void;
}

export default function AIWriterBlock({ content, onUpdate }: AIWriterBlockProps) {
  const [prompt, setPrompt] = useState(content.prompt || "");
  const [result, setResult] = useState(content.result || "");
  const [status, setStatus] = useState<'idle' | 'generating' | 'complete' | 'error'>(content.status || 'idle');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setStatus('generating');
    try {
      // Call AI API to generate content
      const response = await fetch('/api/notion/ai-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      
      if (data.error) {
        setStatus('error');
        return;
      }

      setResult(data.result);
      setStatus('complete');
      onUpdate({ prompt, result: data.result, status: 'complete' });
    } catch (error) {
      console.error('Error generating content:', error);
      setStatus('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-indigo-200 rounded-lg overflow-hidden bg-gradient-to-r from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm px-4 py-3 border-b border-indigo-200 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-medium text-indigo-900">AI Writer</span>
      </div>

      {/* Prompt Input */}
      <div className="p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What would you like me to write? Be specific..."
          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-md text-sm
            placeholder-text-tertiary focus:outline-none focus:border-indigo-500 resize-none"
          rows={3}
        />

        <button
          onClick={handleGenerate}
          disabled={status === 'generating' || !prompt.trim()}
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium
            hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2 transition"
        >
          {status === 'generating' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && status === 'complete' && (
        <div className="p-4 border-t border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-900 uppercase tracking-wider">
              Generated Content
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600
                hover:bg-white rounded transition"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-white rounded-md p-3 text-sm text-text-primary whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="p-4 border-t border-red-200 bg-red-50">
          <p className="text-sm text-red-600">
            Failed to generate content. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
