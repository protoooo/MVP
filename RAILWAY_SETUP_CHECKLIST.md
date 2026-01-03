# Railway Setup Checklist

Use this checklist to ensure your Railway deployment is configured correctly for a single-service deployment.

## ✅ Pre-Deployment Checklist

### 1. Remove Old Railway Configurations (if any)
- [ ] Delete any existing Railway services (both frontend and backend if you had separate deployments)
- [ ] Start fresh with a new Railway project

### 2. Verify Repository Files
- [ ] Confirm `nixpacks.toml` exists in repository root
- [ ] Confirm `railway.backend.toml` and `railway.frontend.toml` are renamed to `.example` (or deleted)
- [ ] Verify latest code is pushed to GitHub

### 3. Create Railway Project
- [ ] Create new Railway project
- [ ] Connect to your GitHub repository
- [ ] Railway should detect `nixpacks.toml` automatically

### 4. Add PostgreSQL Database
- [ ] Add PostgreSQL from Railway marketplace
- [ ] Note: `DATABASE_URL` will be set automatically
- [ ] After database is running, connect and enable pgvector:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

### 5. Set Environment Variables

In Railway project settings, set these variables:

#### Required:
- [ ] `JWT_SECRET` - Generate a random 32+ character string
- [ ] `COHERE_API_KEY` - From https://cohere.com
- [ ] `DATABASE_URL` - Automatically set by Railway PostgreSQL

#### Optional (but recommended):
- [ ] `SUPABASE_URL` - From https://supabase.com
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase
- [ ] `CLOUDFLARE_TURNSTILE_SECRET_KEY` - From Cloudflare
- [ ] `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` - From Cloudflare

#### DO NOT Set These (handled automatically):
- [ ] ❌ `PORT` - Railway sets this automatically
- [ ] ❌ `BACKEND_PORT` - Set in nixpacks.toml
- [ ] ❌ `NODE_ENV` - Railway sets this to 'production'

### 6. Deploy
- [ ] Trigger deployment from Railway dashboard or push to GitHub
- [ ] Monitor build logs for errors
- [ ] Build should show both backend and frontend compilation

### 7. Verify Deployment

After deployment completes, test these URLs (replace with your Railway URL):

- [ ] **Frontend**: `https://your-app.railway.app`
  - Should show the landing page (NOT "Cannot GET /")
  
- [ ] **Health Check**: `https://your-app.railway.app/health`
  - Should return JSON with service status
  
- [ ] **API**: Try the login page and check if API calls work
  - Open browser dev tools → Network tab
  - API calls should go to `/api/*` (same domain)

## 🐛 Troubleshooting

### Still Getting "Cannot GET /"?

1. **Check Railway Logs**:
   - Look for both backend and frontend starting
   - Backend should show: "Starting ProtocolLM Server" on port 3001
   - Frontend should show: "Starting Next.js" on port 3000

2. **Verify Build Output**:
   - Check that both `backend/dist/` and `.next/` directories were created
   - Both services should be in "running" state

3. **Check Environment Variables**:
   - Ensure you didn't manually set `PORT` or `BACKEND_PORT`
   - Verify required variables (JWT_SECRET, COHERE_API_KEY, DATABASE_URL) are set

4. **Verify Only One Service**:
   - You should have exactly ONE Railway service, not two
   - If you see separate "backend" and "frontend" services, delete them and start over

### Build Failing?

1. Check Railway build logs for specific error
2. Verify all dependencies are in `package.json`
3. Test locally: `npm run build`

### API Requests Failing?

1. Check backend logs for errors
2. Verify database connection (DATABASE_URL)
3. Test health endpoint: `https://your-app.railway.app/health`

## 📝 Important Notes

- **Single Deployment**: You should have ONE Railway service, not two
- **No NEXT_PUBLIC_API_URL**: Don't set this variable - API calls use Next.js rewrites
- **Port Configuration**: Handled automatically, don't override
- **Database Extension**: Remember to enable pgvector extension after PostgreSQL is running

## 🎉 Success Indicators

✅ Railway shows ONE service running (not two separate services)
✅ Frontend loads at your Railway URL
✅ `/health` endpoint returns JSON
✅ Login/signup pages load without errors
✅ No "Cannot GET /" errors
✅ API calls work (check browser Network tab)

## 📚 Additional Resources

- Full deployment guide: See `RAILWAY_DEPLOYMENT.md`
- Railway documentation: https://docs.railway.app
- Support: support@protocollm.org
