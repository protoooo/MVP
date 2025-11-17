'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, X, FileText } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('ask');
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newDocs = [];

    for (const file of files) {
      const text = await file.text();
      newDocs.push({
        name: file.name,
        content: text,
        uploadedAt: new Date().toISOString()
      });
    }

    setDocuments([...documents, ...newDocs]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages,
          documents: documents
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages([...messages, userMessage, assistantMessage]);
    } catch (error) {
      setMessages([...messages, userMessage, {
        role: 'assistant',
        content: `Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f1419', 
      margin: 0, 
      padding: 0
    }}>
      {/* Header */}
      <div style={{ 
        background: '#1a2332', 
        borderBottom: '1px solid #2d3748',
        padding: '12px 16px',
        margin: 0
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMode('ask')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                outline: mode === 'ask' ? '1px solid #2d3748' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'ask' ? '#2d3748' : 'transparent',
                color: mode === 'ask' ? '#f7fafc' : '#a0aec0',
                transition: 'all 0.2s'
              }}
            >
              Ask
            </button>
            <button
              onClick={() => setMode('manage')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                outline: mode === 'manage' ? '1px solid #2d3748' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'manage' ? '#2d3748' : 'transparent',
                color: mode === 'manage' ? '#f7fafc' : '#a0aec0',
                transition: 'all 0.2s'
              }}
            >
              Manage
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '16px',
        height: 'calc(100vh - 49px)',
        overflowY: 'auto'
      }}>
        {mode === 'manage' ? (
          <div style={{ 
            background: '#1a2332',
            borderRadius: '8px',
            border: '1px solid #2d3748',
            padding: '24px'
          }}>
            {/* Document Upload */}
            <div>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: '#e2e8f0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                Documents
              </label>
              <div style={{
                border: '1px solid #4a5568',
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#0f1419'
              }}>
                <input
                  type="file"
                  multiple
                  accept=".txt,.pdf,.md"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                  <Upload style={{ 
                    width: '48px', 
                    height: '48px', 
                    color: '#718096',
                    margin: '0 auto 8px'
                  }} />
                  <p style={{ fontSize: '14px', color: '#cbd5e0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Upload documents
                  </p>
                  <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    .txt, .pdf, .md files
                  </p>
                </label>
              </div>
            </div>

            {/* Document List */}
            {documents.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#e2e8f0' }}>
                  Uploaded ({documents.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {documents.map((doc, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#0f1419',
                      borderRadius: '6px',
                      border: '1px solid #2d3748'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText style={{ width: '16px', height: '16px', color: '#cbd5e0' }} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: '500', color: '#f7fafc' }}>{doc.name}</p>
                          <p style={{ fontSize: '12px', color: '#718096' }}>
                            {new Date(doc.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setDocuments(documents.filter((_, i) => i !== idx))}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#cbd5e0',
                          padding: '4px'
                        }}
                      >
                        <X style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: '#1a2332',
            borderRadius: '8px',
            border: '1px solid #2d3748',
            height: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Messages */}
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
                  color: '#718096',
                  marginTop: '80px'
                }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px', color: '#a0aec0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Ask a question
                  </p>
                  <p style={{ fontSize: '14px', color: '#718096', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Press the mic or type
                  </p>
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
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: msg.role === 'user' ? '#f7fafc' : '#0f1419',
                      color: msg.role === 'user' ? '#0f1419' : '#f7fafc',
                      border: msg.role === 'user' ? 'none' : '1px solid #2d3748'
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
                        background: '#718096',
                        animation: 'bounce 1s infinite'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#718096',
                        animation: 'bounce 1s infinite 0.15s'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#718096',
                        animation: 'bounce 1s infinite 0.3s'
                      }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              borderTop: '1px solid #2d3748',
              padding: '16px',
              display: 'flex',
              gap: '8px',
              background: '#0f1419'
            }}>
              <button
                onClick={toggleListening}
                disabled={isLoading}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  background: isListening ? '#f7fafc' : '#2d3748',
                  color: isListening ? '#0f1419' : '#a0aec0',
                  opacity: isLoading ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? "Listening..." : "Ask a question..."}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #2d3748',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: '#1a2332',
                  color: '#f7fafc',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: (input.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                  background: '#f7fafc',
                  color: '#0f1419',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: (input.trim() && !isLoading) ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        input::placeholder {
          color: #718096;
        }
      `}</style>
    </div>
  );
}
