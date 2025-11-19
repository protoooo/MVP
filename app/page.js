'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Send, Shield, FileText, Menu, X, AlertTriangle, Camera, Trash2, Clock, Check, LogIn, CreditCard } from 'lucide-react';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Request limits per plan
const REQUEST_LIMITS = {
  trial: 50,
  pro: 500,
  enterprise: -1 // unlimited
};

// ==========================================
// 1. LANDING PAGE COMPONENT (Public View)
// ==========================================
function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Login Handler (Magic Link)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: redirectTo } 
    });
    
    setLoading(false);
    if (error) alert("Error: " + error.message);
    else setMagicLinkSent(true);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#1f2937', lineHeight: 1.5, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Login Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '400px', width: '100%', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#0f2545' }}>Welcome Back</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>Enter your email to receive a secure login link.</p>
            {magicLinkSent ? (
              <div style={{ backgroundColor: '#ecfdf5', padding: '15px', borderRadius: '8px', color: '#065f46', textAlign: 'center' }}>
                <Check size={40} style={{ display: 'block', margin: '0 auto 10px' }} />
                <strong>Check your email!</strong><br/>We sent a login link to {email}
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '15px', fontSize: '16px' }} required />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#0f2545', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>{loading ? 'Sending...' : 'Send Login Link'}</button>
              </form>
            )}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>New to Protocol?</p>
              <button onClick={() => setShowLoginModal(false)} style={{ color: '#5D4037', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Start Free Trial →</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #f3f4f6', backgroundColor: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '20px', color: '#0f2545' }}>
          <Shield size={28} /> Protocol
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setShowLoginModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '2px solid #e5e7eb', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '600', color: '#0f2545' }}>
            <LogIn size={16} /> Log In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#f9fafb', flex: 1 }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '20px', color: '#0f2545' }}>Food Safety Intelligence <br/> <span style={{ color: '#5D4037' }}>Simplified.</span></h1>
        <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>AI-powered compliance for modern kitchens. Upload photos, ask questions, and stay audit-ready 24/7.</p>
        <a href="/auth" style={{ display: 'inline-block', padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', color: 'white', backgroundColor: '#5D4037', border: 'none', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none' }}>Start Free Trial (7 Days)</a>
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#6b7280' }}>No credit card required</p>
      </div>

      {/* Features Section */}
      <div style={{ padding: '60px 20px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '50px', color: '#0f2545' }}>Everything You Need to Stay Compliant</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <Camera size={40} color="#5D4037" style={{ margin: '0 auto 15px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Image Analysis</h3>
              <p style={{ color: '#6b7280' }}>Upload photos of your kitchen and get instant compliance feedback</p>
            </div>
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <MessageSquare size={40} color="#5D4037" style={{ margin: '0 auto 15px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>24/7 AI Assistant</h3>
              <p style={{ color: '#6b7280' }}>Ask any food safety question and get expert answers instantly</p>
            </div>
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <FileText size={40} color="#5D4037" style={{ margin: '0 auto 15px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Local Regulations</h3>
              <p style={{ color: '#6b7280' }}>Washtenaw County + FDA guidelines in one place</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Preview */}
      <div style={{ padding: '60px 20px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px', color: '#0f2545' }}>Simple, Transparent Pricing</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            <div style={{ backgroundColor: 'white', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '30px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Pro</h3>
              <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '5px' }}>$29<span style={{ fontSize: '16px', fontWeight: 'normal', color: '#6b7280' }}>/mo</span></div>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>500 requests/month</p>
              <ul style={{ textAlign: 'left', color: '#6b7280', listStyle: 'none', padding: 0, marginBottom: '20px' }}>
                <li style={{ marginBottom: '8px' }}>✓ AI chat assistant</li>
                <li style={{ marginBottom: '8px' }}>✓ Image analysis</li>
                <li style={{ marginBottom: '8px' }}>✓ Email support</li>
              </ul>
            </div>
            <div style={{ backgroundColor: 'white', border: '2px solid #5D4037', borderRadius: '12px', padding: '30px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#5D4037', color: 'white', padding: '5px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>BEST VALUE</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Enterprise</h3>
              <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '5px' }}>$49<span style={{ fontSize: '16px', fontWeight: 'normal', color: '#6b7280' }}>/mo</span></div>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>Unlimited requests</p>
              <ul style={{ textAlign: 'left', color: '#6b7280', listStyle: 'none', padding: 0, marginBottom: '20px' }}>
                <li style={{ marginBottom: '8px' }}>✓ Everything in Pro</li>
                <li style={{ marginBottom: '8px' }}>✓ Unlimited usage</li>
                <li style={{ marginBottom: '8px' }}>✓ Priority support</li>
              </ul>
            </div>
          </div>
          <a href="/auth" style={{ display: 'inline-block', marginTop: '40px', padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', color: 'white', backgroundColor: '#0f2545', borderRadius: '8px', textDecoration: 'none' }}>Start Free Trial →</a>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: 'white', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>© 2024 Protocol. For informational purposes only.</p>
      </footer>
    </div>
  );
}

// ==========================================
// 2. MAIN APP COMPONENT (Private View)
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [userPlan, setUserPlan] = useState(null);
  const [requestsRemaining, setRequestsRemaining] = useState(null);
  
  // Chat App State
  const [activeTab, setActiveTab] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAppLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load user plan and request limits
  useEffect(() => {
    if (!session?.user) return;
    
    async function loadUserData() {
      const userId = session.user.id;
      
      // Check subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, plan')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      // Check profile for trial and usage
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('trial_ends_at, requests_used')
        .eq('id', userId)
        .single();
      
      let plan = 'trial';
      let requestsUsed = profile?.requests_used || 0;
      
      if (sub && sub.status === 'active') {
        plan = sub.plan; // 'pro' or 'enterprise'
      } else if (profile?.trial_ends_at) {
        const daysLeft = Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) {
          plan = 'expired';
        } else {
          setTrialDaysLeft(daysLeft);
        }
      }
      
      setUserPlan(plan);
      
      // Calculate remaining requests
      if (plan === 'enterprise') {
        setRequestsRemaining(-1); // unlimited
      } else if (plan === 'expired') {
        setRequestsRemaining(0);
      } else {
        const limit = REQUEST_LIMITS[plan] || 50;
        setRequestsRemaining(Math.max(0, limit - requestsUsed));
      }
    }
    
    loadUserData();
  }, [session]);

  // Load documents
  useEffect(() => {
    if (!session) return;
    fetch('/api/documents').then(res => res.json()).then(data => setDocuments(data.files || [])).catch(console.error);
  }, [session]);

  // Check terms acceptance
  useEffect(() => {
    const accepted = localStorage.getItem('terms_accepted');
    if (accepted === 'true') setTermsAccepted(true);
    else if (session) setShowTermsModal(true);
  }, [session]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleAcceptTerms = () => { localStorage.setItem('terms_accepted', 'true'); setTermsAccepted(true); setShowTermsModal(false); };
  const handleDeclineTerms = () => { alert('You must accept the terms to use Protocol.'); };
  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); };
  
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !image) || !termsAccepted) return;
    
    // Check if user has requests remaining
    if (userPlan === 'expired') {
      setShowUpgradeModal(true);
      return;
    }
    
    if (requestsRemaining === 0) {
      setShowUpgradeModal(true);
      return;
    }
    
    const userMessage = { role: 'user', content: input, image: image };
    setMessages(prev => [...prev, userMessage]);
    const payloadInput = input; 
    const payloadImage = image;
    setInput(''); 
    setImage(null); 
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payloadInput, image: payloadImage })
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
        // Rate limit hit
        setShowUpgradeModal(true);
        setMessages(prev => [...prev, { role: 'assistant', content: "You've reached your request limit. Please upgrade to continue using Protocol." }]);
        setLoading(false);
        return;
      }
      
      if (data.error) throw new Error(data.error);
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, confidence: data.confidence }]);
      
      // Update local request count
      if (requestsRemaining > 0) {
        setRequestsRemaining(prev => prev - 1);
      }
      
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + error.message }]);
    } finally { 
      setLoading(false); 
    }
  };

  const formatMessage = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
      return part;
    });
  };

  const handleNavClick = (tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); };

  if (appLoading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1419', color: 'white' }}>Loading Protocol...</div>;

  // Show landing page if not logged in
  if (!session) return <LandingPage />;

  return (
    <>
      {/* Terms Modal */}
      {showTermsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <AlertTriangle size={28} color="#dc2626" />
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Protocol Terms of Use</h2>
            </div>
            <p style={{ marginBottom: '20px', color: '#374151' }}>By using Protocol, you acknowledge:</p>
            <ul style={{ marginBottom: '20px', color: '#374151', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '10px' }}>This service is for informational purposes only</li>
              <li style={{ marginBottom: '10px' }}>Protocol does not replace professional food safety advice</li>
              <li style={{ marginBottom: '10px' }}>You are responsible for compliance with all applicable regulations</li>
              <li style={{ marginBottom: '10px' }}>AI responses may contain errors - always verify critical information</li>
            </ul>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={handleDeclineTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600' }}>Decline</button>
              <button onClick={handleAcceptTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white', cursor: 'pointer', fontWeight: '600' }}>I Accept</button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '30px', textAlign: 'center' }}>
            <CreditCard size={48} color="#5D4037" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#1f2937' }}>
              {userPlan === 'expired' ? 'Trial Expired' : 'Request Limit Reached'}
            </h2>
            <p style={{ marginBottom: '30px', color: '#6b7280' }}>
              {userPlan === 'expired' 
                ? 'Your 7-day trial has ended. Upgrade to continue using Protocol.' 
                : 'You\'ve used all your requests for this month. Upgrade for more!'}
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => setShowUpgradeModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <a href="/pricing" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white', cursor: 'pointer', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Upgrade Now</a>
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        {isMobileMenuOpen && <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20 }} onClick={() => setIsMobileMenuOpen(false)} />}

        {/* Sidebar */}
        <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #2a436b', paddingBottom: '15px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} /> <span>Protocol</span>
            </div>
            <button className="mobile-only" onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          
          <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => handleNavClick('chat')}>
            <MessageSquare size={18} /> Chat Assistant
          </div>
          <div className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => handleNavClick('documents')}>
            <FileText size={18} /> Document Library
          </div>

          <div style={{ flex: 1 }}></div>
          
          {/* Plan Info */}
          <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              {userPlan === 'trial' ? '🎁 Free Trial' : userPlan === 'pro' ? '⭐ Pro Plan' : userPlan === 'enterprise' ? '🚀 Enterprise' : '⚠️ Trial Expired'}
            </div>
            {requestsRemaining !== null && requestsRemaining >= 0 && (
              <div style={{ fontSize: '14px', color: 'white' }}>
                {requestsRemaining} requests left
              </div>
            )}
            {requestsRemaining === -1 && (
              <div style={{ fontSize: '14px', color: 'white' }}>
                ∞ Unlimited requests
              </div>
            )}
            {(userPlan === 'trial' || userPlan === 'expired') && (
              <a href="/pricing" style={{ display: 'block', marginTop: '10px', padding: '8px', backgroundColor: '#5D4037', color: 'white', textAlign: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                Upgrade Plan
              </a>
            )}
          </div>
          
          <div className={`nav-item`} onClick={handleSignOut} style={{ color: '#fca5a5' }}>
            <LogIn size={18} /> Sign Out
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button className="mobile-only" onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#0f2545', cursor: 'pointer' }}><Menu size={24} /></button>
              <div className="header-title">Protocol | Intelligence</div>
            </div>
          </div>

          {trialDaysLeft !== null && trialDaysLeft > 0 && (
             <div style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fdba74', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c2410c', fontSize: '14px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <Clock size={16} />
                 <span>Trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}.</span>
               </div>
               <a href="/pricing" style={{ color: '#c2410c', fontWeight: '600', textDecoration: 'underline' }}>Upgrade</a>
             </div>
          )}

          {activeTab === 'chat' ? (
            <>
              <div className="chat-box">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>
                    <Shield size={60} color="#d1d5db" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ marginBottom: '10px', color: '#1f2937' }}>Protocol AI Assistant</h2>
                    <p>Ask questions or upload photos for food safety analysis.</p>
                    {requestsRemaining !== null && requestsRemaining >= 0 && (
                      <p style={{ marginTop: '10px', fontSize: '14px', color: '#9ca3af' }}>
                        {requestsRemaining} requests remaining this month
                      </p>
                    )}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    {msg.image && <img src={msg.image} alt="User" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '10px' }} />}
                    {formatMessage(msg.content)}
                    {msg.role === 'assistant' && msg.confidence && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                        Confidence: <strong>{msg.confidence}%</strong>
                      </div>
                    )}
                  </div>
                ))}
                {loading && <div className="loading-container">Analyzing...</div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="input-area">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                {image && (
                  <div style={{ position: 'absolute', bottom: '70px', left: '20px', backgroundColor: '#e0e7ff', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: '#0f2545', border: '1px solid #0f2545' }}>
                    <span>📸 Image attached</span>
                    <button onClick={() => setImage(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                )}
                <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#5D4037' }} disabled={!termsAccepted || requestsRemaining === 0}><Camera size={24} /></button>
                <input className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={requestsRemaining === 0 ? "Upgrade to continue..." : "Type message..."} disabled={loading || !termsAccepted || requestsRemaining === 0} />
                <button className="send-button" onClick={handleSendMessage} disabled={loading || !termsAccepted || requestsRemaining === 0}><Send size={20} /></button>
              </div>
            </>
          ) : (
            <div className="scroll-content">
              <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>Document Library</h2>
              <p style={{ color: '#6b7280', marginBottom: '30px' }}>Access all food safety reference documents</p>
              <div style={{ display: 'grid', gap: '15px' }}>
                {documents.map((doc, idx) => (
                  <div key={idx} style={{ padding: '15px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <FileText size={24} color="#5D4037" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '5px' }}>{doc.name}</div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>{doc.size}</div>
                    </div>
                    <a href={`/documents/${doc.name}`} download style={{ padding: '8px 16px', backgroundColor: '#0f2545', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Download</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <style jsx global>{`
          .app-container { height: 100dvh; display: flex; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
          .sidebar { width: 280px; min-width: 280px; background-color: #0f2545; color: white; display: flex; flex-direction: column; padding: 20px; z-index: 30; transition: transform 0.3s ease; }
          .nav-item { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 6px; cursor: pointer; margin-bottom: 5px; fontSize: 14px; color: #a5b4fc; transition: all 0.2s; }
          .nav-item:hover { background-color: rgba(255,255,255,0.05); }
          .nav-item.active { color: white; background-color: rgba(255,255,255,0.1); }
          .main-content { flex: 1; display: flex; flex-direction: column; background-color: #ffffff; overflow: hidden; position: relative; }
          .header { padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justifyContent: space-between; height: 60px; flex-shrink: 0; }
          .header-title { font-size: 18px; font-weight: 600; color: #1f2937; }
          .chat-box { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; background-color: #f9fafb; }
          .bubble { padding: 15px 20px; max-width: 85%; line-height: 1.6; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-radius: 12px; }
          .bubble.user { align-self: flex-end; background-color: #0f2545; color: white; border-radius: 12px 12px 0 12px; }
          .bubble.bot { align-self: flex-start; background-color: #ffffff; color: #374151; border: 1px solid #e5e7eb; border-radius: 12px 12px 12px 0; white-space: pre-wrap; }
          .input-area { padding: 15px 20px; background-color: #ffffff; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; align-items: center; padding-bottom: max(15px, env(safe-area-inset-bottom)); position: relative; }
          .chat-input { flex: 1; padding: 14px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #ffffff; color: #1f2937; font-size: 16px; outline: none; }
          .chat-input:disabled { background-color: #f3f4f6; cursor: not-allowed; }
          .send-button { padding: 14px 20px; border-radius: 8px; border: none; background-color: #5D4037; color: white; cursor: pointer; display: flex; align-items: center; justifyContent: center; transition: opacity 0.2s; }
          .send-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .loading-container { padding: 15px; text-align: center; color: #6b7280; font-style: italic; }
          .scroll-content { flex: 1; overflow-y: auto; padding: 30px; }
          .mobile-only { display: none; }
          @media (max-width: 768px) {
            .mobile-only { display: block; }
            .sidebar { position: absolute; top: 0; left: 0; bottom: 0; transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); }
            .bubble { max-width: 90%; }
          }
        `}</style>
      </div>
    </>
  );
}
