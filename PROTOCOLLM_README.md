# ProtocolLM - Universal Compliance & Standard Procedures Integration Engine

**Sector-agnostic compliance and standard-procedures enforcement engine** designed to integrate into existing business systems **without requiring developers**.

## What is ProtocolLM?

ProtocolLM is **not a workflow platform**, **not an automation builder**, and **not an AI chat wrapper**.

It is a **plug-and-play compliance endpoint** that:

* Accepts structured or semi-structured operational inputs
* Evaluates them strictly against official, pre-defined standards
* Produces **deterministic, auditable, machine-readable decisions**
* Pushes results back into the customer's existing tools

ProtocolLM feels like **something you connect to**, not something you configure.

## Core Philosophy

1. **Protocol First, AI Second**
   - AI is used only for interpretation and classification
   - All decisions trace back to authoritative standards

2. **Opinionated Outputs**
   - No free-form advice
   - No speculative reasoning
   - Every response includes: Status, Risk level, Applicable protocol reference, Required action

3. **Zero Developer Assumption**
   - All integrations possible via: Webhooks, No-code tools, Simple exports, Minimal configuration

## Supported Sectors (Protocol Packs)

ProtocolLM is a **nationwide compliance engine** focusing on **5 high-viability sectors** with strong regulatory requirements and less technology competition:

### ✅ Active Protocol Packs (Available Now)

#### 1. 🍽️ Food Service & Retail (HIGHEST VIABILITY)
- **Protocol Pack**: `food_service_nationwide_v1`
- **Coverage**: Nationwide (FDA Food Code)
- **Target Market**: Restaurant chains, grocery stores, food retail, catering, institutional food service
- **Why High Viability**: Frequent health inspections, high violation penalties, brand reputation risk
- **Input Types**: Image ✅, Text ✅, Forms ✅

#### 2. 🏥 Senior Living & Assisted Care (HIGH VIABILITY)
- **Protocol Pack**: `senior_living_facilities_v1`
- **Coverage**: Nationwide (CMS, State Regulations)
- **Target Market**: Assisted living, memory care, independent living, nursing homes
- **Why High Viability**: State inspections, CMS compliance, family concerns, less tech competition than hospitals
- **Input Types**: Image ✅, Text ✅, Forms ✅

#### 3. 👶 Child Care & Daycare (HIGH VIABILITY)
- **Protocol Pack**: `childcare_facilities_v1`
- **Coverage**: Nationwide (State Licensing)
- **Target Market**: Daycare centers, preschools, after-school programs, child care chains
- **Why High Viability**: Highly regulated, parent concerns, surprise inspections, license suspension risk
- **Input Types**: Image ✅, Text ✅, Forms ✅

#### 4. 🏢 Property Management & Multi-Family Housing (HIGH VIABILITY)
- **Protocol Pack**: `property_management_v1`
- **Coverage**: Nationwide (HUD, Local Housing Codes)
- **Target Market**: Apartment complexes, property management companies, affordable housing, student housing
- **Why High Viability**: Large market, housing inspections, tenant complaints, minimal tech solutions
- **Input Types**: Image ✅, Text ✅, Forms ✅

#### 5. 💪 Fitness Centers & Gyms (HIGH VIABILITY)
- **Protocol Pack**: `fitness_facilities_v1`
- **Coverage**: Nationwide (Health Department, Safety Regulations)
- **Target Market**: Gyms, fitness studios, yoga studios, CrossFit boxes, corporate wellness centers
- **Why High Viability**: Health/safety focused, growing market, member safety concerns, equipment liability
- **Input Types**: Image ✅, Text ✅, Forms ✅

---

### Why These 5 Sectors?

✅ **Less Competition**: Not crowded with tech solutions  
✅ **High Compliance Burden**: Frequent inspections and strict regulations  
✅ **Strong Pain Points**: Real business problems (fines, license suspension, reputation)  
✅ **Easy to Sell**: Clear ROI and immediate value  
✅ **Nationwide Coverage**: Same regulations across states (mostly federal/FDA/CMS/HUD)  

