// lib/protocolPacks.js - Protocol Pack Management System
// Defines and manages sector-agnostic compliance protocol packs

/**
 * Protocol Pack Structure:
 * - id: Unique identifier (e.g., "food_service_washtenaw_v1")
 * - name: Display name
 * - version: Semantic version
 * - sector: Sector category (food_service, healthcare, manufacturing, etc.)
 * - standards: Array of standard documents and rules
 * - active: Whether this pack is currently available
 */

export const PROTOCOL_PACKS = {
  // 1. Food Service & Retail Protocol Pack (HIGH VIABILITY - Always need health inspections)
  food_service_nationwide_v1: {
    id: 'food_service_nationwide_v1',
    name: 'Food Service & Retail - Nationwide',
    version: '1.0.0',
    sector: 'food_service',
    description: 'FDA Food Code compliance for restaurants, grocery stores, and food retail establishments nationwide',
    active: true,
    coverage: 'nationwide',
    viability_score: 'high',
    target_market: 'Restaurant chains, grocery stores, food retail, catering, institutional food service',
    pain_points: ['Frequent health inspections', 'High violation penalties', 'Brand reputation risk', 'Multi-location compliance'],
    standards: [
      {
        code: 'FDA-3-501.16',
        title: 'Time/Temperature Control for Safety Food, Hot and Cold Holding',
        category: 'temperature_control',
        severity: 'critical',
        description: 'Cold holding must be at 41°F or below, hot holding at 135°F or above',
      },
      {
        code: 'FDA-3-302.11',
        title: 'Food Separation and Cross-Contamination Prevention',
        category: 'cross_contamination',
        severity: 'critical',
        description: 'Separation of raw and ready-to-eat foods, proper storage practices',
      },
      {
        code: 'FDA-4-601.11',
        title: 'Equipment and Food-Contact Surface Sanitation',
        category: 'equipment_facilities',
        severity: 'high',
        description: 'Clean surfaces and proper equipment maintenance',
      },
      {
        code: 'FDA-2-301.11',
        title: 'Hand Hygiene and Handwashing',
        category: 'personal_hygiene',
        severity: 'high',
        description: 'Proper handwashing compliance and procedures',
      },
      {
        code: 'FDA-7-206.11',
        title: 'Chemical Storage and Labeling',
        category: 'chemical_storage',
        severity: 'critical',
        description: 'Proper chemical storage away from food and correct labeling',
      },
      {
        code: 'FDA-6-202.11',
        title: 'Pest Control and Prevention',
        category: 'pest_control',
        severity: 'medium',
        description: 'Evidence of pests and proper exclusion measures',
      },
      {
        code: 'FDA-3-602.11',
        title: 'Food Labeling and Date Marking',
        category: 'food_labeling',
        severity: 'medium',
        description: 'Date marking and proper food identification',
      },
      {
        code: 'FDA-2-201.11',
        title: 'Employee Health and Illness Reporting',
        category: 'employee_health',
        severity: 'critical',
        description: 'Illness reporting and employee exclusion criteria',
      },
    ],
    constraints: {
      temperature: { cold_holding_max: 41, hot_holding_min: 135 },
      documentation_required: true,
    },
  },

  // 2. Senior Living & Assisted Care Facilities (HIGH VIABILITY - Less competition than hospitals)
  senior_living_facilities_v1: {
    id: 'senior_living_facilities_v1',
    name: 'Senior Living & Assisted Care - Nationwide',
    version: '1.0.0',
    sector: 'senior_living',
    description: 'CMS and state compliance for assisted living, memory care, and senior housing facilities',
    active: true,
    coverage: 'nationwide',
    viability_score: 'high',
    target_market: 'Assisted living facilities, memory care, independent living, nursing homes, senior housing',
    pain_points: ['State inspections', 'CMS compliance', 'Family concerns', 'Medication management', 'Falls and safety'],
    standards: [
      {
        code: 'CMS-483.10',
        title: 'Resident Rights',
        category: 'resident_care',
        severity: 'high',
        description: 'Dignity, privacy, and self-determination compliance',
      },
      {
        code: 'CMS-483.25',
        title: 'Quality of Care - Accident Prevention',
        category: 'safety',
        severity: 'critical',
        description: 'Fall prevention, hazard identification, safe environment',
      },
      {
        code: 'CMS-483.35',
        title: 'Nursing Services',
        category: 'staffing',
        severity: 'high',
        description: 'Adequate staffing, proper supervision, care documentation',
      },
      {
        code: 'CMS-483.45',
        title: 'Pharmacy Services',
        category: 'medication',
        severity: 'critical',
        description: 'Medication storage, administration, and error prevention',
      },
      {
        code: 'CMS-483.60',
        title: 'Food and Nutrition Services',
        category: 'nutrition',
        severity: 'high',
        description: 'Meal service, dietary needs, food safety',
      },
      {
        code: 'CMS-483.65',
        title: 'Infection Prevention and Control',
        category: 'infection_control',
        severity: 'critical',
        description: 'Infection control program, outbreak prevention, sanitation',
      },
    ],
    constraints: {
      documentation_required: true,
      care_plan_compliance: true,
    },
  },

  // 3. Child Care & Daycare Facilities (HIGH VIABILITY - Highly regulated, less tech competition)
  childcare_facilities_v1: {
    id: 'childcare_facilities_v1',
    name: 'Child Care & Daycare - Nationwide',
    version: '1.0.0',
    sector: 'childcare',
    description: 'State licensing compliance for daycare, preschool, and child care centers',
    active: true,
    coverage: 'nationwide',
    viability_score: 'high',
    target_market: 'Daycare centers, preschools, after-school programs, child care chains, home daycare',
    pain_points: ['State licensing inspections', 'Parent concerns', 'Safety violations', 'Surprise inspections', 'License suspension risk'],
    standards: [
      {
        code: 'CCDF-98.41',
        title: 'Health and Safety Standards',
        category: 'health_safety',
        severity: 'critical',
        description: 'Safe environment, hazard prevention, emergency preparedness',
      },
      {
        code: 'CCDF-98.43',
        title: 'Child-Staff Ratios',
        category: 'staffing',
        severity: 'critical',
        description: 'Proper supervision ratios, staff qualifications, background checks',
      },
      {
        code: 'STATE-SLEEP',
        title: 'Safe Sleep Practices',
        category: 'infant_safety',
        severity: 'critical',
        description: 'Back-to-sleep positioning, crib safety, SIDS prevention',
      },
      {
        code: 'STATE-NUTRITION',
        title: 'Nutrition and Meal Service',
        category: 'nutrition',
        severity: 'high',
        description: 'Age-appropriate meals, allergies, food safety',
      },
      {
        code: 'STATE-SANITATION',
        title: 'Facility Sanitation',
        category: 'sanitation',
        severity: 'high',
        description: 'Diaper changing, handwashing, toy cleaning, bathroom cleanliness',
      },
      {
        code: 'STATE-PLAYGROUND',
        title: 'Playground and Outdoor Safety',
        category: 'outdoor_safety',
        severity: 'high',
        description: 'Equipment safety, surfacing, supervision, hazards',
      },
    ],
    constraints: {
      documentation_required: true,
      background_checks_required: true,
    },
  },

  // 4. Property Management & Multi-Family Housing (HIGH VIABILITY - Large market, minimal tech solutions)
  property_management_v1: {
    id: 'property_management_v1',
    name: 'Property Management & Housing - Nationwide',
    version: '1.0.0',
    sector: 'property_management',
    description: 'HUD and local housing code compliance for apartment complexes and rental properties',
    active: true,
    coverage: 'nationwide',
    viability_score: 'high',
    target_market: 'Apartment complexes, property management companies, affordable housing, student housing, HOAs',
    pain_points: ['Housing inspections', 'Tenant complaints', 'Code violations', 'Habitability issues', 'Fines and citations'],
    standards: [
      {
        code: 'HUD-24-CFR-5.703',
        title: 'Housing Quality Standards',
        category: 'habitability',
        severity: 'high',
        description: 'Safe and sanitary housing conditions',
      },
      {
        code: 'IRC-R315',
        title: 'Smoke and Carbon Monoxide Alarms',
        category: 'fire_safety',
        severity: 'critical',
        description: 'Working alarms, proper placement, testing',
      },
      {
        code: 'IRC-E3901',
        title: 'Electrical Safety',
        category: 'electrical',
        severity: 'critical',
        description: 'Safe wiring, GFCI outlets, panel access',
      },
      {
        code: 'IPC-P2902',
        title: 'Plumbing Fixtures',
        category: 'plumbing',
        severity: 'high',
        description: 'Working fixtures, hot water, no leaks',
      },
      {
        code: 'IRC-R302',
        title: 'Fire Separation',
        category: 'fire_safety',
        severity: 'critical',
        description: 'Fire-rated walls, proper exits, egress windows',
      },
      {
        code: 'IPMC-304',
        title: 'Exterior Structure Maintenance',
        category: 'maintenance',
        severity: 'medium',
        description: 'Roof, siding, gutters, foundation integrity',
      },
    ],
    constraints: {
      inspection_frequency: 'annual',
      tenant_notification_required: true,
    },
  },

  // 5. Fitness Centers & Gyms (HIGH VIABILITY - Health/safety focused, growing market)
  fitness_facilities_v1: {
    id: 'fitness_facilities_v1',
    name: 'Fitness Centers & Gyms - Nationwide',
    version: '1.0.0',
    sector: 'fitness',
    description: 'Health department and safety compliance for gyms, fitness studios, and wellness centers',
    active: true,
    coverage: 'nationwide',
    viability_score: 'high',
    target_market: 'Gyms, fitness studios, yoga studios, CrossFit boxes, corporate wellness centers, hotel gyms',
    pain_points: ['Health department inspections', 'Member safety concerns', 'Equipment liability', 'Sanitation standards', 'Pool/spa regulations'],
    standards: [
      {
        code: 'HEALTH-GYM-001',
        title: 'Equipment Sanitation',
        category: 'sanitation',
        severity: 'high',
        description: 'Regular cleaning, sanitizing stations, equipment maintenance',
      },
      {
        code: 'HEALTH-GYM-002',
        title: 'Locker Room and Shower Facilities',
        category: 'facilities',
        severity: 'high',
        description: 'Cleanliness, proper ventilation, mold prevention',
      },
      {
        code: 'POOL-265-CMR-7',
        title: 'Pool and Spa Safety',
        category: 'aquatics',
        severity: 'critical',
        description: 'Water chemistry, lifeguard presence, safety equipment',
      },
      {
        code: 'OSHA-BLOODBORNE',
        title: 'Bloodborne Pathogen Exposure',
        category: 'health_safety',
        severity: 'critical',
        description: 'First aid kits, AED availability, exposure control plan',
      },
      {
        code: 'FITNESS-EQUIP-001',
        title: 'Equipment Safety and Maintenance',
        category: 'equipment',
        severity: 'high',
        description: 'Regular inspections, proper assembly, warning labels',
      },
      {
        code: 'HEALTH-GYM-003',
        title: 'Air Quality and Ventilation',
        category: 'environmental',
        severity: 'medium',
        description: 'Proper HVAC, air circulation, temperature control',
      },
    ],
    constraints: {
      inspection_frequency: 'quarterly',
      documentation_required: true,
    },
  },

  // Legacy support - Michigan-specific (maps to nationwide)
  food_service_michigan_v1: {
    id: 'food_service_michigan_v1',
    name: 'Food Service - Michigan Food Code (Legacy)',
    version: '1.0.0',
    sector: 'food_service',
    description: 'Michigan Food Code compliance - Legacy pack, use food_service_nationwide_v1',
    active: true,
    legacy: true,
    maps_to: 'food_service_nationwide_v1',
    standards: [], // Uses food_service_nationwide_v1 standards
  },

  // Removed lower viability packs (Healthcare operations, Warehouse, Manufacturing, Construction)
  // to focus on high-viability, less competitive markets
}

