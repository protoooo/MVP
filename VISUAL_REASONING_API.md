# Visual Reasoning API Documentation

## Overview

The Visual Reasoning API is a production-ready system that acts as a non-stop "second pair of eyes" for businesses. It evaluates images or videos taken during normal business workflows and returns structured, actionable feedback.

**NOT a single-industry tool. NOT a hardcoded rules engine. NOT a generic AI wrapper.**

This is a **configurable Visual Reasoning API** that helps businesses automatically verify that work is being done correctly, consistently, and according to their standards — without changing how they already operate.

## Core Concept

Businesses already take photos during:
- Receiving shipments
- Stocking shelves
- Cleaning areas
- Completing deliveries
- Inspecting equipment
- Closing out tasks

This API simply:
1. Receives those images
2. Evaluates them using visual reasoning
3. Applies the business's expectations
4. Returns clear, structured results
5. Optionally sends results to a webhook

**No new hardware. No new workflows. No AI expertise required.**

## Intelligence Layers

The system has THREE layers of intelligence:

### 1. General Visual Reasoning (Given)
- Comes from the base multimodal AI model
- Understands: objects, damage, cleanliness, organization, missing/extra items, safety risks, common-sense correctness
- NOT trained or modified per customer

### 2. Task Context (Controlled by the API)
- The API tells the model:
  - What type of task this image represents
  - What to pay attention to
  - How strict to be
  - What format to respond in

### 3. Customer Expectations (Optional, Configurable)
- Businesses can provide:
  - Nothing (zero-config mode)
  - Plain-language rules
  - Documents when precision matters
- These do NOT train the model
- They constrain and guide reasoning

## API Endpoints

### 1. Main Analysis Endpoint

**POST /api/audit-media**

Analyze images or videos using configured standards.

#### Request Headers
```
X-Api-Key: your_api_key_here
Content-Type: application/json  (or multipart/form-data)
```

#### Request Body (JSON)
```json
{
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "standards_profile_id": "uuid-of-profile",  // Optional
  "metadata": {
    "location": "warehouse-a",
    "task": "receiving",
    "timestamp": "2025-12-29T10:00:00Z"
  }
}
```

#### Request Body (Multipart)
```
files: [File, File, ...]
standards_profile_id: uuid-of-profile  // Optional
metadata: JSON string with location, task, timestamp, etc.
```

#### Response (200 OK)
```json
{
  "session_id": "uuid",
  "findings": [
    {
      "type": "issue",
      "severity": "major",
      "category": "Safety",
      "description": "Boxes stacked unsafely beyond safe height limit",
      "confidence": 0.92,
      "location": "northwest corner",
      "recommendation": "Reduce stack height to 6 feet maximum",
      "document_reference": null
    },
    {
      "type": "confirmation",
      "severity": "info",
      "category": "Organization",
      "description": "Items properly labeled and organized",
      "confidence": 0.88,
      "location": "main storage area"
    }
  ],
  "severity_summary": {
    "critical": 0,
    "major": 1,
    "minor": 2,
    "info": 5
  },
  "overall_score": 85,
  "compliant": true,
  "summary": "Analyzed 2 image(s). Found 3 issue(s).",
  "media_analyzed": 2,
  "credits_used": 2,
  "remaining_credits": 998,
  "profile_used": {
    "id": "uuid",
    "name": "Logistics - Warehouse",
    "industry": "logistics",
    "task_type": "storage"
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Invalid or inactive API key"
}
```

**402 Payment Required**
```json
{
  "error": "Insufficient credits",
  "remaining_credits": 0,
  "buy_more": "https://example.com/#pricing"
}
```

**400 Bad Request**
```json
{
  "error": "No images or videos provided"
}
```

### 2. Standards Profiles Management

**GET /api/profiles**

List all profiles accessible to your API key (system + custom).

#### Response
```json
{
  "profiles": [
    {
      "id": "uuid",
      "profile_name": "Food Service - General",
      "industry": "food",
      "task_type": "general",
      "strictness_level": "high",
      "plain_language_rules": [
        "Food must be stored at safe temperatures",
        "Surfaces should be clean and sanitized"
      ],
      "is_system_profile": true,
      "description": "General food safety compliance"
    }
  ],
  "available_industries": ["food", "retail", "logistics", "construction", "healthcare", "general"],
  "available_task_types": ["general", "receiving", "storage", "cleaning", "delivery", "inspection"],
  "available_strictness_levels": ["low", "medium", "high"]
}
```

**POST /api/profiles**

Create a custom standards profile.

#### Request
```json
{
  "profile_name": "My Custom Warehouse Profile",
  "industry": "logistics",
  "task_type": "storage",
  "strictness_level": "high",
  "plain_language_rules": [
    "All pallets must be shrink-wrapped",
    "Aisles must be clear of obstacles",
    "Temperature must be between 60-75°F"
  ],
  "description": "Custom profile for our warehouse operations"
}
```

#### Response (201 Created)
```json
{
  "profile": {
    "id": "uuid",
    "profile_name": "My Custom Warehouse Profile",
    "industry": "logistics",
    "task_type": "storage",
    "strictness_level": "high",
    "plain_language_rules": [...],
    "is_system_profile": false,
    "active": true,
    "created_at": "2025-12-29T10:00:00Z"
  }
}
```

**PUT /api/profiles**

Update an existing custom profile.

#### Request
```json
{
  "profile_id": "uuid",
  "profile_name": "Updated Profile Name",
  "plain_language_rules": [
    "New rule 1",
    "New rule 2"
  ]
}
```