Each sector is implemented as a **Protocol Pack** - an immutable, versioned set of rules and standards.

### Supported Input Formats

ProtocolLM accepts the workflows you already perform - **no changes needed**:

- ✅ **Images** - Photos from inspections, walkthroughs, audits (supports large image sets, up to 200 images per request)
- ✅ **Text** - Logs, checklists, procedures, SOPs, large documents (auto-chunked for processing)
- ✅ **Forms** - Structured checklists, compliance forms, audit forms
- 🔜 **Video** - Video walkthroughs and recordings (coming Q2 2024)
- 🔜 **Sensor Data** - Temperature logs, environmental sensors (coming Q2 2024)

## Quick Start

### Option 1: For Developers

If you have technical staff, follow the API integration guide below.

### Option 2: For Non-Technical Users (No Code!)

**Don't have a developer?** No problem! Use our no-code integration:

👉 **[Complete No-Code Setup Guide](NO_CODE_SETUP_GUIDE.md)** 👈

You can integrate ProtocolLM using:
- Zapier (easiest!)
- Make.com (Integromat)
- Google Sheets
- Airtable
- Any webhook-enabled tool

**Setup time: 10-15 minutes, no coding required!**

---

### For Developers: Standard Integration

#### 1. Get an API Key

Purchase a plan or prepaid pack to receive your API key instantly:

**Free Tier** (For Testing)
- **Free**: $0/mo → 100 inspections per month
- Perfect for testing and evaluation
- No credit card required
- Instant API key generation

**Subscriptions** (Unlimited webhooks)
- **Growth**: $99/mo → 3,000 inspections included + $0.03/extra
- **Chain**: $499/mo → 20,000 inspections included + $0.025/extra
- **Enterprise**: $1,999/mo → Unlimited inspections

**Prepaid Packs** (Optional - No commitment)
- **Starter**: 1,000 inspections - $39 ($0.039/inspection)
- **Pro**: 10,000 inspections - $349 ($0.035/inspection)
- **Enterprise**: 100,000 inspections - $3,000 ($0.03/inspection)

### 2. Connect Your System

ProtocolLM exposes a **single primary webhook endpoint** that works with any sector:

```
POST /api/v1/inspect
```

**Key Features:**
- Nationwide coverage across 5 high-viability sectors
- Supports both image and text analysis
- Handles large image sets (up to 200 images)
- Handles large documents (auto-chunked)
- Works with existing workflows - **no changes needed**
- **No-code integration options available** - [See No-Code Setup Guide](NO_CODE_SETUP_GUIDE.md)

## API Reference

### POST /api/v1/inspect

Primary compliance inspection endpoint.

**Request Headers:**
```
Authorization: Bearer YOUR_API_KEY_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "protocol_pack": "food_service_michigan_v1",
  "input_type": "image",
  "context": {
    "location": "kitchen",
    "timestamp": "2024-01-15T10:30:00Z",
    "operator": "john_doe"
  },
  "payload": {
    "images": [
      "https://example.com/kitchen-photo.jpg",
      "https://example.com/storage-photo.jpg"
    ]
  }
}
```

**Supported Input Types:**
- `image` - Photo evidence (URLs)
- `video` - Video clips (coming soon)
- `text` - Logs, checklists (coming soon)
- `sensor` - Temperature, humidity data (coming soon)
- `form` - Structured form data (coming soon)

**Response (Success):**
```json
{
  "inspection_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "fail",
  "risk_level": "critical",
  "findings": [
    {
      "protocol_reference": "3-501.16",
      "description": "Cold storage temperature above 41°F",
      "evidence_type": "image",
      "confidence": 0.92
    }
  ],
  "required_actions": [
    {
      "action": "Address violation: Cold storage temperature above 41°F",
      "urgency": "immediate",
      "verification_required": true,
      "protocol_reference": "3-501.16"
    }
  ],
  "audit_ready": true,
  "metadata": {
    "protocol_pack": "food_service_michigan_v1",
    "input_type": "image",
    "timestamp": "2024-01-15T10:30:00Z",
    "location": "kitchen",
    "credits_used": 2,
    "remaining_credits": 998
  }
}
```

