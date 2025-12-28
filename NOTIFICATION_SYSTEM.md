# Notification Opt-In System

This system allows one-time purchasers ($149 inspection report) to opt into helpful email notifications without requiring user accounts.

## Features

1. **Post-Purchase Opt-In Modal** - Friendly modal shown after successful payment
2. **Two Notification Types:**
   - 🗓️ **Inspection Season Reminders** - Semi-annual reminders (March & September) before typical inspection seasons
   - 📋 **Regulation Updates** - Manual notifications about Michigan food code changes
3. **Access Code Retrieval** - Self-service feature for customers who lost their access code
4. **One-Click Unsubscribe** - Every email includes an unsubscribe link

## Database Schema

### Table: `user_notification_preferences`

Stores email notification preferences for purchasers.

**Columns:**
- `id` (UUID, Primary Key)
- `email` (TEXT, UNIQUE, NOT NULL) - Customer email from Stripe purchase
- `purchase_date` (TIMESTAMPTZ, NOT NULL)
- `opted_in_inspection_reminders` (BOOLEAN) - True if user wants semi-annual reminders
- `opted_in_regulation_updates` (BOOLEAN) - True if user wants food code updates
- `establishment_type` (TEXT) - Optional: restaurant, cafe, food_truck, catering, bakery, bar, other
- `last_reminder_sent` (TIMESTAMPTZ) - Timestamp of last inspection reminder
- `last_regulation_update_sent` (TIMESTAMPTZ) - Timestamp of last regulation update
- `unsubscribe_token` (TEXT, UNIQUE) - Unique token for unsubscribe links
- `unsubscribed_at` (TIMESTAMPTZ) - Timestamp when user unsubscribed
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Setup:**
```bash
# Run the SQL migration in your Supabase dashboard
# File: scripts/migrations/001_notification_preferences.sql
```

## API Endpoints

### Save Notification Preferences
```
POST /api/notification-preferences
Content-Type: application/json

{
  "email": "user@example.com",
  "inspectionReminders": true,
  "regulationUpdates": false,
  "establishmentType": "restaurant"
}

Response: { "success": true, "preferences": { ... } }
```

### Get Notification Preferences
```
GET /api/notification-preferences?email=user@example.com

Response: {
  "exists": true,
  "unsubscribed": false,
  "preferences": {
    "inspectionReminders": true,
    "regulationUpdates": false,
    "establishmentType": "restaurant"
  }
}
```

### Unsubscribe
```
GET /api/notification-preferences/unsubscribe?token=<unique_token>

Returns: HTML page confirming unsubscription
```

### Retrieve Access Code
```
POST /api/access-code/retrieve
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: {
  "success": true,
  "message": "Access code has been sent to your email.",
  "remaining": 2
}
```

**Rate Limiting:** 3 requests per hour per email address

## Email Templates

All email templates are in `lib/emails.js`:

1. **`sendInspectionReminder(email, name, unsubscribeToken, season)`**
   - Sent in early March (spring) and early September (fall)
   - Reminds users about upcoming inspection season
   - Includes tips for preparation

2. **`sendRegulationUpdate(email, name, title, description, details, unsubscribeToken)`**
   - Manually triggered when Michigan food code changes
   - Explains what changed and what action is needed
   - Includes link to official regulations

3. **`sendAccessCodeRetrieval(email, name, accessCode, codeStatus)`**
   - Sent when user requests their access code
   - Shows code status (unused vs used)
   - Includes instructions on how to use

## Scheduled Jobs

### Inspection Reminders

Send semi-annual reminders to opted-in users:

```bash
# Dry run (preview recipients without sending)
npm run send-inspection-reminders -- --season=spring --dry-run

# Send spring reminders (run in early March)
npm run send-inspection-reminders -- --season=spring

# Send fall reminders (run in early September)
npm run send-inspection-reminders -- --season=fall

# Auto-detect season based on current month
npm run send-inspection-reminders
```

**Features:**
- Only sends to users who opted in and haven't been sent a reminder in the last 5 months
- Updates `last_reminder_sent` timestamp after successful send
- Includes rate limiting (100ms delay between emails)
- Logs all activity with timestamps

**Recommended Schedule:**
- **Spring:** First week of March (before March 15)
- **Fall:** First week of September (before September 15)

### Regulation Updates

Send manual notifications about food code changes:

```bash
# Dry run (preview)
npm run send-regulation-updates -- \
  --title="New Handwashing Requirements" \
  --description="Michigan now requires touchless faucets in all new establishments" \
  --details="<p>Starting January 2025, all newly constructed food service establishments must install touchless handwashing faucets. Existing establishments are grandfathered but encouraged to upgrade.</p><ul><li>New construction must comply immediately</li><li>Renovations affecting plumbing must upgrade</li><li>Grants available for voluntary upgrades</li></ul>" \
  --dry-run

# Send to all opted-in users (5 second confirmation delay)
npm run send-regulation-updates -- \
  --title="Food Allergen Labeling Update" \
  --description="New requirements for sesame allergen disclosure" \
  --details="<p>Effective immediately, sesame must be listed as a major food allergen.</p>"
```

