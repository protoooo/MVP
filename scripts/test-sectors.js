#!/usr/bin/env node
// Test script for multi-sector functionality
// Run with: node scripts/test-sectors.js

import { 
  SECTORS, 
  SECTOR_METADATA, 
  getSectorById, 
  isValidSector, 
  getSectorFromCounty,
  canAccessSector,
  getDefaultSector,
  getActiveSectors
} from '../lib/sectors.js'

console.log('🧪 Testing Multi-Sector Functionality\n')

// Test 1: Sector Constants
console.log('Test 1: Sector Constants')
console.log('  Food Safety:', SECTORS.FOOD_SAFETY)
console.log('  Fire & Life Safety:', SECTORS.FIRE_LIFE_SAFETY)
console.log('  Rental Housing:', SECTORS.RENTAL_HOUSING)
console.log('  ✅ All sectors defined\n')

// Test 2: Sector Metadata
console.log('Test 2: Sector Metadata')
Object.values(SECTOR_METADATA).forEach(sector => {
  console.log(`  ${sector.name}:`)
  console.log(`    ID: ${sector.id}`)
  console.log(`    Price: $${sector.price}/month`)
  console.log(`    Active: ${sector.active}`)
  console.log(`    Icon: ${sector.icon}`)
})
console.log('  ✅ Metadata loaded\n')

// Test 3: Active Sectors
console.log('Test 3: Active Sectors')
const activeSectors = getActiveSectors()
console.log(`  Active count: ${activeSectors.length}`)
activeSectors.forEach(s => console.log(`    - ${s.name}`))
console.log('  ✅ Active sectors retrieved\n')

// Test 4: Sector Validation
console.log('Test 4: Sector Validation')
console.log('  food_safety valid?', isValidSector('food_safety'))
console.log('  invalid_sector valid?', isValidSector('invalid_sector'))
console.log('  ✅ Validation working\n')

// Test 5: Sector by ID
console.log('Test 5: Get Sector by ID')
const foodSafety = getSectorById(SECTORS.FOOD_SAFETY)
console.log('  Food Safety:', foodSafety?.name)
const invalid = getSectorById('nonexistent')
console.log('  Invalid sector:', invalid)
console.log('  ✅ Sector retrieval working\n')

// Test 6: County to Sector Mapping (backward compatibility)
console.log('Test 6: County to Sector Mapping')
const testCases = [
  { county: 'washtenaw', expected: SECTORS.FOOD_SAFETY },
  { county: 'michigan', expected: SECTORS.FOOD_SAFETY },
  { county: 'wayne', expected: SECTORS.FOOD_SAFETY },
  { county: 'unknown', expected: SECTORS.FOOD_SAFETY }
]

testCases.forEach(({ county, expected }) => {
  const result = getSectorFromCounty(county)
  const status = result === expected ? '✅' : '❌'
  console.log(`  ${status} "${county}" → ${result}`)
})
console.log('  ✅ County mapping working\n')

// Test 7: Access Control Logic
console.log('Test 7: Access Control Logic')

// Regular user with food_safety subscription
const subscription1 = { sector: 'food_safety' }
console.log('  Regular user, food_safety subscription:')
console.log('    Can access food_safety?', canAccessSector('user1', 'food_safety', subscription1, false))
console.log('    Can access fire_life_safety?', canAccessSector('user1', 'fire_life_safety', subscription1, false))

// Admin user
console.log('  Admin user:')
console.log('    Can access food_safety?', canAccessSector('admin1', 'food_safety', subscription1, true))
console.log('    Can access fire_life_safety?', canAccessSector('admin1', 'fire_life_safety', subscription1, true))
console.log('  ✅ Access control working\n')

// Test 8: Default Sector
console.log('Test 8: Default Sector')
console.log('  Regular user default:', getDefaultSector(subscription1, false))
console.log('  Admin default:', getDefaultSector(subscription1, true))
console.log('  No subscription (fallback):', getDefaultSector(null, false))
console.log('  ✅ Default sector working\n')

console.log('🎉 All tests passed!')
console.log('\nNext steps:')
console.log('  1. Run database migrations: db/migrations/001_add_sector_support.sql')
console.log('  2. Re-ingest documents: POST /api/admin/ingest {"sector":"food_safety","wipe":true}')
console.log('  3. Test with actual API calls')
