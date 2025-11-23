// scripts/check-documents.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const COUNTIES = ['washtenaw', 'wayne', 'oakland']

const CRITICAL_DOCS = [
  'Enforcement Action',
  'Food Service Inspection'
]

async function checkDocuments() {
  console.log('🔍 DOCUMENT ORGANIZATION DIAGNOSTIC\n')
  console.log('='.repeat(60))
  
  const { count: totalCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 TOTAL DOCUMENTS: ${totalCount}\n`)
  
  if (totalCount === 0) {
    console.error('❌ NO DOCUMENTS IN DATABASE!')
    console.error('   Run: npm run upload-embeddings')
    process.exit(1)
  }
  
  for (const county of COUNTIES) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📍 ${county.toUpperCase()} COUNTY`)
    console.log('='.repeat(60))
    
    const { data: countyDocs, count: countyCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('metadata->>county', county)
    
    console.log(`\nTotal chunks: ${countyCount}`)
    
    if (countyCount === 0) {
      console.error(`❌ NO DOCUMENTS FOR ${county.toUpperCase()}!`)
      continue
    }
    
    const sources = new Set()
    const sourceChunkCounts = {}
    
    for (const doc of countyDocs) {
      const source = doc.metadata?.source || 'Unknown'
      sources.add(source)
      sourceChunkCounts[source] = (sourceChunkCounts[source] || 0) + 1
    }
    
    console.log(`\nUnique documents: ${sources.size}\n`)
    
    console.log('🎯 CRITICAL DOCUMENTS CHECK:')
    let allCriticalPresent = true
    
    for (const critical of CRITICAL_DOCS) {
      const found = Array.from(sources).some(s => 
        s.toLowerCase().includes(critical.toLowerCase())
      )
      
      if (found) {
        const matchingSource = Array.from(sources).find(s => 
          s.toLowerCase().includes(critical.toLowerCase())
        )
        const chunks = sourceChunkCounts[matchingSource]
        console.log(`   ✅ ${critical}: ${chunks} chunks (${matchingSource})`)
      } else {
        console.log(`   ❌ ${critical}: NOT FOUND`)
        allCriticalPresent = false
      }
    }
    
    if (!allCriticalPresent) {
      console.error(`\n⚠️  MISSING CRITICAL DOCUMENTS FOR ${county}!`)
    }
    
    console.log(`\n📚 ALL DOCUMENTS (${sources.size} total):`)
    const sortedSources = Array.from(sources).sort()
    
    for (const source of sortedSources) {
      const chunks = sourceChunkCounts[source]
      const isCritical = CRITICAL_DOCS.some(c => 
        source.toLowerCase().includes(c.toLowerCase())
      )
      const marker = isCritical ? '⭐' : '  '
      console.log(`   ${marker} ${source.padEnd(50)} (${chunks} chunks)`)
    }
  }
  
  console.log(`\n\n${'='.repeat(60)}`)
  console.log('✅ DIAGNOSTIC COMPLETE')
  console.log('='.repeat(60))
  console.log('\n')
}

checkDocuments().catch(console.error)