**Response Statuses:**
- `pass` - No violations found
- `fail` - Critical or high violations detected
- `warning` - Medium/low violations detected
- `insufficient_data` - Unable to determine compliance

**Risk Levels:**
- `critical` - Immediate action required
- `high` - Same-day resolution required
- `medium` - Scheduled resolution
- `low` - Minor issue

**Error Responses:**

```json
// 401 - Invalid API Key
{
  "error": "Invalid or inactive API key"
}

// 402 - Insufficient Credits
{
  "error": "Insufficient credits",
  "remaining_credits": 0,
  "buy_more": "https://protocollm.com/#pricing"
}

// 400 - Invalid Protocol Pack
{
  "error": "Invalid protocol_pack",
  "message": "Protocol pack \"xyz\" not found or inactive",
  "available_packs": ["food_service_michigan_v1"]
}
```

## Integration Examples

### Example 1: Food Service - Image Analysis
```javascript
const response = await fetch('https://protocollm.com/api/v1/inspect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    protocol_pack: 'food_service_nationwide_v1',
    input_type: 'image',
    context: {
      location: 'kitchen',
      timestamp: new Date().toISOString(),
      operator: 'manager_001'
    },
    payload: {
      images: [
        'https://example.com/kitchen-photo.jpg',
        'https://example.com/storage-photo.jpg',
        'https://example.com/prep-area.jpg'
      ]
    }
  })
})

const inspection = await response.json()
// Returns: inspection_id, status, risk_level, findings, required_actions
```

### Example 2: Senior Living - Checklist Analysis (Text)
```javascript
const response = await fetch('https://protocollm.com/api/v1/inspect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    protocol_pack: 'senior_living_facilities_v1',
    input_type: 'text',
    context: {
      location: 'resident_room_204',
      timestamp: new Date().toISOString(),
    },
    payload: {
      text: `Daily Care Checklist - Date: 2024-01-15
      
      Room 204 - Mrs. Johnson
      - Medication administered at scheduled time: YES
      - Fall prevention measures in place: YES
      - Call button within reach: YES
      - Room clean and organized: YES
      - Bed rails properly positioned: NO - found lowered
      - Adequate lighting: YES
      
      Notes: Bed rails were found in lowered position during afternoon check.
      Resident was sleeping safely but rails should have been up per care plan.
      Staff: J. Smith, Time: 14:30`
    }
  })
})

const inspection = await response.json()
// AI detects bed rail violation as potential fall risk
```

### Example 3: Child Care - Large Document Analysis (Text)
```javascript
const response = await fetch('https://protocollm.com/api/v1/inspect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    protocol_pack: 'childcare_facilities_v1',
    input_type: 'text',
    context: {
      location: 'preschool_room_2',
      timestamp: new Date().toISOString(),
    },
    payload: {
      document: `DAILY SAFETY INSPECTION REPORT
      
      Date: January 15, 2024
      Room: Preschool Room 2
      Inspector: Sarah Martinez
      
      MORNING INSPECTION:
      ✓ All toys sanitized from previous day
      ✓ Cleaning supplies locked in cabinet
      ✓ Outlet covers in place
      ✓ Emergency exits clear
      ✓ First aid kit fully stocked
      ✗ Staff-to-child ratio: 1:12 (Should be 1:10 for ages 3-4)
      ✓ Hand sanitizer available
      ✓ Diaper changing station cleaned
      
      OUTDOOR AREA:
      ✓ Playground equipment inspected - OK
      ✓ Fence secure - no gaps
      ✗ Sandbox cover not in place overnight - found toys inside
      ✓ Shade structure functional
      
      ISSUES NOTED:
      Staff ratio exceeded state requirement during morning drop-off.
      Additional staff member called in.
      
      Sandbox requires cleaning due to uncovered overnight exposure.`,
      document_type: 'inspection_report'
    }
  })
})

const inspection = await response.json()
// AI flags staff ratio violation as critical compliance issue
```

