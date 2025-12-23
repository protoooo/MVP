// lib/conversationMemory.js - FIXED with better error handling
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

// ✅ FIX: Lazy initialization to prevent build-time errors
let supabaseClient = null

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

    const { data, error } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
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

    const { userMessage, assistantResponse, mode, meta, firstUseComplete } = interaction
    
    // Get existing memory
    const existing = await getUserMemory(userId)
    
    // Build memory update
    const memoryUpdate = {
      user_id: userId,
      last_interaction_type: mode,
      last_context: userMessage?.substring(0, 500) || '',
      interaction_count: (existing?.interaction_count || 0) + 1,
      updated_at: new Date().toISOString()
    }

    // Extract key topics from the conversation
    const topics = extractTopics(userMessage, assistantResponse)
    if (topics.length > 0) {
      const existingTopics = existing?.key_topics || []
      memoryUpdate.key_topics = mergeTopics(existingTopics, topics)
    }

    // Store metadata (include first-use flag safely, even if column is missing)
    const metadata = {
      ...(existing?.metadata || {}),
      ...(meta || {}),
    }

    const firstUseFlag = Boolean(
      firstUseComplete ||
      meta?.first_use_complete ||
      meta?.firstUseComplete ||
      existing?.metadata?.first_use_complete ||
      existing?.metadata?.firstUseComplete
    )

    if (firstUseFlag) {
      metadata.first_use_complete = true
    }

    if (Object.keys(metadata).length > 0) {
      memoryUpdate.metadata = metadata
    }

    // Upsert memory
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

/**
 * Generate context-aware greeting based on memory
 */
export function generateGreeting(memory) {
  if (!memory || memory.interaction_count === 0) {
    return null // No greeting for first-time users
  }

  const { last_interaction_type, key_topics, interaction_count } = memory
  
  const greetings = []

  // Recent interaction continuity
  if (last_interaction_type === 'vision') {
    greetings.push("Good to see you again. Need to check more photos?")
    greetings.push("Welcome back. Ready for another photo scan?")
  }

  // Topic-based greetings
  if (key_topics && Array.isArray(key_topics) && key_topics.length > 0) {
    const recentTopic = key_topics[key_topics.length - 1]
    if (recentTopic.includes('temperature')) {
      greetings.push("Hope those temperature logs are looking good. What can I help with?")
    }
    if (recentTopic.includes('cooler') || recentTopic.includes('walk-in')) {
      greetings.push("Back to check on storage? What's up?")
    }
    if (recentTopic.includes('prep') || recentTopic.includes('cross contamination')) {
      greetings.push("Keeping prep clean? What do you need?")
    }
  }

  // Interaction count milestones
  if (interaction_count === 10) {
    greetings.push("10 checks in! You're on top of it. What's next?")
  }
  if (interaction_count === 50) {
    greetings.push("50 scans completed. You're making this a habit—that's great. What do you need?")
  }

  // Generic returning user
  greetings.push("Welcome back. What can I check today?")
  greetings.push("Good to see you. What's going on?")

  // Return random greeting
  return greetings[Math.floor(Math.random() * greetings.length)]
}

/**
 * Extract key topics from conversation
 */
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

/**
 * Merge new topics with existing, keeping last 10
 */
function mergeTopics(existing, newTopics) {
  const combined = [...existing, ...newTopics]
  const unique = [...new Set(combined)]
  return unique.slice(-10) // Keep last 10 unique topics
}

/**
 * Build memory context for system prompt
 */
export function buildMemoryContext(memory) {
  if (!memory) return ''

  const { key_topics, interaction_count, last_interaction_type } = memory
  const firstUseComplete =
    memory.first_use_complete ||
    memory.metadata?.first_use_complete ||
    memory.metadata?.firstUseComplete
  
  // ✅ FIX: Don't generate greeting on first use
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
