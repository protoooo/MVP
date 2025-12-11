// lib/modelConfig.js - Simplified model configuration (no fallback)
import { logger } from './logger'

// Model configuration
export const MODEL_CONFIG = {
  CHAT: 'gpt-4o',
  VISION: 'gpt-4o',
  EMBEDDING: 'text-embedding-3-small',
}

// Generation parameters
export const GENERATION_PARAMS = {
  temperature: 0.1,
  top_p: 0.8,
  max_tokens: 1200,
  presence_penalty: 0,
  frequency_penalty: 0,
}

/**
 * Get model identifier
 * @param {string} type - Model type ('chat', 'vision', 'embedding')
 * @returns {string} - Model identifier
 */
export function getModel(type = 'chat') {
  if (type === 'embedding') {
    return MODEL_CONFIG.EMBEDDING
  }
  
  if (type === 'vision') {
    return MODEL_CONFIG.VISION
  }
  
  // Always use primary chat model
  const model = MODEL_CONFIG.CHAT
  logger.debug('Model selected', { type, model })
  return model
}

export default {
  MODEL_CONFIG,
  GENERATION_PARAMS,
  getModel,
}