**DELETE /api/profiles**

Delete a custom profile.

#### Request
```json
{
  "profile_id": "uuid"
}
```

### 3. Webhook Configuration

**GET /api/webhooks**

Get webhook configuration and delivery history.

#### Response
```json
{
  "configured": true,
  "webhook": {
    "id": "uuid",
    "webhook_url": "https://example.com/webhook",
    "active": true,
    "max_retries": 3,
    "retry_delay_seconds": 60,
    "created_at": "2025-12-29T10:00:00Z",
    "last_triggered_at": "2025-12-29T15:30:00Z"
  },
  "delivery_history": [
    {
      "id": "uuid",
      "status": "sent",
      "attempt_count": 1,
      "response_code": 200,
      "created_at": "2025-12-29T15:30:00Z",
      "delivered_at": "2025-12-29T15:30:01Z"
    }
  ]
}
```

**POST /api/webhooks**

Register a webhook endpoint.

#### Request
```json
{
  "webhook_url": "https://example.com/webhook",
  "max_retries": 3,
  "retry_delay_seconds": 60
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "webhook": {
    "id": "uuid",
    "webhook_url": "https://example.com/webhook",
    "webhook_secret": "hex-secret-string",
    "active": true,
    "max_retries": 3,
    "retry_delay_seconds": 60
  },
  "message": "Webhook registered successfully. Save the webhook_secret - it will not be shown again."
}
```

**PUT /api/webhooks**

Update webhook configuration.

#### Request
```json
{
  "webhook_url": "https://new-url.com/webhook",
  "active": true
}
```

**DELETE /api/webhooks**

Delete webhook configuration.

## Zero-Config Mode

If you provide NO profile ID, the system uses a default "Zero Config" profile that:
- Applies common best practices across industries
- Flags only obvious issues
- Avoids proprietary assumptions
- Returns conservative, explainable results

This is how small businesses can onboard instantly without any configuration.

## Webhook Payload

When a webhook is configured, the same JSON response from `/api/audit-media` is sent to your webhook URL with these headers:

```
Content-Type: application/json
X-Webhook-Signature: hmac-sha256-signature
X-Webhook-Timestamp: 2025-12-29T15:30:00Z
X-Webhook-Delivery-Id: uuid
```

### Verifying Webhook Signatures

```javascript
const crypto = require('crypto')

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
  
  return signature === expectedSignature
}
```

## Integration Examples

### JavaScript/Node.js
```javascript
const response = await fetch('https://api.example.com/api/audit-media', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    images: ['https://example.com/image.jpg'],
    standards_profile_id: 'profile-uuid',
    metadata: {
      location: 'warehouse-a',
      task: 'receiving'
    }
  })
})

const result = await response.json()
console.log('Overall Score:', result.overall_score)
console.log('Findings:', result.findings)
```

### Python
```python
import requests

response = requests.post(
    'https://api.example.com/api/audit-media',
    headers={'X-Api-Key': 'your_api_key'},
    json={
        'images': ['https://example.com/image.jpg'],
        'standards_profile_id': 'profile-uuid',
        'metadata': {
            'location': 'warehouse-a',
            'task': 'receiving'
        }
    }
)

result = response.json()
print(f"Overall Score: {result['overall_score']}")
print(f"Findings: {result['findings']}")
```

### cURL
```bash
curl -X POST https://api.example.com/api/audit-media \
  -H "X-Api-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://example.com/image.jpg"],
    "standards_profile_id": "profile-uuid",
    "metadata": {
      "location": "warehouse-a",
      "task": "receiving"
    }
  }'
```

## Supported Industries

- **Food Service**: Restaurants, cafeterias, food processing
- **Retail**: Stores, supermarkets, inventory management
- **Logistics**: Warehouses, delivery, shipping/receiving
- **Construction**: Site safety, quality verification
- **Healthcare**: Facility cleaning, compliance checks
- **General**: Any industry with zero-config mode

## Task Types

- **General**: Broad compliance verification
- **Receiving**: Delivery and shipment inspection
- **Storage**: Inventory and warehouse checks
- **Cleaning**: Sanitation verification
- **Delivery**: Completion and condition checks
- **Inspection**: Quality and safety audits

## Strictness Levels

- **Low**: Flag only severe, obvious issues
- **Medium**: Balance between catching issues and false positives (default)
- **High**: Flag all potential issues, be conservative

## Rate Limits

- Maximum 200 images per request
- No per-second rate limit (limited by credits only)
- Webhook retries: configurable (default 3 attempts)

## Credits System

- 1 credit = 1 image analyzed
- Credits deducted after successful analysis
- Check `remaining_credits` in response
- Purchase more credits when depleted

## Best Practices

1. **Use Standards Profiles**: Create custom profiles for your specific needs
2. **Provide Metadata**: Include location, task type, and timestamps
3. **Configure Webhooks**: For async processing and integration
4. **Verify Signatures**: Always verify webhook signatures for security
5. **Handle Errors**: Implement proper error handling and retries
6. **Monitor Credits**: Track credit usage to avoid service interruption

## Security

- API keys are 256-bit cryptographic tokens
- HTTPS enforced for all requests
- Webhook payloads are signed with HMAC-SHA256
- No sensitive data stored in findings
- Audit logging for all API requests

## Support

For issues or questions:
- API documentation: This file
- Integration help: See examples above
- Technical support: Contact your account manager
