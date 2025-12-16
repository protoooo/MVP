// scripts/verify-no-openai.js - Verify no OpenAI dependencies
import fs from 'fs'
import path from 'path'

console.log('🔍 Checking for OpenAI references...\n')

const filesToCheck = [
  'app/api/chat/route.js',
  'lib/searchDocs.js',
  'package.json',
]

let found = false

for (const file of filesToCheck) {
  const fullPath = path.join(process.cwd(), file)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${file} - NOT FOUND`)
    continue
  }
  
  const content = fs.readFileSync(fullPath, 'utf8')
  
  const openaiRefs = [
    'openai',
    'OpenAI',
    'gpt-',
    'text-embedding',
  ]
  
  const foundRefs = openaiRefs.filter(ref => content.toLowerCase().includes(ref.toLowerCase()))
  
  if (foundRefs.length > 0) {
    console.log(`❌ ${file}`)
    console.log(`   Found: ${foundRefs.join(', ')}\n`)
    found = true
  } else {
    console.log(`✅ ${file} - Clean`)
  }
}

if (!found) {
  console.log('\n✅ All files clean - no OpenAI references found!')
  console.log('\nCurrent AI stack:')
  console.log('  - Anthropic Claude (text generation)')
  console.log('  - Cohere (embeddings)')
  process.exit(0)
} else {
  console.log('\n❌ Found OpenAI references - please remove them')
  process.exit(1)
}
