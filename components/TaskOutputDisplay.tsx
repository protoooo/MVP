"use client";

import { useState } from "react";
import { Download, FileText, Table, FileSpreadsheet, File, Check, Clock, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OutputActionBar from "./OutputActionBar";
import { showToast } from "./Toast";
import { trackValueEvent, ValueEventType } from "@/lib/value-tracking";

interface TaskOutput {
  type: 'file' | 'data' | 'action' | 'text';
  title: string;
  content: any;
  downloadUrl?: string;
  fileType?: 'pdf' | 'excel' | 'word' | 'csv' | 'json';
  actionType?: string;
  agentType?: string;
  timeSavedMinutes?: number;
}

interface TaskOutputDisplayProps {
  outputs: TaskOutput[];
  onDownload?: (output: TaskOutput) => void;
  agentType?: string;
}

export default function TaskOutputDisplay({ outputs, onDownload, agentType }: TaskOutputDisplayProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [markedAsUsed, setMarkedAsUsed] = useState<Set<number>>(new Set());

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

  const handleMarkAsUsed = async (output: TaskOutput, index: number) => {
    // Track value event
    const eventType = getValueEventType(output);
    if (eventType && agentType) {
      await trackValueEvent(
        eventType,
        agentType,
        `Used output: ${output.title}`,
        output.timeSavedMinutes
      );
      
      showToast(
        `✨ Saved you ~${output.timeSavedMinutes || 15} minutes!`,
        "value",
        3000
      );
    }
    
    const newMarked = new Set(markedAsUsed);
    newMarked.add(index);
    setMarkedAsUsed(newMarked);
  };

  const getValueEventType = (output: TaskOutput): ValueEventType | null => {
    const title = output.title.toLowerCase();
    if (title.includes('email')) return 'email_drafted';
    if (title.includes('schedule')) return 'schedule_created';
    if (title.includes('report')) return 'report_generated';
    if (title.includes('resume')) return 'resume_screened';
    if (title.includes('contract')) return 'contract_summarized';
    if (title.includes('inventory')) return 'inventory_analyzed';
    if (title.includes('financial')) return 'financial_summary';
    if (title.includes('task')) return 'task_list_created';
    if (title.includes('reorder')) return 'reorder_list';
    return null;
  };

  const handleCustomDownload = (output: TaskOutput) => {
    if (onDownload) {
      onDownload(output);
    }
  };

  if (outputs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Generated Outputs</h3>
        <span className="text-xs text-gray-500">{outputs.length} {outputs.length === 1 ? 'item' : 'items'}</span>
      </div>
      
      <div className="space-y-2">
        {outputs.map((output, index) => {
          const isUsed = markedAsUsed.has(index);
          const contentStr = typeof output.content === 'string' 
            ? output.content 
            : JSON.stringify(output.content, null, 2);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-lg border ${isUsed ? 'border-green-200 bg-green-50/50' : 'border-gray-200'} overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 ${isUsed ? 'bg-green-100' : 'bg-blue-50'} rounded-lg ${isUsed ? 'text-green-600' : 'text-blue-600'}`}>
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
                        {output.timeSavedMinutes && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-green-600 font-medium">
                              Saves ~{output.timeSavedMinutes} min
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isUsed && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Used
                    </div>
                  )}
                </div>

                {/* Output Action Bar */}
                <OutputActionBar
                  content={contentStr}
                  title={output.title}
                  fileType={output.fileType}
                  onDownload={() => handleCustomDownload(output)}
                  showEmail={output.type === 'file' || output.type === 'text'}
                  showShare={true}
                />

                {/* Preview for data outputs */}
                {output.type === 'data' && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                    >
                      {expandedIndex === index ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    
                    <AnimatePresence>
                      {expandedIndex === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3"
                        >
                          <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 border border-gray-200">
                            {contentStr}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Mark as used button */}
                {!isUsed && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleMarkAsUsed(output, index)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      Mark as Used (Track Value)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
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
