'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, Sparkles, Download, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    fileId: number;
    filename: string;
    excerpt: string;
    relevance: number;
  }>;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onClose?: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/conversation/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setConversationId(data.conversationId);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !conversationId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversation/${conversationId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestedFollowUps(data.suggestedFollowUps || []);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportConversation = async () => {
    if (!conversationId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversation/${conversationId}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${new Date().toISOString()}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting conversation:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Chat with Your Documents</h2>
            <p className="text-xs text-text-tertiary">Ask questions in natural language</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={exportConversation}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
              title="Export conversation"
            >
              <Download className="w-5 h-5 text-text-secondary" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-brand" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Start a Conversation
            </h3>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              Ask me anything about your documents. I'll search through everything and provide detailed answers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {[
                "What were my capital gains in 2017?",
                "Show me recent invoices over $1000",
                "Find property inspection reports",
                "What tax documents do I have from 2023?"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  className="text-left px-4 py-3 rounded-lg bg-surface border border-border hover:border-brand/50 text-sm text-text-primary transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-brand" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-brand text-white'
                    : 'bg-surface border border-border'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>

              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Sources ({message.sources.length})
                  </p>
                  {message.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="bg-surface border border-border rounded-lg p-3 hover:border-brand/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-text-primary truncate flex-1">
                          {source.filename}
                        </p>
                        <span className="text-xs text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded-md flex-shrink-0">
                          {Math.round(source.relevance * 100)}% match
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed italic">
                        "{source.excerpt}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-text-tertiary mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-text-primary">You</span>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-brand animate-spin" />
                <span className="text-sm text-text-secondary">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Follow-ups */}
      {suggestedFollowUps.length > 0 && !loading && (
        <div className="px-6 py-3 border-t border-border bg-surface-elevated">
          <p className="text-xs font-semibold text-text-tertiary mb-2">Suggested follow-ups:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedFollowUps.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(suggestion)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-brand/50 text-xs text-text-primary transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-surface">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your documents..."
            disabled={loading}
            rows={1}
            className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-text-primary placeholder:text-text-placeholder resize-none focus:border-brand focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-lg bg-brand text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-text-tertiary mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