### Example 4: Property Management - Form Data (Checklist)
```javascript
const response = await fetch('https://protocollm.com/api/v1/inspect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    protocol_pack: 'property_management_v1',
    input_type: 'form',
    context: {
      location: 'unit_3b',
      timestamp: new Date().toISOString(),
    },
    payload: {
      checklist: {
        title: 'Pre-Move-In Unit Inspection',
        unit: '3B',
        date: '2024-01-15',
        items: [
          {
            question: 'Smoke detectors installed and functional?',
            completed: true,
            response: 'yes',
            notes: 'Tested all 3 units - working'
          },
          {
            question: 'Carbon monoxide detector present and functional?',
            completed: false,
            response: 'no',
            notes: 'Missing in bedroom'
          },
          {
            question: 'GFCI outlets in kitchen and bathroom?',
            completed: true,
            response: 'yes'
          },
          {
            question: 'All windows open and lock properly?',
            completed: true,
            response: 'yes'
          },
          {
            question: 'Hot water temperature safe (120°F or below)?',
            completed: true,
            response: 'yes',
            notes: 'Measured at 118°F'
          }
        ]
      }
    }
  })
})

const inspection = await response.json()
// AI flags missing CO detector as critical safety violation
```

### Example 5: Fitness Center - Multiple Images (Large Set)
```javascript
const response = await fetch('https://protocollm.com/api/v1/inspect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    protocol_pack: 'fitness_facilities_v1',
    input_type: 'image',
    context: {
      location: 'main_gym_floor',
      timestamp: new Date().toISOString(),
    },
    payload: {
      // Supports up to 200 images per request
      images: [
        'https://example.com/cardio-equipment-1.jpg',
        'https://example.com/cardio-equipment-2.jpg',
        'https://example.com/weight-machines-1.jpg',
        'https://example.com/weight-machines-2.jpg',
        'https://example.com/free-weights-area.jpg',
        'https://example.com/locker-room-mens.jpg',
        'https://example.com/locker-room-womens.jpg',
        'https://example.com/shower-facilities.jpg',
        'https://example.com/pool-area.jpg',
        'https://example.com/sauna-steam.jpg',
        // ... up to 200 images
      ]
    }
  })
})

const inspection = await response.json()
// Analyzes all images, aggregates findings across the entire set
```

### Example 6: Multi-Document Processing
```javascript
const response = await fetch('https://protocollm.com/api/v1/inspect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    protocol_pack: 'healthcare_operations_v1',
    input_type: 'text',
    context: {
      location: 'facility_a',
      timestamp: new Date().toISOString(),
    },
    payload: {
      documents: [
        {
          name: 'cleaning_log.txt',
          type: 'log',
          content: 'Daily cleaning log content here...'
        },
        {
          name: 'ppe_inventory.txt',
          type: 'inventory',
          content: 'PPE inventory checklist content here...'
        },
        {
          name: 'waste_disposal_log.txt',
          type: 'log',
          content: 'Medical waste disposal log content here...'
        }
      ]
    }
  })
})

const inspection = await response.json()
// Processes each document separately, aggregates findings
```

### Python Examples

#### Food Service - Image Analysis
```python
import requests
from datetime import datetime

response = requests.post(
    'https://protocollm.com/api/v1/inspect',
    headers={
        'Authorization': 'Bearer sk_your_api_key_here',
        'Content-Type': 'application/json',
    },
    json={
        'protocol_pack': 'food_service_nationwide_v1',
        'input_type': 'image',
        'context': {
            'location': 'kitchen',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
        'payload': {
            'images': ['https://example.com/kitchen.jpg']
        }
    }
)

inspection = response.json()
print(f"Status: {inspection['status']}")
print(f"Risk Level: {inspection['risk_level']}")
print(f"Findings: {inspection['findings']}")
```

