#!/usr/bin/env node
/**
 * Example Integration Script - Visual Reasoning API
 * Demonstrates how to use the API for various industries
 */

import fetch from 'node-fetch'
import fs from 'fs'
import FormData from 'form-data'

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const API_KEY = process.env.API_KEY || 'your_api_key_here'

/**
 * Example 1: Zero-Config Mode
 * Just send an image with no profile - uses defaults
 */
async function exampleZeroConfig() {
  console.log('\n=== Example 1: Zero-Config Mode ===')
  
  const response = await fetch(`${API_BASE_URL}/api/audit-media`, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      images: ['https://example.com/warehouse.jpg'],
      metadata: {
        location: 'main-warehouse'
      }
    })
  })
  
  const result = await response.json()
  console.log('Response:', JSON.stringify(result, null, 2))
  console.log(`Score: ${result.overall_score}`)
  console.log(`Issues found: ${result.severity_summary?.major || 0} major, ${result.severity_summary?.minor || 0} minor`)
}

/**
 * Example 2: Using System Profile
 * Use a pre-configured industry profile
 */
async function exampleWithSystemProfile() {
  console.log('\n=== Example 2: Using System Profile ===')
  
  // First, list available profiles
  const profilesResponse = await fetch(`${API_BASE_URL}/api/profiles`, {
    method: 'GET',
    headers: {
      'X-Api-Key': API_KEY
    }
  })
  
  const profilesData = await profilesResponse.json()
  console.log('Available profiles:', profilesData.profiles.length)
  
  // Find a food safety profile
  const foodProfile = profilesData.profiles.find(p => p.industry === 'food')
  if (!foodProfile) {
    console.log('No food profile found')
    return
  }
  
  console.log(`Using profile: ${foodProfile.profile_name}`)
  
  // Use the profile for analysis
  const response = await fetch(`${API_BASE_URL}/api/audit-media`, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      images: ['https://example.com/kitchen.jpg'],
      standards_profile_id: foodProfile.id,
      metadata: {
        location: 'kitchen',
        task: 'cleaning'
      }
    })
  })
  
  const result = await response.json()
  console.log(`Profile used: ${result.profile_used?.name}`)
  console.log(`Overall score: ${result.overall_score}`)
}

/**
 * Example 3: Create Custom Profile
 * Create a custom profile with specific rules
 */
async function exampleCustomProfile() {
  console.log('\n=== Example 3: Create Custom Profile ===')
  
  // Create a custom profile for a specific use case
  const createResponse = await fetch(`${API_BASE_URL}/api/profiles`, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_name: 'My Retail Store - Daily Check',
      industry: 'retail',
      task_type: 'general',
      strictness_level: 'high',
      plain_language_rules: [
        'All price tags must be visible and accurate',
        'Aisles must be clear of obstacles',
        'Products must be faced forward',
        'No expired products on shelves',
        'Floor must be clean and dry'
      ],
      description: 'Daily store opening checklist verification'
    })
  })
  
  const newProfile = await createResponse.json()
  console.log('Created profile:', newProfile.profile.id)
  console.log('Rules:', newProfile.profile.plain_language_rules.length)
  
  // Use the new profile
  const response = await fetch(`${API_BASE_URL}/api/audit-media`, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      images: ['https://example.com/store-aisle.jpg'],
      standards_profile_id: newProfile.profile.id,
      metadata: {
        location: 'aisle-3',
        task: 'inspection'
      }
    })
  })
  
  const result = await response.json()
  console.log(`Analysis complete: ${result.summary}`)
  console.log(`Credits remaining: ${result.remaining_credits}`)
}

/**
 * Example 4: Upload Local Files
 * Upload files from disk instead of URLs
 */
