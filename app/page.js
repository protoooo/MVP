'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Shield, FileText, Info, Menu, X, AlertTriangle, File, Phone, Mail, User } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const messagesEndRef = useRef(null);

  // --- CHECK IF TERMS ACCEPTED ON LOAD ---
  useEffect(() => {
    const accepted = localStorage.getItem('terms_accepted');
    if (accepted === 'true') {
      setTermsAccepted(true);
    } else {
      setShowTermsModal(true);
    }
  }, []);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => setDocuments(data.files || []))
      .catch(err => console.error(err));
  }, []);

  // --- CHAT LOGIC ---
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const handleAcceptTerms = () => {
    localStorage.setItem('terms_accepted', 'true');
    setTermsAccepted(true);
    setShowTermsModal(false);
  };

  const handleDeclineTerms = () => {
    alert('You must accept the terms to use Protocol.');
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !termsAccepted) return;
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (text) => {
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

  return (
    <>
      {/* --- TERMS MODAL --- */}
      {showTermsModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <AlertTriangle size={28} color="#dc2626" />
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Protocol Terms of Use</h2>
            </div>
            <div style={{ backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: '10px', fontSize: '16px' }}>IMPORTANT LEGAL NOTICE</h3>
              <p style={{ color: '#7f1d1d', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>By using Protocol, you acknowledge and agree to these terms.</p>
            </div>
            <div style={{ color: '#374151', fontSize: '14px', lineHeight: '1.8', marginBottom: '25px' }}>
              <p style={{ marginBottom: '10px' }}>1. <strong>Informational Only:</strong> Protocol organizes publicly available food safety regulations. It is NOT legal advice.</p>
              <p style={{ marginBottom: '10px' }}>2. <strong>No Affiliation:</strong> Protocol is not endorsed by any government agency.</p>
              <p style={{ marginBottom: '10px' }}>3. <strong>Your Responsibility:</strong> You are responsible for verifying all info with official sources.</p>
              <p style={{ marginBottom: '10px' }}>4. <strong>No Liability:</strong> We are not liable for fines, violations, or penalties arising from use of this tool.</p>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={handleDeclineTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', backgroundColor: 'white', color: '#6b7280', fontWeight: '600', cursor: 'pointer', fontSize: '16px' }}>Decline</button>
              <button onClick={handleAcceptTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '16px' }}>I Accept</button>
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        {/* --- MOBILE OVERLAY --- */}
        {isMobileMenuOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20 }} onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* --- SIDEBAR --- */}
        <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #2a436b', paddingBottom: '15px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} />
              <span>Protocol</span>
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
          
          <div className={`nav-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => handleNavClick('help')}>
            <Info size={18} /> Help & Support
          </div>

          <div style={{ marginTop: '20px', padding: '10px', borderTop: '1px solid #2a436b' }}>
            <p style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.4', fontStyle: 'italic' }}>
              Not affiliated with government agencies. Reference only. <br/>
              <button onClick={() => setShowTermsModal(true)} style={{ color: '#a5b4fc', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '10px' }}>View Terms</button>
            </p>
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="main-content">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button className="mobile-only" onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#0f2545', cursor: 'pointer', padding: 0 }}><Menu size={24} /></button>
              <div className="header-title">
                <span style={{ color: '#0f2545' }}>Protocol</span> 
                <span style={{ color: '#6b7280', fontWeight: '400' }}> | Food Safety Intelligence</span>
              </div>
            </div>
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="chat-box">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px', padding: '0 20px' }}>
                    <Shield size={60} color="#d1d5db" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>Protocol</h2>
                    <p style={{ fontSize: '14px' }}>Ask questions about the loaded food safety regulations.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    {formatMessage(msg.content)}
                  </div>
                ))}
                {loading && <div style={{ marginLeft: '20px', color: '#6b7280', fontStyle: 'italic', fontSize: '14px' }}>Consulting regulations...</div>}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="input-area">
                <input className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type your question here..." disabled={loading || !termsAccepted} />
                <button className="send-button" onClick={handleSendMessage} disabled={loading || !termsAccepted}><Send size={20} /></button>
              </div>
            </>
          ) : activeTab === 'documents' ? (
            <div className="scroll-content">
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Document Library</h2>
              {documents.map((doc, i) => (
                <div key={i} style={{ backgroundColor: 'white', padding: '20px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ backgroundColor: '#e0e7ff', padding: '10px', borderRadius: '8px' }}><FileText size={24} color="#0f2545" /></div>
                  <div><div style={{ fontWeight: '600', color: '#1f2937' }}>{doc.name}</div><div style={{ fontSize: '12px', color: '#6b7280' }}>{doc.size} • Active</div></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="scroll-content">
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Help & Support</h2>
              
              {/* Official Compliance Help */}
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0f2545' }}>Official Health Questions</h3>
                <p style={{ marginBottom: '15px', color: '#4b5563' }}>
                  For official inspections, permitting, or to report immediate health hazards, please contact the county directly.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0f2545', fontWeight: 'bold' }}>
                  <Shield size={20} />
                  <span>Washtenaw County Environmental Health: 734-222-3800</span>
                </div>
              </div>

              {/* App Technical Support */}
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0f2545' }}>App Technical Support</h3>
                <p style={{ marginBottom: '15px', color: '#4b5563' }}>
                  For login issues, subscription management, or technical support:
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151' }}>
                    <User size={20} color="#5D4037" />
                    <span>Austin Northrup</span> 
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151' }}>
                    <Phone size={20} color="#5D4037" />
                    <span>734-216-4836</span> 
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151' }}>
                    <Mail size={20} color="#5D4037" />
                    <span>austinrnorthrop@gmail.com</span> 
                  </div>
                </div>
              </div>
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
          .input-area { padding: 15px 20px; background-color: #ffffff; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; align-items: center; flex-shrink: 0; padding-bottom: max(15px, env(safe-area-inset-bottom)); }
          .chat-input { flex: 1; padding: 14px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #ffffff; color: #1f2937; font-size: 16px; outline: none; }
          .send-button { padding: 14px 20px; border-radius: 8px; border: none; background-color: #5D4037; color: white; cursor: pointer; display: flex; align-items: center; justifyContent: center; }
          .send-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .scroll-content { padding: 30px; background-color: #f9fafb; flex: 1; overflow-y: auto; }
          .mobile-only { display: none; }
          @media (max-width: 768px) {
            .mobile-only { display: block; }
            .sidebar { position: absolute; top: 0; left: 0; bottom: 0; transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); }
            .header-title { font-size: 16px; }
            .bubble { max-width: 90%; padding: 12px 16px; }
            .chat-box { padding: 15px; }
            .input-area { padding: 10px 15px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
          }
        `}</style>
      </div>
    </>
  );
}
