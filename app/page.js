'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Shield, FileText, Info, Menu, X, File } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => setDocuments(data.files || []))
      .catch(err => console.error(err));
  }, []);

  // --- CHAT LOGIC ---
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
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
    <div className="app-container">
      {/* --- MOBILE OVERLAY --- */}
      {isMobileMenuOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20 }} 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #2a436b', paddingBottom: '15px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} />
            <span>Compliance</span>
          </div>
          <button 
            className="mobile-only"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation Items */}
        <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => handleNavClick('chat')}>
          <MessageSquare size={18} /> Chat Assistant
        </div>
        
        <div className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => handleNavClick('documents')}>
          <FileText size={18} /> Document Library
        </div>
        
        {/* Loaded Files List */}
        <div style={{ marginLeft: '15px', marginTop: '10px', marginBottom: '15px', borderLeft: '1px solid #2a436b', paddingLeft: '10px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>Loaded Files</div>
          {documents.length === 0 ? (
             <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No files loaded</div>
          ) : (
             documents.map((doc, i) => (
               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', padding: '4px 0', cursor: 'default' }}>
                 <File size={12} color="#94a3b8" />
                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                   {doc.name}
                 </span>
               </div>
             ))
          )}
        </div>

        <div style={{ flex: 1 }}></div>
        
        <div className={`nav-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => handleNavClick('help')}>
          <Info size={18} /> Help & Support
        </div>

        {/* LEGAL DISCLAIMER (Safety Net) */}
        <div style={{ marginTop: '20px', padding: '10px', borderTop: '1px solid #2a436b' }}>
          <p style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.4', fontStyle: 'italic' }}>
            Not officially affiliated with Washtenaw County Government. Always verify with official Environmental Health Dept guidelines.
          </p>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="main-content">
        {/* HEADER */}
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              className="mobile-only"
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ background: 'none', border: 'none', color: '#0f2545', cursor: 'pointer', padding: 0 }}
            >
              <Menu size={24} />
            </button>
            {/* UPDATED HEADER TITLE (Option 1) */}
            <div className="header-title">
              <span style={{ color: '#0f2545' }}>Washtenaw County</span> 
              <span style={{ color: '#6b7280', fontWeight: '400' }}> | Compliance Assistant</span>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        {activeTab === 'chat' ? (
          <>
            <div className="chat-box">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px', padding: '0 20px' }}>
                  <Shield size={60} color="#d1d5db" style={{ margin: '0 auto 20px' }} />
                  <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>Compliance Assistant</h2>
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
              <input 
                className="chat-input"
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                placeholder="Type your question here..." 
                disabled={loading} 
              />
              <button className="send-button" onClick={handleSendMessage} disabled={loading}>
                <Send size={20} />
              </button>
            </div>
          </>
        ) : activeTab === 'documents' ? (
          <div className="scroll-content">
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Document Detail View</h2>
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
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '10px', color: '#0f2545' }}>Contact Information</h3>
              <p style={{ marginBottom: '20px', color: '#4b5563' }}>For urgent issues or official health hazards, please contact the department directly.</p>
              <p style={{ fontWeight: 'bold', color: '#0f2545' }}>Phone: 734-222-3800</p>
            </div>
          </div>
        )}
      </div>

      {/* --- RESPONSIVE CSS --- */}
      <style jsx global>{`
        .app-container {
          height: 100dvh; 
          display: flex;
          background-color: #f3f4f6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
        }
        .sidebar {
          width: 280px;
          min-width: 280px;
          background-color: #0f2545;
          color: white;
          display: flex;
          flex-direction: column;
          padding: 20px;
          z-index: 30;
          transition: transform 0.3s ease;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 5px;
          font-size: 14px;
          color: #a5b4fc;
          transition: all 0.2s;
        }
        .nav-item.active {
          color: white;
          background-color: rgba(255,255,255,0.1);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          overflow: hidden;
          position: relative;
        }
        .header {
          padding: 15px 20px;
          background-color: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
          flex-shrink: 0;
        }
        .header-title {
          font-size: 18px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-box {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background-color: #f9fafb;
          -webkit-overflow-scrolling: touch; 
        }
        .bubble {
          padding: 15px 20px;
          max-width: 85%;
          line-height: 1.6;
          font-size: 15px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .bubble.user {
          align-self: flex-end;
          background-color: #0f2545;
          color: white;
          border-radius: 12px 12px 0 12px;
        }
        .bubble.bot {
          align-self: flex-start;
          background-color: #ffffff;
          color: #374151;
          border-radius: 12px 12px 12px 0;
          border: 1px solid #e5e7eb;
          white-space: pre-wrap;
        }
        .input-area {
          padding: 15px 20px;
          background-color: #ffffff;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
          padding-bottom: max(15px, env(safe-area-inset-bottom));
        }
        .chat-input {
          flex: 1;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background-color: #ffffff;
          color: #1f2937;
          font-size: 16px;
          outline: none;
        }
        .send-button {
          padding: 14px 20px;
          border-radius: 8px;
          border: none;
          background-color: #5D4037;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scroll-content {
          padding: 30px;
          background-color: #f9fafb;
          flex: 1;
          overflow-y: auto;
        }
        .mobile-only { display: none; }
        @media (max-width: 768px) {
          .mobile-only { display: block; }
          .sidebar {
            position: absolute;
            top: 0; left: 0; bottom: 0;
            transform: translateX(-100%);
          }
          .sidebar.open { transform: translateX(0); }
          .header-title { font-size: 16px; }
          .bubble { max-width: 90%; padding: 12px 16px; }
          .chat-box { padding: 15px; }
          .input-area { padding: 10px 15px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
        }
      `}</style>
    </div>
  );
}
