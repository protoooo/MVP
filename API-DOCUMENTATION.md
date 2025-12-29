# Food Safety Compliance API - Full Documentation

## Overview

### What is This API?

This is a food safety compliance API that analyzes photos of restaurant and food service environments to detect violations of Michigan Food Code regulations. It provides automated, instant compliance checking without requiring manual inspections.

### Who is This For?

- **Restaurant Chains** - Monitor compliance across multiple locations
- **Independent Restaurants** - Maintain food safety standards
- **Compliance Teams** - Automate inspection workflows
- **Food Service Operations** - Integrate compliance into existing systems
- **Health Departments** - Augment inspection capabilities
- **Enterprise Food Businesses** - Scale compliance monitoring

### Key Benefits

- **Automated Analysis** - Photos taken during normal operations become compliance data
- **Instant Results** - Real-time violation detection and scoring
- **Regulatory References** - Specific Michigan Food Code citations for each violation
- **Integration Friendly** - Simple API that works with any system
- **No Training Required** - Pre-configured for Michigan Food Code compliance

## How It Works

### End-to-End Process

1. **Photo Capture** - Photos are taken during normal business operations (inventory checks, cleaning verification, equipment inspection, etc.)
2. **API Submission** - Images are sent to the API via POST request with your API key
3. **AI Analysis** - Advanced computer vision analyzes each image for food safety violations
4. **Compliance Matching** - Findings are matched against Michigan Food Code regulations
5. **Structured Results** - You receive JSON data with violations, scores, and regulatory citations
6. **Automation** - Results trigger alerts, logs, dashboards, or corrective action workflows

### What the System Checks

The AI is trained to detect violations across 9 core Michigan Food Code categories:

1. **Temperature Control** (3-501.16, 3-501.17) - Cold holding, hot holding, cooling procedures
2. **Cross Contamination** (3-302.11) - Raw vs. ready-to-eat separation
3. **Equipment & Facilities** (4-601.11, 4-202.16) - Cleanliness and maintenance
4. **Personal Hygiene** (2-301.11, 2-401.11) - Handwashing, glove usage
5. **Chemical Storage** (7-206.11, 7-207.11) - Proper labeling and storage
6. **Pest Control** (6-202.11) - Evidence of pests, exclusion
7. **Food Labeling** (3-602.11) - Date marking, identification
8. **Sanitation** (4-501.11) - Cleaning schedules, sanitizer concentrations
9. **Employee Health** (2-201.11) - Illness reporting, exclusion criteria

## Authentication

### API Key System

This API uses a simple, secure authentication model with **no user accounts**.

#### How API Keys Work

1. **Subscribe** - Choose a pricing tier and complete payment via Stripe
2. **Receive Key** - API key is automatically generated and emailed to you
3. **Use Key** - Include the key in your API requests
4. **Monitor Usage** - The system tracks your image analysis count

#### API Key Format

API keys are 256-bit cryptographic tokens with the format:

```
sk_live_[random_alphanumeric_string]
```

Example: `sk_live_abc123def456...` (actual keys are longer)

#### Including Your API Key

**Option 1: Request Header (Recommended)**
```bash
curl -X POST https://protocollm.com/api/audit-photos \
  -H "X-Api-Key: sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"images": ["https://example.com/kitchen.jpg"]}'
```

**Option 2: Request Body**
```json
{
  "images": ["https://example.com/kitchen.jpg"],
  "api_key": "sk_live_your_api_key_here"
}
```

#### Security Best Practices

- Store API keys in environment variables, never commit them to code repositories
- Use HTTPS for all requests (enforced by the API)
- Rotate keys immediately if compromised
- Monitor usage patterns to detect unauthorized access
- Use different keys for development and production environments

## Endpoint Reference

### Single Endpoint: POST /api/audit-photos

This is the only endpoint you need. It accepts photos and returns compliance results.

#### Request Format

