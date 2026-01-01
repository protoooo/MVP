// Agent Memory and Document Storage Utilities
// This module provides functions for managing agent memory, document embeddings, and run logs

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper to create Supabase client
function getSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface AgentMemory {
  id?: string;
  user_id: string;
  agent_type: string;
  memory_key: string;
  memory_value: any;
  category?: string;
  importance?: number;
  last_accessed?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface AgentRunLog {
  id?: string;
  user_id: string;
  agent_type: string;
  run_type: string;
  user_input?: string;
  agent_output?: string;
  documents_used?: any[];
  documents_missing?: any[];
  tools_called?: any[];
  execution_time_ms?: number;
  tokens_used?: number;
  confidence_score?: number;
  user_feedback?: number;
  session_id?: string;
  metadata?: any;
  created_at?: Date;
}

export interface DocumentInsight {
  id?: string;
  user_id: string;
  document_id: string;
  agent_type: string;
  insight_type: string;
  insight_title: string;
  insight_description: string;
  severity?: string;
  related_documents?: any[];
  action_items?: any[];
  status?: string;
  resolved_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface CrossDocumentFinding {
  id?: string;
  user_id: string;
  finding_type: string;
  title: string;
  description: string;
  severity?: string;
  document_ids: any[];
  document_excerpts?: any;
  recommendations?: any[];
  suggested_actions?: any[];
  status?: string;
  reviewed_by_user?: boolean;
  resolved_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

// ========================================
// AGENT MEMORY FUNCTIONS
// ========================================

/**
 * Store or update a memory for an agent
 */
export async function storeAgentMemory(
  userId: string,
  agentType: string,
  memoryKey: string,
  memoryValue: any,
  category?: string,
  importance: number = 5
): Promise<AgentMemory | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("agent_memory")
    .upsert({
      user_id: userId,
      agent_type: agentType,
      memory_key: memoryKey,
      memory_value: memoryValue,
      category: category,
      importance: importance,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error storing agent memory:", error);
    return null;
  }

  return data;
}

/**
 * Retrieve a specific memory
 */
export async function getAgentMemory(
  userId: string,
  agentType: string,
  memoryKey: string
): Promise<AgentMemory | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("agent_type", agentType)
    .eq("memory_key", memoryKey)
    .single();

  if (error) {
    console.error("Error retrieving agent memory:", error);
    return null;
  }

  // Update last_accessed
  if (data) {
    await supabase
      .from("agent_memory")
      .update({ last_accessed: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

/**
 * Get all memories for an agent, optionally filtered by category
 */
export async function getAgentMemories(
  userId: string,
  agentType: string,
  category?: string
): Promise<AgentMemory[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("agent_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("agent_type", agentType)
    .order("importance", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error retrieving agent memories:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete a specific memory
 */
export async function deleteAgentMemory(
  userId: string,
  agentType: string,
  memoryKey: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("agent_memory")
    .delete()
    .eq("user_id", userId)
    .eq("agent_type", agentType)
    .eq("memory_key", memoryKey);

  if (error) {
    console.error("Error deleting agent memory:", error);
    return false;
  }

  return true;
}

// ========================================
// AGENT RUN LOG FUNCTIONS
// ========================================

/**
 * Log an agent execution
 */
export async function logAgentRun(runLog: AgentRunLog): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("agent_run_logs")
    .insert(runLog)
    .select("id")
    .single();

  if (error) {
    console.error("Error logging agent run:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get recent agent runs for a user
 */
export async function getRecentAgentRuns(
  userId: string,
  agentType?: string,
  limit: number = 50
): Promise<AgentRunLog[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("agent_run_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agentType) {
    query = query.eq("agent_type", agentType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error retrieving agent runs:", error);
    return [];
  }

  return data || [];
}

/**
 * Get agent performance metrics
 */
export async function getAgentMetrics(
  userId: string,
  agentType: string
): Promise<any> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("agent_activity_summary")
    .select("*")
    .eq("user_id", userId)
    .eq("agent_type", agentType)
    .single();

  if (error) {
    console.error("Error retrieving agent metrics:", error);
    return null;
  }

  return data;
}

// ========================================
// DOCUMENT INSIGHT FUNCTIONS
// ========================================

/**
 * Store a document insight
 */
export async function storeDocumentInsight(
  insight: DocumentInsight
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("document_insights")
    .insert(insight)
    .select("id")
    .single();

  if (error) {
    console.error("Error storing document insight:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get insights for a document
 */
export async function getDocumentInsights(
  userId: string,
  documentId: string,
  status?: string
): Promise<DocumentInsight[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("document_insights")
    .select("*")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error retrieving document insights:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all active insights for a user
 */
export async function getActiveInsights(
  userId: string,
  insightType?: string
): Promise<DocumentInsight[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("document_insights")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("severity", { ascending: false })
    .order("created_at", { ascending: false });

  if (insightType) {
    query = query.eq("insight_type", insightType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error retrieving active insights:", error);
    return [];
  }

  return data || [];
}

/**
 * Update insight status
 */
export async function updateInsightStatus(
  insightId: string,
  status: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const updateData: any = { status };
  if (status === "resolved") {
    updateData.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("document_insights")
    .update(updateData)
    .eq("id", insightId);

  if (error) {
    console.error("Error updating insight status:", error);
    return false;
  }

  return true;
}

// ========================================
// CROSS-DOCUMENT FINDING FUNCTIONS
// ========================================

/**
 * Store a cross-document finding
 */
export async function storeCrossDocumentFinding(
  finding: CrossDocumentFinding
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("cross_document_findings")
    .insert(finding)
    .select("id")
    .single();

  if (error) {
    console.error("Error storing cross-document finding:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get all active cross-document findings for a user
 */
export async function getCrossDocumentFindings(
  userId: string,
  findingType?: string,
  status?: string
): Promise<CrossDocumentFinding[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("cross_document_findings")
    .select("*")
    .eq("user_id", userId)
    .order("severity", { ascending: false })
    .order("created_at", { ascending: false });

  if (findingType) {
    query = query.eq("finding_type", findingType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error retrieving cross-document findings:", error);
    return [];
  }

  return data || [];
}

/**
 * Mark finding as reviewed
 */
export async function markFindingReviewed(
  findingId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("cross_document_findings")
    .update({ reviewed_by_user: true })
    .eq("id", findingId);

  if (error) {
    console.error("Error marking finding as reviewed:", error);
    return false;
  }

  return true;
}

// ========================================
// DOCUMENT UTILIZATION FUNCTIONS
// ========================================

/**
 * Get document usage statistics
 */
export async function getDocumentUtilization(
  userId: string
): Promise<any[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("document_utilization")
    .select("*")
    .eq("user_id", userId)
    .order("times_referenced", { ascending: false });

  if (error) {
    console.error("Error retrieving document utilization:", error);
    return [];
  }

  return data || [];
}

/**
 * Identify underutilized or missing document types
 */
export async function identifyMissingDocuments(
  userId: string,
  agentType: string
): Promise<string[]> {
  const supabase = getSupabaseClient();

  // Get all documents user has uploaded
  const { data: userDocs } = await supabase
    .from("business_documents")
    .select("document_type")
    .eq("user_id", userId);

  const uploadedTypes = new Set(userDocs?.map(d => d.document_type) || []);

  // Define ideal document types per agent
  const idealDocTypes: Record<string, string[]> = {
    operations: ["manual", "procedure", "policy", "report", "inspection"],
    "customer-support": ["policy", "faq", "manual"],
    hr: ["policy", "manual", "procedure"],
    inventory: ["inventory_data", "report"],
    financial: ["financial_data", "report"],
    document: ["contract", "agreement", "legal"],
  };

  const ideal = idealDocTypes[agentType] || [];
  const missing = ideal.filter(type => !uploadedTypes.has(type));

  return missing;
}
