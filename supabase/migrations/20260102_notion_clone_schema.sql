-- Migration: Notion Clone Database Schema
-- Transform the application into a Notion-like workspace

-- ============================================
-- WORKSPACE TABLES
-- ============================================

-- Workspaces (top-level container)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT, -- emoji or icon name
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pages (hierarchical structure with unlimited nesting)
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES pages(id) ON DELETE CASCADE, -- NULL for root pages
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT, -- emoji or icon
  cover_image TEXT, -- URL to cover image
  position REAL NOT NULL DEFAULT 0, -- for ordering
  is_favorite BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_edited_by UUID REFERENCES auth.users(id),
  last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocks (content units within pages)
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE, -- for nested blocks
  type TEXT NOT NULL, -- 'text', 'heading1', 'heading2', 'heading3', 'bullet', 'number', 'toggle', 'quote', 'callout', 'code', 'image', 'file', 'video', 'audio', 'pdf', 'divider', 'toc', 'breadcrumb', 'link', 'synced', 'database', 'ai_writer', 'ai_summarizer', 'ai_improver', 'ai_brainstorm'
  content JSONB NOT NULL DEFAULT '{}', -- block-specific content and properties
  position REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DATABASE TABLES (for database blocks)
-- ============================================

-- Databases metadata
CREATE TABLE IF NOT EXISTS databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE, -- database can be a full page
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE, -- or an inline block
  name TEXT NOT NULL DEFAULT 'Untitled Database',
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database properties (columns)
CREATE TABLE IF NOT EXISTS database_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'text', 'number', 'select', 'multiselect', 'status', 'date', 'person', 'files', 'checkbox', 'url', 'email', 'phone', 'formula', 'relation', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'
  config JSONB DEFAULT '{}', -- property-specific config (options for select, formula, etc.)
  position REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database views (different ways to view the same data)
CREATE TABLE IF NOT EXISTS database_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'All',
  type TEXT NOT NULL, -- 'table', 'board', 'calendar', 'list', 'gallery'
  filters JSONB DEFAULT '[]',
  sorts JSONB DEFAULT '[]',
  groups JSONB DEFAULT '[]',
  visible_properties UUID[], -- array of property IDs
  is_default BOOLEAN DEFAULT FALSE,
  position REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database items (rows/cards)
CREATE TABLE IF NOT EXISTS database_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE, -- each item is also a page
  position REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database property values (cell data)
CREATE TABLE IF NOT EXISTS database_property_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES database_items(id) ON DELETE CASCADE,
  property_id UUID REFERENCES database_properties(id) ON DELETE CASCADE,
  value JSONB, -- actual value stored as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, property_id)
);

-- ============================================
-- COLLABORATION TABLES
-- ============================================

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- for threads
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shares (sharing permissions)
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  share_url TEXT UNIQUE NOT NULL,
  permission_level TEXT NOT NULL, -- 'full_access', 'can_edit', 'can_comment', 'can_view'
  public BOOLEAN DEFAULT FALSE, -- if true, anyone with link can access
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Page permissions (user-specific)
CREATE TABLE IF NOT EXISTS page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL, -- 'full_access', 'can_edit', 'can_comment', 'can_view'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id, user_id)
);

-- Active page sessions (for real-time presence)
CREATE TABLE IF NOT EXISTS page_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_position JSONB,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'meeting', 'project', 'wiki', 'roadmap', etc.
  icon TEXT,
  is_builtin BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  template_data JSONB NOT NULL, -- page structure and blocks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRASH (for 30-day restore)
-- ============================================

CREATE TABLE IF NOT EXISTS trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL, -- 'page', 'block', 'database_item'
  item_id UUID NOT NULL,
  item_data JSONB NOT NULL, -- snapshot of deleted item
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restore_before TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- ============================================
-- INDEXES
-- ============================================

-- Workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

-- Pages
CREATE INDEX IF NOT EXISTS idx_pages_workspace ON pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_position ON pages(workspace_id, position);
CREATE INDEX IF NOT EXISTS idx_pages_favorite ON pages(workspace_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at DESC);

-- Blocks
CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parent_block_id);
CREATE INDEX IF NOT EXISTS idx_blocks_position ON blocks(page_id, position);
CREATE INDEX IF NOT EXISTS idx_blocks_type ON blocks(type);

