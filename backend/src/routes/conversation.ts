import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Sparkles, Loader2, ChevronDown } from 'lucide-react';

export default function ConversationMode() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your business document assistant. Ask me anything about your files - I can find specific info, compare documents, or summarize anything.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relatedDocs, setRelatedDocs] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    "What were my Q4 2023 expenses?",
    "When does my business license expire?",
    "Show me all vendor contracts",
    "What's the difference between 2023 and 2024 taxes?"
  ];

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate API call to your backend
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: "Based on your documents, I found that your Q4 2023 total expenses were $47,234. This includes:\n\n• Payroll: $28,500\n• Supplies: $12,450\n• Utilities: $6,284\n\nWould you like me to break down any specific category?",
        timestamp: new Date(),
        sources: [
          { filename: "Q4-2023-expenses.pdf", relevance: 0.95 },
          { filename: "2023-payroll-summary.xlsx", relevance: 0.87 }
        ]
      };

      setMessages(prev => [...prev, aiResponse]);
      setRelatedDocs(aiResponse.sources || []);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const askSuggestion = (question) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Document Assistant</h1>
            <p className="text-xs text-text-tertiary">Ask anything about your business files</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-brand" />
              </div>
            )}
            
            <div className={`max-w-2xl ${msg.role === 'user' ? 'order-first' : ''}`}>
              <div className={`rounded-2xl px-5 py-3 ${
                msg.role === 'user' 
                  ? 'bg-brand text-white' 
                  : 'bg-surface border border-border'
              }`}>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' ? 'text-white' : 'text-text-primary'
                }`}>
                  {msg.content}
                </p>
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-text-tertiary">Sources:</p>
                  {msg.sources.map((source, sidx) => (
                    <div key={sidx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:border-brand/30 transition-colors cursor-pointer">
                      <FileText className="w-4 h-4 text-text-tertiary" />
                      <span className="text-xs text-text-primary flex-1">{source.filename}</span>
                      <span className="text-xs text-brand font-medium">
                        {Math.round(source.relevance * 100)}% match
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-text-tertiary mt-2">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-brand">You</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div className="bg-surface border border-border rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Searching your documents...</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-secondary">Try asking:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => askSuggestion(q)}
                  className="text-left px-4 py-3 rounded-lg border border-border bg-surface hover:border-brand/50 hover:bg-surface-elevated transition-all text-sm text-text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-surface px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your documents... (Shift+Enter for new line)"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background text-text-primary placeholder:text-text-placeholder resize-none focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-text-tertiary mt-2 text-center">
            AI can make mistakes. Verify important information in source documents.
          </p>
        </div>
      </div>
    </div>
  );
}
