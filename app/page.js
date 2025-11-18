'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Shield, FileText, Info, ChevronDown, ChevronRight, File } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const messagesEndRef = useRef(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    // 1. Load Documents immediately for the sidebar
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

  // --- STYLES ---
  const styles = {
    container: { height: '100vh', display: 'flex', backgroundColor: '#f3f4f6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    sidebar: { width: '280px', minWidth: '280px', backgroundColor: '#0f2545', color: 'white', display: 'flex', flexDirection: 'column', padding: '20px', boxShadow: '4px 0 10px rgba(0,0,0,0.1)', zIndex: 10 },
    sidebarHeader: { fontSize: '18px', fontWeight: 'bold', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #2a436b', paddingBottom: '15px' },
    navItem: (isActive) => ({
      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '5px', fontSize: '14px',
      color: isActive ? 'white' : '#a5b4fc', backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'all 0.2s'
    }),
    // New Styles for Sidebar Files
    fileList: { marginLeft: '15px', marginTop: '5px', marginBottom: '15px', borderLeft: '1px solid #2a436b', paddingLeft: '10px' },
    fileItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', padding: '8px 0', cursor: 'default' },
    
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' },
    header: { padding: '15px 30px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: '20px', fontWeight: '600', color: '#111827' },
    
    // Chat Area
    chatBox: { flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#f9fafb' },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#0f2545', color: 'white', padding: '15px 20px', borderRadius: '12px 12px 0 12px', maxWidth: '75%', lineHeight: '1.6', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    bubbleBot: { alignSelf: 'flex-start', backgroundColor: '#ffffff', color: '#374151', padding: '20px', borderRadius: '12px 12px 12px 0', maxWidth: '80%', lineHeight: '1.6', border: '1px solid #e5e7eb', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap' },
    
    inputArea: { padding: '20px 40px', backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '15px', alignItems: 'center' },
    input: { flex: 1, padding: '16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#1f2937', fontSize: '16px', outline: 'none' },
    button: { padding: '16px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white', cursor: 'pointer', fontWeight: 'bold' }
  };

  // --- RENDER ---
  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Shield size={24} />
          <span>Compliance</span>
        </div>
        
        {/* Chat Tab */}
        <div style={styles.navItem(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={18} /> Chat Assistant
        </div>
        
        {/* Documents Tab & List */}
        <div style={styles.navItem(activeTab === 'documents')} onClick={() => setActiveTab('documents')}>
          <FileText size={18} /> Document Library
        </div>
        
        {/* Mini File List in Sidebar */}
        <div style={styles.fileList}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>Loaded Files</div>
          {documents.length === 0 ? (
             <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No files loaded</div>
          ) : (
             documents.map((doc, i) => (
               <div key={i} style={styles.fileItem} title={doc.name}>
                 <File size={12} color="#94a3b8" />
                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                   {doc.name.length > 20 ? doc.name.substring(0, 20) + '...' : doc.name}
                 </span>
               </div>
             ))
          )}
        </div>

        <div style={{ flex: 1 }}></div>
        
        <div style={styles.navItem(activeTab === 'help')} onClick={() => setActiveTab('help')}>
          <Info size={18} /> Help & Support
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={{ color: '#0f2545' }}>Washtenaw County</span> 
            <span style={{ color: '#6b7280', fontWeight: '400' }}> | Environmental Health</span>
          </div>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div style={styles.chatBox}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '80px' }}>
                  <Shield size={60} color="#d1d5db" style={{ margin: '0 auto 20px' }} />
                  <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>Compliance Assistant</h2>
                  <p>Ask questions about the loaded food safety regulations.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                  {formatMessage(msg.content)}
                </div>
              ))}
              {loading && <div style={{ marginLeft: '20px', color: '#6b7280', fontStyle: 'italic' }}>Consulting regulations...</div>}
              <div ref={messagesEndRef} />
            </div>
            <div style={styles.inputArea}>
              <input style={styles.input} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type your question here..." disabled={loading} />
              <button style={styles.button} onClick={handleSendMessage} disabled={loading}><Send size={20} /></button>
            </div>
          </>
        ) : activeTab === 'documents' ? (
          <div style={{ padding: '40px', backgroundColor: '#f9fafb', flex: 1, overflowY: 'auto' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Document Detail View</h2>
            {documents.map((doc, i) => (
              <div key={i} style={{ backgroundColor: 'white', padding: '20px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ backgroundColor: '#e0e7ff', padding: '10px', borderRadius: '8px' }}><FileText size={24} color="#0f2545" /></div>
                <div><div style={{ fontWeight: '600', color: '#1f2937' }}>{doc.name}</div><div style={{ fontSize: '12px', color: '#6b7280' }}>{doc.size} • Active in Knowledge Base</div></div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px', backgroundColor: '#f9fafb', flex: 1 }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>Help & Support</h2>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Contact Information</h3>
              <p style={{ marginBottom: '20px', color: '#4b5563' }}>For urgent issues, call 734-222-3800.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
