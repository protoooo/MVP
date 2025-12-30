# Image and Video Analysis Implementation

## Overview

This document describes the implementation of image and video analysis features for the MI Health Inspection platform, including Cohere Vision API integration, FFmpeg video processing, and PDF report generation.

## Core Components

### 1. Storage Module (`lib/storage.js`)

Handles file uploads to Supabase Storage with automatic URL generation.

**Features:**
- Single and batch file uploads
- Public URL retrieval
- Automatic bucket creation
- File deletion utilities

**Usage:**
```javascript
import { uploadFile } from './lib/storage.js'

const result = await uploadFile(
  buffer,
  'filename.jpg',
  'analysis-uploads',
  'image/jpeg'
)
// Returns: { url: 'https://...', path: '...' }
```

### 2. Cohere Vision Module (`lib/cohereVision.js`)

Integrates Cohere Vision API for health code violation detection.

**Features:**
- Single and batch image analysis
- Michigan food safety compliance focus
- Automatic violation parsing and severity classification
- Structured output format

**Environment Variables Required:**
- `COHERE_API_KEY` - Cohere API key
- `COHERE_VISION_MODEL` - Model name (default: c4ai-aya-vision-32b)

**Usage:**
```javascript
import { analyzeImage } from './lib/cohereVision.js'

const result = await analyzeImage(imageUrl)
// Returns: { violations: [...], raw_analysis: '...' }
```

### 3. Video Processor Module (`lib/videoProcessor.js`)

Extracts frames from videos using FFmpeg for analysis.

**Features:**
- Configurable frame extraction rate
- Video metadata extraction (duration, resolution, fps)
- Automatic timestamp generation
- Temporary file cleanup

**System Requirements:**
- FFmpeg installed on the system

**Usage:**
```javascript
import { extractFrames } from './lib/videoProcessor.js'

const { frames, frameCount } = await extractFrames(
  '/path/to/video.mp4',
  1 // frames per second
)
```

### 4. Violation Analyzer Module (`lib/violationAnalyzer.js`)

Provides utilities for violation classification and analysis.

**Features:**
- Severity classification (High, Medium, Low)
- Violation aggregation and grouping
- Deduplication of similar violations
- Category-based organization

**Usage:**
```javascript
import { createViolationSummary } from './lib/violationAnalyzer.js'

const summary = createViolationSummary(violations)
// Returns detailed violation statistics
```

### 5. PDF Generator Module (`lib/pdfGenerator.js`)

Generates branded PDF reports with MI Health Inspection styling.

**Features:**
- Professional MI Health Inspection branding
- Severity-based color coding
- Timeline support for video analysis
- Automatic upload to Supabase Storage

**Usage:**
```javascript
import { generateInspectionReport } from './lib/pdfGenerator.js'

const result = await generateInspectionReport({
  restaurantName: 'Example Restaurant',
  analysisType: 'image',
  violations: [...]
})
// Returns: { pdfUrl: '...', pdfPath: '...' }
```

## API Endpoints

### Image Analysis - `POST /api/image/analyze`

Analyzes uploaded images for health code violations.

**Request (multipart/form-data):**
- `image0`, `image1`, ... - Image files
- `passcode` (optional) - Session passcode for tracking
- `restaurantName` (optional) - Restaurant name for report

**Response:**
```json
{
  "success": true,
  "images_analyzed": 3,
  "violations": [
    {
      "description": "Improper food storage",
      "severity": "High",
      "citation": "Michigan Food Code Section 3-302.11"
    }
  ],
  "summary": {
    "total": 5,
    "by_severity": { "high": 2, "medium": 2, "low": 1 }
  },
  "pdf_url": "https://...report.pdf"
}
```

### Video Analysis - `POST /api/video/analyze`

Processes video uploads, extracts frames, and analyzes for violations.

**Request (multipart/form-data):**
- `video` - Video file (MP4, MOV, WEBM, etc.)
- `passcode` (optional) - Session passcode
- `restaurantName` (optional) - Restaurant name
- `framesPerSecond` (optional) - Frame extraction rate (default: 1)

**Response:**
```json
{
  "success": true,
  "video_url": "https://...",
  "frames_analyzed": 60,
  "violations_found": 8,
  "timeline": [
    {
      "timestamp": "00:00:15",
      "frameNumber": 15,
      "violations": [...]
    }
  ],
  "pdf_url": "https://...report.pdf"
}
```

### PDF Generation - `POST /api/pdf/generate`

Generates standalone PDF reports from violation data.

