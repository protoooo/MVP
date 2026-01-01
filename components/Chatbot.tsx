"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

interface ChatbotProps {
  onSendMessage: (message: string, history: Message[]) => Promise<string | { response: string; progressUpdates?: string[]; autonomous?: boolean }>;
  placeholder?: string;
  welcomeMessage?: string;
  agentColor?: string;
  agentType?: string;
  enableAutonomous?: boolean;
}

export default function Chatbot({ 
  onSendMessage, 
  placeholder, 
  welcomeMessage,
  agentColor = "blue",
  agentType,
  enableAutonomous = true,
}: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [welcomeMessage, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await onSendMessage(userMessage, messages);
      
      // Handle both string and object responses
      if (typeof response === 'string') {
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
      } else if (response && typeof response === 'object') {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: response.response,
          progressUpdates: response.progressUpdates,
          isAutonomous: response.autonomous,
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const colorMap: Record<string, string> = {
    blue: "bg-blue",
    purple: "bg-purple",
    green: "bg-green",
    amber: "bg-amber",
    red: "bg-red",
  };

  const assistantBgColor = colorMap[agentColor] || colorMap.blue;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-border">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-24 space-y-16">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1],
              }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${message.role === "user" ? "" : "space-y-8"}`}>
                <div
                  className={`rounded-lg px-16 py-12 ${
                    message.role === "user"
                      ? "bg-background-tertiary text-text-primary"
                      : `bg-background-secondary text-text-primary border border-border`
                  }`}
                >
                  {/* Show autonomous mode indicator */}
                  {message.isAutonomous && (
                    <div className="flex items-center gap-8 mb-8 text-xs text-purple font-medium">
                      <Zap className="w-12 h-12" />
                      <span>Autonomous Mode</span>
                    </div>
                  )}
                  
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {/* Show progress updates if available */}
                {message.progressUpdates && message.progressUpdates.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <div className="text-xs text-text-tertiary font-medium">Task Progress:</div>
                    {message.progressUpdates.map((update, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-8 text-xs text-text-secondary"
                      >
                        <div className="w-4 h-4 rounded-full bg-green-200 flex-shrink-0" />
                        <span>{update}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-background-secondary border border-border rounded-lg px-16 py-12">
              <div className="flex items-center gap-8">
                {autonomousMode && (
                  <div className="flex items-center gap-4 text-xs text-purple font-medium mr-8">
                    <Zap className="w-12 h-12 animate-pulse" />
                    <span>Thinking...</span>
                  </div>
                )}
                <div className="flex space-x-4">
                  <motion.div
                    className="w-8 h-8 rounded-full bg-text-tertiary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-8 h-8 rounded-full bg-text-tertiary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-8 h-8 rounded-full bg-text-tertiary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-16">
        {/* Autonomous mode toggle */}
        {enableAutonomous && (
          <div className="flex items-center gap-8 mb-12">
            <button
              onClick={() => setAutonomousMode(!autonomousMode)}
              className={`flex items-center gap-8 px-12 py-6 rounded-md text-xs font-medium transition-colors-smooth ${
                autonomousMode
                  ? "bg-purple text-white"
                  : "bg-background-secondary text-text-secondary hover:bg-background-tertiary"
              }`}
            >
              <Zap className="w-12 h-12" />
              <span>Autonomous Mode</span>
            </button>
            {autonomousMode && (
              <span className="text-xs text-text-tertiary">
                Agent can use tools and work independently
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-12">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || "Type a message..."}
            className="flex-1 px-16 py-12 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue focus:border-transparent bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-smooth"
            disabled={isLoading}
          />
          <motion.button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-12 bg-blue text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors-smooth"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-16 h-16" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