async function exampleUploadFiles() {
  console.log('\n=== Example 4: Upload Local Files ===')
  
  // Note: This requires actual image files
  const imagePath = process.argv[2]
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.log('No valid image path provided. Usage: node examples.js <image-path>')
    return
  }
  
  const formData = new FormData()
  formData.append('files', fs.createReadStream(imagePath))
  formData.append('metadata', JSON.stringify({
    location: 'test-location',
    task: 'inspection'
  }))
  
  const response = await fetch(`${API_BASE_URL}/api/audit-media`, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      ...formData.getHeaders()
    },
    body: formData
  })
  
  const result = await response.json()
  console.log('Upload complete:', result.session_id)
  console.log('Findings:', result.findings.length)
}

/**
 * Example 5: Configure Webhook
 * Set up webhook for async notifications
 */
async function exampleConfigureWebhook() {
  console.log('\n=== Example 5: Configure Webhook ===')
  
  // Register webhook
  const registerResponse = await fetch(`${API_BASE_URL}/api/webhooks`, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      webhook_url: 'https://example.com/my-webhook',
      max_retries: 3,
      retry_delay_seconds: 60
    })
  })
  
  const webhook = await registerResponse.json()
  
  if (webhook.success) {
    console.log('Webhook registered!')
    console.log('Webhook ID:', webhook.webhook.id)
    console.log('Secret (SAVE THIS):', webhook.webhook.webhook_secret)
    
    // Now send analysis - result will be sent to webhook
    const analysisResponse = await fetch(`${API_BASE_URL}/api/audit-media`, {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: ['https://example.com/test.jpg'],
        metadata: { location: 'test' }
      })
    })
    
    const result = await analysisResponse.json()
    console.log('Analysis sent. Session:', result.session_id)
    console.log('Webhook will receive the same result payload')
  } else {
    console.log('Webhook registration failed:', webhook.error)
  }
}

/**
 * Example 6: Batch Processing
 * Process multiple images in one request
 */
async function exampleBatchProcessing() {
  console.log('\n=== Example 6: Batch Processing ===')
  
  const images = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
    'https://example.com/image4.jpg',
    'https://example.com/image5.jpg'
  ]
  
  const response = await fetch(`${API_BASE_URL}/api/audit-media`, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      images: images,
      metadata: {
        location: 'store-main',
        task: 'daily-check',
        timestamp: new Date().toISOString()
      }
    })
  })
  
  const result = await response.json()
  console.log(`Processed ${result.media_analyzed} images`)
  console.log(`Credits used: ${result.credits_used}`)
  console.log(`Overall score: ${result.overall_score}`)
  console.log(`Issues by severity:`, result.severity_summary)
}

/**
 * Run examples
 */
async function main() {
  const example = process.argv[2]
  
  try {
    switch (example) {
      case '1':
        await exampleZeroConfig()
        break
      case '2':
        await exampleWithSystemProfile()
        break
      case '3':
        await exampleCustomProfile()
        break
      case '4':
        await exampleUploadFiles()
        break
      case '5':
        await exampleConfigureWebhook()
        break
      case '6':
        await exampleBatchProcessing()
        break
      case 'all':
        await exampleZeroConfig()
        await exampleWithSystemProfile()
        await exampleCustomProfile()
        await exampleBatchProcessing()
        break
      default:
        console.log('Visual Reasoning API Examples')
        console.log('Usage: node examples.js [example-number]')
        console.log('')
        console.log('Examples:')
        console.log('  1 - Zero-Config Mode')
        console.log('  2 - Using System Profile')
        console.log('  3 - Create Custom Profile')
        console.log('  4 - Upload Local Files')
        console.log('  5 - Configure Webhook')
        console.log('  6 - Batch Processing')
        console.log('  all - Run examples 1-3 and 6')
        console.log('')
        console.log('Set environment variables:')
        console.log('  API_BASE_URL - API base URL (default: http://localhost:3000)')
        console.log('  API_KEY - Your API key')
    }
  } catch (error) {
    console.error('Error:', error.message)
    if (error.response) {
      console.error('Response:', await error.response.text())
    }
  }
}

main()
