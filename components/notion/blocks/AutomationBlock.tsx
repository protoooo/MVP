"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Copy, RefreshCw, Edit2, Loader2, AlertCircle, Check, Clock, DollarSign, Sparkles } from "lucide-react";

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
  timeSaved?: string;
  hourlyRate?: number;
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
  estimatedTime = "1 minute",
  timeSaved = "2 hours",
  hourlyRate = 50
}: AutomationBlockProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(!content.output);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasOutput = content.output && !showConfig;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

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
      setShowCelebration(true);
      
      // Auto-hide celebration after 5 seconds
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
      celebrationTimeoutRef.current = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const parseTimeSaved = (timeStr: string): number => {
    // Convert time string like "2h", "3h 45m", "25m" to hours
    const hourMatch = timeStr.match(/(\d+)\s*h/);
    const minMatch = timeStr.match(/(\d+)\s*m/);
    
    let hours = 0;
    if (hourMatch) hours += parseInt(hourMatch[1]);
    if (minMatch) hours += parseInt(minMatch[1]) / 60;
    
    return hours;
  };

  const timeValue = Math.round(parseTimeSaved(timeSaved) * hourlyRate);

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
      <div className="space-y-4">
        {/* Celebration Message */}
        {showCelebration && (
          <div className="border-2 border-green-200 bg-green-50 rounded-xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {title} created!
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">Saved {timeSaved}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <DollarSign className="w-4 h-4" />
                    <span>That's worth ${timeValue} of your time</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCelebration(false)}
                  className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Output Content */}
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
      </div>
    );
  }

  return null;
}