#### Daycare - Checklist Analysis
```python
import requests
from datetime import datetime

response = requests.post(
    'https://protocollm.com/api/v1/inspect',
    headers={
        'Authorization': 'Bearer sk_your_api_key_here',
        'Content-Type': 'application/json',
    },
    json={
        'protocol_pack': 'childcare_facilities_v1',
        'input_type': 'form',
        'context': {
            'location': 'infant_room',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
        'payload': {
            'checklist': {
                'title': 'Daily Safety Checklist',
                'items': [
                    {
                        'question': 'Are cribs clear of toys and blankets?',
                        'completed': True,
                        'response': 'yes'
                    },
                    {
                        'question': 'Is staff-to-child ratio compliant?',
                        'completed': False,
                        'response': 'no',
                        'notes': '1:6 ratio, should be 1:4 for infants'
                    }
                ]
            }
        }
    }
)

inspection = response.json()
if inspection['status'] == 'fail':
    print("CRITICAL VIOLATIONS FOUND:")
    for finding in inspection['findings']:
        print(f"  - {finding['description']} ({finding['protocol_reference']})")
```

### cURL
```bash
curl -X POST https://protocollm.com/api/v1/inspect \
  -H "Authorization: Bearer sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "protocol_pack": "food_service_michigan_v1",
    "input_type": "image",
    "context": {
      "location": "kitchen",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "payload": {
      "images": ["https://example.com/kitchen.jpg"]
    }
  }'
```

### Webhook Integration Patterns

#### Pattern 1: Restaurant Daily Photo Upload Workflow
```javascript
// Your existing photo upload webhook receiver
app.post('/operations/daily-photos', async (req, res) => {
  const { photos, location, shift } = req.body
  
  // Send to ProtocolLM for compliance check (no workflow changes needed)
  const inspection = await fetch('https://protocollm.com/api/v1/inspect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PROTOCOLLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      protocol_pack: 'food_service_nationwide_v1',
      input_type: 'image',
      context: { 
        location,
        operator: shift.manager,
        timestamp: new Date().toISOString()
      },
      payload: { images: photos.map(p => p.url) }
    })
  }).then(r => r.json())
  
  // Handle results - integrate into existing systems
  if (inspection.status === 'fail' || inspection.risk_level === 'critical') {
    // Alert manager immediately
    await alertManager.critical({
      location,
      inspection_id: inspection.inspection_id,
      findings: inspection.findings,
      actions: inspection.required_actions
    })
    
    // Create work orders for each required action
    for (const action of inspection.required_actions) {
      if (action.urgency === 'immediate') {
        await workOrderSystem.create({
          location,
          priority: 'urgent',
          description: action.action,
          reference: action.protocol_reference
        })
      }
    }
  }
  
  // Store in compliance database
  await db.compliance_inspections.create({
    inspection_id: inspection.inspection_id,
    location,
    date: new Date(),
    status: inspection.status,
    risk_level: inspection.risk_level,
    findings_count: inspection.findings.length,
    raw_data: inspection
  })
  
  // Update dashboard metrics
  await dashboardMetrics.update(location, {
    last_inspection: new Date(),
    compliance_score: inspection.status === 'pass' ? 100 : 
                     inspection.findings.length === 0 ? 100 : 
                     Math.max(0, 100 - (inspection.findings.length * 10))
  })
  
  res.json({ success: true, inspection_id: inspection.inspection_id })
})
```

#### Pattern 2: Warehouse Forklift Inspection Form Integration
```javascript
// Integrate with existing forklift inspection app
app.post('/safety/forklift-inspection-submit', async (req, res) => {
  const { forklift_id, operator, checklist_data } = req.body
  
  // Send checklist to ProtocolLM for compliance verification
  const inspection = await fetch('https://protocollm.com/api/v1/inspect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PROTOCOLLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      protocol_pack: 'warehouse_logistics_v1',
      input_type: 'form',
      context: {
        location: `forklift_${forklift_id}`,
        operator: operator,
        timestamp: new Date().toISOString()
      },
      payload: {
        checklist: checklist_data
      }
    })
  }).then(r => r.json())
  
  // Lock equipment if critical violations found
  if (inspection.risk_level === 'critical') {
    await equipmentControl.lockout({
      equipment_id: forklift_id,
      reason: 'Critical safety violation detected',
      inspection_id: inspection.inspection_id,
      requires_manager_override: true
    })
    
    // Notify safety team immediately
    await notificationService.sendUrgent({
      to: 'safety-team',
      subject: `CRITICAL: Forklift ${forklift_id} Safety Violation`,
      body: inspection.findings.map(f => f.description).join('\n')
    })
  }
  
  res.json({ 
    inspection_result: inspection.status,
    equipment_locked: inspection.risk_level === 'critical',
    inspection_id: inspection.inspection_id
  })
})
```

