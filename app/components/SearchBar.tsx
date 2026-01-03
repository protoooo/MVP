'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Clock, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const history = localStorage.getItem('search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      const newHistory = [trimmedQuery, ...searchHistory.filter(h => h !== trimmedQuery)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('search_history', JSON.stringify(newHistory));
      
      onSearch(trimmedQuery);
      setShowHistory(false);
    }
  };

  const handleSearchFromHistory = (historyQuery: string) => {
    setQuery(historyQuery);
    onSearch(historyQuery);
    setShowHistory(false);
  };

  const removeFromHistory = (historyQuery: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(h => h !== historyQuery);
    setSearchHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('search_history');
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative transition-all duration-200 ${isFocused ? 'ring-2 ring-brand/20' : ''}`}>
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <Search className="w-5 h-5 text-text-tertiary" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setShowHistory(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowHistory(false), 200);
            }}
            placeholder="Search documents... (Cmd+K)"
            className="w-full pl-12 pr-28 py-3.5 text-sm rounded-lg border border-border bg-surface text-text-primary
                       placeholder:text-text-placeholder
                       focus:border-brand focus:outline-none
                       transition-all duration-200"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 rounded-md text-sm font-medium text-white bg-brand hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {showHistory && searchHistory.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-elevated">
            <div className="flex items-center gap-2 text-xs font-medium text-text-tertiary">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Searches</span>
            </div>
            <button
              onClick={clearHistory}
              className="text-xs text-text-secondary hover:text-brand transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {searchHistory.map((historyQuery, idx) => (
              <button
                key={idx}
                onClick={() => handleSearchFromHistory(historyQuery)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-elevated transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Clock className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  <span className="text-sm text-text-primary truncate">{historyQuery}</span>
                </div>
                <button
                  onClick={(e) => removeFromHistory(historyQuery, e)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-surface rounded transition-all"
                >
                  <X className="w-3.5 h-3.5 text-text-tertiary" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
