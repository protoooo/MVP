'use client';

import Link from 'next/link';
import { Shield, Lock, Database, Eye, Server, Key, CloudCog, CheckCircle } from 'lucide-react';

export default function SecurityPage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Your documents are protected with industry-standard encryption."
    },
    {
      icon: Shield,
      title: "Cloudflare Turnstile",
      description: "Bot protection on all forms using Cloudflare Turnstile, preventing automated attacks and ensuring only legitimate users access the platform."
    },
    {
      icon: Key,
      title: "Secure Authentication",
      description: "JWT-based authentication with bcrypt password hashing (cost factor 10). Passwords are never stored in plain text."
    },
    {
      icon: Database,
      title: "Supabase Infrastructure",
      description: "Built on Supabase's enterprise-grade infrastructure with automatic backups, point-in-time recovery, and 99.9% uptime SLA."
    },
    {
      icon: Server,
      title: "Isolated Storage",
      description: "Each user's files are stored in isolated buckets with access controls. No user can access another user's documents."
    },
    {
      icon: Eye,
      title: "Privacy by Design",
      description: "We don't sell your data. Your documents are yours. We use AI processing only to improve search and never train models on your data."
    }
  ];

  const technicalSecurity = [
    {
      title: "Network Security",
      items: [
        "TLS 1.3 encryption for all connections",
        "HSTS (HTTP Strict Transport Security) enabled",
        "CSP (Content Security Policy) headers",
        "Rate limiting on all API endpoints",
        "DDoS protection via Cloudflare"
      ]
    },
    {
      title: "Application Security",
      items: [
        "Input validation and sanitization",
        "SQL injection prevention with parameterized queries",
        "XSS (Cross-Site Scripting) protection",
        "CSRF (Cross-Site Request Forgery) tokens",
        "Secure session management"
      ]
    },
    {
      title: "Data Security",
      items: [
        "AES-256 encryption at rest",
        "Encrypted database connections",
        "Automatic encrypted backups",
        "Secure file deletion with no recovery",
        "Data isolation per user/organization"
      ]
    },
    {
      title: "Access Control",
      items: [
        "JWT token-based authentication",
        "Role-based access control (RBAC)",
        "Multi-factor authentication (coming soon)",
        "SSO/SAML support (Enterprise)",
        "Audit logs for compliance"
      ]
    }
  ];

  const compliance = [
    {
      name: "SOC 2 Type II",
      status: "In Progress",
      description: "Working towards SOC 2 Type II certification for enterprise customers"
    },
    {
      name: "GDPR Compliant",
      status: "Compliant",
      description: "Full compliance with GDPR data protection regulations"
    },
    {
      name: "CCPA Compliant",
      status: "Compliant",
      description: "California Consumer Privacy Act compliance"
    },
    {
      name: "ISO 27001",
      status: "Planned",
      description: "ISO 27001 certification planned for 2025"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-text-primary">
              protocol<span className="text-brand">LM</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-text-secondary hover:text-brand transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="btn-primary text-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-brand/10 mb-6">
            <Shield className="w-8 h-8 text-brand" />
          </div>
          <h1 className="text-5xl font-bold text-text-primary mb-6">
            Enterprise-Grade Security
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Your documents are protected with military-grade encryption and industry-leading security practices.
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-12 px-6 bg-surface/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-12 text-center">
            Security Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature, idx) => (
              <div key={idx} className="bg-surface border border-border rounded-xl p-6 hover:border-brand/50 transition-all">
                <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-brand" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Security */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-12 text-center">
            Technical Security Measures
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {technicalSecurity.map((section, idx) => (
              <div key={idx} className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                      <span className="text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-12 px-6 bg-surface/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-12 text-center">
            Compliance & Certifications
          </h2>
          <div className="space-y-4">
            {compliance.map((item, idx) => (
              <div key={idx} className="bg-surface border border-border rounded-xl p-6 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    {item.name}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {item.description}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.status === 'Compliant' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : item.status === 'In Progress'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-8 text-center">
            Infrastructure & Monitoring
          </h2>
          <div className="bg-surface border border-border rounded-xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <CloudCog className="w-5 h-5 text-brand" />
                  Powered by Industry Leaders
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  ProtocolLM is built on Supabase's enterprise infrastructure, providing automatic backups,
                  99.9% uptime SLA, and scalability to handle millions of documents. All data is stored in
                  secure data centers with physical security, redundancy, and disaster recovery.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand" />
                  Database Security
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  PostgreSQL with pgvector extension hosted on Supabase. All connections are encrypted,
                  data is backed up continuously, and we maintain point-in-time recovery for up to 30 days.
                  Database credentials are rotated regularly and stored in secure vaults.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <Server className="w-5 h-5 text-brand" />
                  AI Processing
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  We use Cohere AI for document understanding and semantic search. Your documents are processed
                  securely and never used to train AI models. All AI processing happens in isolated environments
                  with no data retention by Cohere.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 px-6 bg-surface/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Security Questions?
          </h2>
          <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
            For security concerns, vulnerability reports, or enterprise security inquiries, 
            please contact our security team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="mailto:support@protocollm.org" 
              className="btn-primary"
            >
              Contact Security Team
            </a>
            <a 
              href="tel:7342164836"
              className="btn-secondary"
            >
              Call (734) 216-4836
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-text-tertiary">
          <p>© 2025 ProtocolLM by Austin Northrup. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <Link href="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-brand transition-colors">Terms of Service</Link>
            <Link href="/security" className="hover:text-brand transition-colors">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
