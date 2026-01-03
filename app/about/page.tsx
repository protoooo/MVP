'use client';

import Link from 'next/link';
import { Database, Zap, Shield, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Database className="w-6 h-6 text-brand-500" />
              <span className="text-xl font-bold text-white">protocolLM</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            About ProtocolLM
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Enterprise-grade document storage with semantic search, built for modern businesses.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-12 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Mission</h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            ProtocolLM was created to solve a fundamental problem: finding the right document at the right time. 
            Traditional search relies on exact keyword matches and manual organization. We leverage cutting-edge 
            technology to understand the meaning behind your queries, making document retrieval as natural as 
            having a conversation.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            Our platform combines unlimited storage capacity with semantic search powered by Cohere, allowing 
            businesses to store terabytes of documents and find exactly what they need in seconds—even with vague 
            or natural language queries.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">What We Stand For</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="w-12 h-12 rounded-lg bg-brand-600/10 flex items-center justify-center mb-4 border border-brand-600/20">
                <Shield className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Security First</h3>
              <p className="text-gray-400 leading-relaxed">
                Your data is encrypted at rest with AES-256 and in transit with TLS 1.3. We never train models 
                on your documents, and we never sell your data.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Speed & Scale</h3>
              <p className="text-gray-400 leading-relaxed">
                Built on Supabase's enterprise infrastructure with PostgreSQL and pgvector, our platform scales 
                effortlessly from gigabytes to terabytes without sacrificing performance.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
                <Globe className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Accessibility</h3>
              <p className="text-gray-400 leading-relaxed">
                Powerful search should be accessible to businesses of all sizes. That's why we offer flexible 
                pricing from personal use to enterprise scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-12 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Technology Stack</h2>
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Cohere</h3>
              <p className="text-gray-400">
                We use Cohere's Command-R7b for natural language understanding and Embed v4.0 for semantic embeddings, 
                providing industry-leading search accuracy.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Supabase + PostgreSQL</h3>
              <p className="text-gray-400">
                Enterprise-grade database with pgvector extension for vector similarity search, automatic backups, 
                and 99.9% uptime SLA.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Advanced OCR</h3>
              <p className="text-gray-400">
                Tesseract.js for image text extraction, pdf-parse for PDF processing, and mammoth for document parsing—all 
                working together to extract every word from your files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Get in Touch
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Have questions or want to learn more? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="mailto:support@protocollm.org" 
              className="px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-all"
            >
              Email Us
            </a>
            <a 
              href="tel:7342164836"
              className="px-6 py-3 rounded-lg border border-gray-700 text-white font-medium hover:bg-gray-800 transition-all"
            >
              Call (734) 216-4836
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>© 2025 ProtocolLM. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
