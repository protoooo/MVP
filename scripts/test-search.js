// scripts/test-search.js
import { searchDocuments } from '../lib/searchDocs.js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const TEST_QUERIES = [
  {
    query: 'What are enforcement procedures?',
    county: 'washtenaw',
    expectation: 'Should return Washtenaw Enforcement Action document'
  },
  {
    query: 'refrigerator temperature requirements',
    county: 'washtenaw',
    expectation: 'Should return both FDA code and Washtenaw enforcement docs'
  },
  {
    query: 'handwashing sink location',
    county: 'wayne',
    expectation: 'Should return Wayne county inspection guidelines'
  }
]

async function testSearch() {
  console.log('🧪 RAG SEARCH TEST\n')
  console.log('='.repeat(70) + '\n')
  
  for (const test of TEST_QUERIES) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`TEST QUERY: "${test.query}"`)
    console.log(`COUNTY: ${test.county}`)
    console.log(`EXPECTATION: ${test.expectation}`)
    console.log('='.repeat(70))
    
    try {
      const results = await searchDocuments(test.query, 10, test.county)
      
      if (results.length === 0) {
        console.log('\n❌ NO RESULTS RETURNED!')
        continue
      }
      
      console.log(`\n✅ Found ${results.length} results\n`)
      
      const countyDocs = results.filter(r => r.county === test.county)
      const enforcementDocs = results.filter(r => {
        const source = r.source.toLowerCase()
        return source.includes('enforcement') || 
               source.includes('inspection')
      })
      
      console.log(`📊 RESULT BREAKDOWN:`)
      console.log(`   • County-specific: ${countyDocs.length}/${results.length}`)
      console.log(`   • Enforcement docs: ${enforcementDocs.length}/${results.length}`)
      console.log(`   • Top score: ${results[0].score.toFixed(3)}`)
      
      console.log(`\n📚 TOP 5 RESULTS:`)
      
      for (let i = 0; i < Math.min(5, results.length); i++) {
        const result = results[i]
        const marker = result.county === test.county ? '⭐' : '  '
        const criticalMarker = result.isCritical ? '🎯' : ''
        
        console.log(`\n   ${i + 1}. ${marker}${criticalMarker} [Score: ${result.score.toFixed(3)}]`)
        console.log(`      Source: ${result.source}`)
        console.log(`      County: ${result.county || 'general'}`)
        console.log(`      Preview: ${result.text.substring(0, 120)}...`)
      }
      
      const hasCountyEnforcement = enforcementDocs.some(d => 
        d.county === test.county
      )
      
      console.log(`\n🎯 EXPECTATION CHECK:`)
      if (hasCountyEnforcement) {
        console.log(`   ✅ Found county enforcement documents`)
      } else {
        console.log(`   ❌ Missing county enforcement documents!`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`\n❌ SEARCH FAILED:`, error.message)
    }
  }
  
  console.log(`\n\n${'='.repeat(70)}`)
  console.log('🏁 TEST COMPLETE')
  console.log('='.repeat(70))
  console.log('\n')
}

testSearch().catch(console.error)
