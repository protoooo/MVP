// Team and Workspace Management Utilities
// Handles workspace creation, member invites, and team collaboration

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper to create Supabase client
function getSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  subscription_status: string;
  max_members: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  email: string;
  display_name?: string;
  joined_at: Date;
  last_active?: Date;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  invited_by: string;
  token: string;
  status: "pending" | "accepted" | "declined" | "expired";
  expires_at: Date;
  created_at: Date;
}

export interface SharedOutput {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  content: string;
  output_type: string;
  tool_type: string;
  shared_with: string[];
  metadata?: any;
  related_documents?: any[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TeamTask {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assigned_to?: string;
  due_date?: Date;
  source?: string;
  related_output_id?: string;
  tags?: string[];
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ========================================
// WORKSPACE FUNCTIONS
// ========================================

/**
 * Get workspace for a user
 */
export async function getUserWorkspace(userId: string): Promise<Workspace | null> {
  const supabase = getSupabaseClient();

  // Check if user owns a workspace
  const { data: ownedWorkspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)
    .single();

  if (ownedWorkspace) {
    return ownedWorkspace;
  }

  // Check if user is a member of a workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return null;
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single();

  return workspace;
}

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Error fetching workspace members:", error);
    return [];
  }

  return data || [];
}

/**
 * Check if workspace can accept more members
 */
export async function canAddMember(workspaceId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("max_members")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return false;

  const { count } = await supabase
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  return (count || 0) < workspace.max_members;
}

// ========================================
// INVITE FUNCTIONS
// ========================================

/**
 * Create an invite for a new team member
 */
export async function createInvite(
  workspaceId: string,
  email: string,
  invitedBy: string
): Promise<{ invite: WorkspaceInvite | null; error?: string }> {
  const supabase = getSupabaseClient();

  // Check if workspace can accept more members
  const canAdd = await canAddMember(workspaceId);
  if (!canAdd) {
    return { invite: null, error: "Workspace has reached maximum member limit (5)" };
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .single();

  if (existingMember) {
    return { invite: null, error: "User is already a member of this workspace" };
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabase
    .from("workspace_invites")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return { invite: null, error: "An invite has already been sent to this email" };
  }

  // Generate unique token
  const token = `invite_${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`;
  
  // Create invite (expires in 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email: email,
      invited_by: invitedBy,
      token: token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating invite:", error);
    return { invite: null, error: "Failed to create invite" };
  }

  return { invite: data };
}

/**
 * Accept an invite
 */
export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; workspaceId?: string; error?: string }> {
  const supabase = getSupabaseClient();

  // Find the invite
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (inviteError || !invite) {
    return { success: false, error: "Invalid or expired invite" };
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("workspace_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return { success: false, error: "Invite has expired" };
  }

  // Check if email matches
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { success: false, error: "This invite was sent to a different email address" };
  }

  // Check if workspace can still accept members
  const canAdd = await canAddMember(invite.workspace_id);
  if (!canAdd) {
    return { success: false, error: "Workspace has reached maximum member limit" };
  }

  // Add user as member
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: invite.workspace_id,
      user_id: userId,
      role: "member",
      email: userEmail,
    });

  if (memberError) {
    console.error("Error adding member:", memberError);
    return { success: false, error: "Failed to join workspace" };
  }

  // Update invite status
  await supabase
    .from("workspace_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  // Log activity
  await supabase.rpc("log_workspace_activity", {
    p_workspace_id: invite.workspace_id,
    p_user_id: userId,
    p_activity_type: "member_joined",
    p_title: `${userEmail} joined the team`,
  });

  return { success: true, workspaceId: invite.workspace_id };
}

/**
 * Get pending invites for a workspace
 */
export async function getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invites:", error);
    return [];
  }

  return data || [];
}

// ========================================
// SHARED OUTPUT FUNCTIONS
// ========================================

/**
 * Share an output with the team
 */
export async function shareOutput(
  workspaceId: string,
  userId: string,
  output: {
    title: string;
    content: string;
    output_type: string;
    tool_type: string;
    metadata?: any;
    related_documents?: any[];
    shared_with?: string[]; // empty array = share with all
  }
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("shared_outputs")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      ...output,
      shared_with: output.shared_with || [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error sharing output:", error);
    return null;
  }

  // Log activity
  await supabase.rpc("log_workspace_activity", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_activity_type: "output_shared",
    p_title: `Shared: ${output.title}`,
    p_related_id: data.id,
    p_related_type: "output",
  });

  return data.id;
}

/**
 * Get shared outputs for a workspace
 */
export async function getSharedOutputs(
  workspaceId: string,
  userId: string,
  filters?: {
    tool_type?: string;
    output_type?: string;
    created_by?: string;
    pinned_only?: boolean;
  }
): Promise<SharedOutput[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("shared_outputs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_archived", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.tool_type) {
    query = query.eq("tool_type", filters.tool_type);
  }

  if (filters?.output_type) {
    query = query.eq("output_type", filters.output_type);
  }

  if (filters?.created_by) {
    query = query.eq("created_by", filters.created_by);
  }

  if (filters?.pinned_only) {
    query = query.eq("is_pinned", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching shared outputs:", error);
    return [];
  }

  return data || [];
}

// ========================================
// TASK FUNCTIONS
// ========================================

/**
 * Create a task
 */
export async function createTask(
  workspaceId: string,
  userId: string,
  task: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    assigned_to?: string;
    due_date?: Date;
    source?: string;
    related_output_id?: string;
    tags?: string[];
  }
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("team_tasks")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      ...task,
      due_date: task.due_date?.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating task:", error);
    return null;
  }

  // Log activity
  await supabase.rpc("log_workspace_activity", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_activity_type: "task_created",
    p_title: `New task: ${task.title}`,
    p_related_id: data.id,
    p_related_type: "task",
  });

  return data.id;
}

/**
 * Get tasks for a workspace
 */
export async function getTasks(
  workspaceId: string,
  filters?: {
    status?: string;
    assigned_to?: string;
    priority?: string;
    source?: string;
  }
): Promise<TeamTask[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("team_tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.source) {
    query = query.eq("source", filters.source);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data || [];
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: "pending" | "in_progress" | "completed" | "cancelled"
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const updateData: any = { status };
  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("team_tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) {
    console.error("Error updating task:", error);
    return false;
  }

  // Log activity if completed
  if (status === "completed") {
    const { data: task } = await supabase
      .from("team_tasks")
      .select("workspace_id, title")
      .eq("id", taskId)
      .single();

    if (task) {
      await supabase.rpc("log_workspace_activity", {
        p_workspace_id: task.workspace_id,
        p_user_id: userId,
        p_activity_type: "task_completed",
        p_title: `Completed: ${task.title}`,
        p_related_id: taskId,
        p_related_type: "task",
      });
    }
  }

  return true;
}

// ========================================
// ACTIVITY FEED
// ========================================

/**
 * Get activity feed for a workspace
 */
export async function getActivityFeed(
  workspaceId: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("activity_feed")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching activity feed:", error);
    return [];
  }

  return data || [];
}