**Features:**
- Sends to all users opted into regulation updates
- 5-second confirmation delay before sending
- Updates `last_regulation_update_sent` timestamp
- Supports HTML formatting in details

## Integration with Purchase Flow

The notification opt-in modal appears after successful Stripe payment.

**Component:** `components/NotificationOptInModal.jsx`

**Usage Example:**
```jsx
import NotificationOptInModal from '@/components/NotificationOptInModal'

const [showOptInModal, setShowOptInModal] = useState(false)
const [customerEmail, setCustomerEmail] = useState('')

// Show modal after payment success
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('payment') === 'success') {
    setShowOptInModal(true)
  }
}, [])

// Handle modal submission
const handleOptInSubmit = async (preferences) => {
  try {
    const response = await fetch('/api/notification-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        ...preferences
      })
    })
    
    if (response.ok) {
      setShowOptInModal(false)
      // Show success message
    }
  } catch (error) {
    console.error('Failed to save preferences:', error)
  }
}

return (
  <NotificationOptInModal
    isOpen={showOptInModal}
    onClose={() => setShowOptInModal(false)}
    onSubmit={handleOptInSubmit}
    customerEmail={customerEmail}
  />
)
```

## Access Code Retrieval UI

Add a "Retrieve Access Code" section to your landing page:

```jsx
const [retrievalEmail, setRetrievalEmail] = useState('')
const [retrievalStatus, setRetrievalStatus] = useState(null)

const handleRetrieveCode = async (e) => {
  e.preventDefault()
  setRetrievalStatus('loading')
  
  try {
    const response = await fetch('/api/access-code/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: retrievalEmail })
    })
    
    if (response.ok) {
      setRetrievalStatus('success')
    } else {
      const data = await response.json()
      setRetrievalStatus({ error: data.error })
    }
  } catch (error) {
    setRetrievalStatus({ error: 'Failed to send email' })
  }
}

return (
  <form onSubmit={handleRetrieveCode}>
    <input 
      type="email" 
      value={retrievalEmail}
      onChange={(e) => setRetrievalEmail(e.target.value)}
      placeholder="your@email.com"
      required 
    />
    <button type="submit">Retrieve Code</button>
    {retrievalStatus === 'success' && (
      <p>✓ Access code sent to your email!</p>
    )}
  </form>
)
```

## Environment Variables

Required environment variables (should already be configured):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=protocolLM <support@protocollm.org>

# App
NEXT_PUBLIC_BASE_URL=https://protocollm.org
```

## Monitoring & Logs

All email sends and preference changes are logged using the app's logger:

- `logger.audit()` - Successful operations (email sent, preferences saved, unsubscribed)
- `logger.error()` - Failed operations
- `logger.security()` - Rate limiting, invalid tokens, CSRF failures

Check your application logs for email delivery status and any issues.

## Best Practices

1. **Test with --dry-run first** - Always preview recipients before sending
2. **Schedule reminders appropriately** - March 1-7 and September 1-7
3. **Keep regulation updates infrequent** - Only send when there are real changes
4. **Monitor unsubscribe rates** - If >5%, review email content/frequency
5. **Include unsubscribe links** - Required by CAN-SPAM Act
6. **Make content valuable** - Users opted in to be helpful, keep it that way

## Troubleshooting

**Modal not showing after payment:**
- Check URL parameters for `?payment=success`
- Verify Stripe webhook is properly configured
- Check browser console for errors

**Emails not sending:**
- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for delivery status
- Review application logs for error messages

**Access code retrieval hitting rate limit:**
- Users are limited to 3 requests per hour
- Rate limit resets automatically after 1 hour
- Consider increasing limit if legitimate use case

**Users not receiving emails:**
- Verify email address is correct in database
- Check spam folders
- Verify `unsubscribed_at` is NULL in database
- Test email sending with a known good address

## Future Enhancements

Potential improvements:

1. **Preview before send** - Web UI to preview email before batch send
2. **Email analytics** - Track open rates, click rates
3. **Segmentation** - Send targeted updates based on establishment_type
4. **Preference management page** - Allow users to update preferences without unsubscribing
5. **SMS notifications** - Optional text reminders for inspection season
6. **Admin dashboard** - View opt-in statistics and manage campaigns

## Support

For questions or issues:
- Email: support@protocollm.org
- Check application logs for detailed error messages
- Review Supabase dashboard for database queries
- Check Resend dashboard for email delivery status
