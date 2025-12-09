// scripts/upload-to-supabase.js
// Bulk-upload precomputed embeddings JSON files into the `documents` table.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BATCH_SIZE = 50
const counties = ['washtenaw', 'wayne', 'oakland']

async function uploadEmbeddings() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials (URL or SERVICE_ROLE_KEY).')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const documentsDir = path.join(__dirname, '../public/documents')

  console.log('🚀 Starting upload to Supabase...')
  console.log(`📁 Documents directory: ${documentsDir}`)

  for (const county of counties) {
    const filePath = path.join(documentsDir, `${county}-embeddings.json`)

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Skipping ${county} (no JSON file found at ${filePath})`)
      continue
    }

    console.log(`\n📂 Loading ${county} from ${filePath}...`)

    let documents
    try {
      const rawData = fs.readFileSync(filePath, 'utf8')
      documents = JSON.parse(rawData)
    } catch (err) {
      console.error(`❌ Failed to read/parse ${county} JSON:`, err.message)
      continue
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      console.log(`⚠️ Skipping ${county} (parsed JSON is empty or not an array)`)
      continue
    }

    console.log(`📦 Uploading ${documents.length} records for ${county}...`)

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE)

      const { error } = await supabase.from('documents').insert(batch)

      if (error) {
        console.error(
          `   ❌ Error uploading batch starting at index ${i}:`,
          error.message
        )
      } else {
        process.stdout.write('.') // progress dots
      }
    }

    console.log(`\n✅ ${county} complete`)
  }

  console.log('\n🎉 All uploads finished.')
  process.exit(0)
}

uploadEmbeddings().catch((err) => {
  console.error('❌ Fatal upload error:', err)
  process.exit(1)
})
