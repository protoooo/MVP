# Employee Assistant - Production Deployment Guide

## Prerequisites

1. **Supabase Account** - Create a project at [supabase.com](https://supabase.com)
2. **Google Gemini API Key** - Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **Node.js** - Version 18 or higher

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of the SQL schema file (Production-Ready Supabase Schema artifact)
4. Run the SQL query
5. Verify all tables were created in the Table Editor

**Important:** This will create:
- All necessary tables (businesses, profiles, documents, conversations, messages)
- Row Level Security (RLS) policies
- Automatic trigger for profile/business creation on signup
- Proper indexes for performance

### 2. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key" or "Create API Key"
3. Click "Create API key in new project" (or select an existing project)
4. Copy your API key and keep it secure

**Important:** Never commit your API key to version control or share it publicly.

### 3. Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Found in Supabase Project Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Found in Supabase Project Settings > API (use the `anon` `public` key)
   - `GEMINI_API_KEY`: Your Google Gemini API key from AI Studio

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Locally (Development)

```bash
npm run dev
```

Visit `http://localhost:3000`

### 6. Deploy to Production

#### Option A: Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Deploy

#### Option B: Deploy to Railway

1. Push your code to GitHub
2. Create a new project in Railway
3. Connect your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
5. Deploy

## Verification

After deployment, verify everything is working:

1. **Health Check**: Visit `https://yourdomain.com/api/health`
   - Should return `{"status": "healthy"}` with geminiKey: true

2. **Test Signup**:
   - Create a new account
   - Verify profile and business are auto-created
   - Check Supabase dashboard to confirm data

3. **Test Upload**:
   - Upload a PDF document
   - Verify it appears in the Manage tab

4. **Test Chat**:
   - Ask a question about your uploaded documents
   - Verify you get a response from Gemini

## Important Production Considerations

### Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Rate limiting on API routes (100 req/min)
- ✅ Input validation and sanitization
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ API keys validated on startup

### Performance

- ✅ Database indexes on frequently queried columns
- ✅ Document content truncation (200k chars max)
- ✅ API retry logic with exponential backoff
- ✅ Proper error handling

### Monitoring

- Health check endpoint at `/api/health`
- Server-side error logging (check your hosting platform logs)
- Consider adding: Sentry, LogRocket, or similar for production monitoring

### Gemini API Pricing

Google Gemini API has generous free tier:
- **Gemini 1.5 Flash**: 15 requests per minute (free)
- **Gemini 1.5 Pro**: 2 requests per minute (free)

For production with higher usage, consider:
- Google Cloud Platform with Vertex AI for higher rate limits
- Implementing request queuing for rate limit management

### Limitations

1. **Rate Limiting**: In-memory store (resets on server restart)
   - For production, consider: Upstash Redis, Vercel KV, or similar
   
2. **File Storage**: Documents stored as text in database
   - For large-scale: Consider Supabase Storage + vector embeddings
   
3. **No Email Verification**: Supabase handles this, but customize templates in Supabase dashboard

## Troubleshooting

### "Unauthorized" errors
- Check RLS policies in Supabase
- Verify user is logged in
- Check browser console for auth errors

### "Profile not found"
- Verify the signup trigger is working
- Check Supabase logs
- Manually check if profile was created in database

### PDF upload fails
- Check file size (max 50MB)
- Verify PDF is not password-protected
- Check server logs for detailed error

### Chat not working
- Verify GEMINI_API_KEY is set correctly
- Check API quota in Google AI Studio
- Check for rate limit errors (429 responses)
- Verify documents exist in database

### "API error" or rate limit issues
- Gemini free tier has rate limits
- Wait a minute and try again
- Consider upgrading to paid tier for higher limits

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key |
| `NODE_ENV` | No | Set to `production` in production |

## Switching from Anthropic to Gemini

This app now uses Google's Gemini API instead of Anthropic's Claude API. Key differences:

- **API Endpoint**: Uses `generativelanguage.googleapis.com` instead of `api.anthropic.com`
- **Request Format**: Uses Gemini's `contents` format with `parts` instead of Claude's `messages` format
- **Response Format**: Parses `candidates[0].content.parts[0].text` instead of `content[0].text`
- **Model**: Uses `gemini-1.5-flash` (fast and efficient) instead of Claude Sonnet

### Models Available

- `gemini-1.5-flash`: Fast, efficient, good for most tasks (recommended)
- `gemini-1.5-pro`: More capable, better reasoning
- `gemini-2.0-flash`: Latest experimental model

To change the model, update the model name in `app/api/chat/route.js`.

## Support

For issues or questions:
1. Check the health endpoint: `/api/health`
2. Review server logs in your hosting platform
3. Check Supabase logs in dashboard
4. Verify all environment variables are set correctly
5. Check [Gemini API documentation](https://ai.google.dev/gemini-api/docs)
