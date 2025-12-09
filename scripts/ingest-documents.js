import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// --- ENV CHECKS ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('❌ Missing Env Vars. Check .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

// --- SETUP CLIENTS ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    if (error.status === 429) {
      throw new Error('RATE_LIMIT')
    }
    throw error
  }
}

const chunkText = (text, chunkSize = 1500) => {
  const words = text.split(/\s+/)
  const chunks = []
  let currentChunk = []
  let currentLength = 0
  for (const word of words) {
    if (currentLength + word.length > chunkSize) {
      chunks.push(currentChunk.join(' '))
      currentChunk = [word]
      currentLength = word.length
    } else {
      currentChunk.push(word)
      currentLength += word.length + 1
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.join(' '))
  return chunks
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
  console.log('🚀 Starting OpenAI Document Ingestion...')
  
  // Try to find documents folder
  let docsDir = path.join(process.cwd(), 'public/washtenaw')
  if (!fs.existsSync(docsDir)) {
    docsDir = path.join(process.cwd(), 'public/documents')
    if (!fs.existsSync(docsDir)) {
      console.error('❌ Cannot find PDF folder. Tried:')
      console.error('  - public/washtenaw')
      console.error('  - public/documents')
      process.exit(1)
    }
  }

  const files = fs.readdirSync(docsDir).filter(f => f.toLowerCase().endsWith('.pdf'))
  console.log(`📂 Found ${files.length} PDFs in ${docsDir}`)
  console.log('⏳ This will take time to avoid rate limits.\n')

  for (const file of files) {
    console.log(`\n📄 Processing: ${file}`)
    const filePath = path.join(docsDir, file)
    
    try {
      const dataBuffer = fs.readFileSync(filePath)
      const data = await pdf(dataBuffer)
      const text = data.text.replace(/\n/g, ' ').replace(/\s+/g, ' ')
      const chunks = chunkText(text)
      console.log(`   👉 Split into ${chunks.length} chunks`)

      for (let i = 0; i < chunks.length; i++) {
        let retries = 0
        let success = false
        
        while (!success && retries < 5) {
          try {
            const embedding = await getEmbedding(chunks[i])
            
            await supabase.from('documents').insert({
              content: chunks[i],
              metadata: { 
                source: file, 
                chunk_index: i,
                county: 'washtenaw'
              },
              embedding: embedding
            })

            process.stdout.write('█')
            success = true
            
            // 1 second pause between requests
            await sleep(1000)

          } catch (err) {
            if (err.message === 'RATE_LIMIT') {
              process.stdout.write('⏳')
              await sleep(5000 * (retries + 1))
              retries++
            } else {
              console.error(`\n   ❌ Error chunk ${i}:`, err.message)
              break
            }
          }
        }
      }
    } catch (fileErr) {
      console.error(`   ❌ Failed to read file:`, fileErr.message)
    }
  }
  console.log('\n\n✅ Ingestion Complete!')
  
  // Verify ingestion
  const { count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('❌ Could not verify documents:', error.message)
  } else {
    console.log(`✅ Total documents in database: ${count}`)
  }
}

run()
