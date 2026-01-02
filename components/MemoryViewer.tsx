"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Trash2, Eye, EyeOff, Filter } from "lucide-react";
import { ProtoMemory } from "@/lib/proto-memory";

interface MemoryViewerProps {
  userId: string;
}

export default function MemoryViewer({ userId }: MemoryViewerProps) {
  const [memories, setMemories] = useState<ProtoMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showValues, setShowValues] = useState(true);

  useEffect(() => {
    loadMemories();
  }, [userId, filter]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("type", filter);
      }
      
      const response = await fetch(`/api/proto/memories?${params}`);
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error("Failed to load memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    
    try {
      await fetch(`/api/proto/memories/${memoryId}`, {
        method: "DELETE",
      });
      setMemories(memories.filter(m => m.id !== memoryId));
    } catch (error) {
      console.error("Failed to delete memory:", error);
    }
  };

  const memoryTypes = [
    { value: "all", label: "All Memories" },
    { value: "business_context", label: "Business Context" },
    { value: "preference", label: "Preferences" },
    { value: "relationship", label: "Relationships" },
    { value: "process", label: "Processes" },
    { value: "goal", label: "Goals" },
  ];

  const getCategoryColor = (category?: string) => {
    const colors = {
      team: "bg-lavender-100 text-lavender-700",
      customer: "bg-sky-100 text-sky-700",
      financial: "bg-honey-100 text-honey-700",
      operational: "bg-indigo-100 text-indigo-700",
    };
    return colors[category as keyof typeof colors] || "bg-background-tertiary text-text-secondary";
  };

  const getImportanceColor = (importance?: number) => {
    if (!importance) return "bg-gray-200";
    if (importance >= 8) return "bg-error";
    if (importance >= 5) return "bg-warning";
    return "bg-success";
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Brain className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Proto's Memory</h2>
            <p className="text-sm text-text-secondary">
              Everything I remember about your business
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowValues(!showValues)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-secondary rounded-lg transition"
        >
          {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showValues ? "Hide" : "Show"} Details
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        {memoryTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              filter === type.value
                ? "bg-indigo-600 text-white"
                : "bg-background-secondary text-text-secondary hover:bg-background-tertiary"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Memories List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-background-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {memories.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-text-secondary mb-2">No memories found</p>
                <p className="text-sm text-text-tertiary">
                  As we work together, I'll remember important details here
                </p>
              </motion.div>
            ) : (
              memories.map((memory, index) => (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-surface border border-border rounded-lg p-4 hover:shadow-notion-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-text-primary">
                          {memory.key}
                        </span>
                        {memory.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(memory.category)}`}>
                            {memory.category}
                          </span>
                        )}
                        <span className="text-xs text-text-tertiary">
                          {memory.memory_type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Value */}
                      {showValues && (
                        <div className="text-sm text-text-secondary mb-2 whitespace-pre-wrap">
                          {typeof memory.value === 'string' 
                            ? memory.value 
                            : JSON.stringify(memory.value, null, 2)}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-text-tertiary">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getImportanceColor(memory.importance)}`} />
                          <span>Importance: {memory.importance}/10</span>
                        </div>
                        <span>Accessed: {memory.access_count || 0} times</span>
                        {memory.last_accessed && (
                          <span>
                            Last: {new Date(memory.last_accessed).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => deleteMemory(memory.id!)}
                      className="p-2 hover:bg-error/10 rounded transition text-error"
                      title="Delete memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
