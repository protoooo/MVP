"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Users, Package, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
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
    }
  };

  return (
    <div 
      className="min-h-screen bg-background"
      style={{
        backgroundImage: 'url(/images/landing-background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: '#ffffff' // Fallback if image doesn't load
      }}
    >
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-16">

        {/* Headline */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-semibold text-text-primary mb-6 leading-tight">
            Business Automation for Small Teams
          </h2>
          <p className="text-xl text-text-secondary leading-relaxed">
            A lightweight, powerful platform designed specifically for small businesses. 
            Get AI-powered agents that actually do work, not just chat.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button
            onClick={() => router.push("/signup")}
            className="group px-6 py-2.5 bg-text-primary text-white rounded-full text-sm font-medium 
              hover:bg-text-secondary transition shadow-soft hover:shadow-soft-md
              flex items-center justify-center gap-2"
          >
            Get Started - $50/month
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 bg-background-secondary text-text-primary rounded-full text-sm font-medium 
              hover:bg-background-tertiary transition border border-border shadow-soft"
          >
            Sign In
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-surface rounded-2xl p-6 border border-border shadow-soft">
            <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-sky-600" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Real Actions</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Draft emails, create invoices, schedule interviews - not just suggestions
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-6 border border-border shadow-soft">
            <div className="w-12 h-12 rounded-xl bg-lavender-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-lavender-600" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Know Your Business</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Upload your docs - agents learn your operations, policies, and data
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-6 border border-border shadow-soft">
            <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-sage-600" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Unlimited Usage</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              One simple price. No usage limits. Built for small businesses.
            </p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center">
          <p className="text-sm text-text-tertiary">
            Perfect for bakeries, bars, breweries, retail shops, and small teams everywhere
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-background-secondary border-t border-border-light py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-semibold text-text-primary mb-4">
              Five Specialized Agents
            </h3>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Each agent is trained for specific business tasks, working together to automate your operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Customer Support",
                description: "Handle inquiries, route tickets, maintain context",
                color: "sky",
              },
              {
                name: "HR Assistant",
                description: "Screen resumes, match candidates, draft emails",
                color: "lavender",
              },
              {
                name: "Inventory Manager",
                description: "Track stock, predict demand, automate reorders",
                color: "sage",
              },
              {
                name: "Financial Analyst",
                description: "Categorize expenses, forecast budgets, detect anomalies",
                color: "honey",
              },
              {
                name: "Document Reviewer",
                description: "Summarize contracts, extract clauses, assess risks",
                color: "clay",
              },
            ].map((agent, index) => (
              <div 
                key={index}
                className={`p-6 rounded-2xl border bg-surface shadow-soft
                  ${agent.color === 'sky' ? 'border-sky-200' :
                    agent.color === 'lavender' ? 'border-lavender-200' :
                    agent.color === 'sage' ? 'border-sage-200' :
                    agent.color === 'honey' ? 'border-honey-200' :
                    'border-clay-200'
                  }`}
              >
                <h4 className="font-semibold text-text-primary mb-2">{agent.name}</h4>
                <p className="text-sm text-text-secondary">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-semibold text-text-primary mb-4">
            Ready to automate your business?
          </h3>
          <p className="text-lg text-text-secondary mb-8">
            Join small businesses using our platform to save time and grow
          </p>
          <button
            onClick={() => router.push("/signup")}
            className="px-6 py-2.5 bg-text-primary text-white rounded-full text-sm font-medium 
              hover:bg-text-secondary transition shadow-soft hover:shadow-soft-md"
          >
            Get Started Today
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border-light bg-background-secondary">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-center text-sm text-text-tertiary">
            © 2024 Business Automation Platform. Built for small and medium businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}
