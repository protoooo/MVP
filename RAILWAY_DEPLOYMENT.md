# Railway Deployment Guide

This guide will help you deploy the AgentHub Multi-Agent Automation App to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Cohere API key (get it from https://dashboard.cohere.com/api-keys)
- This GitHub repository

## Deployment Steps

### Option 1: Deploy from GitHub (Recommended)

1. **Connect to Railway**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select this repository: `protoooo/MVP`
   - Choose the branch you want to deploy

2. **Railway Auto-Detection**
   - Railway will automatically detect the Next.js application
   - It will install dependencies using `npm install`
   - Build using `npm run build`
   - Start using `npm start`

3. **Set Environment Variables**
   - In Railway dashboard, go to your project
   - Click on "Variables"
   - Add the following:
     - **Required**: `COHERE_API_KEY` - Your Cohere API key
     - **Optional**: `NEXT_PUBLIC_BASE_URL` - Your Railway URL (e.g., `https://your-app.up.railway.app`)

4. **Deploy**
   - Railway will automatically build and deploy
   - Wait for deployment to complete (usually 2-3 minutes)

5. **Get Your URL**
   - Railway will provide a public URL (e.g., `https://your-app.up.railway.app`)
   - Visit the URL to see your live app!

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
   cd /path/to/MVP
   railway init
   railway up
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set COHERE_API_KEY=your_api_key_here
   ```

## Post-Deployment

### Testing Your Agents

Once deployed, test each agent:

1. **Customer Support Agent**
   - Click on "Customer Support" card
   - Try asking: "How do I reset my password?"
   - Verify the AI responds appropriately

2. **HR Agent**
   - Click on "HR Assistant" card
   - Try asking: "Find candidates with JavaScript skills"
   - Check the semantic search results

3. **Inventory Agent**
   - Click on "Inventory Manager" card
   - Try asking: "What items are low in stock?"
   - Verify inventory predictions

4. **Financial Agent**
   - Click on "Financial Analyst" card
   - Try asking: "Categorize my recent expenses"
   - Check expense categorization

5. **Document Review Agent**
   - Click on "Document Reviewer" card
   - Paste a sample contract
   - Verify summarization works

### Monitoring

Railway provides built-in monitoring:
- **Deployments**: View deployment history and logs
- **Metrics**: CPU usage, memory usage, request counts
- **Logs**: Real-time application logs

Access these in your Railway dashboard under the "Observability" tab.

### Custom Domain (Optional)

To use a custom domain:

1. In Railway dashboard, go to your project
2. Click on "Settings"
3. Scroll to "Domains"
4. Click "Add Domain"
5. Enter your custom domain
6. Follow the DNS configuration instructions

## Troubleshooting

### Build Failures

**Problem**: Build fails with "npm install" errors
- **Solution**: Check `package.json` for any issues
- Clear Railway cache and redeploy

**Problem**: TypeScript errors during build
- **Solution**: Run `npm run build` locally first to catch errors
- Check `tsconfig.json` configuration

### Runtime Errors

**Problem**: App deploys but shows errors when clicking agents
- **Solution**: Verify `COHERE_API_KEY` is set correctly
- Check Railway logs for specific error messages

**Problem**: API endpoints returning 500 errors
- **Solution**: Check if Cohere API key has correct permissions
- Verify Cohere API is accessible (not hitting rate limits)

### Environment Variables

**Problem**: Environment variables not working
- **Solution**: Make sure to restart the service after adding variables
- Check variable names match exactly (case-sensitive)

## Updating the Application

To deploy updates:

1. **Automatic Updates** (if enabled)
   - Push changes to GitHub
   - Railway will automatically redeploy

2. **Manual Deployment**
   - In Railway dashboard, click "Deploy"
   - Select the commit/branch to deploy

## Cost Estimation

Railway pricing:
- **Trial**: $5 in credits + 500 hours free
- **Hobby Plan**: $5/month + usage-based pricing
- **Pro Plan**: $20/month + usage-based pricing

This Next.js app should run comfortably on the Hobby plan.

Estimated costs:
- **Hobby Plan**: ~$5-10/month for moderate usage
- **Pro Plan**: Recommended for production use

## Performance Optimization

### Recommended Settings

1. **Enable Caching**
   - Next.js automatically caches static pages
   - No additional configuration needed

2. **Environment**
   - Set `NODE_ENV=production` (automatically set by Railway)

3. **Monitoring**
   - Enable Railway metrics
   - Set up alerts for high CPU/memory usage

### Scaling

For high traffic:
- Railway automatically handles scaling
- Consider upgrading to Pro plan for better performance
- Monitor response times in Railway dashboard

## Security Best Practices

1. **API Keys**
   - Never commit API keys to Git
   - Use Railway's environment variables
   - Rotate keys periodically

2. **HTTPS**
   - Railway provides HTTPS by default
   - No additional configuration needed

3. **Rate Limiting**
   - Consider adding rate limiting for API endpoints
   - Monitor Cohere API usage to avoid unexpected charges

## Support

- **Railway Documentation**: https://docs.railway.app
- **Railway Community**: https://discord.gg/railway
- **Cohere Documentation**: https://docs.cohere.com
- **Next.js Documentation**: https://nextjs.org/docs

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Set up environment variables
3. ✅ Test all AI agents
4. ✅ Monitor performance
5. 🎉 Share with your team!

---

**Questions?** Check the main README.md or open an issue on GitHub.
