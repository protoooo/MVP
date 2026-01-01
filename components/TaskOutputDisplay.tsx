"use client";

import { useState } from "react";
import { Download, FileText, Table, FileSpreadsheet, File, Check, Clock, AlertCircle, Copy, Share2, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskOutput {
  type: 'file' | 'data' | 'action' | 'text';
  title: string;
  content: any;
  downloadUrl?: string;
  fileType?: 'pdf' | 'excel' | 'word' | 'csv' | 'json';
  actionType?: string;
}

interface TaskOutputDisplayProps {
  outputs: TaskOutput[];
  onDownload?: (output: TaskOutput) => void;
}

export default function TaskOutputDisplay({ outputs, onDownload }: TaskOutputDisplayProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [shareMenuIndex, setShareMenuIndex] = useState<number | null>(null);

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      case 'excel':
      case 'csv':
        return <Table className="w-5 h-5" />;
      case 'word':
        return <FileSpreadsheet className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const handleDownload = async (output: TaskOutput, index: number) => {
    if (onDownload) {
      onDownload(output);
      return;
    }

    // Default download behavior - create and download file
    const content = typeof output.content === 'string' 
      ? output.content 
      : JSON.stringify(output.content, null, 2);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${output.title.replace(/[^a-z0-9]/gi, '_')}.${output.fileType || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (output: TaskOutput, index: number) => {
    try {
      const content = typeof output.content === 'string' 
        ? output.content 
        : JSON.stringify(output.content, null, 2);
      
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: create a text area and copy from it
      const textArea = document.createElement('textarea');
      const content = typeof output.content === 'string' 
        ? output.content 
        : JSON.stringify(output.content, null, 2);
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleShareEmail = (output: TaskOutput) => {
    const content = typeof output.content === 'string' 
      ? output.content 
      : JSON.stringify(output.content, null, 2);
    
    const subject = encodeURIComponent(output.title);
    const body = encodeURIComponent(content);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareMenuIndex(null);
  };

  if (outputs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Task Outputs</h3>
      
      <div className="space-y-2">
        {outputs.map((output, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {getFileIcon(output.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {output.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 capitalize">
                        {output.type}
                      </span>
                      {output.fileType && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 uppercase">
                            {output.fileType}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(output, index)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>

                  {output.type === 'file' && (
                    <button
                      onClick={() => handleDownload(output, index)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                  
                  <div className="relative">
                    <button
                      onClick={() => setShareMenuIndex(shareMenuIndex === index ? null : index)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                      title="Share"
                      aria-expanded={shareMenuIndex === index}
                      aria-haspopup="true"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>

                    {shareMenuIndex === index && (
                      <div 
                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                        role="menu"
                      >
                        <button
                          onClick={() => handleShareEmail(output)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                          role="menuitem"
                        >
                          <Mail className="w-4 h-4" />
                          Share via Email
                        </button>
                      </div>
                    )}
                  </div>

                  {output.type === 'data' && (
                    <button
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                    >
                      {expandedIndex === index ? 'Hide' : 'View'}
                    </button>
                  )}

                  {output.type === 'action' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Completed
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded content for data outputs */}
              <AnimatePresence>
                {expandedIndex === index && output.type === 'data' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(output.content, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Progress indicator component
interface TaskProgressProps {
  steps: Array<{
    step: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
    message: string;
  }>;
}

export function TaskProgressIndicator({ steps }: TaskProgressProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Task Progress</h4>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {getStatusIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{step.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
