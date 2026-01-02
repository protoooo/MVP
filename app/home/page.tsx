'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, searchAPI, filesAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import FileUpload from '../components/FileUpload';
import SearchResults from '../components/SearchResults';
import FileCard from '../components/FileCard';
import { SearchResult, User, File } from '../types';
import { Database, LogOut, Files } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'files'>('files');

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const userData = await authAPI.getMe();
        setUser(userData);
        // Load all files on initial load
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
      setActiveTab('search');
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
    setSearchResults(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">BizMemory</h1>
                {user.business_name && (
                  <p className="text-sm text-text-secondary">{user.business_name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="btn-ghost flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar - Always Visible */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-border">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('files')}
              className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'files'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Files className="w-4 h-4" />
              All Files ({allFiles.length})
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Search Results
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Upload Files
            </button>
          </nav>
        </div>

        {/* Content Area */}
        {activeTab === 'files' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Your Files
              </h2>
              <button 
                onClick={loadAllFiles}
                className="btn-secondary text-sm"
              >
                Refresh
              </button>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
              </div>
            ) : allFiles.length > 0 ? (
              <div className="grid gap-4">
                {allFiles.map((file) => (
                  <FileCard key={file.id} file={file} onDelete={refreshFiles} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-text-secondary mb-2">No files uploaded yet</p>
                <p className="text-sm text-text-tertiary">
                  Upload your first file to get started
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <SearchResults 
            results={searchResults} 
            loading={loading} 
            onFileDeleted={refreshFiles}
          />
        )}

        {activeTab === 'upload' && (
          <FileUpload onUploadComplete={() => {
            loadAllFiles();
            setActiveTab('files');
          }} />
        )}
      </main>
    </div>
  );
}
