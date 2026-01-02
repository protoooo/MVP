"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkspaceLayout from "@/components/notion/WorkspaceLayout";
import PageEditor from "@/components/notion/PageEditor";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateWorkspace, createPage, getPageTree } from "@/lib/notion/page-utils";

export default function WorkspacePage() {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    // Check for page ID in URL
    const pageId = searchParams.get("page");
    if (pageId) {
      setCurrentPageId(pageId);
    }
  }, [searchParams]);

  const initializePage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get or create workspace
      const workspace = await getOrCreateWorkspace(user.id);
      
      // Check if there's a page ID in URL
      const pageId = searchParams.get("page");
      if (pageId) {
        setCurrentPageId(pageId);
      } else {
        // Get first page or create one
        const pageTree = await getPageTree(workspace.id);
        if (pageTree.length === 0) {
          // Create first page
          const newPage = await createPage(workspace.id, user.id, "Getting Started");
          setCurrentPageId(newPage.id);
          router.push(`/workspace?page=${newPage.id}`);
        } else {
          // Use first page
          setCurrentPageId(pageTree[0].id);
          router.push(`/workspace?page=${pageTree[0].id}`);
        }
      }
    } catch (error) {
      console.error("Error initializing page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageSelect = (pageId: string) => {
    setCurrentPageId(pageId);
    router.push(`/workspace?page=${pageId}`);
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

  return (
    <WorkspaceLayout
      currentPageId={currentPageId || undefined}
      onPageSelect={handlePageSelect}
    >
      {currentPageId ? (
        <PageEditor pageId={currentPageId} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg text-text-secondary mb-2">No page selected</p>
            <p className="text-sm text-text-tertiary">Select a page from the sidebar or create a new one</p>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
