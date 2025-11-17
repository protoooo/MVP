'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, LogOut, Edit2, Check, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Auth from '../components/Auth';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES_PER_UPLOAD = 10;
const ALLOWED_FILE_TYPES = ['.txt', '.md', '.pdf'];

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('ask');
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
    } catch (err) {
      console.error('Error checking user:', err);
      setError('Failed to load user session');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Profile error:', profileError);
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found yet, this is normal for new users');
          setLoading(false);
          return;
        }
        throw profileError;
      }
      
      if (profileData) {
        if (profileData.business_id) {
          const { data: businessData } = await supabase
            .from('businesses')
            .select('name')
            .eq('id', profileData.business_id)
            .single();
          
          if (businessData) {
            profileData.businesses = businessData;
            setBusinessName(businessData.name || '');
          }
        }
        
        setProfile(profileData);
        
        if (profileData.business_id) {
          await loadDocuments(profileData.business_id);
          await loadConversations(profileData.business_id);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      if (err.code !== 'PGRST116') {
        console.error('Unexpected error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setDocuments(data);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const loadConversations = async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setMessages(data.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    }
  };

  const updateBusinessName = async () => {
    if (!businessName.trim()) {
      alert('Business name cannot be empty');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ name: businessName })
        .eq('id', profile.business_id);
      
      if (error) throw error;
      
      setProfile({
        ...profile,
        businesses: { name: businessName }
      });
      setEditingBusinessName(false);
    } catch (err) {
      console.error('Error updating business name:', err);
      alert('Failed to update business name');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setDocuments([]);
    setMessages([]);
    setConversations([]);
    setCurrentConversation(null);
    setProfile(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > MAX_FILES_PER_UPLOAD) {
      alert(`Maximum ${MAX_FILES_PER_UPLOAD} files allowed at once`);
      return;
    }

    setUploadProgress({ current: 0, total: files.length, fileName: '', error: null });
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setUploadProgress({ 
        current: i, 
        total: files.length, 
        fileName: file.name,
        error: null 
      });
      
      if (file.size > MAX_FILE_SIZE) {
        setUploadProgress({ 
          current: i, 
          total: files.length, 
          fileName: file.name,
          error: `${file.name} is too large (max 50MB)` 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_FILE_TYPES.includes(fileExt)) {
        setUploadProgress({ 
          current: i, 
          total: files.length, 
          fileName: file.name,
          error: `${file.name} is not an allowed file type` 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      try {
        if (fileExt === '.pdf') {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileName', file.name);

          const response = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload PDF');
          }

          const { document } = await response.json();
          setDocuments([document, ...documents]);
        } else {
          const content = await file.text();
          const truncatedContent = content.length > 100000 
            ? content.substring(0, 100000) + '\n\n[Content truncated...]'
            : content;
          
          const { data, error } = await supabase
            .from('documents')
            .insert({
              business_id: profile.business_id,
              name: file.name,
              content: truncatedContent,
              uploaded_by: user.id
            })
            .select()
            .single();
          
          if (error) throw error;
          
          if (data) {
            setDocuments([data, ...documents]);
          }
        }
        
        setUploadProgress({ 
          current: i + 1, 
          total: files.length, 
          fileName: file.name,
          error: null 
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error('Error uploading document:', err);
        setUploadProgress({ 
          current: i, 
          total: files.length, 
          fileName: file.name,
          error: `Failed to upload ${file.name}: ${err.message}` 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setUploadProgress(null);
    e.target.value = '';
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);
      
      if (error) throw error;
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          business_id: profile.business_id,
          title: 'New conversation'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCurrentConversation(data);
        setMessages([]);
        setConversations([data, ...conversations]);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
      alert('Failed to create conversation');
    }
  };

  const selectConversation = async (conv) => {
    setCurrentConversation(conv);
    await loadMessages(conv.id);
  };

  const deleteConversation = async (convId) => {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', convId);
      
      if (error) throw error;
      
      setConversations(conversations.filter(c => c.id !== convId));
      if (currentConversation?.id === convId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      alert('Failed to delete conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (input.length > 2000) {
      alert('Message is too long (max 2000 characters)');
      return;
    }

    let conversationId = currentConversation?.id;
    if (!conversationId) {
      try {
        const { data } = await supabase
          .from('conversations')
          .insert({
            business_id: profile.business_id,
            title: input.substring(0, 50)
          })
          .select()
          .single();
        
        if (data) {
          setCurrentConversation(data);
          setConversations([data, ...conversations]);
          conversationId = data.id;
        } else {
          throw new Error('Failed to create conversation');
        }
      } catch (err) {
        console.error('Error creating conversation:', err);
        alert('Failed to create conversation');
        return;
      }
    }

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessage.content
        });
    } catch (err) {
      console.error('Error saving user message:', err);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: newMessages,
          documents: documents
        })
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `Request failed with status ${response.status}`);
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages([...newMessages, assistantMessage]);

      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantMessage.content
        });

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`
      };
      setMessages([...newMessages, errorMessage]);
      setError(error.message);
      
      try {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: errorMessage.content
          });
      } catch (err) {
        console.error('Error saving error message:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1419'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #2d3748',
            borderTop: '3px solid #f7fafc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ 
            color: '#a0aec0', 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
          }}>
            Loading...
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

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
        padding: '12px 16px'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#f7fafc',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500'
          }}>
            {profile?.businesses?.name || 'My Business'}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setMode('ask')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'ask' ? '#2d3748' : 'transparent',
                color: mode === 'ask' ? '#f7fafc' : '#a0aec0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'manage' ? '#2d3748' : 'transparent',
                color: mode === 'manage' ? '#f7fafc' : '#a0aec0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Manage
            </button>
            <button
              onClick={() => setMode('settings')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'settings' ? '#2d3748' : 'transparent',
                color: mode === 'settings' ? '#f7fafc' : '#a0aec0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#a0aec0',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        flex: 1,
        display: 'flex',
        padding: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', gap: '16px', height: '100%' }}>
          {mode === 'ask' && (
            <div style={{
              width: '280px',
              background: '#1a2332',
              borderRadius: '8px',
              border: '1px solid #2d3748',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden'
            }}>
              <button
                onClick={createNewConversation}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#2d3748',
                  color: '#f7fafc',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}
              >
                <MessageSquare size={16} />
                New Chat
              </button>
              
              <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: currentConversation?.id === conv.id ? '#0f1419' : 'transparent',
                      border: currentConversation?.id === conv.id ? '1px solid #2d3748' : '1px solid transparent'
                    }}
                    onClick={() => selectConversation(conv)}
                  >
                    <p style={{
                      fontSize: '13px',
                      color: '#f7fafc',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {conv.title}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#718096',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {mode === 'settings' ? (
              <div style={{ 
                background: '#1a2332',
                borderRadius: '8px',
                border: '1px solid #2d3748',
                padding: '24px',
                flex: 1,
                overflow: 'auto'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '24px',
                  color: '#f7fafc',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  Settings
                </h2>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#e2e8f0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Business Name
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {editingBusinessName ? (
                      <>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #2d3748',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#0f1419',
                            color: '#f7fafc',
                            outline: 'none',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}
                        />
                        <button
                          onClick={updateBusinessName}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: '#f7fafc',
                            color: '#0f1419',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}
                        >
                          <Check size={16} />
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          color: '#f7fafc',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          {businessName}
                        </p>
                        <button
                          onClick={() => setEditingBusinessName(true)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: '#2d3748',
                            color: '#f7fafc',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}
                        >
                          <Edit2 size={16} />
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#e2e8f0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Account Email
                  </label>
                  <p style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: '#a0aec0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}>
                    {user.email}
                  </p>
                </div>
              </div>
            ) : mode === 'manage' ? (
              <div style={{ 
                background: '#1a2332',
                borderRadius: '8px',
                border: '1px solid #2d3748',
                padding: '24px',
                flex: 1,
                overflow: 'auto'
              }}>
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
                    cursor: uploadProgress ? 'not-allowed' : 'pointer',
                    background: '#0f1419',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      multiple
                      accept={ALLOWED_FILE_TYPES.join(',')}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="file-upload"
                      disabled={!!uploadProgress}
                    />
                    
                    {uploadProgress ? (
                      <div style={{ padding: '16px' }}>
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#cbd5e0', 
                          marginBottom: '12px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                        }}>
                          {uploadProgress.error ? '⚠️ Error' : '📤 Uploading'} {uploadProgress.fileName}
                        </p>
                        
                        {uploadProgress.error ? (
                          <div style={{
                            padding: '12px',
                            background: '#742a2a',
                            color: '#feb2b2',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}>
                            {uploadProgress.error}
                          </div>
                        ) : (
                          <>
                            <div style={{
                              width: '100%',
                              height: '8px',
                              background: '#2d3748',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              marginBottom: '8px'
                            }}>
                              <div style={{
                                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                                height: '100%',
                                background: '#48bb78',
                                transition: 'width 0.3s ease',
                                borderRadius: '4px'
                              }} />
                            </div>
                            
                            <p style={{ 
                              fontSize: '13px', 
                              color: '#a0aec0',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                            }}>
                              {uploadProgress.current} of {uploadProgress.total} files
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                        <Upload style={{ 
                          width: '48px', 
                          height: '48px', 
                          color: '#718096',
                          margin: '0 auto 8px'
                        }} />
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#cbd5e0', 
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                        }}>
                          Click to upload documents
                        </p>
                        <p style={{ 
                          fontSize: '12px', 
                          color: '#718096', 
                          marginTop: '4px', 
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                        }}>
                          {ALLOWED_FILE_TYPES.join(', ')} • Max 50MB each • Up to {MAX_FILES_PER_UPLOAD} files
                        </p>
                      </label>
                    )}
                  </div>
                </div>

                {documents.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      marginBottom: '8px', 
                      color: '#e2e8f0',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>
                      Uploaded ({documents.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {documents.map((doc) => (
                        <div key={doc.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          background: '#0f1419',
                          borderRadius: '6px',
                          border: '1px solid #2d3748'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <FileText style={{ width: '16px', height: '16px', color: '#cbd5e0', flexShrink: 0 }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ 
                                fontSize: '14px', 
                                fontWeight: '500', 
                                color: '#f7fafc',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>{doc.name}</p>
                              <p style={{ 
                                fontSize: '12px', 
                                color: '#718096',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                              }}>
                                {new Date(doc.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#cbd5e0',
                              padding: '4px',
                              flexShrink: 0
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
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
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
                      color: '#718096',
                      marginTop: '80px'
                    }}>
                      <p style={{ 
                        fontSize: '16px', 
                        marginBottom: '8px', 
                        color: '#a0aec0', 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                      }}>
                        Ask a question
                      </p>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#718096', 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                      }}>
                        Type your message below
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
                          border: msg.role === 'user' ? 'none' : '1px solid #2d3748',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontSize: '15px',
                          lineHeight: '1.5'
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

                <div style={{
                  borderTop: '1px solid #2d3748',
                  padding: '16px',
                  display: 'flex',
                  gap: '8px',
                  background: '#0f1419',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px'
                }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask a question..."
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #2d3748',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#1a2332',
                      color: '#f7fafc',
                      outline: 'none',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #718096;
        }
      `}</style>
    </div>
  );
}
