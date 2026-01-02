"use client";

import { useState } from "react";
import { Download, Copy, RefreshCw, Edit2, Loader2, AlertCircle, Check } from "lucide-react";

interface AutomationBlockProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: Record<string, any>;
  onUpdate: (content: Record<string, any>) => void;
  children?: React.ReactNode;
  renderConfig?: () => React.ReactNode;
  renderOutput?: () => React.ReactNode;
  onGenerate?: (inputs: Record<string, any>) => Promise<any>;
  estimatedTime?: string;
}

export default function AutomationBlock({
  title,
  description,
  icon: Icon,
  content,
  onUpdate,
  children,
  renderConfig,
  renderOutput,
  onGenerate,
  estimatedTime = "1 minute"
}: AutomationBlockProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(!content.output);

  const hasOutput = content.output && !showConfig;

  const handleGenerate = async (inputs: Record<string, any>) => {
    if (!onGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await onGenerate(inputs);
      onUpdate({
        ...content,
        output: result,
        inputs,
        generatedAt: new Date().toISOString()
      });
      setShowConfig(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (content.output) {
      navigator.clipboard.writeText(
        typeof content.output === 'string' 
          ? content.output 
          : JSON.stringify(content.output, null, 2)
      );
    }
  };

  const handleRegenerate = () => {
    if (content.inputs && onGenerate) {
      handleGenerate(content.inputs);
    }
  };

  const handleEditConfig = () => {
    setShowConfig(true);
  };

  if (error) {
    return (
      <div className="border border-border rounded-lg p-6 bg-background">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mb-3" />
          <h3 className="text-base font-medium text-text-primary mb-1">
            Couldn't generate {title.toLowerCase()}
          </h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md">
            {error}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null);
                setShowConfig(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => setShowConfig(true)}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background-secondary transition-colors"
            >
              Edit Configuration
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showConfig && !hasOutput) {
    return (
      <div className="border border-border rounded-lg p-6 bg-background hover:border-indigo-200 transition-colors">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Icon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary mb-1">
              {title}
            </h3>
            <p className="text-sm text-text-secondary">
              {description}
            </p>
            {estimatedTime && (
              <p className="text-xs text-text-tertiary mt-1">
                Estimated time: {estimatedTime}
              </p>
            )}
          </div>
        </div>

        {isGenerating ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-secondary">
                Generating {title.toLowerCase()}...
              </p>
            </div>
          </div>
        ) : (
          <>
            {renderConfig ? renderConfig() : children}
          </>
        )}
      </div>
    );
  }

  if (hasOutput) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="bg-background-secondary border-b border-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Icon className="w-4 h-4" />
            <span>{title}</span>
            {content.generatedAt && (
              <span className="text-xs text-text-tertiary">
                • Generated {new Date(content.generatedAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-background rounded text-text-tertiary hover:text-text-primary transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleRegenerate}
              className="p-1.5 hover:bg-background rounded text-text-tertiary hover:text-text-primary transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleEditConfig}
              className="p-1.5 hover:bg-background rounded text-text-tertiary hover:text-text-primary transition-colors"
              title="Edit configuration"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Output Content */}
        <div className="p-6">
          {renderOutput ? renderOutput() : (
            <div className="prose prose-sm max-w-none">
              {typeof content.output === 'string' ? (
                <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary">
                  {content.output}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-text-primary">
                  {JSON.stringify(content.output, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
