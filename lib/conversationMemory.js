// lib/conversationMemory.js - COMPLETE FILE with metadata column handling

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
    const { error } = await supabase
      .from('conversation_memory')
      .select('id')
      .limit(0)

    if (error && error.code !== 'PGRST116') {
      logger.warn('conversation_memory table not accessible', { error: error.message })
      conversationSchema = { exists: false }
      return conversationSchema
    }

    // Check which columns exist by trying a test query
    const { data: testRow } = await supabase
      .from('conversation_memory')
      .select('*')
      .limit(1)
      .maybeSingle()

    conversationSchema = {
      exists: true,
      hasMetadata: testRow ? 'metadata' in testRow : false,
      hasKeyTopics: testRow ? 'key_topics' in testRow : true,
      hasLastContext: testRow ? 'last_context' in testRow : true,
      hasFirstUseComplete: testRow ? 'first_use_complete' in testRow : false,
    }

    logger.info('Conversation memory schema loaded', conversationSchema)
  } catch (err) {
    logger.warn('Conversation memory schema check failed', { error: err?.message })
    conversationSchema = { exists: false }
  }

  return conversationSchema
}

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

    // Add key topics if supported
    const topics = extractTopics(userMessage, assistantResponse)
    if (topics.length > 0 && schema.hasKeyTopics) {
      const existingTopics = existing?.key_topics || []
      memoryUpdate.key_topics = mergeTopics(existingTopics, topics)
    }

    // Handle first_use_complete flag
    const firstUseFlag = Boolean(
      firstUseComplete ||
      meta?.first_use_complete ||
      meta?.firstUseComplete ||
      (schema.hasMetadata && existing?.metadata?.first_use_complete) ||
      (schema.hasMetadata && existing?.metadata?.firstUseComplete) ||
      (schema.hasFirstUseComplete && existing?.first_use_complete)
    )

    // Store metadata if column exists
    if (schema.hasMetadata) {
      const metadata = {
        ...(existing?.metadata || {}),
        ...(meta || {}),
      }

      if (firstUseFlag) {
        metadata.first_use_complete = true
      }

      if (Object.keys(metadata).length > 0) {
        memoryUpdate.metadata = metadata
      }
    }
    
    // Also store at root level if that column exists
    if (schema.hasFirstUseComplete && firstUseFlag) {
      memoryUpdate.first_use_complete = true
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
  
  // Check both locations for first_use_complete
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
