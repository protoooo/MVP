"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkspaceLayout from "@/components/notion/WorkspaceLayout";
import PageEditor from "@/components/notion/PageEditor";
import TemplateGallery from "@/components/notion/TemplateGallery";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateWorkspace, createPage, getPageTree, createBlock } from "@/lib/notion/page-utils";
import type { Template } from "@/lib/notion/types";

export default function WorkspacePage() {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
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
      setWorkspaceId(workspace.id);
      
      // Check if there's a page ID in URL
      const pageId = searchParams.get("page");
      if (pageId) {
        setCurrentPageId(pageId);
      } else {
        // Get first page or create one
        const pageTree = await getPageTree(workspace.id);
        if (pageTree.length === 0) {
          // Show templates for first-time users
          setShowTemplates(true);
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

  const handleTemplateSelect = async (template: Template) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !workspaceId) return;

    // Create page from template
    const newPage = await createPage(
      workspaceId,
      user.id,
      template.template_data.page.title || "Untitled",
      undefined
    );

    // Add blocks from template
    for (const blockTemplate of template.template_data.blocks) {
      if (blockTemplate.type) {
        await createBlock(
          newPage.id,
          blockTemplate.type,
          blockTemplate.content || {},
          undefined
        );
      }
    }

    setShowTemplates(false);
    setCurrentPageId(newPage.id);
    router.push(`/workspace?page=${newPage.id}`);
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

  if (showTemplates) {
    return (
      <TemplateGallery
        onSelect={handleTemplateSelect}
        onClose={() => {
          setShowTemplates(false);
          // Create blank page if no templates selected
          if (!currentPageId && workspaceId) {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) {
                createPage(workspaceId, user.id, "Getting Started").then(page => {
                  setCurrentPageId(page.id);
                  router.push(`/workspace?page=${page.id}`);
                });
              }
            });
          }
        }}
      />
    );
  }

  return (
    <WorkspaceLayout
      currentPageId={currentPageId || undefined}
      onPageSelect={handlePageSelect}
      onShowTemplates={() => setShowTemplates(true)}
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
