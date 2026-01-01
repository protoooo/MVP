"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is logged in, check if onboarding is complete
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("setup_completed")
        .eq("id", user.id)
        .single();

      if (profile?.setup_completed) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } else {
      // Not logged in, show landing page
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Sparkles className="w-16 h-16 text-blue-600" />
          <h1 className="text-5xl font-semibold text-gray-900">naiborhood</h1>
        </div>

        <h2 className="text-3xl font-semibold text-gray-900">
          Business Automation for Small Teams
        </h2>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A lightweight, powerful platform designed specifically for small businesses. 
          Get AI-powered agents that actually do work, not just chat.
        </p>

        <div className="flex gap-4 justify-center pt-8">
          <button
            onClick={() => router.push("/signup")}
            className="px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started - $50/month
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-4 bg-white text-gray-700 rounded-full text-lg font-medium hover:bg-gray-50 transition-all border-2 border-gray-300"
          >
            Sign In
          </button>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Real Actions</h3>
            <p className="text-sm text-gray-600">
              Draft emails, create invoices, schedule interviews - not just suggestions
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Know Your Business</h3>
            <p className="text-sm text-gray-600">
              Upload your docs - agents learn your operations, policies, and data
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Unlimited Usage</h3>
            <p className="text-sm text-gray-600">
              One simple price. No usage limits. Built for small businesses.
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500 pt-8">
          Perfect for bakeries, bars, breweries, retail shops, and small teams everywhere
        </p>
      </div>
    </div>
  );
}

