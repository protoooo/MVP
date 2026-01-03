# Railway Deployment Guide

This guide explains how to deploy ProtocolLM on Railway with a **single service** running both the frontend and backend.

## Architecture

- **Single Deployment**: Both Next.js frontend and Express backend run in one Railway service
- **Frontend**: Next.js on port 3000 (or PORT environment variable from Railway)
- **Backend**: Express API on internal port 3001
- **Routing**: Next.js rewrites proxy `/api/*` requests to the backend

## Prerequisites

1. A [Railway](https://railway.app) account
2. A GitHub repository with your code
3. API keys for:
   - Cohere AI
   - Supabase (optional but recommended)
   - Cloudflare Turnstile (optional but recommended)

## Deployment Steps

### 1. Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set the `DATABASE_URL` environment variable
4. Wait for PostgreSQL to deploy

### 3. Enable pgvector Extension

After PostgreSQL is running:

1. Click on the PostgreSQL service
2. Go to "Connect" tab
3. Use "psql" or any PostgreSQL client to connect
4. Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### 4. Configure Environment Variables

In your Railway service settings, add these environment variables:

#### Required Variables

```bash
# JWT Secret (generate a strong random 32+ character string)
JWT_SECRET=your_32_character_or_longer_secret_key

# Cohere AI API Key (get from https://cohere.com)
COHERE_API_KEY=your_cohere_api_key

# Database URL (automatically set by Railway PostgreSQL addon)
DATABASE_URL=postgresql://...
```

#### Optional but Recommended Variables

```bash
# Supabase for file storage (get from https://supabase.com)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudflare Turnstile for bot protection (get from https://dash.cloudflare.com)
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key
```

#### Automatically Set by Railway

```bash
# Railway sets this automatically - used by Next.js frontend
PORT=3000

# Backend port is set in nixpacks.toml - DO NOT override
BACKEND_PORT=3001

# Node environment - Railway sets this automatically
NODE_ENV=production
```

### 5. Deploy

1. Railway will automatically detect `nixpacks.toml` and start the build
2. The build process will:
   - Install dependencies
   - Build the backend (TypeScript → JavaScript)
   - Build the frontend (Next.js production build)
   - Start both services using `npm start`

### 6. Verify Deployment

Once deployed, test your deployment:

1. **Frontend**: Visit your Railway URL (e.g., `https://yourapp.railway.app`)
   - You should see the landing page
   
2. **Health Check**: Visit `https://yourapp.railway.app/health`
   - You should see a JSON response with service status
   
3. **API**: The API is accessible at `https://yourapp.railway.app/api/*`

## How It Works

### Build Process (`nixpacks.toml`)

```toml
[phases.setup]
nixPkgs = ['nodejs', 'graphicsmagick', 'ghostscript']

[phases.build]
cmds = ['npm install', 'npm run build']

[start]
cmd = 'BACKEND_PORT=3001 npm start'
```

This configures Railway to:
- Install system dependencies (Node.js, GraphicsMagick, Ghostscript)
- Install npm packages and build both services
- Start with `BACKEND_PORT=3001` environment variable set

### Start Command (`package.json`)

```json
{
  "scripts": {
    "start": "concurrently \"npm run start:backend\" \"npm run start:frontend\"",
    "start:backend": "node backend/dist/server.js",
    "start:frontend": "next start"
  }
}
```

This uses `concurrently` to run both services simultaneously:
- Backend reads `BACKEND_PORT` (3001) set by nixpacks.toml
- Frontend uses Railway's `PORT` environment variable (default 3000)

### API Proxying (`next.config.js`)

```javascript
// Backend port configuration
const BACKEND_PORT = 3001;

async rewrites() {
  const backendUrl = process.env.NODE_ENV === 'production' 
    ? `http://localhost:${BACKEND_PORT}` 
    : process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;
  
  return [
    {
      source: '/api/:path*',
      destination: `${backendUrl}/api/:path*`,
    },
    {
      source: '/health',
      destination: `${backendUrl}/health`,
    },
  ];
}
```

This makes all `/api/*` requests transparently proxy to the backend server.

## Common Issues

### "Cannot GET /" Error

**Cause**: Railway is only starting the backend, not the frontend.

**Solution**: Make sure:
1. Only `nixpacks.toml` exists (not `railway.backend.toml` or `railway.frontend.toml`)
2. The start command is `npm start` which runs both services
3. You've committed and pushed the latest changes

### CORS Errors

**Cause**: Backend CORS configuration blocking requests.

**Solution**: The backend is configured to allow requests with no origin (for server-side requests from Next.js). If you still have issues, check the backend logs.

### API Requests Failing

**Cause**: Next.js rewrites not working or backend not running.

**Solution**: 
1. Check logs for both services
2. Verify backend is running on port 3001
3. Test the health endpoint: `https://yourapp.railway.app/health`

### Build Failures

**Cause**: Missing dependencies or build errors.

**Solution**:
1. Check Railway build logs
2. Ensure all dependencies are in `package.json`
3. Test build locally: `npm run build`

## Environment Variables Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Railway sets this (frontend port) |
| `JWT_SECRET` | Yes | - | 32+ character secret for JWT tokens |
| `COHERE_API_KEY` | Yes | - | Cohere AI API key |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SUPABASE_URL` | No | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | No | - | Supabase service role key |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | No | - | Turnstile secret key |
| `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` | No | - | Turnstile site key |

## Monitoring

Railway provides:
- **Logs**: Real-time logs for debugging
- **Metrics**: CPU, memory, and network usage
- **Deployments**: History of all deployments

Access these from your Railway dashboard.

## Scaling

Railway automatically handles:
- Auto-scaling based on traffic
- Zero-downtime deployments
- HTTPS/SSL certificates

## Support

If you encounter issues:
1. Check Railway logs in the dashboard
2. Verify all environment variables are set
3. Test the build locally with `npm run build && npm start`
4. Contact support@protocollm.org
