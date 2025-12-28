# Video Processing Integration Guide

## Overview
This guide explains how to integrate the access code system with the existing video processing logic.

## Current Upload Flow (Without Access Codes)

The current system uploads videos through these files:
- `app/page.client.js` - Handles file upload on client
- `app/api/upload/*` - Server-side video processing
- Video is processed and report generated

## Required Changes

### 1. Update Client-Side Upload (page-simple.client.js)

The simplified page needs to pass the access code to the upload API:

```javascript
// In handleUploadAndProcess function
const handleUploadAndProcess = async () => {
  if (!validatedCode || !validatedCode.canProcess) {
    setUploadError('This access code cannot be used for processing')
    return
  }

  // ... existing validation ...

  try {
    // Create FormData with access code
    const formData = new FormData()
    
    // Add access code to request
    formData.append('accessCode', validatedCode.code)
    
    // Add files
    uploadFiles.forEach((fileObj) => {
      formData.append('files', fileObj.file)
    })

    // Upload to your existing API endpoint
    const response = await fetch('/api/upload/start-session', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed')
    }

    // Continue with existing processing logic
    // ...
  } catch (error) {
    setUploadError(error.message)
  }
}
```

### 2. Update Server-Side Upload API

Find your upload API endpoint (likely `app/api/upload/*/route.js`) and add:

```javascript
// At the start of the upload handler
export async function POST(request) {
  try {
    const formData = await request.formData()
    const accessCode = formData.get('accessCode')

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code required' },
        { status: 400 }
      )
    }

    // Validate the access code
    const { data: codeData, error: codeError } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', accessCode)
      .single()

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 403 }
      )
    }

    // Check if code can be used
    if (codeData.status === 'used' && !codeData.is_admin) {
      return NextResponse.json(
        { error: 'This code has already been used' },
        { status: 403 }
      )
    }

    // Check remaining time
    const remainingSeconds = codeData.max_video_duration_seconds - 
                            (codeData.total_video_duration_seconds || 0)
    
    if (remainingSeconds <= 0 && !codeData.is_admin) {
      return NextResponse.json(
        { error: 'Time limit exceeded for this code' },
        { status: 403 }
      )
    }

    // Continue with your existing upload logic
    // Store the codeData.id to link later
    const codeId = codeData.id
    
    // ... process video ...
    
    return NextResponse.json({ 
      success: true,
      codeId,
      sessionId: 'your-session-id'
    })
  } catch (error) {
    logger.error('Upload error', { error: error.message })
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
```

### 3. Track Video Duration

During video processing, track the duration:

```javascript
// When you determine video duration (e.g., using FFmpeg)
const videoDurationSeconds = 3600 // Example: 1 hour

// Update the access code with duration
const { error: updateError } = await supabase
  .from('access_codes')
  .update({
    total_video_duration_seconds: videoDurationSeconds,
    used_at: new Date().toISOString(),
    status: 'used'
  })
  .eq('id', codeId)

// Log the usage
await supabase
  .from('code_usage')
  .insert({
    code_id: codeId,
    action_type: 'video_process',
    video_duration_seconds: videoDurationSeconds,
    ip_address: getClientIp(request),
    metadata: {
      file_count: files.length,
      total_size: totalBytes
    }
  })
```

### 4. Store Report Data

After report generation:

```javascript
// When report is generated
const reportData = {
  violations: [...],
  summary: "...",
  generated_at: new Date().toISOString(),
  // ... your report structure ...
}

// Store in access_codes table
const { error: reportError } = await supabase
  .from('access_codes')
  .update({
    report_data: reportData,
    report_generated_at: new Date().toISOString(),
    status: 'used'
  })
  .eq('id', codeId)

if (reportError) {
  logger.error('Failed to store report', { error: reportError.message })
}
```

### 5. Report Retrieval

When user enters a used code, show their report:

```javascript
// In page-simple.client.js, after code validation
if (validatedCode.hasReport && validatedCode.reportData) {
  // Load report from the validation response
  setReportData(validatedCode.reportData)
  
  // Show download button instead of upload interface
}
```

Update the validation API to return report data:

```javascript
// In app/api/access-code/validate/route.js
// Already implemented - just needs frontend to use it

return NextResponse.json({
  valid: true,
  code: accessCode.code,
  status: accessCode.status,
  canProcess: accessCode.status === 'unused' || accessCode.is_admin,
  canAccessReport: hasReport,
  hasReport,
  reportData: hasReport ? accessCode.report_data : null, // Full report data
  remainingSeconds,
  // ...
})
```

### 6. PDF Download

Implement PDF download for saved reports:

```javascript
// Add download handler
const handleDownloadReport = async () => {
  try {
    // Option A: Generate PDF from report_data
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: validatedCode.code,
        reportData: validatedCode.reportData
      })
    })
    
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inspection-report-${validatedCode.code}.pdf`
    a.click()
    
    // Option B: If PDF is stored as base64 in report_data
    // const pdfBase64 = validatedCode.reportData.pdf
    // const blob = base64ToBlob(pdfBase64, 'application/pdf')
    // ... same download logic ...
    
  } catch (error) {
    console.error('Download failed', error)
    alert('Failed to download report')
  }
}
```

## Testing Checklist

After implementing these changes:

- [ ] Access code is required for upload
- [ ] Invalid codes are rejected
- [ ] Admin code (800869) bypasses restrictions
- [ ] Used codes cannot process again
- [ ] Video duration is tracked
- [ ] Time limit is enforced (1 hour = 3600 seconds)
- [ ] Report is stored in database
- [ ] Used codes can retrieve their report
- [ ] PDF download works
- [ ] Error messages are clear

## Example: Complete Upload Flow

```javascript
// 1. User enters access code
POST /api/access-code/validate
Body: { code: "123456" }
Response: { valid: true, canProcess: true, remainingSeconds: 3600 }

// 2. User uploads video
POST /api/upload/start-session
Body: FormData { accessCode: "123456", files: [...] }
Response: { success: true, sessionId: "abc123" }

// 3. Video processes
// - Duration tracked: 2700 seconds (45 minutes)
// - Code updated with duration
// - Status set to 'used'

// 4. Report generated
// - Stored in access_codes.report_data
// - report_generated_at timestamp set

// 5. User returns later
POST /api/access-code/validate
Body: { code: "123456" }
Response: { 
  valid: true, 
  canProcess: false,  // Already used
  hasReport: true,
  reportData: { ... }  // Full report
}

// 6. User downloads report
// Frontend generates PDF from reportData
// Or calls API to generate PDF server-side
```

## Error Handling

Add these error messages:

```javascript
const ERROR_MESSAGES = {
  CODE_REQUIRED: 'Access code is required',
  CODE_INVALID: 'Invalid access code',
  CODE_EXPIRED: 'This access code has expired',
  CODE_USED: 'This code has already been used',
  TIME_EXCEEDED: 'Time limit exceeded for this code',
  VIDEO_TOO_LONG: 'Video duration exceeds remaining time',
  UPLOAD_FAILED: 'Upload failed. Please try again.',
  PROCESSING_FAILED: 'Video processing failed',
  REPORT_NOT_FOUND: 'Report not found for this code',
}
```

## Database Queries Reference

```sql
-- Get code with usage
SELECT 
  ac.*,
  COUNT(cu.id) as usage_count
FROM access_codes ac
LEFT JOIN code_usage cu ON cu.code_id = ac.id
WHERE ac.code = '123456'
GROUP BY ac.id;

-- Get all usage for a code
SELECT * FROM code_usage
WHERE code_id = 'uuid-here'
ORDER BY created_at DESC;

-- Check codes about to expire
SELECT * FROM access_codes
WHERE expires_at < NOW() + INTERVAL '24 hours'
AND status = 'unused';

-- Admin dashboard: Recent purchases
SELECT 
  code,
  email,
  status,
  created_at,
  total_video_duration_seconds / 60 as minutes_used
FROM access_codes
WHERE is_admin = false
ORDER BY created_at DESC
LIMIT 50;
```

## Next Steps

1. Identify your upload API endpoint(s)
2. Add access code validation at entry point
3. Track video duration during processing
4. Store report data after generation
5. Update frontend to show report for used codes
6. Test with admin code (800869) first
7. Test with real purchase flow
8. Handle all error cases

## Questions?

- Check existing upload code in `app/api/upload/`
- Review video processing logic
- Look at report generation code
- Test incrementally with admin code

---

**Remember:** Admin code 800869 bypasses all restrictions for testing!