**Request (JSON):**
```json
{
  "restaurantName": "Example Restaurant",
  "analysisType": "image",
  "violations": [...],
  "timeline": [...],
  "metadata": {...},
  "passcode": "12345"
}
```

**Response:**
```json
{
  "success": true,
  "pdf_url": "https://...report.pdf",
  "pdf_path": "path/to/report.pdf"
}
```

## Dependencies

### Required NPM Packages

All required packages are already in `package.json`:

- `cohere-ai` (^7.10.0) - Cohere AI SDK for Vision API
- `@supabase/supabase-js` (~2.87.0) - Supabase client
- `pdfkit` (^0.13.0) - PDF generation
- `nanoid` (^5.1.6) - Unique ID generation
- `sharp` (^0.34.5) - Image processing (optional enhancement)

### System Requirements

- **Node.js** 20.x or higher
- **FFmpeg** - Required for video frame extraction
  ```bash
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  
  # macOS
  brew install ffmpeg
  ```

## Environment Variables

Add these to your `.env.local`:

```bash
# Cohere AI
COHERE_API_KEY=your_cohere_api_key
COHERE_VISION_MODEL=c4ai-aya-vision-32b

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Supabase Storage Setup

Create the required storage buckets in your Supabase project:

1. **analysis-uploads** - For uploaded images and videos
2. **analysis-reports** - For generated PDF reports

Both buckets should be configured as **public** with appropriate file size limits.

## Testing

### Manual Testing

1. **Test Image Analysis:**
```bash
curl -X POST http://localhost:3000/api/image/analyze \
  -F "image0=@test-image.jpg" \
  -F "restaurantName=Test Restaurant"
```

2. **Test Video Analysis:**
```bash
curl -X POST http://localhost:3000/api/video/analyze \
  -F "video=@test-video.mp4" \
  -F "restaurantName=Test Restaurant" \
  -F "framesPerSecond=0.5"
```

3. **Test PDF Generation:**
```bash
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "Test Restaurant",
    "analysisType": "image",
    "violations": [
      {
        "description": "Test violation",
        "severity": "Medium",
        "citation": "Test Code Section 1.1"
      }
    ]
  }'
```

## Architecture Decisions

### 1. Modular Design
Each component (storage, vision, video, PDF) is in a separate module for:
- Easy testing
- Code reusability
- Maintenance simplicity

### 2. Lazy Supabase Client Initialization
API routes create Supabase clients at runtime to avoid build-time errors.

### 3. Batch Processing
Images are analyzed in batches of 5 with delays to respect API rate limits.

### 4. Temporary File Management
Video files and extracted frames are stored in `/tmp` and cleaned up after processing.

### 5. Error Handling
All modules include comprehensive error handling and logging.

## Performance Considerations

### Image Analysis
- **Rate Limiting:** Batches of 5 images with 1-second delays
- **Concurrency:** Parallel uploads, sequential AI analysis
- **Typical Time:** 2-5 seconds per image

### Video Analysis
- **Frame Extraction:** ~1 second per 10 frames
- **Upload Time:** Depends on frame count and network
- **AI Analysis:** Same as image analysis per frame
- **Total Time:** ~30-120 seconds for a 1-minute video at 1 fps

### PDF Generation
- **Generation Time:** <1 second
- **Upload Time:** <1 second
- **Total Time:** 1-2 seconds

## Troubleshooting

### FFmpeg Not Found
```
Error: Failed to extract frames: Command failed: ffmpeg
```
**Solution:** Install FFmpeg on your system

### Cohere API Errors
```
Error: Failed to analyze image: Unauthorized
```
**Solution:** Check `COHERE_API_KEY` environment variable

### Supabase Upload Errors
```
Error: Storage upload failed: Bucket not found
```
**Solution:** Create the required storage buckets in Supabase dashboard

### Build Errors
```
Error: supabaseUrl is required
```
**Solution:** Ensure Supabase clients are created at runtime, not module load time

## Security Considerations

1. **API Keys:** Never commit API keys to version control
2. **File Size Limits:** Configure appropriate limits in Next.js config
3. **Input Validation:** All inputs are validated before processing
4. **Temporary Files:** Cleaned up after processing
5. **Public URLs:** Only use for appropriate file types

## Future Enhancements

1. **Image Optimization:** Use Sharp for image preprocessing
2. **Caching:** Cache analysis results for duplicate images
3. **Real-time Progress:** WebSocket updates for long-running video analysis
4. **Advanced Frame Selection:** Intelligent keyframe detection
5. **Batch Video Processing:** Queue system for multiple videos
6. **Custom Branding:** Support for custom logos and colors

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs in console
3. Verify environment variables
4. Check Supabase and Cohere dashboards for service status
