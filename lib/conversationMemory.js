// lib/conversationMemory.js - FIXED: Use RPC instead of information_schema queries
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

let supabaseClient = null
let conversationSchema = null

function getSupabaseClient() {
  if (!supabaseClient) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Supabase credentials missing for memory system')
      return null
    }
    
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return supabaseClient
}

async function loadConversationSchema(supabase) {
  if (conversationSchema) return conversationSchema

  try {
    // ✅ FIXED: Test table existence by trying to query it
    const { error } = await supabase
      .from('conversation_memory')
      .select('id')
      .limit(0)

    if (error && error.code !== 'PGRST116') {
      logger.warn('conversation_memory table not accessible', { error: error.message })
      conversationSchema = { exists: false }
      return conversationSchema
    }

    // Table exists - assume modern schema with all columns
    conversationSchema = {
      exists: true,
      hasMetadata: true,
      hasKeyTopics: true,
      hasLastContext: true,
    }

    logger.info('Conversation memory schema loaded')
  } catch (err) {
    logger.warn('Conversation memory schema check failed', { error: err?.message })
    conversationSchema = { exists: false }
  }

  return conversationSchema
}

async function ensureUsageEventsTable(supabaseAdmin) {
  try {
    // ✅ FIXED: Test table existence by trying to query it
    const { error } = await supabaseAdmin
      .from('usage_events')
      .select('id')
      .limit(0)

    if (error && error.code !== 'PGRST116') {
      logger.warn('usage_events table not accessible')
      return false
    }

    return true
  } catch (err) {
    logger.warn('usage_events table check failed', { error: err?.message })
    return false
  }
}

/**
 * Get user's conversation memory
 */
export async function getUserMemory(userId) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      logger.warn('Memory system unavailable - Supabase not configured')
      return null
    }

    const schema = await loadConversationSchema(supabase)
    if (!schema?.exists) return null

    const { data, error } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch user memory', { error: error.message, userId })
      return null
    }

    return data
  } catch (error) {
    logger.error('Get user memory exception', { error: error.message, userId })
    return null
  }
}

/**
 * Update conversation memory after interaction
 */
export async function updateMemory(userId, interaction) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      logger.warn('Memory system unavailable - skipping update')
      return false
    }

    const schema = await loadConversationSchema(supabase)
    if (!schema?.exists) return false

    const { userMessage, assistantResponse, mode, meta, firstUseComplete } = interaction
    
    const existing = await getUserMemory(userId)
    
    const memoryUpdate = {
      user_id: userId,
      last_interaction_type: mode,
      last_context: userMessage?.substring(0, 500) || '',
      interaction_count: (existing?.interaction_count || 0) + 1,
      updated_at: new Date().toISOString()
    }

    const topics = extractTopics(userMessage, assistantResponse)
    if (topics.length > 0) {
      const existingTopics = existing?.key_topics || []
      if (schema.hasKeyTopics) {
        memoryUpdate.key_topics = mergeTopics(existingTopics, topics)
      }
    }

    const metadata = schema.hasMetadata
      ? {
          ...(existing?.metadata || {}),
          ...(meta || {}),
        }
      : null

    const firstUseFlag = Boolean(
      firstUseComplete ||
      meta?.first_use_complete ||
      meta?.firstUseComplete ||
      existing?.metadata?.first_use_complete ||
      existing?.metadata?.firstUseComplete
    )

    if (firstUseFlag && metadata) {
      metadata.first_use_complete = true
    }

    if (metadata && Object.keys(metadata).length > 0) {
      memoryUpdate.metadata = metadata
    }

    const { error } = await supabase
      .from('conversation_memory')
      .upsert(memoryUpdate, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })

    if (error) {
      logger.error('Failed to update memory', { error: error.message, userId })
      return false
    }

    logger.info('Memory updated', { 
      userId, 
      interactionCount: memoryUpdate.interaction_count,
      topics: topics.length 
    })
    
    return true
  } catch (error) {
    logger.error('Update memory exception', { error: error.message, userId })
    return false
  }
}

function extractTopics(userMessage, assistantResponse) {
  const topics = []
  const text = `${userMessage} ${assistantResponse}`.toLowerCase()

  const topicKeywords = {
    'temperature': ['temp', 'temperature', 'hot', 'cold', 'cooling', 'heating'],
    'cooler': ['cooler', 'walk-in', 'refrigerator', 'freezer'],
    'prep': ['prep', 'preparation', 'cutting board', 'knife'],
    'cross contamination': ['cross contamination', 'raw', 'cooked', 'separate'],
    'dishwashing': ['dish', 'sanitizer', 'three compartment', 'sink'],
    'handwashing': ['handwash', 'hand wash', 'soap'],
    'storage': ['storage', 'shelving', 'floor'],
    'labels': ['label', 'date mark', 'discard date'],
  }

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      topics.push(topic)
    }
  }

  return topics
}

function mergeTopics(existing, newTopics) {
  const combined = [...existing, ...newTopics]
  const unique = [...new Set(combined)]
  return unique.slice(-10)
}

export function buildMemoryContext(memory) {
  if (!memory) return ''

  const { key_topics, interaction_count, last_interaction_type } = memory
  const firstUseComplete =
    memory.first_use_complete ||
    memory.metadata?.first_use_complete ||
    memory.metadata?.firstUseComplete
  
  if (!firstUseComplete || interaction_count === 0) {
    return ''
  }

  let context = `User context: ${interaction_count} prior interactions. `

  if (last_interaction_type) {
    context += `Last interaction: ${last_interaction_type === 'vision' ? 'photo analysis' : 'text question'}. `
  }

  if (key_topics && key_topics.length > 0) {
    context += `Recent topics: ${key_topics.slice(-5).join(', ')}. `
  }

  return context
}
