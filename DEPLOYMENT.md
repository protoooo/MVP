# Deployment Guide for Railway

This guide will help you deploy the Michigan Food Safety Dashboard to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- This GitHub repository

## Deployment Steps

### Option 1: Deploy from GitHub (Recommended)

1. **Connect Railway to GitHub**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select this repository: `protoooo/MVP`
   - Choose the branch: `copilot/build-python-flask-app` (or main after merge)

2. **Railway Auto-Detection**
   - Railway will automatically detect the Python application
   - It will use the `Procfile` to start the app with Gunicorn

3. **Set Environment Variables** (Optional but recommended)
   - In Railway dashboard, go to your project
   - Click on "Variables"
   - Add the following:
     - `SECRET_KEY`: A random string (e.g., generate with `python -c "import secrets; print(secrets.token_hex(32))"`)
     - `FLASK_DEBUG`: Set to `false` for production (already default)

4. **Deploy**
   - Railway will automatically build and deploy
   - Wait for deployment to complete (usually 1-2 minutes)

5. **Get Your URL**
   - Railway will provide a public URL (e.g., `https://your-app.up.railway.app`)
   - Visit the URL to see your dashboard!

### Option 2: Deploy with Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize and Deploy**
   ```bash
   railway init
   railway up
   ```

## Post-Deployment

### Running the Scraper

Once deployed, you can trigger the scraper by visiting:
```
https://your-app.up.railway.app/scrape
```

This will start scraping in the background. Check the Railway logs to see progress:
```bash
railway logs
```

### Viewing Data

- **Dashboard**: `https://your-app.up.railway.app/`
- **API**: `https://your-app.up.railway.app/api/data`

### Scheduling Regular Scrapes (Optional)

To automatically scrape data on a schedule:

1. **Option A: Use Railway Cron**
   - Set up a cron job in Railway to call the `/scrape` endpoint
   - Configure in Railway dashboard under "Cron Jobs"

2. **Option B: External Cron Service**
   - Use a service like cron-job.org
   - Schedule it to call `https://your-app.up.railway.app/scrape`
   - Recommended: Daily at 2 AM

## Troubleshooting

### App Won't Start
- Check Railway logs: `railway logs`
- Verify all dependencies in `requirements.txt` are installable
- Ensure `Procfile` is correctly formatted

### No Data Showing
- Manually trigger the scraper: Visit `/scrape` endpoint
- Check logs for scraping errors
- Verify the Sword Solutions website is accessible

### API Errors
- Check if `inspections.json` exists and is valid JSON
- Review application logs for Python errors

## Monitoring

Railway provides built-in monitoring:
- CPU usage
- Memory usage  
- Request metrics
- Application logs

Access these in your Railway dashboard under the "Observability" tab.

## Cost

Railway offers:
- **Hobby Plan**: $5/month + usage
- **Free Trial**: 500 hours and $5 in resources

This simple Flask app should run well within the hobby plan limits.

## Updating the Application

To deploy updates:
1. Push changes to GitHub
2. Railway will automatically redeploy (if auto-deploy is enabled)
3. Or manually trigger a deploy in the Railway dashboard

## Support

For Railway-specific issues:
- Documentation: https://docs.railway.app
- Community: https://discord.gg/railway

For application issues:
- Check the README.md
- Review application logs
- Open an issue on GitHub
