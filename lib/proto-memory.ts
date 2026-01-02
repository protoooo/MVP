// Proto Memory System
// Unified memory management for the adaptive Proto agent

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper to create Supabase client
function getSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface ProtoMemory {
  id?: string;
  user_id: string;
  memory_type: 'business_context' | 'preference' | 'relationship' | 'process' | 'goal';
  category?: 'team' | 'customer' | 'financial' | 'operational';
  key: string;
  value: any;
  importance?: number; // 1-10
  last_accessed?: Date;
  access_count?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProtoConversation {
  id?: string;
  user_id: string;
  thread_id: string;
  title?: string;
  started_at?: Date;
  last_message_at?: Date;
  message_count?: number;
  tags?: string[];
  metadata?: any;
  created_at?: Date;
}

export interface Workspace {
  id?: string;
  user_id: string;
  type: 'whiteboard' | 'task_board' | 'document_review';
  name: string;
  data: any;
  collaborators?: string[];
  created_at?: Date;
  updated_at?: Date;
}

// ========================================
// PROTO MEMORY FUNCTIONS
// ========================================

/**
 * Store or update a memory for Proto
 */
export async function storeProtoMemory(
  userId: string,
  memoryType: ProtoMemory['memory_type'],
  key: string,
  value: any,
  category?: ProtoMemory['category'],
  importance: number = 5
): Promise<ProtoMemory | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("proto_memory")
    .upsert({
      user_id: userId,
      memory_type: memoryType,
      key: key,
      value: value,
      category: category,
      importance: importance,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,memory_type,key'
    })
    .select()
    .single();

  if (error) {
    console.error("Error storing Proto memory:", error);
    return null;
  }

  return data;
}

/**
 * Retrieve a specific memory
 */
export async function getProtoMemory(
  userId: string,
  memoryType: ProtoMemory['memory_type'],
  key: string
): Promise<ProtoMemory | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("proto_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("memory_type", memoryType)
    .eq("key", key)
    .single();

  if (error) {
    console.error("Error retrieving Proto memory:", error);
    return null;
  }

  // Update last_accessed and access_count
  if (data) {
    await supabase
      .from("proto_memory")
      .update({ 
        last_accessed: new Date().toISOString(),
        access_count: (data.access_count || 0) + 1
      })
      .eq("id", data.id);
  }

  return data;
}

/**
 * Get all memories for Proto, optionally filtered by type or category
 */
export async function getProtoMemories(
  userId: string,
  memoryType?: ProtoMemory['memory_type'],
  category?: ProtoMemory['category']
): Promise<ProtoMemory[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("proto_memory")
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false });

  if (memoryType) {
    query = query.eq("memory_type", memoryType);
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error retrieving Proto memories:", error);
    return [];
  }

  return data || [];
}

/**
 * Get most important memories for Proto (top N by importance)
 */
export async function getImportantMemories(
  userId: string,
  limit: number = 10
): Promise<ProtoMemory[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("proto_memory")
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("last_accessed", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error retrieving important memories:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete a specific memory
 */
export async function deleteProtoMemory(
  userId: string,
  memoryType: ProtoMemory['memory_type'],
  key: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("proto_memory")
    .delete()
    .eq("user_id", userId)
    .eq("memory_type", memoryType)
    .eq("key", key);

  if (error) {
    console.error("Error deleting Proto memory:", error);
    return false;
  }

  return true;
}

/**
 * Store onboarding data as Proto memories
 */
export async function storeOnboardingMemories(
  userId: string,
  onboardingData: {
    businessType: string;
    challenges: string;
    goals: string;
    teamSize: string;
    timeConsumers: string;
  }
): Promise<boolean> {
  const memories = [
    {
      type: 'business_context' as const,
      key: 'business_type',
      value: onboardingData.businessType,
      category: 'operational' as const,
      importance: 10,
    },
    {
      type: 'business_context' as const,
      key: 'daily_challenges',
      value: onboardingData.challenges,
      category: 'operational' as const,
      importance: 9,
    },
    {
      type: 'goal' as const,
      key: 'business_goals',
      value: onboardingData.goals,
      category: 'operational' as const,
      importance: 10,
    },
    {
      type: 'business_context' as const,
      key: 'team_size',
      value: onboardingData.teamSize,
      category: 'team' as const,
      importance: 8,
    },
    {
      type: 'business_context' as const,
      key: 'time_consumers',
      value: onboardingData.timeConsumers,
      category: 'operational' as const,
      importance: 9,
    },
  ];

  for (const memory of memories) {
    await storeProtoMemory(
      userId,
      memory.type,
      memory.key,
      memory.value,
      memory.category,
      memory.importance
    );
  }

  return true;
}

// ========================================
// CONVERSATION FUNCTIONS
// ========================================

/**
 * Create or update a conversation thread
 */
export async function upsertProtoConversation(
  conversation: ProtoConversation
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("proto_conversations")
    .upsert(conversation)
    .select("id")
    .single();

  if (error) {
    console.error("Error upserting Proto conversation:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get conversation by thread_id
 */
export async function getProtoConversation(
  userId: string,
  threadId: string
): Promise<ProtoConversation | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("proto_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .single();

  if (error) {
    console.error("Error retrieving Proto conversation:", error);
    return null;
  }

  return data;
}

/**
 * Get recent conversations for a user
 */
export async function getRecentConversations(
  userId: string,
  limit: number = 20
): Promise<ProtoConversation[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("proto_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error retrieving recent conversations:", error);
    return [];
  }

  return data || [];
}

// ========================================
// WORKSPACE FUNCTIONS
// ========================================

/**
 * Create a new workspace
 */
export async function createWorkspace(
  workspace: Workspace
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workspaces")
    .insert(workspace)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating workspace:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(
  workspaceId: string
): Promise<Workspace | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (error) {
    console.error("Error retrieving workspace:", error);
    return null;
  }

  return data;
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(
  userId: string,
  type?: Workspace['type']
): Promise<Workspace[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error retrieving user workspaces:", error);
    return [];
  }

  return data || [];
}

/**
 * Update workspace data
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Workspace>
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("workspaces")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) {
    console.error("Error updating workspace:", error);
    return false;
  }

  return true;
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(
  workspaceId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) {
    console.error("Error deleting workspace:", error);
    return false;
  }

  return true;
}
