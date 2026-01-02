'use client';

import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const suggestions = [
    "tax documents from 2018",
    "before photos Johnson property",
    "invoices over $5000",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative transition-all duration-200 ${isFocused ? 'ring-2 ring-brand/20' : ''}`}>
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <Search className="w-5 h-5 text-text-tertiary" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything... 'Show me tax documents from 2018'"
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
      
      {!isFocused && !query && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-text-tertiary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(suggestion);
                  onSearch(suggestion);
                }}
                className="px-2.5 py-1 rounded-md text-text-secondary bg-surface-elevated border border-border hover:border-brand/50 hover:text-brand transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