**URL**: `https://protocollm.com/api/audit-photos`

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
X-Api-Key: sk_live_your_api_key_here
```

**Body** (JSON):
```json
{
  "images": [
    "https://example.com/kitchen1.jpg",
    "https://example.com/storage2.jpg"
  ],
  "api_key": "sk_live_your_api_key_here",
  "location": "main_kitchen"
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | Array of strings | Yes | URLs of images to analyze (max 200) |
| `api_key` | String | Yes* | Your API key (*required if not in header) |
| `location` | String | No | Label for the area being audited (e.g., "kitchen", "storage") |

#### Response Format

**Success Response (200 OK)**:
```json
{
  "violations": [
    "3-501.16 Cold storage <41°F",
    "4-601.11 Equipment surfaces not clean"
  ],
  "score": 87,
  "michigan_code_refs": ["3-501.16", "4-601.11"],
  "session_id": "uuid-here",
  "report_url": "https://storage-url/reports/uuid.pdf",
  "summary": "Analyzed 2 images. Found 2 violations.",
  "analyzed_count": 2,
  "violation_count": 2,
  "credits_used": 2,
  "remaining_credits": 998,
  "detailed_violations": [
    {
      "description": "3-501.16 Cold storage <41°F",
      "type": "Temperature Control",
      "severity": "major",
      "confidence": 0.92,
      "location": "main_kitchen",
      "citations": ["3-501.16"]
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `violations` | Array | List of violation descriptions |
| `score` | Number | Compliance score (0-100) |
| `michigan_code_refs` | Array | Michigan Food Code section references |
| `session_id` | String | Unique identifier for this analysis session |
| `report_url` | String | URL to download PDF report |
| `summary` | String | Human-readable summary |
| `analyzed_count` | Number | Number of images analyzed |
| `violation_count` | Number | Number of violations found |
| `credits_used` | Number | Credits deducted for this request |
| `remaining_credits` | Number | Your remaining image credits |
| `detailed_violations` | Array | Detailed violation objects with metadata |

#### Error Responses

**401 Unauthorized** - Invalid or missing API key:
```json
{
  "error": "Invalid or inactive API key"
}
```

**402 Payment Required** - Insufficient credits:
```json
{
  "error": "Insufficient credits",
  "remaining_credits": 0,
  "buy_more": "https://protocollm.com#pricing"
}
```

**400 Bad Request** - Invalid request:
```json
{
  "error": "No images provided"
}
```

**400 Bad Request** - Too many images:
```json
{
  "error": "Maximum 200 images per request"
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "Processing failed: [error details]"
}
```

## Integration Guides

### JavaScript / Node.js

Perfect for web applications, Node.js backends, or serverless functions.

#### Basic Example

```javascript
const response = await fetch('https://protocollm.com/api/audit-photos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.FOOD_SAFETY_API_KEY
  },
  body: JSON.stringify({
    images: ['https://example.com/kitchen.jpg'],
    location: 'main_kitchen'
  })
})

const data = await response.json()

