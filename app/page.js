'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#111827', 
      color: 'white', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      {/* HEADER */}
      <div style={{ padding: '20px', borderBottom: '1px solid #374151', backgroundColor: '#1f2937', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MessageSquare color="#10b981" />
        Compliance Assistant
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '50px' }}>
            Ask a question about food safety.
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? '#10b981' : '#374151',
            color: 'white',
            padding: '12px',
            borderRadius: '10px',
            maxWidth: '85%',
            lineHeight: '1.5'
          }}>
            {msg.content}
          </div>
        ))}
        
        {loading && <div style={{ color: '#9ca3af' }}>Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div style={{ padding: '20px', borderTop: '1px solid #374151', backgroundColor: '#1f2937', display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type here..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #4b5563',
            backgroundColor: '#374151',
            color: 'white',
            fontSize: '16px',
            outline: 'none' // Removes the blue glow causing issues
          }}
        />
        <button 
          onClick={handleSendMessage} 
          disabled={loading}
          style={{
            padding: '15px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#10b981',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          <Send />
        </button>
      </div>
    </div>
  );
}