#### Pattern 3: Healthcare Daily Cleaning Log Workflow
```javascript
// Process end-of-shift cleaning logs
app.post('/housekeeping/submit-cleaning-log', async (req, res) => {
  const { room, cleaner, log_text } = req.body
  
  // Analyze cleaning log for compliance
  const inspection = await fetch('https://protocollm.com/api/v1/inspect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PROTOCOLLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      protocol_pack: 'healthcare_operations_v1',
      input_type: 'text',
      context: {
        location: room,
        operator: cleaner,
        timestamp: new Date().toISOString()
      },
      payload: {
        text: log_text
      }
    })
  }).then(r => r.json())
  
  // Flag room if not properly cleaned
  if (inspection.status !== 'pass') {
    await roomStatus.update(room, {
      status: 'needs_recleaning',
      reason: inspection.findings[0]?.description || 'Compliance issue',
      inspection_id: inspection.inspection_id
    })
    
    // Assign re-cleaning task
    await taskManager.create({
      type: 'recleaning',
      room: room,
      priority: inspection.risk_level === 'critical' ? 'urgent' : 'high',
      notes: inspection.required_actions.map(a => a.action).join('; ')
    })
  }
  
  res.json({ 
    compliance_status: inspection.status,
    needs_attention: inspection.status !== 'pass'
  })
})
```

#### Pattern 4: Construction Site Photo Upload (Large Sets)
```javascript
// Process end-of-day jobsite photos
app.post('/construction/daily-photos', async (req, res) => {
  const { jobsite_id, photo_urls, inspector } = req.body
  
  // ProtocolLM handles large image sets (up to 200 images)
  const inspection = await fetch('https://protocollm.com/api/v1/inspect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PROTOCOLLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      protocol_pack: 'construction_safety_v1',
      input_type: 'image',
      context: {
        location: jobsite_id,
        operator: inspector,
        timestamp: new Date().toISOString()
      },
      payload: {
        images: photo_urls // Can be 1-200 images
      }
    })
  }).then(r => r.json())
  
  // Stop work if critical violations found
  if (inspection.risk_level === 'critical') {
    await jobsiteControl.issueStopWorkOrder({
      jobsite_id: jobsite_id,
      reason: 'Critical safety violations detected',
      violations: inspection.findings.filter(f => f.severity === 'critical'),
      inspection_id: inspection.inspection_id
    })
    
    // Notify all stakeholders
    await notificationService.broadcast({
      jobsite: jobsite_id,
      level: 'critical',
      message: `Work stopped due to safety violations. See inspection ${inspection.inspection_id}`,
      recipients: ['foreman', 'safety_officer', 'project_manager']
    })
  }
  
  res.json({
    inspection_id: inspection.inspection_id,
    status: inspection.status,
    work_stopped: inspection.risk_level === 'critical'
  })
})
```

