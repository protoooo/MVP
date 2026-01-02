"use client";

import { motion } from "framer-motion";
import { Brain, Loader2 } from "lucide-react";

export interface ThinkingState {
  isThinking: boolean;
  currentStep?: string;
  progress?: number; // 0-100
  estimatedTime?: string;
}

interface ThinkingIndicatorProps {
  state: ThinkingState;
}

export default function ThinkingIndicator({ state }: ThinkingIndicatorProps) {
  if (!state.isThinking) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200"
    >
      {/* Animated brain icon */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="flex-shrink-0"
      >
        <Brain className="w-5 h-5 text-indigo-600" />
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Current step message */}
        <motion.p
          key={state.currentStep || "thinking"}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-indigo-900"
        >
          {state.currentStep || "Thinking..."}
        </motion.p>

        {/* Estimated time */}
        {state.estimatedTime && (
          <p className="text-xs text-indigo-700 mt-1">
            {state.estimatedTime}
          </p>
        )}

        {/* Progress bar */}
        {state.progress !== undefined && (
          <motion.div
            className="h-1 bg-indigo-200 rounded-full mt-2 overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </div>

      {/* Pulsing dots */}
      <div className="flex items-center gap-1">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-indigo-600"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-indigo-600"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-indigo-600"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </motion.div>
  );
}
