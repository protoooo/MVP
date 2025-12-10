// lib/modelConfig.js - Centralized model configuration with fallbacks
import { logger } from './logger'

// Primary and fallback models
export const MODEL_CONFIG = {
  // Primary model for chat
  PRIMARY_CHAT: 'gpt-4o',
  
  // Fallback if primary fails
  FALLBACK_CHAT: 'gpt-4o-mini',
  
  // Vision model (should support images)
  VISION: 'gpt-4o',
  
  // Embedding model
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
 * Get model with automatic fallback
 * @param {string} type - Model type ('chat', 'vision', 'embedding')
 * @param {boolean} forceFallback - Force use of fallback model
 * @returns {string} - Model identifier
 */
export function getModel(type = 'chat', forceFallback = false) {
  if (type === 'embedding') {
    return MODEL_CONFIG.EMBEDDING
  }
  
  if (type === 'vision') {
    return MODEL_CONFIG.VISION
  }
  
  // For chat, return primary or fallback
  const model = forceFallback 
    ? MODEL_CONFIG.FALLBACK_CHAT 
    : MODEL_CONFIG.PRIMARY_CHAT
  
  logger.debug('Model selected', { type, model, fallback: forceFallback })
  return model
}

/**
 * Check if error should trigger fallback
 * @param {Error} error - Error from OpenAI
 * @returns {boolean} - Whether to try fallback model
 */
export function shouldFallback(error) {
  // Fallback on rate limits, capacity issues, or model unavailable
  const fallbackCodes = [
    'rate_limit_exceeded',
    'insufficient_quota', 
    'model_not_found',
    'service_unavailable',
    'overloaded'
  ]
  
  const errorCode = error?.code || error?.error?.code
  const errorType = error?.type || error?.error?.type
  const errorMessage = error?.message || ''
  
  const shouldFB = 
    fallbackCodes.includes(errorCode) ||
    fallbackCodes.includes(errorType) ||
    error?.status === 429 ||
    error?.status === 503 ||
    errorMessage.includes('overloaded') ||
    errorMessage.includes('rate limit')
  
  if (shouldFB) {
    logger.warn('Triggering model fallback', { 
      errorCode, 
      errorType, 
      status: error?.status 
    })
  }
  
  return shouldFB
}

export default {
  MODEL_CONFIG,
  GENERATION_PARAMS,
  getModel,
  shouldFallback
}