// Old agent selection code moved to /dashboard
/*
type AgentType = "customer-support" | "hr" | "inventory" | "financial" | "document" | null;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  progressUpdates?: string[];
  isAutonomous?: boolean;
}

function OldHomePage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(null);

  const handleCustomerSupportMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are a customer support specialist. You prioritize understanding the user's issue completely before offering solutions. You maintain conversation context, ask clarifying questions, and provide step-by-step guidance. You escalate complex issues appropriately and always confirm resolution.",
        agentType: "customer-support",
        useAutonomous: true,
      }),
    });

    const data = await response.json();
    return data;
  };

  const handleHRMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are an HR assistant specializing in recruitment. You analyze resumes systematically, match candidates to role requirements, and coordinate scheduling efficiently. You provide objective assessments while highlighting candidate strengths. You maintain compliance with hiring best practices.",
        agentType: "hr",
        useAutonomous: true,
      }),
    });

    const data = await response.json();
    return data;
  };

  const handleInventoryMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are an inventory management specialist. You analyze stock levels, predict demand patterns, and identify optimization opportunities. You provide clear, actionable recommendations with supporting data. You alert users to critical thresholds and supply chain risks.",
        agentType: "inventory",
        useAutonomous: true,
      }),
    });

    const data = await response.json();
    return data;
  };

  const handleFinancialMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are a financial analyst. You categorize expenses, identify spending patterns, and forecast budget trajectories. You explain financial concepts clearly and flag anomalies or risks. You provide data-backed recommendations for financial optimization.",
        agentType: "financial",
        useAutonomous: true,
      }),
    });

    const data = await response.json();
    return data;
  };

  const handleDocumentMessage = async (message: string, history: Message[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message,
        chatHistory: history.map(h => ({ role: h.role === "user" ? "USER" : "CHATBOT", message: h.content })),
        systemPrompt: "You are a document review specialist. You analyze contracts, identify key clauses, assess risks, and flag compliance issues. You prioritize findings by severity and business impact. You explain legal concepts in accessible language while maintaining precision.",
        agentType: "document",
        useAutonomous: true,
      }),
    });

    const data = await response.json();
    return data;
  };

  const agents = [
    {
      id: "customer-support" as AgentType,
      icon: <MessageSquare className="w-24 h-24" />,
      title: "Customer Support",
      description: "Empathetic, solution-focused assistant that maintains context and provides step-by-step guidance",
      color: "blue",
      handler: handleCustomerSupportMessage,
      welcome: "Hi! I'm your Customer Support specialist. How can I help you today?",
      capabilities: ["Sentiment Analysis", "Ticket Routing", "Context Retention", "Escalation Detection"],
    },
    {
      id: "hr" as AgentType,
      icon: <Users className="w-24 h-24" />,
      title: "HR Assistant",
      description: "Professional, organized assistant specializing in recruitment and candidate management",
      color: "purple",
      handler: handleHRMessage,
      welcome: "Hello! I'm your HR assistant. I can help with resume screening and candidate matching.",
      capabilities: ["Resume Parsing", "Candidate Matching", "Interview Scheduling", "Pipeline Tracking"],
    },
    {
      id: "inventory" as AgentType,
      icon: <Package className="w-24 h-24" />,
      title: "Inventory Manager",
      description: "Analytical, proactive specialist for stock management and demand forecasting",
      color: "green",
      handler: handleInventoryMessage,
      welcome: "Hi! I manage your inventory. Ask me about stock levels or predictions.",
      capabilities: ["Predictive Analysis", "Reorder Automation", "Demand Forecasting", "Anomaly Detection"],
    },
    {
      id: "financial" as AgentType,
      icon: <TrendingUp className="w-24 h-24" />,
      title: "Financial Analyst",
      description: "Precise, insightful analyst for expense categorization and budget forecasting",
      color: "amber",
      handler: handleFinancialMessage,
      welcome: "Hello! I'm your financial analyst. Let me help with expenses and budgeting.",
      capabilities: ["Expense Categorization", "Budget Analysis", "Cash Flow Forecasting", "Health Scoring"],
    },
    {
      id: "document" as AgentType,
      icon: <FileText className="w-24 h-24" />,
      title: "Document Reviewer",
      description: "Meticulous, thorough specialist for contract analysis and compliance checking",
      color: "red",
      handler: handleDocumentMessage,
      welcome: "Hi! I review documents for you. Share a document or ask me to analyze something.",
      capabilities: ["Clause Extraction", "Risk Assessment", "Compliance Checking", "Change Tracking"],
    },
  ];

  const currentAgent = agents.find(a => a.id === selectedAgent);

  const getAgentColorStyles = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-50 text-blue-600",
      purple: "bg-purple-50 text-purple-600",
      green: "bg-green-50 text-green-600",
      amber: "bg-amber-50 text-amber-600",
      red: "bg-red-50 text-red-600",
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-24 sm:px-32 lg:px-48 py-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-12">
              {selectedAgent && (
                <motion.button
                  onClick={() => setSelectedAgent(null)}
                  className="p-8 rounded-lg hover:bg-background-secondary transition-colors-smooth"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-20 h-20 text-text-secondary" />
                </motion.button>
              )}
              <div className="flex items-center gap-8">
                <Sparkles className="w-32 h-32 text-blue" />
                <h1 className="text-2xl font-semibold text-text-primary">
                  naiborhood
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-24 sm:px-32 lg:px-48 py-48">
        {!selectedAgent ? (
          <div className="space-y-48">
            {/* Welcome Section */}
            <motion.div 
              className="text-center space-y-16 py-48"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <h2 className="text-3xl font-semibold text-text-primary">
                Business Automation Platform
              </h2>
              <p className="text-lg text-text-secondary max-w-3xl mx-auto leading-relaxed">
                Streamline your business operations with our intelligent multi-agent platform.
                Select an agent below to get started.
              </p>
            </motion.div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
              {agents.map((agent, index) => (
                <AgentCard
                  key={agent.id}
                  icon={agent.icon}
                  title={agent.title}
                  description={agent.description}
                  onClick={() => setSelectedAgent(agent.id)}
                  color={agent.color}
                  capabilities={agent.capabilities}
                  index={index}
                />
              ))}
            </div>

            {/* Features Section */}
            <motion.div 
              className="mt-96 bg-white rounded-lg p-48 shadow-sm border border-border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
            >
              <h3 className="text-xl font-semibold text-text-primary mb-32">
                Platform Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-32">
                <div className="flex items-start gap-16">
                  <div className="p-12 bg-blue-50 rounded-lg">
                    <MessageSquare className="w-20 h-20 text-blue" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary mb-8">
                      Advanced NLP
                    </h4>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      State-of-the-art natural language processing for accurate understanding
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-16">
                  <div className="p-12 bg-purple-50 rounded-lg">
                    <Package className="w-20 h-20 text-purple" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary mb-8">
                      Semantic Search
                    </h4>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      Powerful embeddings and reranking for precise information retrieval
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-16">
                  <div className="p-12 bg-green-50 rounded-lg">
                    <FileText className="w-20 h-20 text-green" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary mb-8">
                      Document Analysis
                    </h4>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      Automated summarization and key information extraction
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-16">
                  <div className="p-12 bg-amber-50 rounded-lg">
                    <Sparkles className="w-20 h-20 text-amber" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary mb-8">
                      Intelligent Classification
                    </h4>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      Automatic categorization and routing of tasks and data
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div 
            className="space-y-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Agent Header */}
            <div className="bg-white rounded-lg p-32 shadow-sm border border-border">
              <div className="flex items-center gap-24">
                <div className={`p-16 rounded-full ${getAgentColorStyles(currentAgent?.color || "blue")}`}>
                  {currentAgent?.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-8">
                    {currentAgent?.title}
                  </h2>
                  <p className="text-text-secondary text-sm">
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
                agentColor={currentAgent?.color}
                agentType={selectedAgent || undefined}
                enableAutonomous={true}
              />
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white/80 backdrop-blur-sm mt-96">
        <div className="max-w-7xl mx-auto px-24 sm:px-32 lg:px-48 py-24">
          <p className="text-center text-text-tertiary text-sm">
            © 2024 naiborhood. Built for small business automation.
          </p>
        </div>
      </footer>
    </div>
  );
}