-- Databases
CREATE INDEX IF NOT EXISTS idx_databases_page ON databases(page_id);
CREATE INDEX IF NOT EXISTS idx_databases_block ON databases(block_id);
CREATE INDEX IF NOT EXISTS idx_database_properties_database ON database_properties(database_id);
CREATE INDEX IF NOT EXISTS idx_database_views_database ON database_views(database_id);
CREATE INDEX IF NOT EXISTS idx_database_items_database ON database_items(database_id);
CREATE INDEX IF NOT EXISTS idx_database_property_values_item ON database_property_values(item_id);

-- Collaboration
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page_id);
CREATE INDEX IF NOT EXISTS idx_comments_block ON comments(block_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(resolved);
CREATE INDEX IF NOT EXISTS idx_shares_page ON shares(page_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_page ON page_permissions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_permissions_user ON page_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_page_sessions_page ON page_sessions(page_id);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_builtin ON templates(is_builtin);

-- Trash
CREATE INDEX IF NOT EXISTS idx_trash_restore_before ON trash(restore_before);
CREATE INDEX IF NOT EXISTS idx_trash_deleted_by ON trash(deleted_by);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_databases_updated_at BEFORE UPDATE ON databases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_properties_updated_at BEFORE UPDATE ON database_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_views_updated_at BEFORE UPDATE ON database_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_edited_at and last_edited_by on pages
CREATE OR REPLACE FUNCTION update_page_last_edited()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pages 
  SET 
    last_edited_at = NOW(),
    last_edited_by = NEW.created_by
  WHERE id = NEW.page_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update page when blocks are modified
CREATE TRIGGER update_page_on_block_change AFTER INSERT OR UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION update_page_last_edited();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_property_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trash ENABLE ROW LEVEL SECURITY;

-- Workspace policies (owner can do anything)
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their workspaces" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their workspaces" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- Page policies (based on workspace ownership and permissions)
CREATE POLICY "Users can view pages in their workspace" ON pages
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create pages in their workspace" ON pages
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update pages they have access to" ON pages
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid() AND permission_level IN ('full_access', 'can_edit'))
  );

CREATE POLICY "Users can delete pages in their workspace" ON pages
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Block policies (inherit from page)
CREATE POLICY "Users can view blocks in accessible pages" ON blocks
  FOR SELECT USING (
    page_id IN (
      SELECT id FROM pages WHERE 
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create blocks in accessible pages" ON blocks
  FOR INSERT WITH CHECK (
    page_id IN (
      SELECT id FROM pages WHERE 
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid() AND permission_level IN ('full_access', 'can_edit'))
    )
  );

CREATE POLICY "Users can update blocks in editable pages" ON blocks
  FOR UPDATE USING (
    page_id IN (
      SELECT id FROM pages WHERE 
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid() AND permission_level IN ('full_access', 'can_edit'))
    )
  );

CREATE POLICY "Users can delete blocks in their workspace pages" ON blocks
  FOR DELETE USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments on accessible pages" ON comments
  FOR SELECT USING (
    page_id IN (
      SELECT id FROM pages WHERE 
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments on pages they can comment on" ON comments
  FOR INSERT WITH CHECK (
    page_id IN (
      SELECT id FROM pages WHERE 
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid() AND permission_level IN ('full_access', 'can_edit', 'can_comment'))
    )
  );

-- Add workspace_id to user_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
  END IF;
END $$;

-- Comments
COMMENT ON TABLE workspaces IS 'Top-level workspace container (one per user/team)';
COMMENT ON TABLE pages IS 'Hierarchical pages with unlimited nesting';
COMMENT ON TABLE blocks IS 'Content blocks within pages';
COMMENT ON TABLE databases IS 'Database blocks with multiple views';
COMMENT ON TABLE database_properties IS 'Database column definitions';
COMMENT ON TABLE database_views IS 'Different views of database data';
COMMENT ON TABLE database_items IS 'Database rows/cards';
COMMENT ON TABLE database_property_values IS 'Actual cell data';
COMMENT ON TABLE comments IS 'Comments on blocks and pages';
COMMENT ON TABLE shares IS 'Sharing links for pages';
COMMENT ON TABLE templates IS 'Page templates (built-in and custom)';
COMMENT ON TABLE trash IS 'Deleted items with 30-day restore window';
