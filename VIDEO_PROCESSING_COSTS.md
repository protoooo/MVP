# Video Processing Cost Analysis

## Cost Per Minute Breakdown

Based on the code analysis in `/app/api/upload/processSession/route.js`, here are the video processing costs:

### Current Pricing Model

- **Maximum Video Duration:** 60 minutes (1 hour)
- **Estimated Processing Cost:** **$2.75 per minute**
- **Total Processing Cost (60 min):** $2.75 × 60 = **$165**
- **Customer Charge:** **$149 per inspection report**
- **Loss Per Maximum Duration Video:** -$16 per 60-minute video

### Cost Components

The $2.75/minute estimate includes:

1. **Video Frame Extraction**
   - Extracting frames at 1 frame per second
   - Storage of temporary frames

2. **Frame Deduplication**
   - Perceptual hashing to identify unique frames
   - Reduces AI analysis costs by removing duplicate frames

3. **AI Image Analysis (Cohere)**
   - Using Cohere AYA Vision model (`c4ai-aya-vision-32b`)
   - Analyzing each unique frame for food safety violations
   - Embedding generation for document search
   - Reranking results for relevance

4. **Document Search & Citations**
   - Embedding generation: `embed-v4.0` model
   - Vector similarity search in Supabase
   - Reranking: `rerank-v4.0-pro` model
   - Michigan food safety regulation lookups

5. **Report Generation**
   - PDF generation with citations
   - Storage costs (Supabase)

### Break-Even Analysis

**To break even at $149 per report:**
- Maximum profitable video duration: $149 ÷ $2.75/min = **54.2 minutes**
- Videos longer than 54 minutes result in a loss

### Recommendations

1. **Enforce 54-minute maximum** instead of 60 minutes to maintain profitability
2. **Increase customer pricing** to $165+ for 60-minute videos
3. **Optimize frame extraction** to reduce unique frames (currently 1fps)
4. **Batch AI analysis** more aggressively to reduce API costs
5. **Consider tiered pricing:**
   - Up to 30 minutes: $99
   - Up to 60 minutes: $165
   - Custom (>60 minutes): Contact for quote

### Notes

- Actual costs may vary based on:
  - Video complexity (more unique frames = higher costs)
  - Number of violations detected (affects citation lookups)
  - API rate limits and retry attempts
  - Storage and bandwidth costs

## Technical Details

### AI Models Used

1. **Vision Model:** `c4ai-aya-vision-32b` (Cohere)
2. **Embedding Model:** `embed-v4.0` (Cohere)
3. **Reranking Model:** `rerank-v4.0-pro` (Cohere)

### Processing Pipeline

1. Download video from Supabase storage
2. Validate duration (max 60 minutes)
3. Extract frames (1 per second)
4. Deduplicate frames using perceptual hashing
5. Analyze each unique frame with AI
6. Search Michigan regulations for citations
7. Generate PDF report with findings
8. Upload report to storage
9. Clean up temporary files

### Cost Optimization Opportunities

- **Frame Rate Reduction:** Extract 1 frame every 2-3 seconds instead of every second
- **Smart Frame Selection:** Use motion detection to skip static scenes
- **Batch Processing:** Group frame analyses into larger batches
- **Caching:** Cache common violation patterns and citations
- **Progressive Processing:** Allow users to start with 30-minute analysis, upgrade to 60 if needed
