# ProtocolLM No-Code Setup Guide

## For Businesses Without Developers

This guide helps you set up ProtocolLM compliance checking **without writing any code**. You can integrate ProtocolLM into your existing workflows using simple, no-code tools.

---

## Table of Contents

1. [Getting Your API Key](#step-1-getting-your-api-key)
2. [Understanding Webhooks](#step-2-understanding-webhooks)
3. [No-Code Integration Options](#step-3-no-code-integration-options)
   - [Option A: Zapier Integration](#option-a-zapier-easiest)
   - [Option B: Make.com Integration](#option-b-makecom-integromat)
   - [Option C: Google Sheets Integration](#option-c-google-sheets)
   - [Option D: Airtable Integration](#option-d-airtable)
4. [Testing Your Setup](#step-4-testing-your-setup)
5. [Common Use Cases](#step-5-common-use-cases)

---

## Step 1: Getting Your API Key

### What You Need:
- A valid email address
- A credit card (for paid plans) OR just an email for the free tier

### How to Get Started:

1. **Visit**: https://protocollm.com
2. **Choose a Plan**:
   - **Free Tier**: 100 inspections/month - No credit card needed
   - **Growth**: $99/month - 3,000 inspections
   - **Chain**: $499/month - 20,000 inspections
   - **Enterprise**: $1,999/month - Unlimited inspections

3. **Complete Purchase** (or sign up for free)
4. **Receive Your API Key** via email

Your API key will look like this:
```
sk_live_abc123def456ghi789...
```

⚠️ **IMPORTANT**: Keep this key private! It's like a password for your account.

---

## Step 2: Understanding Webhooks

### What is a Webhook?

Think of a webhook like a mailbox. When something happens (like uploading a photo), ProtocolLM automatically sends the compliance results to your "mailbox" (your system).

### Simple Explanation:

**Traditional Way (You Ask):**
- You: "Hey ProtocolLM, check this photo"
- ProtocolLM: "OK, here are the results"

**Webhook Way (ProtocolLM Tells You):**
- You upload a photo to your system
- Your system automatically sends it to ProtocolLM
- ProtocolLM checks it and sends results back to wherever you want

### What You're Actually Doing:

You're connecting two systems:
1. **Your system** (where you already work - could be Google Sheets, Airtable, email, etc.)
2. **ProtocolLM** (the compliance checker)

---

## Step 3: No-Code Integration Options

Choose the option that matches what you already use:

---

### Option A: Zapier (Easiest!)

**Best for**: Connecting ProtocolLM to almost any tool (Google Drive, Dropbox, email, Slack, etc.)

#### Setup Steps:

1. **Create a Zapier Account** (free): https://zapier.com

2. **Create a New Zap**:
   - Click "+ Create Zap"
   - Choose your trigger (what starts the process)

3. **Example: Check Photos from Google Drive**

   **TRIGGER (When this happens...):**
   - App: Google Drive
   - Event: "New File in Folder"
   - Select folder: "Daily Inspection Photos"

   **ACTION (Do this...):**
   - App: Webhooks by Zapier
   - Event: "POST"
   - URL: `https://protocollm.com/api/v1/inspect`
   - Payload Type: JSON
   
   **Headers:**
   ```
   Authorization: Bearer sk_your_api_key_here
   Content-Type: application/json
   ```
   
   **Data:**
   ```json
   {
     "protocol_pack": "food_service_nationwide_v1",
     "input_type": "image",
     "context": {
       "location": "{{Google Drive File Name}}",
       "timestamp": "{{Google Drive Created Time}}"
     },
     "payload": {
       "images": ["{{Google Drive File URL}}"]
     }
   }
   ```

4. **Add Another Action** (to see results):
   - App: Email or Slack or Google Sheets
   - Action: Send results to yourself

5. **Test & Turn On**

#### Complete Zapier Examples:

**Example 1: Restaurant - Daily Photos → Email Report**
```
TRIGGER: New file in Google Drive folder "Kitchen Photos"
ACTION 1: Send to ProtocolLM for inspection
ACTION 2: Send email with compliance results
ACTION 3: Add to Google Sheets log
```

**Example 2: Gym - Member Complaint Photos**
```
TRIGGER: New email with attachment to complaints@yourgym.com
ACTION 1: Extract photo from email
ACTION 2: Send to ProtocolLM (fitness_facilities_v1)
ACTION 3: Create task in Asana if violations found
ACTION 4: Notify facilities manager via Slack
```

---

### Option B: Make.com (Integromat)

**Best for**: More complex workflows, visual workflow builder

#### Setup Steps:

1. **Create Make Account**: https://make.com

2. **Create New Scenario**:
   - Click "+ Create a new scenario"

3. **Add Modules**:

   **Module 1: Trigger (e.g., Google Drive - Watch Files)**
   - Select folder to watch
   
   **Module 2: HTTP - Make a Request**
   - URL: `https://protocollm.com/api/v1/inspect`
   - Method: POST
   - Headers:
     - Authorization: `Bearer sk_your_api_key_here`
     - Content-Type: `application/json`
   - Body:
   ```json
   {
     "protocol_pack": "childcare_facilities_v1",
     "input_type": "image",
     "context": {
       "location": "{{1.name}}",
       "timestamp": "{{1.createdTime}}"
     },
     "payload": {
       "images": ["{{1.webViewLink}}"]
     }
   }
   ```
   
   **Module 3: Router** (to handle different results)
   - Path 1: If status = "fail" → Send urgent email
   - Path 2: If status = "pass" → Log to Google Sheets
   - Path 3: If status = "warning" → Create Trello card

4. **Test & Activate**

---

### Option C: Google Sheets

**Best for**: Simple logging and tracking

#### Setup Steps:

1. **Create a Google Sheet** with columns:
   ```
   Date | Location | Photo URL | Status | Risk Level | Violations | Credits Used
   ```

2. **Use Google Apps Script**:
   - Tools → Script Editor
   - Copy this script:

```javascript
function checkCompliance() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  
  // Get data from row
  var photoUrl = sheet.getRange(lastRow, 3).getValue(); // Column C: Photo URL
  var location = sheet.getRange(lastRow, 2).getValue(); // Column B: Location
  
  // Call ProtocolLM
  var url = 'https://protocollm.com/api/v1/inspect';
  var payload = {
    'protocol_pack': 'food_service_nationwide_v1',
    'input_type': 'image',
    'context': {
      'location': location,
      'timestamp': new Date().toISOString()
    },
    'payload': {
      'images': [photoUrl]
    }
  };
  
  var options = {
    'method': 'POST',
    'headers': {
      'Authorization': 'Bearer sk_your_api_key_here',
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());
  
  // Write results back to sheet
  sheet.getRange(lastRow, 4).setValue(result.status); // Column D: Status
  sheet.getRange(lastRow, 5).setValue(result.risk_level); // Column E: Risk Level
  sheet.getRange(lastRow, 6).setValue(result.findings.length); // Column F: Violation count
  sheet.getRange(lastRow, 7).setValue(result.metadata.credits_used); // Column G: Credits used
}
```

3. **Add a Button**:
   - Insert → Drawing → Create a button that says "Check Compliance"
   - Assign script: `checkCompliance`

4. **Usage**:
   - Paste photo URL in Column C
   - Click "Check Compliance" button
   - Results appear automatically

---

### Option D: Airtable

**Best for**: Organized databases with photos

#### Setup Steps:

1. **Create Airtable Base** with fields:
   - `Location` (Single line text)
   - `Photos` (Attachment)
   - `Inspection Date` (Date)
   - `Status` (Single select: Pass, Fail, Warning)
   - `Risk Level` (Single select: Low, Medium, High, Critical)
   - `Findings` (Long text)

2. **Use Airtable Automations**:
   - Create automation
   - Trigger: "When record created"
   - Action: "Run script"

```javascript
let table = base.getTable("Inspections");
let record = input.config();

// Get photo URL from Airtable attachment
let photoUrl = record.Photos[0].url;

// Call ProtocolLM
let response = await fetch('https://protocollm.com/api/v1/inspect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    protocol_pack: 'senior_living_facilities_v1',
    input_type: 'image',
    context: {
      location: record.Location,
      timestamp: new Date().toISOString()
    },
    payload: {
      images: [photoUrl]
    }
  })
});

let result = await response.json();

// Update record with results
await table.updateRecordAsync(record.id, {
  'Status': result.status,
  'Risk Level': result.risk_level,
  'Findings': JSON.stringify(result.findings)
});
```

---

## Step 4: Testing Your Setup

### Test Mode (Free)

Before using real photos, test with sample data:

**Test Request (using Zapier/Make.com/etc.):**
```json
{
  "protocol_pack": "food_service_nationwide_v1",
  "input_type": "text",
  "context": {
    "location": "test_location",
    "timestamp": "2024-01-15T10:00:00Z"
  },
  "payload": {
    "text": "Temperature log: Walk-in cooler at 45°F. Should be below 41°F."
  }
}
```

**Expected Response:**
```json
{
  "inspection_id": "abc-123-xyz",
  "status": "fail",
  "risk_level": "critical",
  "findings": [
    {
      "protocol_reference": "FDA-3-501.16",
      "description": "Cold storage temperature above 41°F",
      "confidence": 0.95
    }
  ],
  "required_actions": [
    {
      "action": "Address violation: Cold storage temperature above 41°F",
      "urgency": "immediate",
      "verification_required": true
    }
  ]
}
```

### Verify It Works:

✅ You receive a response with `inspection_id`  
✅ The `status` is one of: pass, fail, warning, insufficient_data  
✅ Credits are deducted from your account  

---

## Step 5: Common Use Cases

### Use Case 1: Restaurant Chain - Daily Kitchen Photos

**What You Already Do:**
- Managers take 5-10 photos per day of kitchen, storage, prep areas
- Photos uploaded to Google Drive or Dropbox

**How to Add ProtocolLM (No Code):**

1. **Setup** (one time, 10 minutes):
   - Create Zapier account
   - Connect Google Drive → ProtocolLM → Email
   - Use `food_service_nationwide_v1` protocol pack

2. **Daily Use** (automatic):
   - Manager uploads photos to "Daily Inspections" folder
   - Zapier automatically sends to ProtocolLM
   - Compliance report emailed to manager + corporate
   - If violations found, urgent alert sent

3. **Result**:
   - No extra work for managers
   - Instant compliance checking
   - Audit trail automatically created

---

### Use Case 2: Daycare Center - Daily Checklist

**What You Already Do:**
- Staff fill out daily safety checklist (paper or simple form)

**How to Add ProtocolLM (No Code):**

1. **Setup**:
   - Use Google Forms for checklist
   - Connect Google Forms → Zapier → ProtocolLM → Google Sheets
   - Use `childcare_facilities_v1` protocol pack

2. **Daily Use**:
   - Staff complete Google Form at end of day
   - Zapier converts form responses to text
   - ProtocolLM checks for compliance issues
   - Results logged in Google Sheets
   - Director gets email summary

3. **Result**:
   - Digital checklist (better than paper)
   - Automatic compliance verification
   - Easy to review history

---

### Use Case 3: Apartment Complex - Unit Inspection Photos

**What You Already Do:**
- Maintenance team inspects units before move-in
- Photos taken of condition

**How to Add ProtocolLM (No Code):**

1. **Setup**:
   - Use Airtable to track units
   - Connect Airtable → ProtocolLM automation
   - Use `property_management_v1` protocol pack

2. **Daily Use**:
   - Maintenance uploads photos to Airtable
   - ProtocolLM checks for code violations
   - If violations found, work order created automatically
   - Unit marked as "Not Ready" until fixed

3. **Result**:
   - No move-ins with violations
   - Automatic work order creation
   - Better tenant satisfaction

---

### Use Case 4: Gym - Equipment Safety Logs

**What You Already Do:**
- Staff walk floor and note equipment issues

**How to Add ProtocolLM (No Code):**

1. **Setup**:
   - Use JotForm or Google Forms for mobile logging
   - Connect to ProtocolLM via Zapier
   - Use `fitness_facilities_v1` protocol pack

2. **Daily Use**:
   - Staff submit form with photos of equipment
   - ProtocolLM checks for safety violations
   - Critical issues → Equipment auto-tagged "Out of Order"
   - Facility manager notified via Slack

3. **Result**:
   - Proactive safety management
   - Reduced liability
   - Member safety improved

---

### Use Case 5: Senior Living - Room Inspection Reports

**What You Already Do:**
   - Weekly room checks for safety hazards

**How to Add ProtocolLM (No Code):**

1. **Setup**:
   - Staff take photos during rounds
   - Upload to Dropbox folder (one folder per room)
   - Zapier → ProtocolLM → Creates report in Google Sheets
   - Use `senior_living_facilities_v1` protocol pack

2. **Weekly Use**:
   - Photos uploaded
   - Automatic compliance check
   - Family portal updated with "Room Safety: PASS"
   - If violations, maintenance ticket created

3. **Result**:
   - Family peace of mind
   - Proactive safety
   - CMS compliance documentation

---

## Quick Reference Card

### Which Protocol Pack Should I Use?

| Your Business Type | Protocol Pack Code | What It Checks |
|-------------------|-------------------|----------------|
| Restaurant, Cafe, Food Truck | `food_service_nationwide_v1` | Food temperature, storage, sanitation, employee hygiene |
| Assisted Living, Nursing Home | `senior_living_facilities_v1` | Resident safety, medication, falls, infection control |
| Daycare, Preschool | `childcare_facilities_v1` | Child safety, staff ratios, playground, sanitation |
| Apartment, Property Management | `property_management_v1` | Habitability, fire safety, electrical, plumbing |
| Gym, Fitness Studio | `fitness_facilities_v1` | Equipment safety, sanitation, pool/spa, locker rooms |

---

## Troubleshooting

### "Invalid API Key" Error
- ✅ Make sure you copied the entire key (starts with `sk_`)
- ✅ No extra spaces before or after
- ✅ Using `Bearer sk_your_key` format in Authorization header

### "Insufficient Credits" Error
- ✅ Check your account at protocollm.com
- ✅ Purchase more credits or upgrade plan

### "Invalid Protocol Pack" Error
- ✅ Check spelling exactly as shown above
- ✅ Make sure protocol pack is active

### Not Receiving Results
- ✅ Check spam/junk folder for emails
- ✅ Verify webhook URL is correct
- ✅ Test with simple text input first

---

## Support

**Need Help?**
- 📧 Email: support@protocollm.com
- 📞 Phone: 1-800-PROTOCOL
- 💬 Live Chat: protocollm.com/support

**Video Tutorials:**
- Zapier Setup: protocollm.com/videos/zapier
- Make.com Setup: protocollm.com/videos/make
- Google Sheets: protocollm.com/videos/sheets

---

## Next Steps

1. ✅ Get your API key
2. ✅ Choose your no-code tool (Zapier recommended)
3. ✅ Test with sample data
4. ✅ Go live with real workflow
5. ✅ Monitor and improve

**You don't need a developer. You can do this!** 🚀
