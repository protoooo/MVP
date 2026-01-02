"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Zap, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TaskOutputDisplay, { TaskProgressIndicator } from "./TaskOutputDisplay";
import ThinkingIndicator, { ThinkingState } from "./ThinkingIndicator";

interface TaskOutput {
  type: 'file' | 'data' | 'action' | 'text';
  title: string;
  content: any;
  downloadUrl?: string;
  fileType?: 'pdf' | 'excel' | 'word' | 'csv' | 'json';
  actionType?: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
  outputs?: TaskOutput[];
  taskProgress?: Array<{
    step: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
    message: string;
  }>;
}

interface ChatbotEnhancedProps {
  onSendMessage: (message: string, history: Message[]) => Promise<any>;
  placeholder?: string;
  welcomeMessage?: string;
  agentColor?: string;
  agentType?: string;
  enableAutonomous?: boolean;
}

export default function ChatbotEnhanced({ 
  onSendMessage, 
  placeholder, 
  welcomeMessage,
  agentColor = "indigo",
  agentType,
  enableAutonomous = true,
}: ChatbotEnhancedProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executingTask, setExecutingTask] = useState(false);
  const [thinkingState, setThinkingState] = useState<ThinkingState>({
    isThinking: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Autonomous mode is always on
  const autonomousMode = true;

  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [welcomeMessage, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detectTaskIntent = (message: string): { isTask: boolean; taskType?: string; params?: any } => {
    const lower = message.toLowerCase();
    
    // Financial tasks
    if (lower.includes('generate') && (lower.includes('report') || lower.includes('financial'))) {
      return { isTask: true, taskType: 'generate_report', params: { reportType: 'monthly' } };
    }
    if (lower.includes('analyze revenue') || lower.includes('revenue analysis')) {
      return { isTask: true, taskType: 'analyze_revenue', params: {} };
    }
    
    // HR tasks
    if (lower.includes('draft') && lower.includes('email')) {
      return { isTask: true, taskType: 'draft_email', params: { 
        recipientType: 'candidate',
        purpose: message,
        context: '',
        tone: 'formal'
      }};
    }
    if (lower.includes('scan resume') || lower.includes('analyze resume')) {
      return { isTask: true, taskType: 'scan_resume', params: { resumeText: '' } };
    }
    if (lower.includes('create policy') || lower.includes('draft policy')) {
      return { isTask: true, taskType: 'create_policy', params: {
        policyType: 'general',
        companyContext: '',
        industry: 'retail'
      }};
    }
    
    // Inventory tasks
    if (lower.includes('reorder list') || lower.includes('what to order')) {
      return { isTask: true, taskType: 'generate_reorder_list', params: {} };
    }
    if (lower.includes('find supplier') || lower.includes('find vendor')) {
      return { isTask: true, taskType: 'find_suppliers', params: { productType: 'general' } };
    }
    
    // Document tasks
    if (lower.includes('extract vendor') || lower.includes('find vendor')) {
      return { isTask: true, taskType: 'extract_vendors', params: { documentText: '' } };
    }
    if (lower.includes('summarize contract') || lower.includes('contract summary')) {
      return { isTask: true, taskType: 'summarize_contract', params: { documentText: '' } };
    }
    
    // Support tasks
    if (lower.includes('create template') || lower.includes('response template')) {
      return { isTask: true, taskType: 'generate_template', params: {
        issueType: 'general',
        customerContext: message
      }};
    }
    
    return { isTask: false };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Detect if this is a task request
      const taskIntent = autonomousMode ? detectTaskIntent(userMessage) : { isTask: false };

      if (taskIntent.isTask && agentType) {
        setExecutingTask(true);
        setThinkingState({
          isThinking: true,
          currentStep: "Analyzing your request...",
          progress: 10,
        });
        
        // Show task is starting
        const taskMessage: Message = {
          role: "assistant",
          content: "I'll take care of that for you. Let me work on this...",
          taskProgress: [
            { step: 'init', status: 'in_progress', message: 'Analyzing request...' }
          ]
        };
        setMessages(prev => [...prev, taskMessage]);

        // Update thinking state
        setThinkingState({
          isThinking: true,
          currentStep: "Executing task...",
          progress: 30,
        });

        // Execute task via API
        const taskResponse = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType,
            taskType: taskIntent.taskType,
            params: taskIntent.params,
            taskId: Date.now().toString(),
          }),
        });

        const taskData = await taskResponse.json();

        setThinkingState({
          isThinking: true,
          currentStep: "Finalizing results...",
          progress: 90,
        });

        if (taskData.success && taskData.outputs) {
          // Update message with outputs
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: "Task completed! Here are the results:",
              outputs: taskData.outputs,
              taskProgress: [
                { step: 'complete', status: 'completed', message: 'Task completed successfully!' }
              ]
            };
            return updated;
          });
        } else {
          throw new Error(taskData.message || 'Task failed');
        }
        
        setThinkingState({ isThinking: false });
        setExecutingTask(false);
      } else {
        // Regular chat
        setThinkingState({
          isThinking: true,
          currentStep: "Processing your message...",
        });

        const response = await onSendMessage(userMessage, [...messages, newUserMessage]);
        
        let assistantContent = "";
        let progressUpdates: string[] = [];
        let isAutonomous = false;

        if (typeof response === "string") {
          assistantContent = response;
        } else if (response && typeof response === "object") {
          assistantContent = response.response || "";
          progressUpdates = response.progressUpdates || [];
          isAutonomous = response.autonomous || false;
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: assistantContent,
          progressUpdates,
          isAutonomous,
        };

        setMessages(prev => [...prev, assistantMessage]);
        setThinkingState({ isThinking: false });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
      setThinkingState({ isThinking: false });
    } finally {
      setIsLoading(false);
      setExecutingTask(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const colorStyles = {
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    lavender: "bg-lavender-50 text-lavender-700 border-lavender-200",
    sage: "bg-sage-50 text-sage-700 border-sage-200",
    honey: "bg-honey-50 text-honey-700 border-honey-200",
    clay: "bg-clay-50 text-clay-700 border-clay-200",
  };

  const colorStyle = colorStyles[agentColor as keyof typeof colorStyles] || colorStyles.sky;

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-background-secondary text-text-primary border border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === "assistant" && message.isAutonomous && (
                    <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1 space-y-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    
                    {message.taskProgress && message.taskProgress.length > 0 && (
                      <div className="mt-3">
                        <TaskProgressIndicator steps={message.taskProgress} />
                      </div>
                    )}
                    
                    {message.outputs && message.outputs.length > 0 && (
                      <div className="mt-3">
                        <TaskOutputDisplay outputs={message.outputs} />
                      </div>
                    )}
                    
                    {message.progressUpdates && message.progressUpdates.length > 0 && (
                      <div className="mt-2 text-xs opacity-75 space-y-1">
                        {message.progressUpdates.map((update, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span>•</span>
                            <span>{update}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking Indicator */}
        {(isLoading || executingTask) && (
          <ThinkingIndicator state={thinkingState} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-background-secondary">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || "Ask me anything..."}
            disabled={isLoading || executingTask}
            className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-text-primary placeholder:text-text-tertiary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || executingTask}
            whileHover={{ scale: !input.trim() || isLoading || executingTask ? 1 : 1.02 }}
            whileTap={{ scale: !input.trim() || isLoading || executingTask ? 1 : 0.98 }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
            style={{
              boxShadow: !input.trim() || isLoading || executingTask 
                ? "none" 
                : "0 4px 14px 0 rgba(99, 102, 241, 0.4)",
            }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
