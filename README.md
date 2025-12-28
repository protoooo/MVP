# protocolLM

AI-powered food safety compliance inspection tool for Michigan restaurants. Upload photos or videos of your establishment and receive instant compliance reports based on Michigan Food Code regulations.

## 🎯 Overview

protocolLM uses advanced AI (Cohere Vision API) to analyze restaurant photos and identify potential health code violations before inspections. Get detailed PDF reports with citations to specific Michigan regulations.

## 💰 Pricing

- **Basic Plan:** $49 for up to 200 photos
- **Premium Plan:** $99 for up to 500 photos

## 🚀 Features

- ✅ AI-powered photo analysis using Cohere Vision
- ✅ Michigan Food Code specific compliance checking
- ✅ Instant PDF report generation with violations and citations
- ✅ Video upload support (extracts frames for analysis)
- ✅ Mobile-responsive interface
- ✅ Secure payment processing via Stripe
- ✅ Anonymous and authenticated user support
- ✅ Email notifications
- ✅ Progress tracking during analysis

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS
- **Backend:** Node.js, Supabase (PostgreSQL)
- **AI:** Cohere Vision API, Cohere Embed, Cohere Rerank
- **Payments:** Stripe
- **Storage:** Supabase Storage
- **Deployment:** Railway (Nixpacks)
- **Email:** Supabase Email
- **Security:** Cloudflare Turnstile (Captcha)

## 📋 Prerequisites

- Node.js 20.x
- npm 10.x
- Python 3.x (for icon generation)
- Supabase account
- Cohere API key
- Stripe account
- Cloudflare Turnstile keys

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/smallbizsolutions/MVP.git
   cd MVP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your actual credentials (see `.env.example` for required variables)

4. **Run database migrations**
   - Set up your Supabase project
   - Run the SQL migrations from `supabase/migrations/` (if applicable)
   - Enable Row Level Security (RLS) policies

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
MVP/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── upload/          # Media upload & processing
│   │   ├── webhook/         # Stripe webhooks
│   │   └── ...
│   ├── admin/               # Admin dashboard
│   ├── page.client.js       # Main application page
│   └── ...
├── backend/
│   ├── functions/           # Serverless functions
│   └── utils/              
│       ├── aiAnalysis.js    # Cohere Vision integration
│       └── reportGenerator.js # PDF generation
├── components/              # React components
├── lib/                     # Utility libraries
│   ├── supabase-browser.js
│   ├── logger.js
│   └── ...
├── public/                  # Static assets
├── scripts/                 # Build & utility scripts
└── package.json
```

## 🔐 Environment Variables

See `.env.example` for a complete list. Key variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cohere AI
COHERE_API_KEY=your_cohere_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🧪 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run ingest` - Ingest documents into knowledge base
- `npm run test-search` - Test document search
- `npm run test-emails` - Test email functionality

## 📊 Database Schema

Key tables:
- `users` - User accounts
- `subscriptions` - Stripe subscriptions
- `media` - Uploaded photos/videos
- `compliance_results` - AI analysis results
- `reports` - Generated PDF reports
- `access_codes` - One-time access codes for reports
- `processing_costs` - Cost tracking per session

## 🔒 Security Features

- CSRF protection on all sensitive endpoints
- Rate limiting on authentication and API routes
- Row Level Security (RLS) in Supabase
- API key authentication
- Cloudflare Turnstile bot protection
- Webhook signature verification
- Input validation and sanitization

## 💳 Payment Flow

1. User selects plan (Basic $49 or Premium $99)
2. Stripe Checkout session created
3. User completes payment
4. Webhook confirms payment
5. Access code generated and emailed
6. User uploads photos using access code
7. AI analyzes photos
8. PDF report generated
9. Report emailed to user

## 📱 Mobile Support

- Fully responsive design
- Touch-optimized interface
- Native file picker integration
- Safe area insets for iOS
- Landscape orientation support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

Proprietary - All rights reserved

## 📞 Support

- Email: support@protocollm.com
- Documentation: [Coming Soon]
- Issues: [GitHub Issues](https://github.com/smallbizsolutions/MVP/issues)

## 🎯 Roadmap

- [ ] Subscription model
- [ ] Report history dashboard
- [ ] Multi-location support for chains
- [ ] Mobile app (React Native)
- [ ] Corrective action tracking
- [ ] Real-time chat assistant
- [ ] Integration marketplace

## 📈 Performance

- Average report generation: < 2 minutes for 200 photos
- AI processing cost: ~$0.01 per image
- Uptime target: 99.5%
- Response time target: < 2 seconds

## 🔍 Testing

Currently in development. Testing strategy:
- Manual QA for critical paths
- Automated tests coming soon
- Load testing for 100+ concurrent users

## 🚀 Deployment

Deploy to Railway using Nixpacks:

1. Connect GitHub repository to Railway
2. Set environment variables
3. Deploy automatically on push to main
4. Configure custom domain
5. Set up Stripe webhooks

## ⚠️ Important Notes

- This tool is for reference only - always verify with official health department guidance
- AI can make mistakes - human review is required
- Costs approximately $0.01 per image for AI processing
- Requires active internet connection
- Storage costs depend on number of uploaded files

## 🙏 Acknowledgments

- Cohere for Vision AI API
- Supabase for database and storage
- Stripe for payment processing
- Michigan Department of Agriculture & Rural Development for regulations

---

Built with ❤️ for Michigan restaurants
