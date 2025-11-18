'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Shield, FileText, Info, Download } from 'lucide-react';

export default function App() {
  // State for Navigation
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'documents', 'help'
  
  // State for Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // State for Documents
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  // --- CHAT LOGIC ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

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
      setMessages(prev => [...prev, { role: 'assistant', content: "System Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  // --- DOCUMENT LOGIC ---
  useEffect(() => {
    if (activeTab === 'documents') {
      fetch('/api/documents')
        .then(res => res.json())
        .then(data => {
          setDocuments(data.files || []);
          setDocsLoading(false);
        })
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  // Helper to render Bold text
  const formatMessage = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // --- STYLES ---
  const styles = {
    container: { 
      height: '100vh', 
      display: 'flex', 
      backgroundColor: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },
    sidebar: {
      width: '260px',
      minWidth: '260px',
      backgroundColor: '#0f2545', // Navy
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
      zIndex: 10
    },
    sidebarHeader: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '30px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      borderBottom: '1px solid #2a436b',
      paddingBottom: '15px'
    },
    navItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px',
      borderRadius: '6px',
      cursor: 'pointer',
      marginBottom: '5px',
      fontSize: '14px',
      color: isActive ? 'white' : '#a5b4fc',
      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
      transition: 'all 0.2s'
    }),
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      overflow: 'hidden' // Prevents double scrollbars
    },
    header: {
      padding: '15px 30px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827',
    },
    contentArea: {
      flex: 1,
      overflowY: 'auto',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      backgroundColor: '#f9fafb'
    },
    // Chat Styles
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: '#0f2545', // Navy
      color: 'white',
      padding: '15px 20px',
      borderRadius: '12px 12px 0 12px',
      maxWidth: '75%',
      lineHeight: '1.6',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    },
    bubbleBot: {
      alignSelf: 'flex-start',
      backgroundColor: '#ffffff',
      color: '#374151',
      padding: '20px',
      borderRadius: '12px 12px 12px 0',
      maxWidth: '80%',
      lineHeight: '1.6',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
      whiteSpace: 'pre-wrap'
    },
    inputArea: {
      padding: '20px 40px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      gap: '15px',
      alignItems: 'center'
    },
    input: {
      flex: 1,
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      fontSize: '16px',
      outline: 'none'
    },
    button: {
      padding: '16px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#5D4037', // MATTE BROWN
      color: 'white',
      cursor: 'pointer',
      fontWeight: 'bold',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    // Document Styles
    docCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }
  };

  // --- RENDER CONTENT BASED ON TAB ---
  const renderContent = () => {
    if (activeTab === 'chat') {
      return (
        <>
          <div style={styles.contentArea}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '80px' }}>
                <Shield size={60} color="#d1d5db" style={{ margin: '0 auto 20px' }} />
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>Compliance Assistant</h2>
                <p>Ask about food codes, inspections, or health regulations.</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                {formatMessage(msg.content)}
              </div>
            ))}
            
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#6b7280', fontStyle: 'italic', marginLeft: '20px' }}>
                Consulting regulations...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your question here..."
              disabled={loading}
            />
            <button style={styles.button} onClick={handleSendMessage} disabled={loading}>
              <Send size={20} />
            </button>
          </div>
        </>
      );
    } else if (activeTab === 'documents') {
      return (
        <div style={styles.contentArea}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Official Regulations Library</h2>
          {docsLoading ? (
            <p style={{ color: '#6b7280' }}>Loading library...</p>
          ) : (
            documents.map((doc, i) => (
              <div key={i} style={styles.docCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ backgroundColor: '#e0e7ff', padding: '10px', borderRadius: '8px' }}>
                    <FileText size={24} color="#0f2545" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{doc.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{doc.size} • Verified Source</div>
                  </div>
                </div>
              </div>
            ))
          )}
          {documents.length === 0 && !docsLoading && <p>No documents found.</p>}
        </div>
      );
    } else if (activeTab === 'help') {
      return (
        <div style={styles.contentArea}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Help & Support</h2>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Washtenaw County Environmental Health</h3>
            <p style={{ marginBottom: '20px', color: '#4b5563', lineHeight: '1.6' }}>
              This AI Assistant is designed to help answer questions about the Food Code. 
              For official inspections, permitting, or urgent health hazards, please contact the department directly.
            </p>
            <div style={{ display: 'flex', gap: '10px', color: '#0f2545', fontWeight: 'bold' }}>
              <Info size={20} />
              <span>Phone: 734-222-3800</span>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Shield size={24} />
          <span>Compliance</span>
        </div>
        
        <div style={styles.navItem(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={18} /> Chat Assistant
        </div>
        
        <div style={styles.navItem(activeTab === 'documents')} onClick={() => setActiveTab('documents')}>
          <FileText size={18} /> Document Library
        </div>
        
        <div style={{ flex: 1 }}></div>
        
        <div style={styles.navItem(activeTab === 'help')} onClick={() => setActiveTab('help')}>
          <Info size={18} /> Help & Support
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={{ color: '#0f2545' }}>Washtenaw County</span> 
            <span style={{ color: '#6b7280', fontWeight: '400' }}> | Environmental Health</span>
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
