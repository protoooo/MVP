'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (input.length > 2000) {
      alert('Message is too long (max 2000 characters)');
      return;
    }

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 Sending to /api/chat');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages
        })
      });

      console.log('📥 Chat response status:', response.status);

      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.error('❌ Chat API error:', data);
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      console.log('✅ Chat response received');
      const assistantMessage = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages([...newMessages, assistantMessage]);

    } catch (error) {
      console.error('❌ Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`
      };
      setMessages([...newMessages, errorMessage]);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#0f1419'
    }}>
      {error && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          background: '#f56565',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '6px',
          zIndex: 1000,
          maxWidth: '400px',
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              marginLeft: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ 
        background: '#1a2332', 
        borderBottom: '1px solid #2d3748',
        padding: '16px'
      }}>
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <MessageSquare size={24} style={{ color: '#48bb78' }} />
          <div>
            <h1 style={{ 
              fontSize: '20px', 
              color: '#f7fafc',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              Washtenaw County Food Service Compliance Assistant
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Get help with food safety regulations and compliance requirements
            </p>
          </div>
        </div>
      </div>

      <div style={{ 
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          maxWidth: '900px', 
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1a2332',
          borderRadius: '8px',
          border: '1px solid #2d3748',
          overflow: 'hidden'
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                marginTop: '80px'
              }}>
                <MessageSquare size={48} style={{ color: '#48bb78', margin: '0 auto 16px' }} />
                <h2 style={{ 
                  fontSize: '18px', 
                  marginBottom: '8px', 
                  color: '#f7fafc', 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '600'
                }}>
                  Welcome to the Compliance Assistant
                </h2>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#a0aec0', 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  marginBottom: '24px'
                }}>
                  Ask questions about food safety, health code compliance, licensing, or inspections
                </p>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '12px',
                  maxWidth: '700px',
                  margin: '0 auto'
                }}>
                  {[
                    'What are the temperature requirements for food storage?',
                    'How do I prepare for a health inspection?',
                    'What permits do I need to open a restaurant?',
                    'Tell me about handwashing requirements'
                  ].map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(question)}
                      style={{
                        padding: '12px',
                        background: '#0f1419',
                        border: '1px solid #2d3748',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#48bb78'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#2d3748'}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: msg.role === 'user' ? '#48bb78' : '#0f1419',
                    color: msg.role === 'user' ? '#ffffff' : '#f7fafc',
                    border: msg.role === 'user' ? 'none' : '1px solid #2d3748',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#0f1419',
                  border: '1px solid #2d3748'
                }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#48bb78',
                      animation: 'bounce 1s infinite'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#48bb78',
                      animation: 'bounce 1s infinite 0.15s'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#48bb78',
                      animation: 'bounce 1s infinite 0.3s'
                    }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            borderTop: '1px solid #2d3748',
            padding: '16px',
            display: 'flex',
            gap: '8px',
            background: '#0f1419'
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about food safety, regulations, or compliance..."
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#1a2332',
                color: '#f7fafc',
                outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                resize: 'none',
                minHeight: '42px',
                maxHeight: '120px'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: (input.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                background: '#48bb78',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                opacity: (input.trim() && !isLoading) ? 1 : 0.5,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      </div>

      <div style={{
        background: '#1a2332',
        borderTop: '1px solid #2d3748',
        padding: '12px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '12px',
          color: '#718096',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          For official guidance, always consult the Washtenaw County Health Department directly
        </p>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        textarea::placeholder {
          color: #718096;
        }
      `}</style>
    </div>
  );
}
