'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Send, Shield, FileText, Info, Menu, X, AlertTriangle, Camera, Trash2, Clock, Check, LogIn } from 'lucide-react';

// --- CONFIGURATION ---
// Replace these with your actual Stripe Price IDs from your Dashboard!
const STRIPE_PRICE_IDS = {
  pro: 'price_1Qxxxxxxxxxxxxxx',        // e.g., price_1Q5b8pKxxxxx
  enterprise: 'price_1Qxxxxxxxxxxxxxx'  // e.g., price_1Q5b9qKxxxxx
};

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. LANDING PAGE COMPONENT (Public View)
// ==========================================
function LandingPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);

  // Login Handler (Simple Email Magic Link or OAuth)
  const handleLogin = async () => {
    const email = prompt("Enter your email to log in:");
    if (!email) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    
    if (error) alert("Error: " + error.message);
    else alert("Check your email for the login link!");
  };

  // Stripe Checkout Handler
  const handleCheckout = async (priceId) => {
    setLoading(true);
    try {
      // 1. Create a Checkout Session
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }) // Sending the price ID to your backend
      });
      
      const data = await res.json();
      
      // 2. Redirect to Stripe
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#1f2937', lineHeight: 1.5 }}>
      {/* Navigation Bar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '20px', color: '#0f2545' }}>
          <Shield size={28} /> Protocol
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', fontWeight: '600', color: '#4b5563' }}>
            <LogIn size={18} /> Log In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#f9fafb' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '20px', color: '#0f2545' }}>
          Food Safety Intelligence <br/> <span style={{ color: '#5D4037' }}>Simplified.</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          AI-powered compliance for modern kitchens. Upload photos, ask questions, and stay audit-ready 24/7.
        </p>
      </div>

      {/* Pricing Section */}
      <div style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '40px' }}>Choose Your Plan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          
          {/* Pro Plan */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '30px', backgroundColor: 'white' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Pro</h3>
            <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px' }}>$29<span style={{ fontSize: '16px', fontWeight: 'normal', color: '#6b7280' }}>/mo</span></div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px', color: '#4b5563' }}>
              <li style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}><Check size={18} color="green"/> Unlimited AI Chat</li>
              <li style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}><Check size={18} color="green"/> Photo Analysis</li>
              <li style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}><Check size={18} color="green"/> Email Support</li>
            </ul>
            <button 
              onClick={() => handleCheckout(STRIPE_PRICE_IDS.pro)}
              disabled={loading}
              style={{ width: '100%', padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#0f2545', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? 'Processing...' : 'Subscribe to Pro'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '30px', backgroundColor: '#fff7ed' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Enterprise</h3>
            <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px' }}>$49<span style={{ fontSize: '16px', fontWeight: 'normal', color: '#6b7280' }}>/mo</span></div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px', color: '#4b5563' }}>
              <li style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}><Check size={18} color="green"/> Everything in Pro</li>
              <li style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}><Check size={18} color="green"/> Priority Support</li>
              <li style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}><Check size={18} color="green"/> Document Storage</li>
            </ul>
            <button 
              onClick={() => handleCheckout(STRIPE_PRICE_IDS.enterprise)}
              disabled={loading}
              style={{ width: '100%', padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? 'Processing...' : 'Subscribe to Enterprise'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. MAIN APP COMPONENT (Private View)
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  
  // --- Chat App State ---
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
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Check Auth Session on Mount
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

  // 2. Check Trial Status (Only if Logged In)
  useEffect(() => {
    if (!session) return;

    async function checkTrialStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('trial_ends_at')
        .eq('id', user.id)
        .single();

      if (profile?.trial_ends_at) {
        const daysLeft = Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 7) {
          setTrialDaysLeft(daysLeft);
        }
      }
    }
    checkTrialStatus();
  }, [session]);

  // 3. Load Documents
  useEffect(() => {
    if (!session) return;
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => setDocuments(data.files || []))
      .catch(err => console.error(err));
  }, [session]);

  // 4. Terms Check
  useEffect(() => {
    const accepted = localStorage.getItem('terms_accepted');
    if (accepted === 'true') setTermsAccepted(true);
    else setShowTermsModal(true);
  }, []);

  // Scroll to bottom
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  // --- Handlers ---
  const handleAcceptTerms = () => {
    localStorage.setItem('terms_accepted', 'true');
    setTermsAccepted(true);
    setShowTermsModal(false);
  };

  const handleDeclineTerms = () => alert('You must accept the terms to use Protocol.');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

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
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, confidence: data.confidence }]);
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

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // --- RENDER LOGIC ---

  if (appLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Protocol...</div>;
  }

  // IF NOT LOGGED IN -> SHOW LANDING PAGE
  if (!session) {
    return <LandingPage />;
  }

  // IF LOGGED IN -> SHOW APP
  return (
    <>
      {showTermsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '30px' }}>
             {/* Terms Modal Content */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <AlertTriangle size={28} color="#dc2626" />
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Protocol Terms of Use</h2>
            </div>
            <p>By using Protocol, you acknowledge that this is for informational purposes only.</p>
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={handleDeclineTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', backgroundColor: 'white' }}>Decline</button>
              <button onClick={handleAcceptTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white' }}>I Accept</button>
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        {isMobileMenuOpen && <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20 }} onClick={() => setIsMobileMenuOpen(false)} />}

        <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #2a436b', paddingBottom: '15px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} /> <span>Protocol</span>
            </div>
            <button className="mobile-only" onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={24} /></button>
          </div>
          
          <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => handleNavClick('chat')}>
            <MessageSquare size={18} /> Chat Assistant
          </div>
          <div className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => handleNavClick('documents')}>
            <FileText size={18} /> Document Library
          </div>

          <div style={{ flex: 1 }}></div>
          
          <div className={`nav-item`} onClick={handleSignOut} style={{ color: '#fca5a5' }}>
            <LogIn size={18} /> Sign Out
          </div>

          <div style={{ marginTop: '20px', padding: '10px', borderTop: '1px solid #2a436b' }}>
            <p style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.4', fontStyle: 'italic' }}>
              Not affiliated with government agencies. Reference only.
            </p>
          </div>
        </div>

        <div className="main-content">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button className="mobile-only" onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#0f2545' }}><Menu size={24} /></button>
              <div className="header-title">
                <span style={{ color: '#0f2545' }}>Protocol</span> <span style={{ color: '#6b7280', fontWeight: '400' }}> | Food Safety Intelligence</span>
              </div>
            </div>
          </div>

          {/* Trial Banner */}
          {trialDaysLeft !== null && (
             <div style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fdba74', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#c2410c', fontSize: '14px' }}>
               <Clock size={16} />
               <span><strong>Trial Ending Soon:</strong> Your free trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}.</span>
             </div>
          )}

          {activeTab === 'chat' ? (
            <>
              <div className="chat-box">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px', padding: '0 20px' }}>
                    <Shield size={60} color="#d1d5db" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>Protocol</h2>
                    <p style={{ fontSize: '14px' }}>Ask questions or upload photos of your kitchen setup.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    {msg.image && <img src={msg.image} alt="User upload" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '10px', display: 'block' }} />}
                    {formatMessage(msg.content)}
                    {msg.role === 'assistant' && msg.confidence && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                        Confidence: <span style={{ color: msg.confidence >= 70 ? '#059669' : '#d97706', fontWeight: '600' }}>{msg.confidence}%</span>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="loading-container">
                    <div className="kinetic-loader"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                    <span className="loading-text">Analyzing...</span>
                  </div>
                )}
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
                <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#5D4037' }}><Camera size={24} /></button>
                <input className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={image ? "Ask about this image..." : "Type question or upload photo..."} disabled={loading || !termsAccepted} />
                <button className="send-button" onClick={handleSendMessage} disabled={loading || !termsAccepted}><Send size={20} /></button>
              </div>
            </>
          ) : (
            <div className="scroll-content">
               {/* Document / Help Content simplified for brevity */}
               <h2>Document Library</h2>
               <p>Library content goes here...</p>
            </div>
          )}
        </div>

        <style jsx global>{`
          .app-container { height: 100dvh; display: flex; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
          .sidebar { width: 280px; min-width: 280px; background-color: #0f2545; color: white; display: flex; flex-direction: column; padding: 20px; z-index: 30; transition: transform 0.3s ease; }
          .nav-item { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 6px; cursor: pointer; margin-bottom: 5px; font-size: 14px; color: #a5b4fc; transition: all 0.2s; }
          .nav-item.active { color: white; background-color: rgba(255,255,255,0.1); }
          .main-content { flex: 1; display: flex; flex-direction: column; background-color: #ffffff; overflow: hidden; position: relative; }
          .header { padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justifyContent: space-between; height: 60px; flex-shrink: 0; }
          .header-title { font-size: 18px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .chat-box { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; background-color: #f9fafb; -webkit-overflow-scrolling: touch; }
          .bubble { padding: 15px 20px; max-width: 85%; line-height: 1.6; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
          .bubble.user { align-self: flex-end; background-color: #0f2545; color: white; border-radius: 12px 12px 0 12px; }
          .bubble.bot { align-self: flex-start; background-color: #ffffff; color: #374151; border-radius: 12px 12px 12px 0; border: 1px solid #e5e7eb; white-space: pre-wrap; }
          .input-area { padding: 15px 20px; background-color: #ffffff; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; align-items: center; flex-shrink: 0; padding-bottom: max(15px, env(safe-area-inset-bottom)); position: relative; }
          .chat-input { flex: 1; padding: 14px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #ffffff; color: #1f2937; font-size: 16px; outline: none; }
          .send-button { padding: 14px 20px; border-radius: 8px; border: none; background-color: #5D4037; color: white; cursor: pointer; display: flex; align-items: center; justifyContent: center; }
          .send-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .scroll-content { padding: 30px; background-color: #f9fafb; flex: 1; overflow-y: auto; }
          .mobile-only { display: none; }
          
          /* LOADING ANIMATION */
          .loading-container { align-self: flex-start; display: flex; align-items: center; gap: 15px; padding: 15px 20px; background-color: #ffffff; border-radius: 12px 12px 12px 0; border: 1px solid #e5e7eb; }
          .kinetic-loader { display: flex; gap: 8px; align-items: center; }
          .kinetic-loader .dot { width: 12px; height: 12px; background: linear-gradient(135deg, #5D4037 0%, #8D6E63 100%); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
          .kinetic-loader .dot:nth-child(1) { animation-delay: -0.32s; }
          .kinetic-loader .dot:nth-child(2) { animation-delay: -0.16s; }
          @keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
          .loading-text { color: #6b7280; font-size: 14px; font-style: italic; }

          @media (max-width: 768px) {
            .mobile-only { display: block; }
            .sidebar { position: absolute; top: 0; left: 0; bottom: 0; transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); }
            .bubble { max-width: 90%; padding: 12px 16px; }
          }
        `}</style>
      </div>
    </>
  );
}
