"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkspaceLayout from "@/components/notion/WorkspaceLayout";
import PageEditor from "@/components/notion/PageEditor";
import TemplateGallery from "@/components/notion/TemplateGallery";
import Dashboard from "@/components/Dashboard";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateWorkspace, createPage, getPageTree, createBlock } from "@/lib/notion/page-utils";
import type { Template } from "@/lib/notion/types";

function WorkspaceContent() {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userName, setUserName] = useState("there");
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

      // Get user profile for name
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("business_name")
        .eq("id", user.id)
        .single();
      
      if (profile?.business_name) {
        setUserName(profile.business_name);
      }

      // Get or create workspace
      const workspace = await getOrCreateWorkspace(user.id);
      setWorkspaceId(workspace.id);
      
      // Check if there's a page ID in URL
      const pageId = searchParams.get("page");
      if (pageId) {
        setCurrentPageId(pageId);
        setShowDashboard(false);
      } else {
        // Get first page or show dashboard
        const pageTree = await getPageTree(workspace.id);
        if (pageTree.length === 0) {
          // Show dashboard for first-time users
          setShowDashboard(true);
        } else {
          // Show dashboard instead of first page
          setShowDashboard(true);
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
    setShowDashboard(false);
    router.push(`/workspace?page=${pageId}`);
  };

  const createPageFromTemplate = async (templateType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !workspaceId) return;

    const templateNames: { [key: string]: { title: string, blockType: string } } = {
      schedule: { title: "New Schedule", blockType: "schedule_generator" },
      email: { title: "Draft Email", blockType: "email_drafter" },
      invoice: { title: "New Invoice", blockType: "invoice_builder" },
      report: { title: "New Report", blockType: "report_generator" },
    };

    const template = templateNames[templateType];
    if (!template) return;

    const newPage = await createPage(
      workspaceId,
      user.id,
      template.title,
      undefined
    );

    await createBlock(
      newPage.id,
      template.blockType as any,
      {},
      undefined
    );

    setCurrentPageId(newPage.id);
    setShowDashboard(false);
    router.push(`/workspace?page=${newPage.id}`);
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
      {showDashboard ? (
        <Dashboard
          userName={userName}
          onCreateSchedule={() => createPageFromTemplate('schedule')}
          onDraftEmail={() => createPageFromTemplate('email')}
          onCreateInvoice={() => createPageFromTemplate('invoice')}
          onGenerateReport={() => createPageFromTemplate('report')}
          onBrowseAutomations={() => setShowTemplates(true)}
        />
      ) : currentPageId ? (
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

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-secondary">Loading workspace...</p>
        </div>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
