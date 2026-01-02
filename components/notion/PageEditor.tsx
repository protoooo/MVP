"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Page, Block as BlockType, BlockType as BType } from "@/lib/notion/types";
import {
  getPageWithBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  updatePageTitle,
  updatePageIcon,
  updatePageCover
} from "@/lib/notion/page-utils";
import Block from "./Block";
import { Star, MoreHorizontal, Image as ImageIcon, Smile } from "lucide-react";
import { motion } from "framer-motion";

interface PageEditorProps {
  pageId: string;
}

export default function PageEditor({ pageId }: PageEditorProps) {
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (pageId) {
      loadPage();
    }
  }, [pageId]);

  const loadPage = async () => {
    try {
      setLoading(true);
      const { page: loadedPage, blocks: loadedBlocks } = await getPageWithBlocks(pageId);
      setPage(loadedPage);
      setBlocks(loadedBlocks);
      setTitle(loadedPage.title);
    } catch (error) {
      console.error("Error loading page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleTitleBlur = async () => {
    if (title !== page?.title && page) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await updatePageTitle(pageId, title, user.id);
        await loadPage();
      }
    }
  };

  const handleUpdateBlock = async (blockId: string, content: Record<string, any>) => {
    try {
      await updateBlock(blockId, { content });
      await loadPage();
    } catch (error) {
      console.error("Error updating block:", error);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await deleteBlock(blockId);
      await loadPage();
    } catch (error) {
      console.error("Error deleting block:", error);
    }
  };

  const handleCreateBelow = async (afterId: string) => {
    try {
      const afterIndex = blocks.findIndex(b => b.id === afterId);
      const newPosition = afterIndex >= 0 ? blocks[afterIndex].position + 0.5 : blocks.length;
      
      await createBlock(pageId, "text", { text: "" });
      await loadPage();
    } catch (error) {
      console.error("Error creating block:", error);
    }
  };

  const handleTypeChange = async (blockId: string, type: BType) => {
    try {
      await updateBlock(blockId, { type });
      await loadPage();
    } catch (error) {
      console.error("Error changing block type:", error);
    }
  };

  const handleAddBlock = async () => {
    try {
      await createBlock(pageId, "text", { text: "" });
      await loadPage();
    } catch (error) {
      console.error("Error adding block:", error);
    }
  };

  const handleIconClick = async () => {
    // Simple emoji picker - in production, use a proper emoji picker
    const emoji = prompt("Enter an emoji:");
    if (emoji && page) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await updatePageIcon(pageId, emoji, user.id);
        await loadPage();
      }
    }
  };

  const handleCoverClick = async () => {
    const url = prompt("Enter cover image URL:");
    if (url && page) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await updatePageCover(pageId, url, user.id);
        await loadPage();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-secondary">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-text-secondary">Page not found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-8 sm:px-16 py-8">
        {/* Cover Image */}
        {page.cover_image ? (
          <div className="relative -mx-8 sm:-mx-16 mb-8 group">
            <img
              src={page.cover_image}
              alt="Cover"
              className="w-full h-64 object-cover"
            />
            <button
              onClick={handleCoverClick}
              className="absolute bottom-4 right-4 px-3 py-1.5 bg-surface/90 backdrop-blur-sm
                border border-border rounded-md text-xs font-medium text-text-primary
                opacity-0 group-hover:opacity-100 transition"
            >
              Change cover
            </button>
          </div>
        ) : (
          <button
            onClick={handleCoverClick}
            className="group -mx-8 sm:-mx-16 mb-8 w-full h-32 border-2 border-dashed border-border
              hover:border-indigo-300 rounded-lg flex items-center justify-center
              opacity-0 hover:opacity-100 transition"
          >
            <div className="flex items-center gap-2 text-text-tertiary">
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm">Add cover</span>
            </div>
          </button>
        )}

        {/* Icon */}
        <div className="mb-4">
          {page.icon ? (
            <button
              onClick={handleIconClick}
              className="text-6xl hover:bg-background-secondary rounded-lg p-2 transition"
            >
              {page.icon}
            </button>
          ) : (
            <button
              onClick={handleIconClick}
              className="flex items-center gap-2 px-3 py-2 hover:bg-background-secondary rounded-lg transition text-text-tertiary"
            >
              <Smile className="w-4 h-4" />
              <span className="text-sm">Add icon</span>
            </button>
          )}
        </div>

        {/* Title */}
        <div className="mb-8">
          <textarea
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Untitled"
            className="w-full bg-transparent border-none outline-none resize-none
              text-4xl font-bold text-text-primary placeholder-text-tertiary
              overflow-hidden"
            rows={1}
            style={{ minHeight: "3rem" }}
          />
        </div>

        {/* Blocks */}
        <div className="space-y-1">
          {blocks.length === 0 ? (
            <div className="text-text-tertiary text-sm py-4">
              <p className="mb-2">Empty page. Start typing or press '/' for commands.</p>
              <button
                onClick={handleAddBlock}
                className="text-indigo-600 hover:text-indigo-700"
              >
                Click here to add a block
              </button>
            </div>
          ) : (
            blocks.map((block) => (
              <Block
                key={block.id}
                block={block}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                onCreateBelow={handleCreateBelow}
                onTypeChange={handleTypeChange}
              />
            ))
          )}
        </div>

        {/* Add block button */}
        {blocks.length > 0 && (
          <button
            onClick={handleAddBlock}
            className="mt-2 text-text-tertiary hover:text-text-secondary text-sm flex items-center gap-2"
          >
            + Add a block
          </button>
        )}
      </div>
    </div>
  );
}
