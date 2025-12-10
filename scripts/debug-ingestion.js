// scripts/debug-ingestion.js
// Run with: node scripts/debug-ingestion.js

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: '.env.local' })

console.log("=" .repeat(70))
console.log("🔍 protocolLM Ingestion Diagnostics")
console.log("=" .repeat(70))

// 1. Check environment variables
console.log("\n📋 Step 1: Checking Environment Variables")
console.log("-".repeat(70))

const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY
}

let envOk = true
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (value) {
    const masked = value.substring(0, 20) + "..." + value.substring(value.length - 5)
    console.log(`✅ ${key}: ${masked}`)
  } else {
    console.log(`❌ ${key}: MISSING`)
    envOk = false
  }
}

if (!envOk) {
  console.log("\n❌ Fix missing environment variables in .env.local")
  console.log("   Copy from .env.example and fill in your keys")
  process.exit(1)
}

// 2. Check for PDFs
console.log("\n📁 Step 2: Searching for PDFs")
console.log("-".repeat(70))

const possibleDirs = [
  'public/documents/washtenaw',
  'public/documents',
  'public/washtenaw',
  'documents/washtenaw',
  'documents'
]

let pdfDir = null
let pdfFiles = []

for (const dir of possibleDirs) {
  const fullPath = path.join(process.cwd(), dir)
  console.log(`Checking: ${fullPath}`)
  
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath)
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    
    if (pdfs.length > 0) {
      console.log(`   ✅ Found ${pdfs.length} PDFs`)
      pdfDir = fullPath
      pdfFiles = pdfs
      break
    } else {
      console.log(`   ⚠️ Directory exists but no PDFs found`)
    }
  } else {
    console.log(`   ❌ Directory doesn't exist`)
  }
}

if (!pdfDir) {
  console.log("\n❌ No PDFs found!")
  console.log("\n📝 To fix:")
  console.log("   1. Create directory: mkdir -p public/documents/washtenaw")
  console.log("   2. Add your PDF files there")
  console.log("   3. Run this script again")
  process.exit(1)
}

console.log(`\n✅ Found PDF directory: ${pdfDir}`)
console.log(`📄 PDFs to process:`)
pdfFiles.forEach((f, i) => {
  const filePath = path.join(pdfDir, f)
  const stats = fs.statSync(filePath)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
  console.log(`   ${i + 1}. ${f} (${sizeMB} MB)`)
})

// 3. Test Supabase connection
console.log("\n🔌 Step 3: Testing Supabase Connection")
console.log("-".repeat(70))

try {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .limit(1)
  
  if (error) {
    console.log(`❌ Supabase connection failed:`)
    console.log(`   Error: ${error.message}`)
    console.log(`   Hint: ${error.hint || 'Check your service role key'}`)
    process.exit(1)
  }
  
  console.log(`✅ Supabase connected successfully`)
  
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📊 Current documents in database: ${count}`)
  
} catch (err) {
  console.log(`❌ Supabase test failed: ${err.message}`)
  process.exit(1)
}

// 4. Test OpenAI connection
console.log("\n🤖 Step 4: Testing OpenAI Connection")
console.log("-".repeat(70))

try {
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  console.log("Generating test embedding...")
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: "test"
  })
  
  const embedding = response.data[0].embedding
  console.log(`✅ OpenAI connected successfully`)
  console.log(`   Embedding dimensions: ${embedding.length}`)
  
} catch (err) {
  console.log(`❌ OpenAI test failed: ${err.message}`)
  if (err.status === 401) {
    console.log(`   Hint: Check your OPENAI_API_KEY - authentication failed`)
  } else if (err.status === 429) {
    console.log(`   Hint: Rate limit exceeded or quota exceeded`)
  }
  process.exit(1)
}

// 5. Test PDF parsing
console.log("\n📖 Step 5: Testing PDF Parsing")
console.log("-".repeat(70))

try {
  const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default
  const testFile = pdfFiles[0]
  const testPath = path.join(pdfDir, testFile)
  
  console.log(`Parsing: ${testFile}`)
  const buffer = fs.readFileSync(testPath)
  const parsed = await pdf(buffer)
  
  const textLength = parsed.text.length
  const pageCount = parsed.numpages
  
  console.log(`✅ PDF parsed successfully`)
  console.log(`   Pages: ${pageCount}`)
  console.log(`   Characters extracted: ${textLength.toLocaleString()}`)
  console.log(`   First 200 chars: "${parsed.text.substring(0, 200).trim()}..."`)
  
  if (textLength < 100) {
    console.log(`   ⚠️ WARNING: Very little text extracted. PDF might be:`)
    console.log(`      - Scanned images without OCR`)
    console.log(`      - Encrypted or protected`)
    console.log(`      - Corrupted`)
  }
  
} catch (err) {
  console.log(`❌ PDF parsing failed: ${err.message}`)
  process.exit(1)
}

// Success summary
console.log("\n" + "=" .repeat(70))
console.log("✅ All diagnostic checks passed!")
console.log("=" .repeat(70))
console.log("\n📝 Next steps:")
console.log("   1. Run ingestion: npm run ingest")
console.log("   2. Or manually: node scripts/ingest-documents.js")
console.log("\n💡 Tips:")
console.log("   - Start with 1-2 PDFs first to test")
console.log("   - Monitor OpenAI API usage (costs ~$0.0001 per 1000 tokens)")
console.log("   - Each 1000-word chunk ≈ $0.0001 in API costs")
console.log("   - Check Railway logs if running there")
