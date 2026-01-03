'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, Search, FileText, Shield, Zap, ArrowRight, Check, Lock, TrendingUp, HardDrive, Layers } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/home');
      return;
    }

    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router]);

  const features = [
    { icon: HardDrive, text: "Unlimited Storage" },
    { icon: Search, text: "Semantic Search" },
    { icon: FileText, text: "Document Analysis" },
    { icon: Layers, text: "Multi-Document Insights" },
    { icon: Shield, text: "Enterprise Security" },
    { icon: Zap, text: "Instant Results" }
  ];

  const pricing = [
    {
      name: "Personal",
      price: "$5",
      period: "/month",
      description: "For individuals",
      features: [
        "500GB storage",
        "Unlimited documents",
        "Semantic search",
        "Document generation",
        "Mobile app access",
        "Email support"
      ],
      cta: "Start 7-Day Free Trial",
      popular: false
    },
    {
      name: "Business",
      price: "$25",
      period: "/month",
      description: "For teams",
      features: [
        "5TB storage",
        "Everything in Personal",
        "Team workspaces",
        "Priority support",
        "Bulk operations",
        "Advanced analytics",
        "API access",
        "Custom integrations"
      ],
      cta: "Start 7-Day Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Unlimited scale",
      features: [
        "Unlimited storage",
        "Everything in Business",
        "SSO/SAML",
        "SOC 2 compliance",
        "Custom AI models",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-surface/80 backdrop-blur-xl border-b border-border shadow-dark' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold text-text-primary">
                protocol<span className="text-brand">LM</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-text-secondary hover:text-brand transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-text-secondary hover:text-brand transition-colors">Pricing</a>
              <a href="#security" className="text-sm text-text-secondary hover:text-brand transition-colors">Security</a>
              <Link href="/login" className="text-sm text-text-secondary hover:text-brand transition-colors">Sign In</Link>
              <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-6 leading-tight">
            Find Any Document.<br />
            <span className="bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent">
              Ask Any Question.
            </span>
          </h1>
          
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed">
            Store unlimited documents. Search using natural language. Get instant answers with AI-powered semantic search.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup" className="btn-primary px-8 py-4 text-lg group">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-text-tertiary">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brand" />
              <span>7-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brand" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brand" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Built for Speed and Scale
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Ask questions in natural language. Get instant answers from thousands of documents.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-4 p-6 bg-surface border border-border rounded-xl hover:border-brand/50 transition-all hover:shadow-dark"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-text-primary font-medium">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="py-12 px-6 bg-surface/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-brand" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Enterprise Security</p>
                <p className="text-xs text-text-tertiary">End-to-end encryption</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-brand" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Encrypted Storage</p>
                <p className="text-xs text-text-tertiary">AES-256 encryption</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-brand" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Unlimited Scale</p>
                <p className="text-xs text-text-tertiary">Powered by Supabase</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-text-secondary">
              Start with 7 days free. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, idx) => (
              <div 
                key={idx}
                className={`relative bg-surface border rounded-2xl p-8 ${
                  plan.popular 
                    ? 'border-brand shadow-dark-hover scale-105' 
                    : 'border-border hover:border-brand/50'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand text-white text-xs font-semibold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                  <p className="text-text-secondary text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                    {plan.period && <span className="text-text-tertiary">{plan.period}</span>}
                  </div>
                </div>

                <Link 
                  href="/signup"
                  className={`w-full py-3 rounded-lg font-medium transition-all mb-6 block text-center ${
                    plan.popular
                      ? 'bg-brand text-white hover:bg-brand-600'
                      : 'bg-surface-elevated text-text-primary hover:bg-surface-muted border border-border'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-3 text-sm">
                      <Check className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border border-brand/20 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Stop Searching. Start Finding.
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            Ask questions in natural language. Get instant answers from your documents.
          </p>
          <Link href="/signup" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-text-tertiary mt-4">
            7-day free trial • No credit card • Cancel anytime
          </p>
        </div>
      </section>

      <footer className="border-t border-border bg-surface/50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-bold text-text-primary mb-4">
                protocol<span className="text-brand">LM</span>
              </div>
              <p className="text-sm text-text-tertiary">
                Unlimited intelligent document storage and retrieval.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-brand transition-colors">Unlimited Storage</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Semantic Search</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Document Generation</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">API Access</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-brand transition-colors">About</a></li>
                <li><a href="mailto:support@protocollm.org" className="hover:text-brand transition-colors">Contact</a></li>
                <li><a href="tel:7342164836" className="hover:text-brand transition-colors">(734) 216-4836</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="/privacy" className="hover:text-brand transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-brand transition-colors">Terms of Service</a></li>
                <li><a href="/security" className="hover:text-brand transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-text-tertiary">
            <p>© 2025 ProtocolLM by Austin Northrup. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
