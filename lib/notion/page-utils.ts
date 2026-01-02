// Utilities for working with Notion-like pages and blocks

import { createClient } from '@/lib/supabase/client';
import type { 
  Page, 
  Block, 
  BlockType, 
  PageTreeNode,
  Workspace,
  Database,
  DatabaseProperty,
  DatabaseView,
  DatabaseItem
} from './types';

/**
 * Get or create workspace for user
 */
export async function getOrCreateWorkspace(userId: string): Promise<Workspace> {
  const supabase = createClient();
  
  // Check if user already has a workspace
  const { data: existingWorkspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .single();
  
  if (existingWorkspace) {
    return existingWorkspace;
  }
  
  // Create new workspace
  const { data: newWorkspace, error } = await supabase
    .from('workspaces')
    .insert({
      name: 'My Workspace',
      icon: '🏢',
      owner_id: userId
    })
    .select()
    .single();
  
  if (error) throw error;
  return newWorkspace;
}

/**
 * Create a new page
 */
export async function createPage(
  workspaceId: string,
  userId: string,
  title: string = 'Untitled',
  parentId?: string
): Promise<Page> {
  const supabase = createClient();
  
  // Get position for new page
  const { data: siblings } = await supabase
    .from('pages')
    .select('position')
    .eq('workspace_id', workspaceId)
    .eq('parent_id', parentId || null)
    .order('position', { ascending: false })
    .limit(1);
  
  const position = siblings && siblings.length > 0 ? siblings[0].position + 1 : 0;
  
  const { data, error } = await supabase
    .from('pages')
    .insert({
      workspace_id: workspaceId,
      parent_id: parentId,
      title,
      position,
      created_by: userId,
      last_edited_by: userId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get page by ID with blocks
 */
export async function getPageWithBlocks(pageId: string): Promise<{
  page: Page;
  blocks: Block[];
}> {
  const supabase = createClient();
  
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .single();
  
  if (pageError) throw pageError;
  
  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('*')
    .eq('page_id', pageId)
    .order('position', { ascending: true });
  
  if (blocksError) throw blocksError;
  
  return { page, blocks: blocks || [] };
}

/**
 * Create a new block in a page
 */
export async function createBlock(
  pageId: string,
  type: BlockType,
  content: Record<string, any> = {},
  parentBlockId?: string
): Promise<Block> {
  const supabase = createClient();
  
  // Get position for new block
  const query = supabase
    .from('blocks')
    .select('position')
    .eq('page_id', pageId);
  
  if (parentBlockId) {
    query.eq('parent_block_id', parentBlockId);
  } else {
    query.is('parent_block_id', null);
  }
  
  const { data: siblings } = await query
    .order('position', { ascending: false })
    .limit(1);
  
  const position = siblings && siblings.length > 0 ? siblings[0].position + 1 : 0;
  
  const { data, error } = await supabase
    .from('blocks')
    .insert({
      page_id: pageId,
      parent_block_id: parentBlockId,
      type,
      content,
      position
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a block's content
 */
export async function updateBlock(
  blockId: string,
  updates: Partial<Block>
): Promise<Block> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('blocks')
    .update(updates)
    .eq('id', blockId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete a block
 */
export async function deleteBlock(blockId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('id', blockId);
  
  if (error) throw error;
}

/**
 * Get all pages in workspace as a tree structure
 */
export async function getPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  const supabase = createClient();
  
  const { data: pages, error } = await supabase
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true });
  
  if (error) throw error;
  
  // Build tree structure
  const pageMap = new Map<string, PageTreeNode>();
  const rootPages: PageTreeNode[] = [];
  
  // First pass: create all nodes
  pages?.forEach(page => {
    pageMap.set(page.id, { ...page, children: [] });
  });
  
  // Second pass: build tree
  pages?.forEach(page => {
    const node = pageMap.get(page.id)!;
    if (page.parent_id) {
      const parent = pageMap.get(page.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      rootPages.push(node);
    }
  });
  
  return rootPages;
}

/**
 * Move page to a new parent or position
 */
export async function movePage(
  pageId: string,
  newParentId: string | null,
  newPosition: number
): Promise<Page> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pages')
    .update({
      parent_id: newParentId,
      position: newPosition
    })
    .eq('id', pageId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Toggle favorite status of a page
 */
export async function toggleFavorite(pageId: string): Promise<Page> {
  const supabase = createClient();
  
  // Get current status
  const { data: page } = await supabase
    .from('pages')
    .select('is_favorite')
    .eq('id', pageId)
    .single();
  
  const { data, error } = await supabase
    .from('pages')
    .update({ is_favorite: !page?.is_favorite })
    .eq('id', pageId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update page title
 */
export async function updatePageTitle(
  pageId: string,
  title: string,
  userId: string
): Promise<Page> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pages')
    .update({
      title,
      last_edited_by: userId,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', pageId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update page icon
 */
export async function updatePageIcon(
  pageId: string,
  icon: string,
  userId: string
): Promise<Page> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pages')
    .update({
      icon,
      last_edited_by: userId,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', pageId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update page cover image
 */
export async function updatePageCover(
  pageId: string,
  coverImage: string,
  userId: string
): Promise<Page> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pages')
    .update({
      cover_image: coverImage,
      last_edited_by: userId,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', pageId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete a page (move to trash)
 */
export async function deletePage(
  pageId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  
  // Get page data before deleting
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .single();
  
  if (page) {
    // Move to trash
    await supabase
      .from('trash')
      .insert({
        item_type: 'page',
        item_id: pageId,
        item_data: page,
        deleted_by: userId
      });
  }
  
  // Delete the page (cascade will delete blocks)
  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('id', pageId);
  
  if (error) throw error;
}

/**
 * Search pages by title or content
 */
export async function searchPages(
  workspaceId: string,
  query: string
): Promise<Page[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .ilike('title', `%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  return data || [];
}

/**
 * Get recent pages
 */
export async function getRecentPages(
  workspaceId: string,
  limit: number = 10
): Promise<Page[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

/**
 * Get favorite pages
 */
export async function getFavoritePages(workspaceId: string): Promise<Page[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_favorite', true)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * Reorder blocks
 */
export async function reorderBlocks(
  blockUpdates: Array<{ id: string; position: number }>
): Promise<void> {
  const supabase = createClient();
  
  // Update all blocks in parallel
  await Promise.all(
    blockUpdates.map(({ id, position }) =>
      supabase
        .from('blocks')
        .update({ position })
        .eq('id', id)
    )
  );
}

/**
 * Duplicate a page
 */
export async function duplicatePage(
  pageId: string,
  workspaceId: string,
  userId: string
): Promise<Page> {
  const supabase = createClient();
  
  // Get original page and blocks
  const { page, blocks } = await getPageWithBlocks(pageId);
  
  // Create new page
  const newPage = await createPage(
    workspaceId,
    userId,
    `${page.title} (Copy)`,
    page.parent_id || undefined
  );
  
  // Duplicate all blocks
  if (blocks.length > 0) {
    const newBlocks = blocks.map(block => ({
      page_id: newPage.id,
      type: block.type,
      content: block.content,
      position: block.position
    }));
    
    await supabase.from('blocks').insert(newBlocks);
  }
  
  return newPage;
}
