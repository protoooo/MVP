# Setup Guide for Inspection Dashboard

This guide will help you set up and run the refactored inspection dashboard application.

## What Changed

The application has been refactored from an image-based compliance analysis tool to a county-level inspection dashboard:

- ✅ **Removed**: Image/video upload, PDF generation, old payment system
- ✅ **Added**: Inspection dashboard, search/filter, analytics, scraper integration
- ✅ **Kept**: Text-based Q&A for food safety regulations

## Quick Start

### 1. Database Setup

Run the new migration in your Supabase SQL editor:

```sql
-- File: supabase/migrations/002_create_establishments.sql
```

This creates the `establishments` table for storing inspection data.

### 2. Environment Variables

Make sure you have these in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
COHERE_API_KEY=your_cohere_api_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Install Dependencies

```bash
npm install
```

Note: We removed these dependencies:
- sharp (image processing)
- pdfkit (PDF generation)
- multer (file uploads)
- exif-parser (image metadata)
- stripe (payment processing)
- three (3D graphics)

### 4. Load Sample Data

We've included sample inspection data for testing. To load it:

```bash
# Start the dev server
npm run dev

# In another terminal, sync the sample data
npm run sync-inspections
```

This will import 10 sample establishments from `inspection_scraper/outputs/inspections.json` into your database.

### 5. View the Dashboard

Open http://localhost:3000 to see the new inspection dashboard!

## Features

### Main Dashboard
- **Search Bar**: Search by establishment name or address
- **Filters**: Filter by severity, type, and date range
- **Analytics**: View top violations, most cited establishments, severity breakdown
- **Pagination**: Browse through all establishments

### Text Q&A (Collapsible)
- Click "Ask a Question" to show the Q&A interface
- Ask questions about Michigan food safety regulations
- Get AI-powered answers grounded in compliance documents

### Sample Data Included
- 10 establishments across Washtenaw County
- Mix of severities: critical, high, medium, low
- Various types: restaurant, cafe, food truck, bakery, grocery
- Recent inspection dates (Nov-Dec 2024)

## Future Enhancements

### To Add Real County Data:

1. **Update scraper URLs** in `inspection_scraper/config/counties.json`:
   ```json
   {
     "washtenaw": {
       "url": "https://actual-county-url.gov/inspections",
       ...
     }
   }
   ```

2. **Run the Python scraper**:
   ```bash
   cd inspection_scraper
   python main.py
   ```

3. **Sync the data**:
   ```bash
   npm run sync-inspections
   ```

### To Add More Counties:

Follow the instructions in the main README.md under "Extending to Other Counties"

## Removed Pages/Routes

These routes/pages have been removed:
- `/upload` - Image upload page
- `/report` - Report viewing page
- `/api/image/*` - Image analysis endpoints
- `/api/video/*` - Video analysis endpoints
- `/api/pdf/*` - PDF generation endpoints
- `/api/payment/*` - Old payment system
- `/api/subscription/*` - Old subscription system
- `/api/session/*` - Session verification

## Testing

### Run Linter
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

### Test Q&A Endpoint
```bash
curl -X POST http://localhost:3000/api/qa \
  -H "Content-Type: application/json" \
  -d '{"question": "What temperature must hot food be held at?"}'
```

### Test Establishments Endpoint
```bash
curl http://localhost:3000/api/establishments?county=washtenaw&limit=5
```

### Test Analytics Endpoint
```bash
curl http://localhost:3000/api/establishments/analytics?county=washtenaw
```

## Troubleshooting

### "No establishments found"
- Make sure you ran `npm run sync-inspections` to load the sample data
- Check that the database migration was run successfully
- Verify Supabase credentials in `.env.local`

### "Failed to fetch establishments"
- Ensure the dev server is running (`npm run dev`)
- Check browser console for error messages
- Verify API endpoints are working

### Linting Errors
- Run `npm run lint` to check for issues
- All issues should be resolved in the current version

## Support

If you encounter any issues:
1. Check this guide first
2. Review the main README.md
3. Check browser console for errors
4. Review server logs in terminal

## Next Steps

1. Set up a Supabase project if you haven't already
2. Run the database migrations
3. Load sample data
4. Explore the dashboard
5. Configure real county scraper URLs when ready
6. Add scheduled tasks for automatic data updates (cron job or similar)
