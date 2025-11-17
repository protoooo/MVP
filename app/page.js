'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, X, FileText } from 'lucide-react';

export default function EmployeeAssistant() {
  const [mode, setMode] = useState('employee');
  const [apiKey, setApiKey] = useState('');
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
    if (!input.trim() || !apiKey) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = documents.map(doc => 
        `Document: ${doc.name}\n${doc.content}`
      ).join('\n\n---\n\n');

      const systemPrompt = `You are an employee assistant for a retail/food service business. Your ONLY job is to answer questions based on the company documents provided below.

CRITICAL RULES:
1. ONLY answer based on the documents provided
2. If the answer is not in the documents, respond with: "I don't have that information in the company docs. Please ask your manager."
3. Be direct and concise - employees need quick answers
4. Reference which document your answer comes from
5. Never make up policies or procedures
6. If you're unsure, say you don't know

Company Documents:
${context || 'No documents uploaded yet.'}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            userMessage
          ],
          max_tokens: 500,
          temperature: 0.3
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
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            Employee Assistant
          </h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMode('employee')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'employee' ? '#2563eb' : '#f3f4f6',
                color: mode === 'employee' ? 'white' : '#374151'
              }}
            >
              Employee
            </button>
            <button
              onClick={() => setMode('owner')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'owner' ? '#2563eb' : '#f3f4f6',
                color: mode === 'owner' ? 'white' : '#374151'
              }}
            >
              Owner
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
        {mode === 'owner' ? (
          <div style={{ 
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
              Owner Dashboard
            </h2>
            
            {/* API Key */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                Stored locally, never shared
              </p>
            </div>

            {/* Document Upload */}
            <div>
              <label style={{ 
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Company Documents
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer'
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
                    color: '#9ca3af',
                    margin: '0 auto 8px'
                  }} />
                  <p style={{ fontSize: '14px', color: '#4b5563' }}>
                    Upload SOPs, training docs, menus
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    .txt, .pdf, .md files
                  </p>
                </label>
              </div>
            </div>

            {/* Document List */}
            {documents.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Uploaded Documents ({documents.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {documents.map((doc, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: '500' }}>{doc.name}</p>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>
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
                          color: '#ef4444',
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
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
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
                  color: '#9ca3af',
                  marginTop: '80px'
                }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                    Ask me anything about company procedures
                  </p>
                  <p style={{ fontSize: '14px' }}>
                    Use the mic or type your question
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
                      background: msg.role === 'user' ? '#2563eb' : '#f3f4f6',
                      color: msg.role === 'user' ? 'white' : '#111827'
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
                    background: '#f3f4f6'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#9ca3af',
                        animation: 'bounce 1s infinite'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#9ca3af',
                        animation: 'bounce 1s infinite 0.15s'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#9ca3af',
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
              borderTop: '1px solid #e5e7eb',
              padding: '16px',
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={toggleListening}
                disabled={!apiKey}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: apiKey ? 'pointer' : 'not-allowed',
                  background: isListening ? '#ef4444' : '#f3f4f6',
                  color: isListening ? 'white' : '#374151',
                  opacity: apiKey ? 1 : 0.5
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
                disabled={!apiKey || isLoading}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!apiKey || !input.trim() || isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: (apiKey && input.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                  background: '#2563eb',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: (apiKey && input.trim() && !isLoading) ? 1 : 0.5
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
      `}</style>
    </div>
  );
}
