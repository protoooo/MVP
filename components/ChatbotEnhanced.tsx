"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Zap, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TaskOutputDisplay, { TaskProgressIndicator } from "./TaskOutputDisplay";

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
  agentColor = "blue",
  agentType,
  enableAutonomous = true,
}: ChatbotEnhancedProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [executingTask, setExecutingTask] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        
        // Show task is starting
        const taskMessage: Message = {
          role: "assistant",
          content: "I'll take care of that for you. Let me work on this...",
          taskProgress: [
            { step: 'init', status: 'in_progress', message: 'Analyzing request...' }
          ]
        };
        setMessages(prev => [...prev, taskMessage]);

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
        
        setExecutingTask(false);
      } else {
        // Regular chat
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
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  const colorStyle = colorStyles[agentColor as keyof typeof colorStyles] || colorStyles.blue;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Agent Chat</span>
        </div>
        
        {enableAutonomous && (
          <button
            onClick={() => setAutonomousMode(!autonomousMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              autonomousMode
                ? `${colorStyle} border`
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {autonomousMode ? "Autonomous ON" : "Autonomous OFF"}
          </button>
        )}
      </div>

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
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === "assistant" && message.isAutonomous && (
                    <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1 space-y-3">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
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

        {(isLoading || executingTask) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">
                {executingTask ? "Executing task..." : "Thinking..."}
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || "Type a message..."}
            disabled={isLoading || executingTask}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || executingTask}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        
        {autonomousMode && (
          <p className="text-xs text-gray-500 mt-2">
            Autonomous mode: I can execute tasks, generate files, and perform actions
          </p>
        )}
      </div>
    </div>
  );
}
