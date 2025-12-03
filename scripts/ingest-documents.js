import { GoogleAuth } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pdfParse from 'pdf-parse'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WASHTENAW_DOCS_PATH = path.join(process.cwd(), 'public/documents/washtenaw')

// --- CONFIG ---
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID
const LOCATION = 'us-central1'
const MODEL_ID = 'text-embedding-004'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// --- DIRECT API HELPER ---
async function getEmbedding(auth, text) {
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{ content: text }]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API Error: ${response.status} ${err}`)
  }

  const result = await response.json()
  // The structure for text-embedding-004 is predictions[0].embeddings.values
  return result.predictions[0].embeddings.values
}

async function run() {
  console.log('🚀 Starting "Bulletproof" Ingestion...')
  
  // 1. Setup Auth
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })

  if (!fs.existsSync(WASHTENAW_DOCS_PATH)) {
    console.error(`❌ Folder missing: ${WASHTENAW_DOCS_PATH}`)
    return
  }

  const files = fs.readdirSync(WASHTENAW_DOCS_PATH).filter(f => f.endsWith('.pdf'))
  console.log(`📚 Found ${files.length} PDFs`)

  for (const file of files) {
    console.log(`\n📄 Processing: ${file}`)
    const buffer = fs.readFileSync(path.join(WASHTENAW_DOCS_PATH, file))
    
    try {
        const data = await pdfParse(buffer)
        let text = data.text.replace(/\s+/g, ' ').trim()
        
        if (text.length < 50) {
            console.log('   ⚠️ Text empty. Skipping (likely an image PDF).')
            continue
        }

        const chunks = []
        for (let i = 0; i < text.length; i += 800) {
            chunks.push(text.slice(i, i + 800))
        }
        console.log(`   ✂️ Created ${chunks.length} chunks`)

        for (let i = 0; i < chunks.length; i++) {
            try {
                const embedding = await getEmbedding(auth, chunks[i])
                
                if (embedding) {
                    await supabase.from('documents').insert({
                        content: chunks[i],
                        embedding: embedding,
                        metadata: { source: file, chunk: i }
                    })
                    process.stdout.write('.')
                }
            } catch (err) {
                 process.stdout.write('x')
                 // If rate limited, wait a bit
                 if (err.message.includes('429')) await new Promise(r => setTimeout(r, 2000))
            }
            // Small delay to be nice to the API
            await new Promise(r => setTimeout(r, 100))
        }
        console.log(' Done!')
    } catch (e) {
        console.error('   ❌ Error:', e.message)
    }
  }
}

run()
