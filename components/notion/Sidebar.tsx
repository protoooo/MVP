"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Menu, Search, Settings, Plus, Star, Trash2, FileText, ChevronRight, ChevronDown } from "lucide-react";
import type { PageTreeNode, Workspace } from "@/lib/notion/types";
import { getPageTree, createPage, toggleFavorite, getFavoritePages } from "@/lib/notion/page-utils";
import Link from "next/link";

interface SidebarProps {
  workspaceId: string;
  currentPageId?: string;
  onPageSelect?: (pageId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  workspaceId,
  currentPageId,
  onPageSelect,
  collapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [pageTree, setPageTree] = useState<PageTreeNode[]>([]);
  const [favoritePages, setFavoritePages] = useState<PageTreeNode[]>([]);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadWorkspace();
    loadPages();
    loadFavorites();
  }, [workspaceId]);

  const loadWorkspace = async () => {
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();
    
    if (data) setWorkspace(data);
  };

  const loadPages = async () => {
    const tree = await getPageTree(workspaceId);
    setPageTree(tree);
  };

  const loadFavorites = async () => {
    const favorites = await getFavoritePages(workspaceId);
    setFavoritePages(favorites as PageTreeNode[]);
  };

  const handleCreatePage = async (parentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newPage = await createPage(workspaceId, user.id, "Untitled", parentId);
    await loadPages();
    if (onPageSelect) onPageSelect(newPage.id);
  };

  const handleToggleFavorite = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(pageId);
    await loadFavorites();
    await loadPages();
  };

  const toggleExpanded = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const renderPageTree = (nodes: PageTreeNode[], depth: number = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedPages.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      const isActive = currentPageId === node.id;

      return (
        <div key={node.id}>
          <button
            onClick={() => onPageSelect?.(node.id)}
            className={`
              w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm
              hover:bg-background-secondary transition group
              ${isActive ? "bg-background-secondary text-text-primary" : "text-text-secondary"}
            `}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {hasChildren && (
              <button
                onClick={(e) => toggleExpanded(node.id, e)}
                className="flex-shrink-0 hover:bg-background-tertiary rounded p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            
            <span className="text-base flex-shrink-0">
              {node.icon || "📄"}
            </span>
            
            <span className="flex-1 truncate text-left">
              {node.title}
            </span>

            <button
              onClick={(e) => handleToggleFavorite(node.id, e)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-background-tertiary rounded p-0.5"
            >
              <Star 
                className={`w-3 h-3 ${node.is_favorite ? "fill-honey-500 text-honey-500" : ""}`}
              />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreatePage(node.id);
              }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-background-tertiary rounded p-0.5"
            >
              <Plus className="w-3 h-3" />
            </button>
          </button>

          {hasChildren && isExpanded && (
            <div>
              {renderPageTree(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (collapsed) {
    return (
      <div className="w-16 h-full bg-surface border-r border-border flex flex-col items-center py-4 gap-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-background-secondary rounded-md"
        >
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        
        <button className="p-2 hover:bg-background-secondary rounded-md">
          <Search className="w-5 h-5 text-text-secondary" />
        </button>
        
        <button 
          onClick={() => handleCreatePage()}
          className="p-2 hover:bg-background-secondary rounded-md"
        >
          <Plus className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-background-secondary rounded"
          >
            <Menu className="w-4 h-4 text-text-secondary" />
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1 hover:bg-background-secondary rounded"
              title="Search (⌘K)"
            >
              <Search className="w-4 h-4 text-text-secondary" />
            </button>
            
            <Link
              href="/dashboard/settings"
              className="p-1 hover:bg-background-secondary rounded"
            >
              <Settings className="w-4 h-4 text-text-secondary" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-xl">{workspace?.icon || "🏢"}</span>
          <span className="font-medium text-sm text-text-primary truncate">
            {workspace?.name || "Workspace"}
          </span>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="p-3 border-b border-border">
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-background-secondary rounded-md text-sm
              border border-border focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Favorites */}
        {favoritePages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-text-tertiary uppercase tracking-wider">
              <Star className="w-3 h-3" />
              Favorites
            </div>
            <div className="mt-1 space-y-0.5">
              {favoritePages.map(page => (
                <button
                  key={page.id}
                  onClick={() => onPageSelect?.(page.id)}
                  className={`
                    w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm
                    hover:bg-background-secondary transition
                    ${currentPageId === page.id ? "bg-background-secondary text-text-primary" : "text-text-secondary"}
                  `}
                >
                  <span className="text-base">{page.icon || "📄"}</span>
                  <span className="flex-1 truncate text-left">{page.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Private Pages */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Private
            </span>
            <button
              onClick={() => handleCreatePage()}
              className="p-0.5 hover:bg-background-secondary rounded"
            >
              <Plus className="w-3 h-3 text-text-tertiary" />
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {pageTree.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <FileText className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                <p className="text-xs text-text-tertiary mb-2">No pages yet</p>
                <button
                  onClick={() => handleCreatePage()}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Create your first page
                </button>
              </div>
            ) : (
              renderPageTree(pageTree)
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          href="/dashboard/trash"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-secondary
            hover:bg-background-secondary transition"
        >
          <Trash2 className="w-4 h-4" />
          Trash
        </Link>
      </div>
    </div>
  );
}
