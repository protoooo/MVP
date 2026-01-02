'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  
  const suggestions = [
    "Show me tax documents from 2018",
    "Find before photos of the Johnson property",
    "Get all invoices over $5000",
    "Show me employee training documents",
    "Find expense receipts from last quarter"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything... 'Show me tax documents from 2018' or 'Find photos from 2019'"
            className="w-full pl-12 pr-24 py-4 text-base rounded-lg border-2 border-border bg-surface text-text-primary
                       placeholder:text-text-placeholder
                       focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none
                       transition-all duration-200"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-sm text-text-tertiary">Try:</span>
        {suggestions.slice(0, 3).map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(suggestion);
              onSearch(suggestion);
            }}
            className="text-sm text-text-secondary hover:text-brand px-2 py-1 rounded hover:bg-surface-elevated transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
