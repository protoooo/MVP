// test-protocollm-inspect.js
// Test script for the new /api/v1/inspect endpoint

const testInspectEndpoint = async () => {
  console.log('=== Testing ProtocolLM /api/v1/inspect Endpoint ===\n')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const testApiKey = 'sk_test_12345' // This would be a real API key

  // Test 1: Text input - Food Service
  console.log('Test 1: Food Service - Text Analysis')
  console.log('-----------------------------------')
  
  const test1 = {
    protocol_pack: 'food_service_nationwide_v1',
    input_type: 'text',
    context: {
      location: 'test_kitchen',
      timestamp: new Date().toISOString(),
      operator: 'test_user'
    },
    payload: {
      text: 'Temperature log: Walk-in cooler measured at 45°F at 2:00 PM. Hot holding unit at 130°F. Ready-to-eat foods stored below raw chicken on shelf.'
    }
  }

  console.log('Request:', JSON.stringify(test1, null, 2))
  console.log('\nExpected: Should detect temperature violations (cooler >41°F, hot holding <135°F) and cross-contamination\n')

  // Test 2: Form input - Child Care
  console.log('\nTest 2: Child Care - Checklist Form')
  console.log('-----------------------------------')
  
  const test2 = {
    protocol_pack: 'childcare_facilities_v1',
    input_type: 'form',
    context: {
      location: 'infant_room',
      timestamp: new Date().toISOString()
    },
    payload: {
      checklist: {
        title: 'Daily Safety Inspection',
        date: new Date().toISOString().split('T')[0],
        items: [
          {
            question: 'Is staff-to-child ratio compliant (1:4 for infants)?',
            completed: false,
            response: 'no',
            notes: 'Currently 1:6 - need additional staff'
          },
          {
            question: 'Are all cribs clear of toys and blankets?',
            completed: true,
            response: 'yes'
          }
        ]
      }
    }
  }

  console.log('Request:', JSON.stringify(test2, null, 2))
  console.log('\nExpected: Should detect staff ratio violation as critical\n')

  // Test 3: Invalid protocol pack
  console.log('\nTest 3: Invalid Protocol Pack')
  console.log('-----------------------------------')
  
  const test3 = {
    protocol_pack: 'invalid_pack_name',
    input_type: 'text',
    context: {},
    payload: { text: 'test' }
  }

  console.log('Request:', JSON.stringify(test3, null, 2))
  console.log('\nExpected: Should return 400 error with available packs\n')

  // Test 4: Missing required fields
  console.log('\nTest 4: Missing Required Fields')
  console.log('-----------------------------------')
  
  const test4 = {
    input_type: 'image',
    payload: {}
  }

  console.log('Request:', JSON.stringify(test4, null, 2))
  console.log('\nExpected: Should return 400 error about missing protocol_pack\n')

  // Test 5: Senior Living - Text document
  console.log('\nTest 5: Senior Living - Care Log Document')
  console.log('-----------------------------------')
  
  const test5 = {
    protocol_pack: 'senior_living_facilities_v1',
    input_type: 'text',
    context: {
      location: 'room_204',
      timestamp: new Date().toISOString()
    },
    payload: {
      document: `Daily Care Log - January 15, 2024
      Resident: Mrs. Johnson, Room 204
      
      Morning Care (8:00 AM):
      - Medication administered: YES (on time)
      - Breakfast served: YES
      - Vitals checked: BP 130/80, Temp 98.6°F
      
      Afternoon Check (2:00 PM):
      - Found resident on floor next to bed
      - No visible injuries
      - Call button was out of reach
      - Bed rails were lowered
      - Notified nurse immediately
      
      Notes: Potential fall incident. Bed rails should have been up per care plan.
      Fall risk assessment to be updated.`,
      document_type: 'care_log'
    }
  }

  console.log('Request:', JSON.stringify(test5, null, 2))
  console.log('\nExpected: Should detect fall risk and bed rail violation\n')

  console.log('\n=== Test Payload Summary ===')
  console.log('5 test cases prepared for /api/v1/inspect endpoint')
  console.log('\nTo run actual tests against the API:')
  console.log('1. Ensure the server is running (npm run dev)')
  console.log('2. Create a valid API key in the database')
  console.log('3. Set API_KEY environment variable')
  console.log('4. Make actual HTTP requests with fetch/axios\n')
  
  console.log('Example cURL test:')
  console.log(`curl -X POST ${baseUrl}/api/v1/inspect \\`)
  console.log(`  -H "Authorization: Bearer YOUR_API_KEY" \\`)
  console.log(`  -H "Content-Type: application/json" \\`)
  console.log(`  -d '${JSON.stringify(test1)}'`)
  console.log('')
}

// Run test
testInspectEndpoint()
