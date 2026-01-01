"use client";

import { useState } from "react";
import { MessageCircle, Users, Package, DollarSign, FileText, ArrowLeft, Sparkles } from "lucide-react";
import AgentCard from "@/components/AgentCard";
import Chatbot from "@/components/Chatbot";
import ThemeToggle from "@/components/ThemeToggle";

type AgentType = "customer-support" | "hr" | "inventory" | "financial" | "document" | null;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(null);

  const handleCustomerSupportMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
      }),
    });

    const data = await response.json();
    return data.response;
  };

  const handleHRMessage = async (message: string, history: Message[]) => {
    // For HR, we'll use the chat API with context
    const contextMessage = `You are an HR assistant. Help with resume screening, candidate matching, and interview scheduling. User query: ${message}`;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: contextMessage }),
    });

    const data = await response.json();
    return data.response;
  };

  const handleInventoryMessage = async (message: string, history: Message[]) => {
    const contextMessage = `You are an inventory management assistant. Help with stock levels, predictions, and alerts. User query: ${message}`;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: contextMessage }),
    });

    const data = await response.json();
    return data.response;
  };

  const handleFinancialMessage = async (message: string, history: Message[]) => {
    const contextMessage = `You are a financial assistant. Help with expense categorization, budgeting, and financial analysis. User query: ${message}`;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: contextMessage }),
    });

    const data = await response.json();
    return data.response;
  };

  const handleDocumentMessage = async (message: string, history: Message[]) => {
    const contextMessage = `You are a document review assistant. Help with summarization, key clause extraction, and risk analysis. User query: ${message}`;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: contextMessage }),
    });

    const data = await response.json();
    return data.response;
  };

  const agents = [
    {
      id: "customer-support" as AgentType,
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Customer Support",
      description: "Handle customer inquiries, sentiment analysis, and ticket routing",
      color: "blue",
      handler: handleCustomerSupportMessage,
      welcome: "Hi! I'm your Customer Support assistant. How can I help you today?",
    },
    {
      id: "hr" as AgentType,
      icon: <Users className="w-6 h-6" />,
      title: "HR Assistant",
      description: "Resume screening, candidate matching, and interview scheduling",
      color: "purple",
      handler: handleHRMessage,
      welcome: "Hello! I'm your HR assistant. I can help with resume screening and candidate matching.",
    },
    {
      id: "inventory" as AgentType,
      icon: <Package className="w-6 h-6" />,
      title: "Inventory Manager",
      description: "Stock predictions, alerts, and inventory optimization",
      color: "green",
      handler: handleInventoryMessage,
      welcome: "Hi! I manage your inventory. Ask me about stock levels or predictions.",
    },
    {
      id: "financial" as AgentType,
      icon: <DollarSign className="w-6 h-6" />,
      title: "Financial Analyst",
      description: "Expense categorization, budgeting, and financial insights",
      color: "yellow",
      handler: handleFinancialMessage,
      welcome: "Hello! I'm your financial analyst. Let me help with expenses and budgeting.",
    },
    {
      id: "document" as AgentType,
      icon: <FileText className="w-6 h-6" />,
      title: "Document Reviewer",
      description: "Contract summarization, clause extraction, and risk analysis",
      color: "red",
      handler: handleDocumentMessage,
      welcome: "Hi! I review documents for you. Share a document or ask me to analyze something.",
    },
  ];

  const currentAgent = agents.find(a => a.id === selectedAgent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedAgent && (
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-primary-500" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AgentHub
                </h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedAgent ? (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4 py-8">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                AI-Powered Business Automation
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Streamline your business operations with our intelligent multi-agent platform.
                Select an agent below to get started.
              </p>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  icon={agent.icon}
                  title={agent.title}
                  description={agent.description}
                  onClick={() => setSelectedAgent(agent.id)}
                  color={agent.color}
                />
              ))}
            </div>

            {/* Features Section */}
            <div className="mt-16 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Powered by Cohere AI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Advanced NLP
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      State-of-the-art natural language processing for accurate understanding
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Semantic Search
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Powerful embeddings and reranking for precise information retrieval
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Document Analysis
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Automated summarization and key information extraction
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Intelligent Classification
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Automatic categorization and routing of tasks and data
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl bg-${currentAgent?.color}-100 dark:bg-${currentAgent?.color}-900/30 text-${currentAgent?.color}-600 dark:text-${currentAgent?.color}-400`}>
                  {currentAgent?.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentAgent?.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {currentAgent?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="h-[600px]">
              <Chatbot
                onSendMessage={currentAgent?.handler || handleCustomerSupportMessage}
                placeholder={`Ask ${currentAgent?.title}...`}
                welcomeMessage={currentAgent?.welcome}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
            © 2024 AgentHub. Powered by Cohere AI. Built for small business automation.
          </p>
        </div>
      </footer>
    </div>
  );
}
