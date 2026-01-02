"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "./Sidebar";
import QuickFind from "./QuickFind";
import { getOrCreateWorkspace } from "@/lib/notion/page-utils";
import type { Workspace } from "@/lib/notion/types";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  currentPageId?: string;
  onPageSelect?: (pageId: string) => void;
  onShowTemplates?: () => void;
}

export default function WorkspaceLayout({
  children,
  currentPageId,
  onPageSelect,
  onShowTemplates
}: WorkspaceLayoutProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showQuickFind, setShowQuickFind] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    initializeWorkspace();
  }, []);

  useEffect(() => {
    // Handle Cmd+K / Ctrl+K to open Quick Find
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowQuickFind(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const initializeWorkspace = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const ws = await getOrCreateWorkspace(user.id);
      setWorkspace(ws);
    } catch (error) {
      console.error("Error initializing workspace:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-secondary">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-text-secondary">No workspace found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        workspaceId={workspace.id}
        currentPageId={currentPageId}
        onPageSelect={onPageSelect}
        onShowTemplates={onShowTemplates}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Quick Find Modal (Cmd+K) */}
      {showQuickFind && workspace && (
        <QuickFind
          workspaceId={workspace.id}
          onClose={() => setShowQuickFind(false)}
          onPageSelect={(pageId) => {
            if (onPageSelect) onPageSelect(pageId);
            setShowQuickFind(false);
          }}
        />
      )}
    </div>
  );
}