#### Pattern 5: Manufacturing SOP Document Review
```javascript
// Review updated SOPs for compliance before approval
app.post('/quality/sop-review', async (req, res) => {
  const { sop_id, document_text, author } = req.body
  
  // Analyze SOP document for compliance with standards
  const inspection = await fetch('https://protocollm.com/api/v1/inspect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PROTOCOLLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      protocol_pack: 'manufacturing_operations_v1',
      input_type: 'text',
      context: {
        location: 'document_review',
        operator: author,
        timestamp: new Date().toISOString()
      },
      payload: {
        document: document_text,
        document_type: 'sop'
      }
    })
  }).then(r => r.json())
  
  // Update SOP status based on compliance
  if (inspection.status === 'pass') {
    await sopSystem.update(sop_id, {
      compliance_status: 'approved',
      reviewed_at: new Date(),
      inspection_id: inspection.inspection_id
    })
  } else {
    await sopSystem.update(sop_id, {
      compliance_status: 'needs_revision',
      review_notes: inspection.findings.map(f => 
        `${f.protocol_reference}: ${f.description}`
      ).join('\n'),
      inspection_id: inspection.inspection_id
    })
    
    // Notify author of required changes
    await notificationService.send({
      to: author,
      subject: `SOP ${sop_id} Requires Compliance Updates`,
      body: `Your SOP has been reviewed and requires updates:\n\n${
        inspection.required_actions.map(a => `- ${a.action}`).join('\n')
      }`
    })
  }
  
  res.json({
    approved: inspection.status === 'pass',
    inspection_id: inspection.inspection_id,
    required_changes: inspection.required_actions
  })
})
```

## Backward Compatibility

### Legacy Endpoint (Still Supported)

The original `/api/audit-photos` endpoint remains available for existing integrations:

```bash
curl -X POST https://protocollm.com/api/audit-photos \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://example.com/kitchen.jpg"],
    "api_key": "sk_your_api_key_here",
    "location": "kitchen"
  }'
```

**Response:**
```json
{
  "violations": ["3-501.16 Cold storage <41°F"],
  "score": 87,
  "michigan_code_refs": ["3-501.16"],
  "analyzed_count": 1,
  "violation_count": 1,
  "credits_used": 1,
  "remaining_credits": 999
}
```

## Protocol Packs

### Available Protocol Packs

#### food_service_michigan_v1
- **Sector**: Food Service & Retail
- **Coverage**: Michigan Food Code
- **Standards**: 13 core compliance categories
- **Status**: Active

Categories covered:
- Temperature Control (3-501.16, 3-501.17)
- Cross Contamination (3-302.11)
- Equipment & Facilities (4-601.11, 4-202.16)
- Personal Hygiene (2-301.11, 2-401.11)
- Chemical Storage (7-206.11, 7-207.11)
- Pest Control (6-202.11)
- Food Labeling (3-602.11)
- Sanitation (4-501.11)
- Employee Health (2-201.11)

### Coming Soon

Additional protocol packs are in development. Contact us if you need a specific sector.

## Architecture

- **Frontend**: Next.js 15 (landing page & dashboard)
- **API**: Next.js API Routes
- **AI Engine**: Cohere Vision AYA-32B, Rerank 4.0, Embed 4.0
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe (Checkout + Webhooks)
- **Deployment**: Railway

## Security

- API keys are cryptographically secure (256-bit)
- TLS enforced for all requests
- Stripe handles all payment processing (PCI compliant)
- Row Level Security (RLS) on database
- Webhook signature verification
- Rate limiting per API key
- Audit logs for all inspections

## Pricing & Billing

### Cost Structure

- Priced by inspections (images, inputs processed)
- Priced by Protocol Packs enabled
- No per-seat pricing
- No per-workflow pricing
- Unlimited users per business

### Your Costs (AI/Infrastructure)

- Cohere Vision API: ~$0.01/image
- Supabase: ~$25/month (hobby tier)
- Railway: ~$5/month (basic tier)
- Stripe: 2.9% + $0.30 per transaction

## Use Cases

### Restaurant Chains
Every photo during store checks → instant compliance data → 100K+ inspections/month

### Grocery & Retail
Inventory photos during stocking → auto-check food safety compliance

### Food Safety Systems
Add compliance layer to existing photo workflows in any system

### Health Departments
Inspection photos → instant violation detection with regulatory citations

### Compliance Teams
Automated pre-inspection monitoring and documentation

## Setup (For Self-Hosting)

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed deployment instructions.

## Support

For issues or questions:
- API integration help: See examples above
- Protocol Pack requests: Contact sales
- Technical support: support@protocollm.com

## License

Proprietary - ProtocolLM Compliance Engine

---

## Migration Guide

If you're using the legacy `/api/audit-photos` endpoint, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for upgrade instructions to the new ProtocolLM `/api/v1/inspect` endpoint.
