'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, searchAPI, filesAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import FileUpload from '../components/FileUpload';
import SearchResults from '../components/SearchResults';
import FileCard from '../components/FileCard';
import { SearchResult, User, File } from '../types';
import { Database, LogOut, Files, Upload, Search, Clock, HardDrive, Settings, Menu, X } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'files' | 'upload' | 'search'>('files');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authAPI.getMe();
        setUser(userData);
        loadAllFiles();
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const loadAllFiles = async () => {
    try {
      setLoading(true);
      const response = await filesAPI.list(1, 50);
      setAllFiles(response.files);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const results = await searchAPI.search(query);
      setSearchResults(results);
      setActiveView('search');
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  const refreshFiles = () => {
    loadAllFiles();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
      </div>
    );
  }

  const storageUsed = allFiles.reduce((acc, file) => acc + file.file_size, 0);
  const storageUsedMB = (storageUsed / (1024 * 1024)).toFixed(2);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-border bg-surface flex flex-col`}>
        {sidebarOpen && (
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-text-primary">BizMemory</h1>
                  {user.business_name && (
                    <p className="text-xs text-text-tertiary">{user.business_name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              <button
                onClick={() => setActiveView('files')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'files'
                    ? 'bg-brand/10 text-brand'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                <Files className="w-5 h-5" />
                <span>All Files</span>
                <span className="ml-auto text-xs bg-surface-elevated px-2 py-0.5 rounded-full">
                  {allFiles.length}
                </span>
              </button>

              <button
                onClick={() => setActiveView('upload')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'upload'
                    ? 'bg-brand/10 text-brand'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Upload</span>
              </button>

              <button
                onClick={() => setActiveView('search')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeView === 'search'
                    ? 'bg-brand/10 text-brand'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                <Search className="w-5 h-5" />
                <span>Search</span>
              </button>
            </nav>

            {/* Storage Info */}
            <div className="p-4 border-t border-border">
              <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-text-secondary">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-xs font-medium">Storage Used</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-text-primary">{storageUsedMB}</span>
                    <span className="text-xs text-text-tertiary">MB</span>
                  </div>
                  <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${Math.min((parseFloat(storageUsedMB) / 1024) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* User Section */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand text-sm font-medium">
                      {user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-text-secondary" />
              ) : (
                <Menu className="w-5 h-5 text-text-secondary" />
              )}
            </button>

            <div className="flex-1 max-w-2xl">
              <SearchBar onSearch={handleSearch} loading={loading} />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeView === 'files' && (
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Your Files</h2>
                  <p className="text-sm text-text-secondary">
                    {allFiles.length} {allFiles.length === 1 ? 'file' : 'files'} stored
                  </p>
                </div>
                <button 
                  onClick={loadAllFiles}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Refresh
                </button>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
                </div>
              ) : allFiles.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allFiles.map((file) => (
                    <FileCard key={file.id} file={file} onDelete={refreshFiles} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4">
                    <Files className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">No files yet</h3>
                  <p className="text-text-secondary mb-6">
                    Upload your first file to get started with AI-powered search
                  </p>
                  <button
                    onClick={() => setActiveView('upload')}
                    className="btn-primary"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </button>
                </div>
              )}
            </div>
          )}

          {activeView === 'upload' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary mb-1">Upload Files</h2>
                <p className="text-sm text-text-secondary">
                  AI will automatically extract text, generate tags, and make your files searchable
                </p>
              </div>
              <FileUpload onUploadComplete={() => {
                loadAllFiles();
                setActiveView('files');
              }} />
            </div>
          )}

          {activeView === 'search' && (
            <div className="max-w-7xl mx-auto">
              <SearchResults 
                results={searchResults} 
                loading={loading} 
                onFileDeleted={refreshFiles}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
