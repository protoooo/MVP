'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, Search, FileText, Shield, Zap, ArrowRight, Check, Lock, TrendingUp, HardDrive, Layers, X } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: HardDrive, text: "Unlimited Storage", color: "text-blue-400" },
    { icon: Search, text: "Semantic Search", color: "text-purple-400" },
    { icon: FileText, text: "Document Analysis", color: "text-orange-400" },
    { icon: Layers, text: "Multi-Document Insights", color: "text-green-400" },
    { icon: Shield, text: "Enterprise Security", color: "text-yellow-400" },
    { icon: Zap, text: "Instant Results", color: "text-pink-400" }
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
      cta: "Start 14-Day Free Trial",
      popular: false,
      color: "blue"
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
      cta: "Start 14-Day Free Trial",
      popular: true,
      color: "purple"
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
        "Custom models",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option"
      ],
      cta: "Contact Sales",
      popular: false,
      color: "orange"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-text-primary">Sign in to your account</h2>
              <button onClick={() => setShowSignIn(false)} className="p-2 hover:bg-surface-elevated rounded-lg transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            
            <form onSubmit={handleSignIn} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white font-medium hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-text-secondary">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'bg-surface/80 backdrop-blur-xl border-b border-border shadow-dark' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold">
                <span className="text-text-primary">protocol</span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">LM</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-text-secondary hover:text-blue-400 transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-text-secondary hover:text-purple-400 transition-colors">Pricing</a>
              <a href="#security" className="text-sm text-text-secondary hover:text-orange-400 transition-colors">Security</a>
              <button onClick={() => setShowSignIn(true)} className="text-sm text-text-secondary hover:text-green-400 transition-colors">Sign In</button>
              <Link href="/signup" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white text-sm font-medium hover:shadow-lg hover:scale-105 transition-all">
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-6 leading-tight">
            Find Any Document.<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Ask Any Question.
            </span>
          </h1>
          
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed">
            Store unlimited documents. Search using natural language. Get instant answers with powerful semantic search technology.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup" className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white text-lg font-medium hover:shadow-2xl hover:scale-105 transition-all">
              Start 14-Day Free Trial
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-tertiary">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-400" />
              <span>Credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-purple-400" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Built for Speed & Scale
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Ask questions in natural language and get instant answers from thousands of documents.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-4 p-6 bg-surface border border-border rounded-xl hover:border-blue-500/50 hover:shadow-dark-hover transition-all"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-${feature.color.split('-')[1]}-500/10 to-transparent flex items-center justify-center`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div>
                  <p className="text-text-primary font-medium">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-12 px-6 bg-surface/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Enterprise Security</p>
                <p className="text-xs text-text-tertiary">End-to-end encryption</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Encrypted Storage</p>
                <p className="text-xs text-text-tertiary">AES-256 encryption</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Unlimited Scale</p>
                <p className="text-xs text-text-tertiary">Powered by Supabase</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-text-secondary">
              Start with 14 days free. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, idx) => (
              <div 
                key={idx}
                className={`relative bg-surface border rounded-2xl p-8 ${
                  plan.popular 
                    ? 'border-purple-500 shadow-dark-hover scale-105' 
                    : 'border-border hover:border-blue-500/50'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full">
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
                      ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-surface-elevated text-text-primary hover:bg-surface-muted border border-border'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-3 text-sm">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.popular ? 'text-purple-400' : 'text-blue-400'
                      }`} />
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
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-orange-500/10 border border-blue-500/20 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Stop Searching. Start Finding.
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            Ask questions in natural language and get instant answers from your documents.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white text-lg font-medium hover:shadow-2xl hover:scale-105 transition-all">
            Start 14-Day Free Trial
          </Link>
          <p className="text-sm text-text-tertiary mt-4">
            14-day free trial • Credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-bold text-text-primary mb-4">
                <span>protocol</span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">LM</span>
              </div>
              <p className="text-sm text-text-tertiary">
                Unlimited intelligent document storage and retrieval.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Unlimited Storage</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Semantic Search</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Document Generation</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">API Access</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-blue-400 transition-colors">About</a></li>
                <li><a href="mailto:support@protocollm.org" className="hover:text-purple-400 transition-colors">Contact</a></li>
                <li><a href="tel:7342164836" className="hover:text-orange-400 transition-colors">(734) 216-4836</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-purple-400 transition-colors">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-orange-400 transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-text-tertiary">
            <p>© 2025 ProtocolLM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
