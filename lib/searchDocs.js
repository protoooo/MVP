// lib/searchDocs.js
if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// CONFIGURATION CONSTANTS
const FETCH_MULTIPLIER = 3 // Fetch 3x documents to ensure county docs appear
const COUNTY_MATCH_BOOST = 1.5 // 50% boost for county-specific docs
const CRITICAL_DOC_BOOST = 1.3 // 30% boost for critical enforcement docs
const PRIORITY_SCORE_MULTIPLIER = 0.003 // Convert priority score to relevance boost
const TERM_MATCH_BOOST = 0.1 // 10% boost per matching query term
const WRONG_COUNTY_PENALTY = 0.3 // 70% reduction for wrong county docs
const MAX_RELEVANCE_SCORE = 2.0 // Cap relevance scores

let genAI = null
let supabase = null

function initializeClients() {
  if (genAI && supabase) return { genAI, supabase }
  
  try {
    if (process.env.GEMINI_API_KEY && !genAI) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    }
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.SUPABASE_SERVICE_ROLE_KEY && 
        !supabase) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
  } catch (error) {
    console.error('[SearchDocs] Initialization error:', error)
  }
  
  return { genAI, supabase }
}
