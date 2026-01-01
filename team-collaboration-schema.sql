-- Team Collaboration and Workspace Schema
-- Enables up to 5 employees per subscription to collaborate

-- ========================================
-- WORKSPACE AND TEAM MANAGEMENT
-- ========================================

-- Table: workspaces
-- The main workspace that represents a business/subscription
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'trial'
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: workspace_members
-- Team members who have access to a workspace
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id)
);

-- Table: workspace_invites
-- Pending invites to join a workspace
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_workspace_invite UNIQUE (workspace_id, email)
);

-- ========================================
-- SHARED WORK AND COLLABORATION
-- ========================================

-- Table: shared_outputs
-- Work outputs that can be shared with team members
CREATE TABLE IF NOT EXISTS shared_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  output_type VARCHAR(100) NOT NULL, -- 'report', 'task_list', 'analysis', 'draft', 'summary'
  tool_type VARCHAR(50) NOT NULL, -- 'operations', 'financial', 'hr', etc.
  
  -- Sharing
  shared_with JSONB DEFAULT '[]', -- Array of user_ids, empty means shared with all
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  related_documents JSONB DEFAULT '[]',
  
  -- Status
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: shared_output_comments
-- Comments on shared outputs for collaboration
CREATE TABLE IF NOT EXISTS shared_output_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_output_id UUID NOT NULL REFERENCES shared_outputs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: team_tasks
-- Tasks that can be assigned to team members
CREATE TABLE IF NOT EXISTS team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  source VARCHAR(100), -- Which tool generated this task
  related_output_id UUID REFERENCES shared_outputs(id) ON DELETE SET NULL,
  tags JSONB DEFAULT '[]',
  
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: activity_feed
-- Activity log for the workspace
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  activity_type VARCHAR(100) NOT NULL, -- 'output_created', 'task_completed', 'document_uploaded', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- References
  related_id UUID, -- ID of the related object (task, output, etc.)
  related_type VARCHAR(50), -- 'task', 'output', 'document'
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_shared_outputs_workspace ON shared_outputs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_output_comments_output ON shared_output_comments(shared_output_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_workspace ON team_tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned ON team_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_activity_feed_workspace ON activity_feed(workspace_id, created_at DESC);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_output_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Workspaces: Users can see workspaces they own or are members of
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update workspaces they own"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- Workspace Members: Members can view other members in their workspace
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage members"
  ON workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Workspace Invites: Owners can manage invites
CREATE POLICY "Workspace owners can manage invites"
  ON workspace_invites FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Invited users can view their invites"
  ON workspace_invites FOR SELECT
  USING (email = auth.email());

-- Shared Outputs: Workspace members can view shared outputs
CREATE POLICY "Workspace members can view shared outputs"
  ON shared_outputs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND (
      shared_with = '[]'::jsonb OR
      shared_with ? auth.uid()::text
    ) AND NOT is_archived
  );

CREATE POLICY "Users can create shared outputs in their workspace"
  ON shared_outputs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own shared outputs"
  ON shared_outputs FOR UPDATE
  USING (created_by = auth.uid());

-- Shared Output Comments: Workspace members can comment
CREATE POLICY "Workspace members can view comments"
  ON shared_output_comments FOR SELECT
  USING (
    shared_output_id IN (
      SELECT id FROM shared_outputs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can create comments"
  ON shared_output_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    shared_output_id IN (
      SELECT id FROM shared_outputs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Team Tasks: Workspace members can view and manage tasks
CREATE POLICY "Workspace members can view tasks"
  ON team_tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create tasks"
  ON team_tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update tasks they created or are assigned to"
  ON team_tasks FOR UPDATE
  USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Activity Feed: Workspace members can view activity
CREATE POLICY "Workspace members can view activity feed"
  ON activity_feed FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity in their workspace"
  ON activity_feed FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at();

CREATE TRIGGER update_shared_outputs_updated_at
  BEFORE UPDATE ON shared_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at();

CREATE TRIGGER update_team_tasks_updated_at
  BEFORE UPDATE ON team_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at();

-- Function to automatically create workspace for new users
CREATE OR REPLACE FUNCTION create_workspace_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create workspace
  INSERT INTO workspaces (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    NEW.id
  )
  RETURNING id INTO new_workspace_id;
  
  -- Add owner as first member
  INSERT INTO workspace_members (workspace_id, user_id, role, email, display_name)
  VALUES (
    new_workspace_id,
    NEW.id,
    'owner',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create workspace on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_workspace_for_new_user();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_workspace_activity(
  p_workspace_id UUID,
  p_user_id UUID,
  p_activity_type VARCHAR,
  p_title VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
    workspace_id,
    user_id,
    activity_type,
    title,
    description,
    related_id,
    related_type
  ) VALUES (
    p_workspace_id,
    p_user_id,
    p_activity_type,
    p_title,
    p_description,
    p_related_id,
    p_related_type
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- HELPER VIEWS
-- ========================================

-- View: workspace_stats
CREATE OR REPLACE VIEW workspace_stats AS
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.owner_id,
  COUNT(DISTINCT wm.user_id) as member_count,
  COUNT(DISTINCT so.id) as shared_outputs_count,
  COUNT(DISTINCT tt.id) FILTER (WHERE tt.status != 'completed') as active_tasks_count,
  COUNT(DISTINCT tt.id) FILTER (WHERE tt.status = 'completed') as completed_tasks_count,
  MAX(af.created_at) as last_activity_at
FROM workspaces w
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
LEFT JOIN shared_outputs so ON so.workspace_id = w.id AND NOT so.is_archived
LEFT JOIN team_tasks tt ON tt.workspace_id = w.id
LEFT JOIN activity_feed af ON af.workspace_id = w.id
GROUP BY w.id, w.name, w.owner_id;

-- ========================================
-- NOTES
-- ========================================

/*
WORKSPACE LIMITS:
- Each subscription supports up to 5 members (including owner)
- Check member count before allowing new invites
- Enforce in application code and via constraints

INVITE FLOW:
1. Owner sends invite via email
2. Invite record created with unique token and expiry (7 days)
3. Recipient clicks invite link
4. If not registered, they sign up first
5. Token validated and workspace_member record created
6. Invite status updated to 'accepted'

COLLABORATION FEATURES:
- Shared outputs: Any member can share their work
- Comments: Team can discuss shared outputs
- Tasks: Can be created by tools or manually, assigned to members
- Activity feed: Real-time feed of workspace activity

CLEANUP:
- Expired invites can be deleted after 30 days
- Archived outputs can be hidden but kept for audit
- Completed tasks older than 90 days can be archived
*/
