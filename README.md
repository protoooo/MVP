# Naiborhood - Business Automation for Small Businesses

A lightweight, powerful platform built specifically for small businesses like bakeries, bars, breweries, and retail shops. Unlike overwhelming enterprise tools, naiborhood is designed to be simple, straightforward, and actually useful for teams of 3-50 people.

**Not just another chatbot.** Agents that actually do work - draft emails, analyze finances, check resumes, manage inventory, and more.

## What Makes This Different

- **Real Actions, Not Suggestions**: Draft → Review → Send emails. Create invoices. Schedule interviews. Not copy-paste.
- **Knows Your Business**: Upload your manuals, procedures, sales data - agents learn your specific operations
- **One Simple Price**: $50/month unlimited. No usage limits. No surprises.
- **Built for Small Teams**: Perfect for bakeries, bars, breweries, retail shops, restaurants

## Core Features

### 5 Specialized Business Agents

#### Financial Analyst
- Analyze revenue, sales, margins, and COGS
- Categorize expenses automatically
- Track spending patterns and budget variances
- Detect financial anomalies
- Forecast cash flow

#### HR Assistant
- Screen resumes for legitimacy and quality
- Check resumes for AI-generated content
- Match candidates to job requirements
- Draft professional emails and templates
- Schedule interviews
- Ensure compliance with company policies

#### Inventory Manager
- Track stock levels in real-time
- Predict demand patterns
- Send low-stock alerts
- Automate reorder recommendations
- Analyze inventory turnover

#### Document Reviewer
- Summarize contracts and agreements
- Extract key clauses
- Assess risks and compliance issues
- Compare document versions
- Flag important terms

#### Customer Support
- Handle customer inquiries
- Analyze sentiment
- Route tickets appropriately
- Maintain conversation context
- Provide step-by-step guidance

### Document Intelligence
- Upload business documents (PDFs, Excel, Word)
- Automatic text extraction and parsing
- Semantic search across all documents
- Context-aware agent responses
- Secure storage with Supabase

### Business-Specific Setup
- Industry templates (bakery, bar, brewery, retail)
- Pre-configured KPIs per industry
- Customizable metrics and dashboards
- Easy onboarding flow

### Automated Reports (Planned)
- Daily sales summaries
- Weekly staff performance
- Monthly financial snapshots
- Scheduled email delivery

### Real Actions (Planned)
- Draft emails → Review → Send
- Create invoices → Approve → Send
- Schedule interviews → Sync calendar
- Generate reports → Email to team

## Integration
Naiborhood seamlessly integrates with a wide range of business tools and systems, including CRM, ERP, HRMS, and more. Our platform is designed to complement existing workflows and processes, ensuring a smooth transition to automated operations.

## Benefits
- **Increased efficiency**: Automate repetitive tasks and processes, freeing up valuable time and resources for more strategic activities.
- **Cost savings**: Reduce operational costs by minimizing manual labor and optimizing resource allocation.
- **Improved accuracy**: Enhance accuracy and consistency in various business functions, reducing errors and improving overall performance.
- **Enhanced customer experience**: Provide faster, more personalized interactions with customers, leading to increased satisfaction and loyalty.
- **Data-driven decision-making**: Gain valuable insights from advanced analytics, enabling informed and strategic business decisions.

## Tech Stack

- **Frontend**: Next.js 16 with React 19, TypeScript
- **Styling**: TailwindCSS with custom design system (Notion/Supabase-inspired)
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: Cohere (Command-R-Plus, Embed v3, Rerank v3, Aya Vision)
- **Payments**: Stripe
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 📦 Project Structure

```
.
├── app/
│   ├── api/              # API routes
│   │   ├── chat/        # Customer support chat endpoint
│   │   ├── hr/          # HR agent endpoint
│   │   ├── inventory/   # Inventory management endpoint
│   │   ├── financial/   # Financial analysis endpoint
│   │   └── document/    # Document review endpoint
│   ├── globals.css      # Global styles and animations
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main dashboard page
├── components/
│   ├── AgentCard.tsx    # Reusable agent card component
│   ├── Chatbot.tsx      # Chat interface component
│   └── ThemeToggle.tsx  # Dark/light mode toggle
├── lib/
│   └── cohere.ts        # Cohere API utilities
└── public/              # Static assets
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Cohere API account (free tier works)
- Stripe account (for payments)

### Setup

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd MVP
   npm install
   ```

2. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings → API and copy your URL and keys
   - Run the database migrations (see `SETUP_GUIDE.md`)
   - Create a storage bucket named `business-documents`
   - Enable pgvector extension

3. **Get API Keys**:
   - **Cohere**: Get API key from [dashboard.cohere.com](https://dashboard.cohere.com)
   - **Stripe**: Get keys from [dashboard.stripe.com](https://dashboard.stripe.com)
   - Create a $50/month subscription product in Stripe

4. **Configure environment variables**:
   Create a `.env.local` file (see `.env.example` for all required variables):
   ```env
   # Cohere
   COHERE_API_KEY=your_key_here

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID=price_...

   # App
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)

### Production Build

```bash
npm run build
npm start
```

## 🎨 UI/UX Design

The interface is inspired by Cohere and Notion's design philosophy:

- **Clean and minimalist**: Focus on functionality without clutter
- **Professional yet playful**: Balanced use of colors and animations
- **Dark mode support**: Automatic theme detection with manual toggle
- **Responsive design**: Works seamlessly on all devices
- **Smooth animations**: Subtle transitions for better UX
- **Accessible**: Built with accessibility in mind

### Color Palette

- Primary: Blue shades for main actions and branding
- Secondary: Purple accents for emphasis
- Agent-specific colors: Each agent has its unique color scheme

## 🔗 API Integration

The app integrates with the following Cohere APIs:

- **Generate**: Text generation for responses and summaries
- **Chat**: Conversational interface for agent interactions
- **Embed**: Semantic search and embeddings (v3.0)
- **Rerank**: Document reranking for better search results (v3.0)
- **Classify**: Text classification for categorization

## 🚢 Railway Deployment

This project is optimized for Railway deployment:

1. **Connect your repository** to Railway
2. **Set environment variables**:
   - `COHERE_API_KEY`: Your Cohere API key
3. **Deploy**: Railway will automatically build and deploy

Railway will:
- Detect Next.js automatically
- Run `npm install` and `npm run build`
- Start the production server

## 📡 API Endpoints

### Customer Support
- `POST /api/chat` - Send messages to the support chatbot

### HR
- `POST /api/hr` - Resume search and candidate analysis

### Inventory
- `POST /api/inventory` - Inventory management and predictions
- `GET /api/inventory` - Get all inventory data

### Financial
- `POST /api/financial` - Expense categorization and analysis
- `GET /api/financial` - Get all transactions

### Document Review
- `POST /api/document` - Document summarization and analysis

## 🎯 Example Use Cases

1. **Customer Support**: Handle customer inquiries automatically, categorize support tickets
2. **HR**: Screen resumes for job openings, find best candidates using semantic search
3. **Inventory**: Get alerts for low stock, receive intelligent restocking recommendations
4. **Finance**: Categorize expenses, generate budget reports with insights
5. **Documents**: Summarize contracts, extract key clauses, identify risks

## 🔐 Environment Variables

Required:
- `COHERE_API_KEY`: Your Cohere API key

Optional:
- `NEXT_PUBLIC_BASE_URL`: Your application URL (for production)

## 📄 License

MIT License - Feel free to use this project for your business needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using Cohere and Next.js**
