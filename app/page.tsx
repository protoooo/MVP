'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, Search, FileText, Shield, Zap, Check, Lock, HardDrive, Layers, X } from 'lucide-react';

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
    { icon: HardDrive, text: "Unlimited Storage Capacity" },
    { icon: Search, text: "Semantic Search Technology" },
    { icon: FileText, text: "Advanced Document Analysis" },
    { icon: Layers, text: "Multi-Document Processing" },
    { icon: Shield, text: "Enterprise-Grade Security" },
    { icon: Zap, text: "Instant Retrieval" }
  ];

  const pricing = [
    {
      name: "Personal",
      price: "$5",
      period: "/month",
      description: "For individuals",
      features: [
        "500GB storage capacity",
        "Unlimited document uploads",
        "Semantic search engine",
        "Document generation",
        "Mobile application access",
        "Email support"
      ],
      cta: "Start 14-Day Trial",
      popular: false
    },
    {
      name: "Business",
      price: "$25",
      period: "/month",
      description: "For teams",
      features: [
        "5TB storage capacity",
        "All Personal features",
        "Team workspace management",
        "Priority technical support",
        "Bulk operations",
        "Advanced analytics dashboard",
        "REST API access",
        "Custom integrations"
      ],
      cta: "Start 14-Day Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Unlimited scale",
      features: [
        "Unlimited storage capacity",
        "All Business features",
        "SSO/SAML authentication",
        "SOC 2 compliance",
        "Dedicated infrastructure",
        "24/7 technical support",
        "SLA guarantee",
        "On-premise deployment"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-white">Sign In</h2>
              <button onClick={() => setShowSignIn(false)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleSignIn} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                  placeholder="you@company.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-400">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'bg-gray-900/90 backdrop-blur-xl border-b border-gray-800' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl font-semibold text-white">
                protocolLM
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="#security" className="text-sm text-gray-400 hover:text-white transition-colors">Security</a>
              <button onClick={() => setShowSignIn(true)} className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</button>
              <Link href="/signup" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-all">
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Enterprise-Grade Document Storage with Semantic Search
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Securely store unlimited documents and retrieve them instantly using natural language semantic search technology.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/signup" className="px-8 py-4 rounded-lg bg-emerald-600 text-white text-lg font-medium hover:bg-emerald-700 transition-all">
              Start 14-Day Trial
            </Link>
            <button onClick={() => setShowSignIn(true)} className="px-8 py-4 rounded-lg border border-gray-700 text-white text-lg font-medium hover:bg-gray-900 transition-all">
              Sign In
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>14-day trial period</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Enterprise Storage Infrastructure
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Professional document management with advanced semantic search capabilities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-4 p-6 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-600/50 transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-600/10 flex items-center justify-center border border-emerald-600/20">
                  <feature.icon className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-white font-medium">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-white">End-to-End Encryption</p>
                <p className="text-xs text-gray-500">AES-256 encryption standard</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-gray-800" />
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-white">SOC 2 Compliance</p>
                <p className="text-xs text-gray-500">Enterprise security standards</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-gray-800" />
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-white">Unlimited Scale</p>
                <p className="text-xs text-gray-500">Enterprise infrastructure</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Transparent Pricing
            </h2>
            <p className="text-lg text-gray-400">
              Start with a 14-day trial. Scale as your needs grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, idx) => (
              <div 
                key={idx}
                className={`relative bg-gray-900 border rounded-lg p-8 ${
                  plan.popular 
                    ? 'border-emerald-600 shadow-lg shadow-emerald-600/20' 
                    : 'border-gray-800'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full">
                    RECOMMENDED
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-gray-500">{plan.period}</span>}
                  </div>
                </div>

                <Link 
                  href="/signup"
                  className={`w-full py-3 rounded-lg font-medium transition-all mb-6 block text-center ${
                    plan.popular
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-3 text-sm">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-400">{feature}</span>
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
        <div className="max-w-4xl mx-auto text-center bg-gray-900 border border-gray-800 rounded-lg p-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Deploy Enterprise Document Storage Today
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Secure, searchable, scalable document management for modern businesses.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-emerald-600 text-white text-lg font-medium hover:bg-emerald-700 transition-all">
            Start 14-Day Trial
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            Credit card required • Cancel anytime • No setup fees
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900/50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-semibold text-white mb-4">
                protocolLM
              </div>
              <p className="text-sm text-gray-500">
                Enterprise document storage with semantic search technology.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#security" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="mailto:support@protocollm.org" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="tel:7342164836" className="hover:text-white transition-colors">(734) 216-4836</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>© 2025 ProtocolLM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
