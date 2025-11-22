import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Document authority hierarchy
const DOCUMENT_PRIORITY = {
  'FDA_FOOD_CODE_2022': 10,
  'USDA': 9,
  'MI_MODIFIED_FOOD_CODE': 8,
  'mcl_act_92_of_2000': 8,
  'PROCEDURES_FOR_THE_ADMINISTRATION': 7,
  'Enforcement Action': 6,
  'Violation Types': 6,
  'Food Service Inspection': 6,
  'Food Allergy Information': 5,
  'NorovirusEnvironCleaning': 5,
  'Cooling Foods': 5,
  'Cross contamination': 5,
  'cook_temps': 5,
  'hold_temps': 5,
  'cooling': 5,
  'calibrate_thermometer': 4,
  'clean_sanitizing': 4,
  '3comp_sink': 4,
  '5keys_to_safer_food': 4,
  'employeehealthposter': 4,
  'gloves_usda': 4,
  'date_marking': 4,
  'contamination': 4,
  'raw_meat_storage': 4,
  'time_as_a_public_health_control': 4,
  'consumer_advisory': 3,
  'foodallergeninformation': 3,
  'general_noro_fact_sheet': 3,
  'Food borne illness guide': 3,
  'retail_food_establishments_emergency': 2,
  'Summary Chart': 2
}

function getDocumentPriority(docName) {
  if (!docName) return 1
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) {
    if (docName.includes(key)) return priority
  }
  return 1
}

function calculateRelevanceScore(doc, query) {
  let score = doc.similarity || 0
  
  const priorityBoost = getDocumentPriority(doc.metadata?.source || '') * 0.04
  score += priorityBoost
  
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3)
  const content = doc.content.toLowerCase()
  const termMatches = queryTerms.filter(term => content.includes(term)).length
  const termBoost = (termMatches / Math.max(queryTerms.length, 1)) * 0.15
  score += termBoost
  
  const regulatoryKeywords = [
    'shall', 'must', 'required', 'prohibited', 'violation',
    'temperature', 'approved', 'certified', 'minimum', 'maximum'
  ]
  const regKeywordCount = regulatoryKeywords.filter(kw => content.includes(kw)).length
  score += (regKeywordCount * 0.02)
  
  return Math.min(score, 1.0)
}

function detectQuestionType(query) {
  const lower = query.toLowerCase()
  
  if (lower.match(/\d+\s*°?[fc]|temperature/i)) return 'temperature'
  if (lower.match(/\d+\s*(hour|minute|day|time)/i)) return 'time'
  if (lower.includes('equipment') || lower.includes('utensil') || lower.includes('repair')) return 'equipment'
  if (lower.includes('clean') || lower.includes('sanitiz') || lower.includes('wash')) return 'sanitation'
  if (lower.includes('store') || lower.includes('storage') || lower.includes('shelf')) return 'storage'
  if (lower.includes('employee') || lower.includes('staff') || lower.includes('hand') || lower.includes('glove')) return 'personnel'
  if (lower.includes('illness') || lower.includes('pathogen') || lower.includes('norovirus')) return 'foodborne_illness'
  if (lower.includes('permit') || lower.includes('inspection') || lower.includes('violation')) return 'regulatory'
  if (lower.includes('allergen') || lower.includes('allergy')) return 'allergen'
  
  return 'general'
}

function generateSearchQueries(query, questionType) {
  const contextualExpansions = {
    temperature: [
      'temperature control time food safety',
      'cooking temperature minimum internal',
      'holding temperature hot cold'
    ],
    time: [
      'time temperature control TCS',
      'cooling time requirements',
      'date marking time limits'
    ],
    equipment: [
      'equipment maintenance repair good working order',
      'food contact surfaces approved materials',
      'utensils storage cleaning requirements'
    ],
    sanitation: [
      'cleaning sanitizing procedures frequency',
      'sanitizer concentration test strips',
      'handwashing facilities requirements'
    ],
    storage: [
      'food storage separation requirements',
      'raw meat storage location',
      'storage temperature controls'
    ],
    personnel: [
      'employee health hygiene handwashing',
      'food handler exclusion illness',
      'glove use requirements procedures'
    ],
    foodborne_illness: [
      'foodborne illness outbreak reporting',
      'norovirus prevention cleaning',
      'employee illness symptoms exclusion'
    ],
    regulatory: [
      'inspection violations critical',
      'enforcement action closure',
      'permit requirements license'
    ],
    allergen: [
      'food allergen information disclosure',
      'allergen cross contact prevention',
      'consumer advisory requirements'
    ]
  }
  
  const expansions = contextualExpansions[questionType] || []
  return [query, ...expansions.slice(0, 2)]
}

export async function searchDocuments(query, topK = 20, county = 'washtenaw') {
  try {
    if (!query || query.trim().length === 0) {
      console.warn('Empty search query')
      return []
    }

    const questionType = detectQuestionType(query)
    const searchQueries = generateSearchQueries(query, questionType)
    
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
    const allResults = []
    
    for (const searchQuery of searchQueries.slice(0, 3)) {
      try {
        const result = await model.embedContent(searchQuery)
        const queryEmbedding = result.embedding.values

        const { data: documents, error } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: 12,
          filter_county: county
        })

        if (error) {
          console.error('Supabase match error:', error)
          continue
        }

        if (documents && documents.length > 0) {
          allResults.push(...documents)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (embedError) {
        console.error('Embedding generation error:', embedError)
      }
    }
    
    if (allResults.length === 0) {
      console.warn('No matching documents found for:', query)
      return []
    }
    
    // Deduplicate and enhance scoring
    const uniqueDocs = new Map()
    
    for (const doc of allResults) {
      const contentKey = doc.content.substring(0, 150)
      
      if (!uniqueDocs.has(contentKey)) {
        const enhancedScore = calculateRelevanceScore(doc, query)
        
        if (enhancedScore > 0.25) { // Minimum relevance threshold
          uniqueDocs.set(contentKey, {
            source: doc.metadata?.source || 'Unknown Document',
            page: doc.metadata?.page || 'N/A',
            text: doc.content,
            score: enhancedScore,
            documentPriority: getDocumentPriority(doc.metadata?.source),
            questionType: questionType
          })
        }
      }
    }
    
    // Sort by enhanced score and limit results
    const sortedResults = Array.from(uniqueDocs.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
    
    console.log(`Search completed: ${sortedResults.length} relevant documents found`)
    
    return sortedResults.map(doc => ({
      source: doc.source,
      page: doc.page,
      text: doc.text,
      score: doc.score
    }))

  } catch (error) {
    console.error('Search system error:', error)
    return []
  }
}
