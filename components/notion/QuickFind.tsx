"use client";

import { useState, useEffect, useRef } from "react";
import { Search, FileText, Plus, Clock, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { searchPages, getRecentPages, createPage, getOrCreateWorkspace } from "@/lib/notion/page-utils";
import type { Page } from "@/lib/notion/types";

interface QuickFindProps {
  workspaceId: string;
  onClose: () => void;
  onPageSelect: (pageId: string) => void;
  onCreatePage?: () => void;
}

export default function QuickFind({ workspaceId, onClose, onPageSelect, onCreatePage }: QuickFindProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Page[]>([]);
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
    
    // Load recent pages
    loadRecent();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (query.trim()) {
      handleSearch();
    } else {
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query]);

  const loadRecent = async () => {
    const recent = await getRecentPages(workspaceId, 5);
    setRecentPages(recent);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const pages = await searchPages(workspaceId, query);
      setResults(pages);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query.trim() ? results : recentPages;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex === items.length && query.trim()) {
        // Create new page
        handleCreatePage();
      } else if (items[selectedIndex]) {
        onPageSelect(items[selectedIndex].id);
        onClose();
      }
    }
  };

  const handleCreatePage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newPage = await createPage(workspaceId, user.id, query.trim() || "Untitled");
    onPageSelect(newPage.id);
    onClose();
  };

  const displayItems = query.trim() ? results : recentPages;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-24"
      onClick={onClose}
    >
      <div 
        className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-text-tertiary flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages or create new..."
              className="flex-1 bg-transparent text-base text-text-primary placeholder-text-tertiary
                outline-none border-none"
            />
            <kbd className="px-2 py-1 bg-background-secondary rounded text-xs text-text-tertiary font-mono">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {displayItems.length === 0 && !query.trim() && (
            <div className="p-8 text-center">
              <Clock className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-text-tertiary">No recent pages</p>
            </div>
          )}

          {displayItems.length === 0 && query.trim() && !loading && (
            <div className="p-8 text-center">
              <FileText className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-text-secondary mb-2">No pages found</p>
              <p className="text-xs text-text-tertiary">Press Enter to create a new page</p>
            </div>
          )}

          {!query.trim() && recentPages.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Recent Pages
              </div>
              {recentPages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => {
                    onPageSelect(page.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition
                    ${selectedIndex === index 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "hover:bg-background-secondary"
                    }`}
                >
                  <span className="text-lg flex-shrink-0">{page.icon || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {page.title}
                    </div>
                  </div>
                  {page.is_favorite && (
                    <Star className="w-4 h-4 text-honey-500 fill-honey-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {query.trim() && results.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Search Results
              </div>
              {results.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => {
                    onPageSelect(page.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition
                    ${selectedIndex === index 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "hover:bg-background-secondary"
                    }`}
                >
                  <span className="text-lg flex-shrink-0">{page.icon || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {page.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Create New Page Option */}
          {query.trim() && (
            <div className="border-t border-border">
              <button
                onClick={handleCreatePage}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition
                  ${selectedIndex === displayItems.length 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "hover:bg-background-secondary"
                  }`}
              >
                <Plus className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    Create page "{query}"
                  </span>
                </div>
                <kbd className="px-2 py-1 bg-background-secondary rounded text-xs text-text-tertiary font-mono">
                  ↵
                </kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
