'use client';

import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, Lock, RefreshCw } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [documents, setDocuments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if already authenticated in session
    const savedPassword = sessionStorage.getItem('adminPassword');
    if (savedPassword) {
      setPassword(savedPassword);
      setAuthenticated(true);
      loadDocuments(savedPassword);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      alert('Please enter a password');
      return;
    }
    
    // Store in session
    sessionStorage.setItem('adminPassword', password);
    setAuthenticated(true);
    loadDocuments(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPassword');
    setAuthenticated(false);
    setPassword('');
    setDocuments([]);
  };

  const loadDocuments = async (pwd) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/upload-pdf', {
        method: 'GET',
        headers: {
          'x-admin-password': pwd
        }
      });

      if (response.status === 401) {
        setError('Invalid password');
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();
      setDocuments(data.files || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    setUploadProgress({ current: 0, total: files.length, fileName: '', error: null });
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      console.log(`📤 Uploading file ${i + 1}/${files.length}:`, file.name);
      setUploadProgress({ 
        current: i, 
        total: files.length, 
        fileName: file.name,
        error: null 
      });
      
      if (file.size > MAX_FILE_SIZE) {
        console.warn('⚠️ File too large:', file.name);
        setUploadProgress({ 
          current: i, 
          total: files.length, 
          fileName: file.name,
          error: `${file.name} is too large (max 50MB)` 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);

        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          headers: {
            'x-admin-password': password
          },
          body: formData
        });

        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          handleLogout();
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload');
        }

        console.log('✅ File uploaded successfully');
        
        setUploadProgress({ 
          current: i + 1, 
          total: files.length, 
          fileName: file.name,
          error: null 
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error('❌ Error uploading document:', err);
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
    loadDocuments(password);
  };

  const handleDeleteDocument = async (fileName) => {
    if (!confirm(`Delete ${fileName}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/upload-pdf', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ fileName })
      });

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      console.log('✅ Document deleted');
      setDocuments(documents.filter(doc => doc.name !== fileName));
    } catch (err) {
      console.error('❌ Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1419',
        padding: '16px'
      }}>
        <form onSubmit={handleLogin} style={{
          maxWidth: '400px',
          width: '100%',
          padding: '32px',
          background: '#1a2332',
          borderRadius: '8px',
          border: '1px solid #2d3748'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Lock size={48} style={{ color: '#48bb78', margin: '0 auto 16px' }} />
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#f7fafc',
              marginBottom: '8px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Admin Panel
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Enter password to manage knowledge base
            </p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #2d3748',
              borderRadius: '6px',
              fontSize: '14px',
              background: '#0f1419',
              color: '#f7fafc',
              outline: 'none',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              marginBottom: '16px'
            }}
          />

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: '#48bb78',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1419',
      padding: '16px'
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
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          background: '#1a2332',
          borderRadius: '8px',
          border: '1px solid #2d3748',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#f7fafc',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Knowledge Base Manager
            </h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => loadDocuments(password)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: '#2d3748',
                  color: '#f7fafc',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: loading ? 0.5 : 1
                }}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#f56565',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

          <div style={{
            border: '2px dashed #4a5568',
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
              accept=".txt,.md,.pdf"
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
                  color: '#48bb78',
                  margin: '0 auto 8px'
                }} />
                <p style={{ 
                  fontSize: '16px', 
                  color: '#cbd5e0', 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  marginBottom: '4px'
                }}>
                  Click to upload compliance documents
                </p>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#718096', 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
                }}>
                  PDF, TXT, MD • Max 50MB each
                </p>
              </label>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #2d3748',
              borderTop: '3px solid #48bb78',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : documents.length > 0 ? (
          <div style={{
            background: '#1a2332',
            borderRadius: '8px',
            border: '1px solid #2d3748',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#f7fafc',
              marginBottom: '16px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Documents ({documents.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc) => (
                <div key={doc.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#0f1419',
                  borderRadius: '6px',
                  border: '1px solid #2d3748'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <FileText style={{ width: '20px', height: '20px', color: '#48bb78', flexShrink: 0 }} />
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
                        {(doc.size / 1024).toFixed(1)} KB • Modified {new Date(doc.modified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.name)}
                    style={{
                      background: '#742a2a',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#feb2b2',
                      padding: '6px',
                      flexShrink: 0,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            background: '#1a2332',
            borderRadius: '8px',
            border: '1px solid #2d3748',
            padding: '40px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#a0aec0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              No documents uploaded yet
            </p>
          </div>
        )}
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
