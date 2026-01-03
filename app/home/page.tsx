'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, searchAPI, filesAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import FileUpload from '../components/FileUpload';
import SearchResults from '../components/SearchResults';
import FileCard from '../components/FileCard';
import FilePreviewModal from '../components/FilePreviewModal';
import AdvancedFilters, { FilterOptions } from '../components/AdvancedFilters';
import KeyboardShortcuts, { useKeyboardShortcuts } from '../components/KeyboardShortcuts';
import { SearchResult, User, File } from '../types';
import { Database, LogOut, Files, Upload, Search, HardDrive, Menu, X, CheckSquare, Square, Download, Trash2, Keyboard as KeyboardIcon } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'files' | 'upload' | 'search'>('files');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());

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
      const response = await filesAPI.list(1, 100);
      setAllFiles(response.files);
      setFilteredFiles(response.files);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setLoading(true);
    setActiveView('search');
    setCurrentQuery(query);
    try {
      const results = await searchAPI.search(query);
      console.log('Search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        results: [],
        total: 0,
        query_understanding: {
          intent: 'retrieve',
          documentTypes: [],
          entities: { dates: [], amounts: [], names: [], locations: [] },
          keywords: []
        },
        extractedAnswer: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters: FilterOptions) => {
    let filtered = [...allFiles];

    if (filters.fileTypes.length > 0) {
      filtered = filtered.filter(file => 
        filters.fileTypes.some(type => file.file_type.includes(type))
      );
    }

    if (filters.dateRange.start) {
      filtered = filtered.filter(file => 
        new Date(file.uploaded_at) >= new Date(filters.dateRange.start!)
      );
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(file => 
        new Date(file.uploaded_at) <= new Date(filters.dateRange.end!)
      );
    }

    if (filters.sizeRange.min !== undefined) {
      filtered = filtered.filter(file => file.file_size >= filters.sizeRange.min!);
    }
    if (filters.sizeRange.max !== undefined) {
      filtered = filtered.filter(file => file.file_size <= filters.sizeRange.max!);
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(file => 
        file.tags?.some(tag => filters.tags.includes(tag))
      );
    }

    if (filters.category) {
      filtered = filtered.filter(file => file.category === filters.category);
    }

    setFilteredFiles(filtered);
  };

  const handleExportResults = () => {
    const filesToExport = activeView === 'search' 
      ? searchResults?.results || [] 
      : filteredFiles;

    const csvContent = [
      ['Filename', 'Size', 'Type', 'Uploaded', 'Category', 'Tags', 'Description'].join(','),
      ...filesToExport.map(file => [
        file.original_filename,
        file.file_size,
        file.file_type,
        file.uploaded_at,
        file.category || '',
        file.tags?.join(';') || '',
        file.ai_description?.replace(/,/g, ';') || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protocollm-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBatchDownload = async () => {
    for (const fileId of selectedFiles) {
      const file = allFiles.find(f => f.id === fileId);
      if (file) {
        const a = document.createElement('a');
        a.href = filesAPI.getDownloadUrl(fileId);
        a.download = file.original_filename;
        a.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) return;
    
    try {
      for (const fileId of selectedFiles) {
        await filesAPI.delete(fileId);
      }
      setSelectedFiles(new Set());
      setSelectionMode(false);
      loadAllFiles();
    } catch (error) {
      console.error('Error deleting files:', error);
    }
  };

  const toggleSelection = (fileId: number) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  useKeyboardShortcuts({
    onNavigateFiles: () => setActiveView('files'),
    onNavigateUpload: () => setActiveView('upload'),
    onNavigateSearch: () => setActiveView('search'),
    onSelectAll: selectAll,
    onDeselectAll: deselectAll,
    onDownload: () => selectedFiles.size > 0 && handleBatchDownload(),
    onDelete: () => selectedFiles.size > 0 && handleBatchDelete(),
    onExport: handleExportResults,
    onShowShortcuts: () => setShowShortcuts(true),
  });

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

  // FIXED: Calculate storage correctly with validation
  const storageUsedBytes = allFiles.reduce((acc, file) => {
    // Ensure file_size is a valid number and not null/undefined
    const fileSize = parseInt(String(file.file_size || 0), 10);
    
    // Sanity check: ignore any file claiming to be > 10GB (likely corrupt data)
    if (fileSize > 10 * 1024 * 1024 * 1024) {
      console.warn(`Ignoring corrupt file size for ${file.original_filename}: ${fileSize} bytes`);
      return acc;
    }
    
    // Additional validation for negative or NaN values
    if (fileSize < 0 || isNaN(fileSize)) {
      console.warn(`Invalid file size for ${file.original_filename}: ${fileSize}`);
      return acc;
    }
    
    return acc + fileSize;
  }, 0);

  const formatStorage = (bytes: number): string => {
    // Additional validation
    if (!bytes || bytes < 0 || !isFinite(bytes)) {
      return '0 B';
    }
    
    if (bytes < 1024) return bytes.toFixed(0) + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TB';
  };

  const availableTags = Array.from(new Set(allFiles.flatMap(f => f.tags || [])));
  const availableCategories = Array.from(new Set(allFiles.map(f => f.category).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-border bg-surface flex flex-col`}>
        {sidebarOpen && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-text-primary">
                    protocol<span className="text-brand">LM</span>
                  </h1>
                  {user.business_name && (
                    <p className="text-xs text-text-tertiary">{user.business_name}</p>
                  )}
                </div>
              </div>
            </div>

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

            <div className="p-4 border-t border-border">
              <div className="bg-surface-elevated rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-text-secondary">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-xs font-medium">Storage Used</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-text-primary">
                    {formatStorage(storageUsedBytes)}
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">Unlimited available</p>
                </div>
              </div>
            </div>

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
        {/* Header */}
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

            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
              title="Keyboard shortcuts"
            >
              <KeyboardIcon className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* All Files View */}
          {activeView === 'files' && (
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Your Documents</h2>
                  <p className="text-sm text-text-secondary">
                    {filteredFiles.length} {filteredFiles.length === 1 ? 'document' : 'documents'} 
                    {filteredFiles.length !== allFiles.length && ` (filtered from ${allFiles.length})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFiles.size > 0 && (
                    <>
                      <button 
                        onClick={handleBatchDownload}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download ({selectedFiles.size})
                      </button>
                      <button 
                        onClick={handleBatchDelete}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      if (selectionMode) setSelectedFiles(new Set());
                    }}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {selectionMode ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    {selectionMode ? 'Cancel' : 'Select'}
                  </button>
                  <AdvancedFilters 
                    onFilterChange={handleFilterChange}
                    availableTags={availableTags}
                    availableCategories={availableCategories}
                  />
                  <button 
                    onClick={loadAllFiles}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Refresh
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
                </div>
              ) : filteredFiles.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      onDelete={refreshFiles}
                      onPreview={() => setPreviewFile(file)}
                      isSelected={selectedFiles.has(file.id)}
                      onSelect={(selected) => toggleSelection(file.id)}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4">
                    <Files className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {allFiles.length === 0 ? 'No documents yet' : 'No documents match filters'}
                  </h3>
                  <p className="text-text-secondary mb-6">
                    {allFiles.length === 0 
                      ? 'Upload your first document to get started'
                      : 'Try adjusting your filters to see more results'
                    }
                  </p>
                  {allFiles.length === 0 && (
                    <button
                      onClick={() => setActiveView('upload')}
                      className="btn-primary"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Documents
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload View */}
          {activeView === 'upload' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary mb-1">Upload Documents</h2>
                <p className="text-sm text-text-secondary">
                  Upload any document and search it instantly with natural language
                </p>
              </div>
              <FileUpload onUploadComplete={() => {
                loadAllFiles();
                setActiveView('files');
              }} />
            </div>
          )}

          {/* Search View */}
          {activeView === 'search' && (
            <div className="max-w-7xl mx-auto">
              {searchResults && searchResults.results.length > 0 && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleExportResults}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Results
                  </button>
                </div>
              )}
              <SearchResults 
                results={searchResults} 
                query={currentQuery}
                loading={loading} 
                onFileDeleted={refreshFiles}
              />
            </div>
          )}
        </div>
      </main>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          allFiles={filteredFiles}
          onClose={() => setPreviewFile(null)}
          onDelete={refreshFiles}
          onNavigate={(file) => setPreviewFile(file)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
