'use client';

import { ExtractedAnswer } from '../types';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface AnswerCardProps {
  answer: ExtractedAnswer;
  query: string;
}

export default function AnswerCard({ answer, query }: AnswerCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle;
    return AlertTriangle;
  };

  const ConfidenceIcon = getConfidenceIcon(answer.confidence);

  return (
    <div className="bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border-2 border-brand/30 rounded-xl p-6 mb-6 shadow-dark-hover">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-brand">Answer</h3>
            <ConfidenceIcon className={`w-4 h-4 ${getConfidenceColor(answer.confidence)}`} />
          </div>
        </div>
        <div className="text-xs text-text-tertiary">
          {Math.round(answer.confidence * 100)}% confidence
        </div>
      </div>

      {/* Answer */}
      <div className="mb-4">
        <p className="text-base text-text-primary leading-relaxed">
          {answer.answer}
        </p>
      </div>

      {/* Citations */}
      {answer.citations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Sources ({answer.citations.length})
          </h4>
          <div className="space-y-2">
            {answer.citations.map((citation, idx) => (
              <div
                key={idx}
                className="bg-surface border border-border rounded-lg p-3 hover:border-brand/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-text-primary truncate flex-1">
                    {citation.filename}
                  </p>
                  <span className="text-xs text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded-md flex-shrink-0">
                    {Math.round(citation.relevance * 100)}% match
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed italic">
                  "{citation.excerpt}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Context */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-text-tertiary">
          <span className="font-medium">Your question:</span> "{query}"
        </p>
      </div>
    </div>
  );
}
