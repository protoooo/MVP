'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, Search, Sparkles, FileText, Image, Receipt, Shield, Users, Zap, ArrowRight, Check, Lock, TrendingUp } from 'lucide-react';

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

  const useCases = [
    {
      icon: Receipt,
      title: "Receipts & Invoices",
      description: "Find any receipt instantly. \"Show me all expenses over $500 from Q2 2023\"",
      gradient: "from-green-500/10 to-emerald-500/10",
      iconColor: "text-green-600"
    },
    {
      icon: TrendingUp,
      title: "Financial Data",
      description: "Answer specific questions. \"What were my capital gains in 2017?\"",
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-600"
    },
    {
      icon: Image,
      title: "Before/After Photos",
      description: "Perfect for contractors & property managers. \"Find before photos of the Johnson property\"",
      gradient: "from-purple-500/10 to-pink-500/10",
      iconColor: "text-purple-600"
    }
  ];

  const features = [
    { icon: Search, text: "AI-powered natural language search" },
    { icon: Sparkles, text: "Automatic tagging and categorization" },
    { icon: FileText, text: "OCR text extraction from images & PDFs" },
    { icon: Users, text: "Team workspaces with granular permissions" },
    { icon: Shield, text: "Enterprise-grade security & encryption" },
    { icon: Zap, text: "Bulk upload thousands of files at once" }
  ];

  const pricing = [
    {
      name: "Personal",
      price: "$12",
      description: "For individuals managing personal documents",
      features: [
        "1 user",
        "50GB storage",
        "AI-powered search",
        "Auto-tagging",
        "Mobile app access",
        "Email support"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Business",
      price: "$49",
      description: "For small teams and growing businesses",
      features: [
        "Up to 5 users",
        "500GB storage",
        "Everything in Personal",
        "Team workspaces",
        "Role-based permissions",
        "Audit logs",
        "Priority support",
        "Bulk operations"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with compliance needs",
      features: [
        "Unlimited users",
        "Unlimited storage",
        "Everything in Business",
        "SSO/SAML",
        "SOC 2 compliance",
        "Custom AI models",
        "Dedicated support",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-surface/80 backdrop-blur-xl border-b border-border shadow-dark' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-600 flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-text-primary">BizMemory</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-text-secondary hover:text-brand transition-colors">Features</a>
              <a href="#use-cases" className="text-sm text-text-secondary hover:text-brand transition-colors">Use Cases</a>
              <a href="#pricing" className="text-sm text-text-secondary hover:text-brand transition-colors">Pricing</a>
              <Link href="/login" className="text-sm text-text-secondary hover:text-brand transition-colors">Sign In</Link>
              <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Document Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-6 leading-tight">
            Stop Searching.<br />
            <span className="bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent">
              Start Asking.
            </span>
          </h1>
          
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed">
            The intelligent file storage that understands your business documents. 
            Find anything with natural language—no folders, no tags, no hassle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup" className="btn-primary px-8 py-4 text-lg group">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="btn-secondary px-8 py-4 text-lg">
              Watch Demo
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-text-tertiary">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-brand" />
              <span>14-day free trial</span>
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

      {/* Use Cases Section */}
      <section id="use-cases" className="py-20 px-6 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Built for How You Actually Work
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Whether you're managing finances, tracking projects, or organizing client work—
              BizMemory finds what you need, when you need it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, idx) => (
              <div 
                key={idx}
                className="group relative bg-surface border border-border rounded-2xl p-8 hover:border-brand/50 transition-all duration-300 hover:shadow-dark-hover"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-surface-elevated flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <useCase.icon className={`w-7 h-7 ${useCase.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-3">
                    {useCase.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Everything You Need to Stay Organized
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Powerful AI meets enterprise security. Built for teams that need to move fast without compromising on compliance.
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

      {/* Security Badge */}
      <section className="py-12 px-6 bg-surface/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-brand" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Enterprise Security</p>
                <p className="text-xs text-text-tertiary">Encryption at rest & in transit</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-brand" />
              <div>
                <p className="text-sm font-semibold text-text-primary">SOC 2 Type II</p>
                <p className="text-xs text-text-tertiary">Compliance ready</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-brand" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Daily Backups</p>
                <p className="text-xs text-text-tertiary">99.9% uptime SLA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Pricing That Scales With You
            </h2>
            <p className="text-lg text-text-secondary">
              Start free, upgrade when you're ready. No hidden fees.
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
                    {plan.price !== "Custom" && <span className="text-text-tertiary">/month</span>}
                  </div>
                </div>

                <button className={`w-full py-3 rounded-lg font-medium transition-all mb-6 ${
                  plan.popular
                    ? 'bg-brand text-white hover:bg-brand-600'
                    : 'bg-surface-elevated text-text-primary hover:bg-surface-muted border border-border'
                }`}>
                  {plan.cta}
                </button>

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

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border border-brand/20 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Ready to Find Anything in Seconds?
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            Join hundreds of businesses saving hours every week with AI-powered document search.
          </p>
          <Link href="/signup" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-text-tertiary mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-6 h-6 text-brand" />
                <span className="font-bold text-text-primary">BizMemory</span>
              </div>
              <p className="text-sm text-text-tertiary">
                AI-powered document intelligence for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#features" className="hover:text-brand transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-brand transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-brand transition-colors">About</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-brand transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-text-tertiary">
            <p>© 2025 BizMemory. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