if (response.ok) {
  console.log('Compliance Score:', data.score)
  console.log('Violations:', data.violations)
  console.log('Michigan Codes:', data.michigan_code_refs)
} else {
  console.error('Error:', data.error)
}
```

#### Advanced Example with Error Handling

```javascript
async function analyzePhotos(imageUrls, location = 'general') {
  try {
    const response = await fetch('https://protocollm.com/api/audit-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.FOOD_SAFETY_API_KEY
      },
      body: JSON.stringify({
        images: imageUrls,
        location: location
      })
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error(`Insufficient credits. Buy more at: ${data.buy_more}`)
      }
      throw new Error(data.error || 'API request failed')
    }

    return {
      success: true,
      score: data.score,
      violations: data.violations,
      codes: data.michigan_code_refs,
      reportUrl: data.report_url,
      creditsRemaining: data.remaining_credits
    }
  } catch (error) {
    console.error('Photo analysis failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Usage
const result = await analyzePhotos([
  'https://example.com/kitchen1.jpg',
  'https://example.com/kitchen2.jpg'
], 'main_kitchen')

if (result.success) {
  console.log(`Score: ${result.score}`)
  console.log(`Violations: ${result.violations.join(', ')}`)
  console.log(`Credits remaining: ${result.creditsRemaining}`)
}
```

### Python

Ideal for data pipelines, automation scripts, Django/Flask applications, or data analysis.

#### Basic Example

```python
import requests
import os

def analyze_photos(image_urls, location='general'):
    """Analyze food safety photos using the compliance API."""
    
    api_key = os.getenv('FOOD_SAFETY_API_KEY')
    
    response = requests.post(
        'https://protocollm.com/api/audit-photos',
        headers={'X-Api-Key': api_key},
        json={
            'images': image_urls,
            'location': location
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        return {
            'success': True,
            'score': data['score'],
            'violations': data['violations'],
            'codes': data['michigan_code_refs'],
            'report_url': data['report_url'],
            'credits_remaining': data['remaining_credits']
        }
    else:
        error_data = response.json()
        return {
            'success': False,
            'error': error_data.get('error', 'Unknown error'),
            'status_code': response.status_code
        }

# Usage
result = analyze_photos([
    'https://example.com/kitchen1.jpg',
    'https://example.com/kitchen2.jpg'
], location='main_kitchen')

if result['success']:
    print(f"Compliance Score: {result['score']}")
    print(f"Violations: {', '.join(result['violations'])}")
    print(f"Credits Remaining: {result['credits_remaining']}")
else:
    print(f"Error: {result['error']}")
```

#### Advanced Example with Database Integration

```python
import requests
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class ComplianceLog(Base):
    __tablename__ = 'compliance_logs'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String, unique=True)
    location = Column(String)
    score = Column(Integer)
    violations = Column(JSON)
    michigan_codes = Column(JSON)
    report_url = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

def analyze_and_log(image_urls, location, db_session):
    """Analyze photos and log results to database."""
    
    api_key = os.getenv('FOOD_SAFETY_API_KEY')
    
    response = requests.post(
        'https://protocollm.com/api/audit-photos',
        headers={'X-Api-Key': api_key},
        json={'images': image_urls, 'location': location}
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Create database record
        log = ComplianceLog(
            session_id=data['session_id'],
            location=location,
            score=data['score'],
            violations=data['violations'],
            michigan_codes=data['michigan_code_refs'],
            report_url=data['report_url']
        )
        
        db_session.add(log)
        db_session.commit()
        
        return {'success': True, 'log_id': log.id}
    else:
        return {'success': False, 'error': response.json().get('error')}

# Usage
engine = create_engine('postgresql://user:pass@localhost/compliance_db')
Session = sessionmaker(bind=engine)
db = Session()

result = analyze_and_log(
    ['https://example.com/kitchen.jpg'],
    'main_kitchen',
    db
)
```

### Webhook Integration

Use webhooks when you have existing systems that already capture photos during operations.

#### Concept

Your existing system → Triggers webhook → Sends to Compliance API → Stores results

#### Example: Express.js Webhook Receiver

```javascript
const express = require('express')
const app = express()

app.use(express.json())

// Webhook endpoint that receives photos from your internal system
app.post('/webhook/photos', async (req, res) => {
  const { photos, location_id, metadata } = req.body
  
  try {
    // Send photos to compliance API
    const result = await fetch('https://protocollm.com/api/audit-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.FOOD_SAFETY_API_KEY
      },
      body: JSON.stringify({
        images: photos.map(p => p.url),
        location: location_id
      })
    }).then(r => r.json())
    
    // Store results in your database
    await db.compliance_logs.insert({
      location_id,
      score: result.score,
      violations: result.violations,
      michigan_codes: result.michigan_code_refs,
      report_url: result.report_url,
      timestamp: new Date(),
      metadata
    })
    
    // Trigger alerts if violations found
    if (result.violations.length > 0) {
      await sendAlertToManagers(location_id, result)
    }
    
    res.json({ 
      success: true, 
      session_id: result.session_id,
      score: result.score 
    })
  } catch (error) {
    console.error('Webhook processing failed:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => console.log('Webhook receiver running'))
```

#### Example: Python Flask Webhook

```python
from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

@app.route('/webhook/photos', methods=['POST'])
def handle_photos():
    """Receive photos from internal system and analyze them."""
    
    data = request.json
    photos = data.get('photos', [])
    location_id = data.get('location_id')
    
    # Send to compliance API
    response = requests.post(
        'https://protocollm.com/api/audit-photos',
        headers={'X-Api-Key': os.getenv('FOOD_SAFETY_API_KEY')},
        json={
            'images': [p['url'] for p in photos],
            'location': location_id
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        
        # Store in your database
        store_compliance_results(
            location_id=location_id,
            score=result['score'],
            violations=result['violations'],
            report_url=result['report_url']
        )
        
        # Send alerts if needed
        if result['violations']:
            send_alert(location_id, result)
        
        return jsonify({
            'success': True,
            'session_id': result['session_id'],
            'score': result['score']
        })
    else:
        return jsonify({
            'success': False,
            'error': response.json().get('error')
        }), response.status_code

if __name__ == '__main__':
    app.run(port=3000)
```

## Pricing Model Explanation

### Why Subscriptions?

This API uses subscription-based pricing because:

1. **Predictable Costs** - You know exactly what you'll pay each month
2. **Unlimited Webhooks** - Webhook delivery is free, you only pay for image analysis
3. **Fair Usage** - Pay for what you use within your tier
4. **Cost Alignment** - Our costs (AI processing) are monthly, so we pass that benefit to you
5. **Scalability** - Easy to upgrade as your needs grow

### How Image Limits Work

- Each image analyzed counts as **1 credit**
- Webhook calls are **unlimited** (delivering results doesn't count)
- Credits reset monthly on your billing date
- If you exceed your limit on Growth/Chain, contact us for Enterprise pricing

### Billing Alignment with Usage Costs

We use Cohere's AI models at approximately $0.01 per image. Our pricing ($0.05 per image on Growth tier) provides sustainable margins while keeping the service affordable and reliable.

### Tier Selection Guide

**Choose Growth ($100/month, 2,000 images)** if:
- Single restaurant location
- Small team doing weekly or bi-weekly audits
- Testing the service before scaling

**Choose Chain ($500/month, 20,000 images)** if:
- Multiple restaurant locations
- Daily compliance monitoring
- Mid-sized operation with regular photo audits

**Choose Enterprise ($1,999/month, Unlimited)** if:
- Large multi-location operation
- High-volume daily monitoring
- Need priority support and custom features
- Integration with enterprise systems

## Operational Notes

### Reliability

- **Uptime**: 99.9% SLA on Enterprise tier
- **Response Time**: Typically < 3 seconds per image
- **Rate Limits**: No artificial rate limits - limited only by your credits
- **Error Handling**: Automatic retries on transient failures

### Automation Use Cases

#### Daily Compliance Monitoring
Integrate with daily photo workflows (opening checklists, closing procedures) to maintain continuous compliance visibility.

#### Pre-Inspection Checks
Run automated audits before official health inspections to catch and fix violations early.

#### Multi-Location Dashboards
Aggregate results from multiple locations into executive dashboards showing compliance trends.

#### Alert Systems
Trigger immediate notifications to managers when critical violations are detected.

#### Regulatory Documentation
Generate audit trails and compliance reports for regulatory agencies.

### Scaling: Growth → Chain → Enterprise

**Start Small**: Begin with Growth tier to test integration and workflows

**Scale Up**: Move to Chain as you add locations or increase audit frequency

**Go Enterprise**: When you need:
- Unlimited image analysis
- Priority support
- Custom features or integrations
- Dedicated success manager
- SLA guarantees

### Best Practices

1. **Batch Images** - Send multiple images in one request to reduce overhead
2. **Use Meaningful Locations** - Label images by area for better tracking
3. **Monitor Credits** - Check `remaining_credits` in responses to avoid service interruption
4. **Store Results** - Keep compliance logs in your database for trend analysis
5. **Automate Alerts** - Set up notifications for critical violations
6. **Regular Audits** - Consistent photo schedules yield better compliance outcomes

### Technical Support

- **Email**: support@protocollm.com
- **Documentation**: This file
- **API Status**: status.protocollm.com
- **Integration Help**: Available for all tiers
- **Priority Support**: Included with Enterprise tier

### Data & Privacy

- **Image Storage**: Images stored securely for 30 days, then deleted
- **Results Retention**: Compliance results stored indefinitely unless you request deletion
- **Data Privacy**: GDPR compliant, no personal data collected
- **Secure Transfer**: All data encrypted in transit (TLS 1.3)
- **API Keys**: Stored hashed, never exposed in logs

### Getting Started Checklist

- [ ] Choose a subscription tier based on your monthly volume
- [ ] Subscribe via Stripe payment link
- [ ] Receive API key via email (check spam folder)
- [ ] Store API key securely as environment variable
- [ ] Test with a single image using cURL or Postman
- [ ] Integrate with your system using provided code examples
- [ ] Set up result logging to your database
- [ ] Configure alerts for violations
- [ ] Monitor usage and adjust tier as needed

---

**Questions or Issues?**

Contact support@protocollm.com or visit https://protocollm.com for more information.
