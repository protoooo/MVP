# ProtocolLM - Quick Start Card

## For Business Owners (No Code Required)

### Step 1: Get Your API Key (2 minutes)
1. Visit: https://protocollm.com
2. Choose plan: Free (100/month), Growth ($99/month), Chain ($499/month), or Enterprise ($1,999/month)
3. Receive API key via email: `sk_live_abc123...`

### Step 2: Choose Your Integration Tool (Pick One)

#### Option A: Zapier (Recommended - Easiest!)
1. Create free Zapier account: https://zapier.com
2. Create Zap: **[Your Tool] → Webhooks by Zapier → [Your Tool]**
3. Configure webhook:
   - URL: `https://protocollm.com/api/v1/inspect`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_API_KEY`
4. Test and turn on

**Done! Photos/checklists automatically checked for compliance.**

#### Option B: Google Sheets
1. Use provided Apps Script (in NO_CODE_SETUP_GUIDE.md)
2. Add button to sheet
3. Click to check compliance

#### Option C: Airtable  
1. Add Automation to your base
2. Use provided script (in NO_CODE_SETUP_GUIDE.md)
3. Auto-runs when records created

---

## For Developers

### Quick API Call

```bash
curl -X POST https://protocollm.com/api/v1/inspect \
  -H "Authorization: Bearer sk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "protocol_pack": "food_service_nationwide_v1",
    "input_type": "image",
    "context": {
      "location": "kitchen",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "payload": {
      "images": ["https://example.com/photo.jpg"]
    }
  }'
```

### Response Format
```json
{
  "inspection_id": "abc-123",
  "status": "fail",
  "risk_level": "critical",
  "findings": [...],
  "required_actions": [...],
  "metadata": {
    "credits_used": 1,
    "remaining_credits": 999
  }
}
```

---

## Protocol Packs (Choose One)

| Your Business | Protocol Pack Code |
|--------------|-------------------|
| Restaurant, Food Service | `food_service_nationwide_v1` |
| Assisted Living, Senior Care | `senior_living_facilities_v1` |
| Daycare, Preschool | `childcare_facilities_v1` |
| Apartments, Property Mgmt | `property_management_v1` |
| Gym, Fitness Center | `fitness_facilities_v1` |

---

## Input Types

| Type | What to Send | Example |
|------|-------------|---------|
| **image** | Photo URLs (up to 200) | Kitchen photos, equipment photos |
| **text** | Text content or logs | "Temperature log: cooler at 45°F" |
| **form** | Checklist data | Daily safety checklist JSON |

---

## Common Use Cases

### Restaurant: Daily Kitchen Photos
**Before ProtocolLM**: Manager takes photos, hopes inspector doesn't find issues  
**With ProtocolLM**: Photos auto-checked, violations flagged immediately  
**Setup**: Google Drive → Zapier → ProtocolLM → Email alert

### Daycare: Safety Checklists
**Before ProtocolLM**: Paper checklist filed away  
**With ProtocolLM**: Digital checklist auto-verified for compliance  
**Setup**: Google Forms → Zapier → ProtocolLM → Google Sheets

### Apartments: Unit Inspections
**Before ProtocolLM**: Hope maintenance catches everything  
**With ProtocolLM**: Photos checked for code violations before move-in  
**Setup**: Airtable → ProtocolLM Automation → Work orders created

### Gym: Equipment Safety
**Before ProtocolLM**: Wait for someone to get hurt  
**With ProtocolLM**: Equipment issues flagged during daily checks  
**Setup**: JotForm → Zapier → ProtocolLM → Slack alert

---

## Support

📧 **Email**: support@protocollm.com  
📖 **Full Documentation**: See PROTOCOLLM_README.md  
🎥 **Video Tutorials**: See NO_CODE_SETUP_GUIDE.md  
💬 **Live Chat**: protocollm.com/support

---

## Pricing Quick Reference

- **Free**: 100 inspections/month
- **Growth**: $99/mo → 3,000 inspections
- **Chain**: $499/mo → 20,000 inspections  
- **Enterprise**: $1,999/mo → Unlimited

**ROI**: One avoided failed inspection typically pays for entire year

---

## Next Steps

1. ✅ Get API key (2 minutes)
2. ✅ Choose integration method (Zapier recommended)
3. ✅ Test with sample data (10 minutes)
4. ✅ Go live with real workflow

**Total setup time: 15 minutes or less**

---

*"Compliance checking should be as easy as accepting payments. Now it is."*