/**
 * Get all active protocol packs
 */
export function getActiveProtocolPacks() {
  return Object.values(PROTOCOL_PACKS).filter(pack => pack.active)
}

/**
 * Get protocol pack by ID
 */
export function getProtocolPackById(packId) {
  return PROTOCOL_PACKS[packId] || null
}

/**
 * Validate protocol pack ID
 */
export function isValidProtocolPack(packId) {
  const pack = PROTOCOL_PACKS[packId]
  return pack && pack.active
}

/**
 * Get protocol standard by code
 */
export function getStandardByCode(packId, code) {
  const pack = getProtocolPackById(packId)
  if (!pack) return null
  
  return pack.standards.find(std => std.code === code) || null
}

/**
 * Get all standards in a category
 */
export function getStandardsByCategory(packId, category) {
  const pack = getProtocolPackById(packId)
  if (!pack) return []
  
  return pack.standards.filter(std => std.category === category)
}

/**
 * Map legacy sector to protocol pack
 */
export function legacySectorToProtocolPack(sector) {
  const mapping = {
    food_safety: 'food_service_michigan_v1',
  }
  
  return mapping[sector] || 'food_service_michigan_v1'
}

/**
 * Get severity level mapping
 */
export const SEVERITY_TO_RISK_LEVEL = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

/**
 * Get inspection status mapping
 */
export const INSPECTION_STATUS = {
  PASS: 'pass',
  FAIL: 'fail',
  WARNING: 'warning',
  INSUFFICIENT_DATA: 'insufficient_data',
}
