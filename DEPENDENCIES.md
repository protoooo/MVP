# Dependencies for Image and Video Analysis

## Production Dependencies

### Core AI & Vision
- **cohere-ai** (^7.10.0)
  - Purpose: Cohere Vision API integration for image/video analysis
  - Used in: `lib/cohereVision.js`
  - Features: Vision-based health code violation detection
  - Model: c4ai-aya-vision-32b

### Database & Storage
- **@supabase/supabase-js** (~2.87.0)
  - Purpose: Supabase client for database and file storage
  - Used in: `lib/storage.js`, all API routes
  - Features: File uploads, database updates, public URL generation

### PDF Generation
- **pdfkit** (^0.13.0)
  - Purpose: Professional PDF report generation
  - Used in: `lib/pdfGenerator.js`
  - Features: MI Health Inspection branded reports with violations

### Utilities
- **nanoid** (^5.1.6)
  - Purpose: Unique ID generation for temporary files
  - Used in: `lib/videoProcessor.js`, `lib/pdfGenerator.js`
  - Features: Collision-resistant IDs for temp directories

### Image Processing (Optional Enhancement)
- **sharp** (^0.34.5)
  - Purpose: Image optimization and format conversion
  - Currently: Available but not actively used
  - Future: Can be used for image preprocessing before analysis

## System Dependencies

### FFmpeg
- **Purpose:** Video frame extraction
- **Required:** Yes, for video analysis functionality
- **Installation:**
  ```bash
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  
  # macOS
  brew install ffmpeg
  
  # Alpine Linux (Docker)
  apk add ffmpeg
  ```
- **Used in:** `lib/videoProcessor.js`
- **Features:**
  - Frame extraction at configurable intervals
  - Video metadata extraction (duration, resolution, fps)
  - Format support: MP4, MOV, WEBM, AVI, M4V

### Node.js Built-ins
- **fs/promises** - File system operations
- **child_process** - FFmpeg command execution
- **util** - Promisify for async/await patterns
- **path** - File path manipulation

## Environment Variables Required

```bash
# Cohere AI Configuration
COHERE_API_KEY=your_cohere_api_key_here
COHERE_VISION_MODEL=c4ai-aya-vision-32b

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Next.js Configuration

### File Upload Limits
```javascript
experimental: {
  serverActions: {
    bodySizeLimit: '500mb'  // For large video uploads
  }
}
```

### File Tracing
```javascript
outputFileTracingIncludes: {
  '/api/pdf/generate': ['./node_modules/pdfkit/js/data/**/*.afm']
}
```

## Dependency Tree

```
Image Analysis Flow:
├── FormData (Next.js built-in)
├── lib/storage.js (@supabase/supabase-js)
├── lib/cohereVision.js (cohere-ai)
├── lib/violationAnalyzer.js (pure JS)
└── lib/pdfGenerator.js (pdfkit, nanoid)

Video Analysis Flow:
├── FormData (Next.js built-in)
├── lib/storage.js (@supabase/supabase-js)
├── lib/videoProcessor.js (FFmpeg, fs, child_process, nanoid)
├── lib/cohereVision.js (cohere-ai)
├── lib/violationAnalyzer.js (pure JS)
└── lib/pdfGenerator.js (pdfkit, nanoid)
```

## Installation Checklist

- [x] NPM packages installed (`npm install`)
- [x] FFmpeg installed on system
- [x] Environment variables configured
- [x] Supabase storage buckets created
  - `analysis-uploads` (public)
  - `analysis-reports` (public)
- [x] Cohere API key obtained
- [x] Next.js config updated

## Verification

Test all dependencies are available:

```bash
# Check NPM packages
npm list cohere-ai @supabase/supabase-js pdfkit nanoid sharp

# Check FFmpeg
ffmpeg -version

# Check environment variables
node -e "console.log({
  cohere: !!process.env.COHERE_API_KEY,
  supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
})"
```

## Size Impact

Production build sizes:
- cohere-ai: ~500KB
- @supabase/supabase-js: ~200KB
- pdfkit: ~800KB (includes fonts)
- nanoid: ~10KB
- sharp: ~8MB (native module, optional)

**Total added:** ~1.5MB (excluding sharp)

## No Additional Dependencies Needed

All required functionality is covered by:
1. Existing package.json dependencies
2. FFmpeg system installation
3. Node.js built-in modules

**Status:** ✅ All dependencies satisfied
