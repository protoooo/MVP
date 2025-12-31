#!/usr/bin/env node

/**
 * Script to sync inspection data from Python scraper to the database
 * Usage: node scripts/sync-inspections.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function syncInspections() {
  console.log('🔄 Starting inspection data sync...')

  // Path to scraper output
  const outputPath = path.join(__dirname, '..', 'inspection_scraper', 'outputs', 'inspections.json')

  // Check if output file exists
  if (!fs.existsSync(outputPath)) {
    console.error('❌ Scraper output file not found:', outputPath)
    console.log('💡 Run the Python scraper first: cd inspection_scraper && python main.py')
    process.exit(1)
  }

  // Read inspection data
  const rawData = fs.readFileSync(outputPath, 'utf-8')
  const records = JSON.parse(rawData)

  console.log(`📊 Found ${records.length} inspection records`)

  // Call sync API
  const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const response = await fetch(`${apiUrl}/api/scraper/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records })
  })

  const result = await response.json()

  if (response.ok) {
    console.log('✅ Successfully synced data:', result.message)
    console.log(`📈 Total records synced: ${result.count}`)
  } else {
    console.error('❌ Failed to sync data:', result.error)
    if (result.details) {
      console.error('Details:', result.details)
    }
    process.exit(1)
  }
}

// Run the sync
syncInspections().catch(error => {
  console.error('❌ Unexpected error:', error.message)
  process.exit(1)
})
