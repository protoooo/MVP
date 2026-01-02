'use client';

import { useState } from 'react';
import { FileText, Download, Share2, Loader2, ChevronDown, Sparkles, X, Calendar, BarChart3, GitCompare, Clock } from 'lucide-react';
import { reportsAPI } from '../services/api';
import { File } from '../types';

interface ReportGeneratorProps {
  files: File[];
  query: string;
  onClose: () => void;
}

interface GeneratedReport {
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
    citations: Array<{
      filename: string;
      excerpt: string;
    }>;
  }>;
  metadata: {
    generatedAt: string;
    documentCount: number;
    timeRange?: { start: string; end: string };
    queryContext: string;
  };
}

export default function ReportGenerator({ files, query, onClose }: ReportGeneratorProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set(files.map(f => f.id)));
  const [reportType, setReportType] = useState<'summary' | 'analysis' | 'comparison' | 'timeline'>('summary');
  const [customQuery, setCustomQuery] = useState(query);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<GeneratedReport | null>(null);

  const reportTypes = [
    {
      value: 'summary',
      label: 'Summary Report',
      icon: FileText,
      description: 'High-level overview with key findings',
    },
    {
      value: 'analysis',
      label: 'Deep Analysis',
      icon: BarChart3,
      description: 'Comprehensive analysis with insights',
    },
    {
      value: 'comparison',
      label: 'Comparison Report',
      icon: GitCompare,
      description: 'Side-by-side comparison of data',
    },
    {
      value: 'timeline',
      label: 'Timeline Report',
      icon: Clock,
      description: 'Chronological analysis of events',
    },
  ];

  const toggleFile = (fileId: number) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleGenerate = async () => {
    if (selectedFiles.size === 0) {
      alert('Please select at least one document');
      return;
    }

    setGenerating(true);
    try {
      const response = await reportsAPI.generateReport(
        customQuery,
        Array.from(selectedFiles),
        reportType
      );
      setReport(response.report);
    } catch (error: any) {
      console.error('Error generating report:', error);
      alert('Failed to generate report: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    let content = `${report.title}\n${'='.repeat(report.title.length)}\n\n`;
    content += `Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}\n`;
    content += `Documents Analyzed: ${report.metadata.documentCount}\n`;
    if (report.metadata.timeRange) {
      content += `Time Range: ${report.metadata.timeRange.start} to ${report.metadata.timeRange.end}\n`;
    }
    content += `\n${'-'.repeat(80)}\n\n`;
    
    content += `EXECUTIVE SUMMARY\n${'-'.repeat(80)}\n${report.summary}\n\n`;

    report.sections.forEach(section => {
      content += `${section.title.toUpperCase()}\n${'-'.repeat(80)}\n`;
      content += `${section.content}\n\n`;
      
      if (section.citations.length > 0) {
        content += `Sources:\n`;
        section.citations.forEach(citation => {
          content += `- ${citation.filename}: "${citation.excerpt}"\n`;
        });
        content += '\n';
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const shareReport = async () => {
    if (!report) return;

    const text = `${report.title}\n\n${report.summary}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: report.title,
          text: text,
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text);
      alert('Report summary copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Generate AI Report</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {report ? 'Report generated successfully' : 'Comprehensive analysis from your documents'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!report ? (
            <div className="space-y-6">
              {/* Report Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-3">
                  Report Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setReportType(type.value as any)}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                          reportType === type.value
                            ? 'border-brand bg-brand/5'
                            : 'border-border bg-surface hover:border-brand/30'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mt-0.5 ${
                            reportType === type.value ? 'text-brand' : 'text-text-tertiary'
                          }`}
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              reportType === type.value ? 'text-brand' : 'text-text-primary'
                            }`}
                          >
                            {type.label}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Query */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Report Focus (Optional)
                </label>
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="e.g., Q2 2023 financial performance, safety incidents, etc."
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary focus:border-brand focus:outline-none"
                />
                <p className="text-xs text-text-tertiary mt-1.5">
                  Customize the focus of your report or leave as default search query
                </p>
              </div>

              {/* Document Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-text-primary">
                    Select Documents ({selectedFiles.size} of {files.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-brand hover:text-brand-400 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 bg-background-tertiary rounded-lg p-3">
                  {files.map((file) => (
                    <label
                      key={file.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFiles.has(file.id)
                          ? 'bg-brand/10 border border-brand/30'
                          : 'bg-surface border border-border hover:border-brand/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFile(file.id)}
                        className="w-4 h-4 mt-0.5 rounded border-border text-brand focus:ring-brand focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {file.original_filename}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {file.category && (
                            <span className="text-xs text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded">
                              {file.category}
                            </span>
                          )}
                          <span className="text-xs text-text-tertiary">
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Display Generated Report
            <div className="space-y-6">
              {/* Report Header */}
              <div className="bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border-2 border-brand/30 rounded-xl p-6">
                <h1 className="text-2xl font-bold text-text-primary mb-3">{report.title}</h1>
                <div className="flex flex-wrap gap-3 text-xs text-text-tertiary mb-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(report.metadata.generatedAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {report.metadata.documentCount} documents
                  </span>
                  {report.metadata.timeRange && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {report.metadata.timeRange.start} to {report.metadata.timeRange.end}
                    </span>
                  )}
                </div>
                <div className="bg-surface border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Executive Summary</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{report.summary}</p>
                </div>
              </div>

              {/* Report Sections */}
              {report.sections.map((section, idx) => (
                <div key={idx} className="bg-surface border border-border rounded-xl p-5">
                  <h2 className="text-lg font-semibold text-text-primary mb-3">{section.title}</h2>
                  <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap mb-4">
                    {section.content}
                  </div>
                  {section.citations.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
                        Sources
                      </h4>
                      <div className="space-y-2">
                        {section.citations.map((citation, citIdx) => (
                          <div
                            key={citIdx}
                            className="bg-background-tertiary rounded-lg p-3 text-xs"
                          >
                            <p className="font-medium text-text-primary mb-1">
                              {citation.filename}
                            </p>
                            <p className="text-text-tertiary italic">"{citation.excerpt}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface-elevated">
          <div className="flex items-center justify-between">
            <div className="text-xs text-text-tertiary">
              {!report && (
                <span>
                  {selectedFiles.size} {selectedFiles.size === 1 ? 'document' : 'documents'} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {report ? (
                <>
                  <button onClick={shareReport} className="btn-secondary flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button onClick={downloadReport} className="btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Report
                  </button>
                  <button
                    onClick={() => setReport(null)}
                    className="btn-secondary"
                  >
                    Generate Another
                  </button>
                </>
              ) : (
                <>
                  <button onClick={onClose} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || selectedFiles.size === 0}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
