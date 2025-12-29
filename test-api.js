#!/usr/bin/env node

/**
 * Test script for Food Safety API
 * Usage: node test-api.js <api_key> <image_path>
 */

const fs = require('fs')
const path = require('path')

const API_URL = process.env.API_URL || 'http://localhost:3000/api/audit-photos'
const apiKey = process.argv[2]
const imagePath = process.argv[3]

if (!apiKey || !imagePath) {
  console.error('Usage: node test-api.js <api_key> <image_path>')
  console.error('Example: node test-api.js sk_abc123 ./kitchen.jpg')
  process.exit(1)
}

if (!fs.existsSync(imagePath)) {
  console.error(`Error: Image file not found: ${imagePath}`)
  process.exit(1)
}

async function testApi() {
  console.log('Testing Food Safety API...')
  console.log(`API URL: ${API_URL}`)
  console.log(`API Key: ${apiKey.substring(0, 10)}...`)
  console.log(`Image: ${imagePath}`)
  console.log('')

  try {
    // Node.js 18+ has built-in fetch, for older versions use node-fetch
    const FormData = require('form-data')
    const fetch = require('node-fetch')

    const formData = new FormData()
    formData.append('files', fs.createReadStream(imagePath))
    formData.append('location', 'kitchen')

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    })

    console.log(`Response Status: ${response.status} ${response.statusText}`)
    console.log('')

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ API Error:', data.error)
      if (data.remaining_credits !== undefined) {
        console.error(`Remaining Credits: ${data.remaining_credits}`)
      }
      process.exit(1)
    }

    console.log('✅ Success!')
    console.log('')
    console.log('Results:')
    console.log(`  Session ID: ${data.session_id}`)
    console.log(`  Score: ${data.score}/100`)
    console.log(`  Analyzed: ${data.analyzed_count} images`)
    console.log(`  Violations: ${data.violation_count}`)
    console.log(`  Credits Used: ${data.credits_used}`)
    console.log(`  Remaining: ${data.remaining_credits}`)
    console.log('')
    
    if (data.report_url) {
      console.log(`Report URL: ${data.report_url}`)
      console.log('')
    }

    if (data.violations && data.violations.length > 0) {
      console.log('Violations Found:')
      data.violations.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.description}`)
        console.log(`     Type: ${v.type}`)
        console.log(`     Severity: ${v.severity}`)
        console.log(`     Confidence: ${Math.round(v.confidence * 100)}%`)
        console.log('')
      })
    } else {
      console.log('✅ No violations detected!')
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    process.exit(1)
  }
}

testApi()
