# Proto - Your Adaptive AI Business Assistant

**"Grow with your business to grow your business"**

Proto is an adaptive AI business assistant that replaces 6 separate agents with ONE intelligent agent that morphs its capabilities based on your needs. Proto remembers everything about your business and learns as you work together.

**Not a generic AI chat app.** Proto is your daily business partner that **actually does work** - drafts emails, analyzes finances, creates schedules, reviews contracts, and coordinates your entire operation.

## 🚀 What Makes Proto Special

### Adaptive Intelligence
- ✅ Single adaptive agent replaces 6 specialized agents
- ✅ Morphs capabilities based on your needs (finance, HR, ops, customer service)
- ✅ Remembers everything about your business across all conversations
- ✅ Learns your preferences and processes over time
- ✅ Character-by-character animated onboarding experience

### Memory System
- ✅ Unified memory storage (business context, preferences, relationships, processes, goals)
- ✅ Intelligent memory retrieval and context awareness
- ✅ Memory viewer to see what Proto remembers
- ✅ Importance-based memory prioritization
- ✅ Onboarding questionnaire stores initial business context

### Document Processing Pipeline
- ✅ Automatic text extraction from PDFs, DOCX, CSV, TXT
- ✅ Document chunking and embedding generation with Cohere
- ✅ Semantic search across all uploaded documents
- ✅ Proto automatically references relevant documents in responses
- ✅ Processing status indicators in UI

### User Experience
- ✅ Toast notification system for real-time feedback
- ✅ Loading states with skeleton screens
- ✅ Empty states with clear CTAs
- ✅ Trial banner with ROI calculations
- ✅ Payment failed banner with recovery options
- ✅ Value tracking (track time/money saved)

### Error Handling & Security
- ✅ Global error boundaries
- ✅ Middleware for auth protection
- ✅ Rate limiting foundation (ready for Redis)
- ✅ Graceful error messages (no technical jargon)
- ✅ Input validation and sanitization

### Output Generation
- ✅ OutputActionBar (copy, email, download, share)
- ✅ "Mark as Used" tracking for value demonstration
- ✅ Automatic value event tracking
- ✅ Export outputs as files

## 💎 Core Features

### Real Actions, Not Just Suggestions
Agents draft outputs you can review and use - emails, schedules, reports. No copy-paste required.

### Knows Your Business
Upload files manually (PDFs, spreadsheets, docs) - agents learn your specific operations and reference them in responses.

### Shared Business Knowledge Hub
All uploads go into a shared hub accessible by your team. Embeddings enable semantic search.

### Pricing
- **Base**: $25/month for workspace owner
- **Team**: $10/month per additional member (up to 5 total)
- **Trial**: 14 days free with full feature access

## CORE CONSTRAINTS

- **No direct integrations of any kind**
- Users upload all files manually (PDFs, spreadsheets, docs, images)
- Agents only know what the user uploads or types
- Shared Business Knowledge Hub where all uploads accumulate
- All files are shared between team members
- Never implies access to external systems, emails, POS, banks, or databases

## What Proto Can Do

Proto is a single adaptive agent that handles everything your business needs:

### ✓ Draft Professional Emails and Customer Responses
- Handle customer questions, complaints, and disputes
- Generate professional, calm, reusable responses
- Draft follow-ups, refunds, and FAQ responses

### ✓ Create Staff Schedules and Manage Availability
- Generate optimized schedules based on constraints
- Detect conflicts and suggest shift swaps
- Plan coverage when staff call out

### ✓ Analyze Contracts, Invoices, and Documents for Issues
- Review contracts and extract key terms, dates, obligations
- Identify red flags and anomalies in financial documents
- Compare multiple documents for discrepancies
- Explain complex documents in plain English

### ✓ Help When You're Short-Staffed
- Suggest smart solutions for coverage gaps
- Recommend task delegation strategies
- Provide actionable workarounds

### ✓ Coordinate Between You and Your Team
- Facilitate decision-making
- Track tasks and action items
- Enable collaborative workspaces with whiteboards

### ✓ Work Autonomously on Complex Tasks
- Show thinking process with progress updates
- Execute multi-step tasks independently
- Keep you informed with real-time status

**Core Principle:** Proto remembers everything. Every detail about your business, your preferences, your team, your challenges. The more you work together, the better Proto understands your needs.

## Draft + Open App Pattern

For any actionable output (emails, schedules, invoices, reports, documents):

1. The agent **drafts the output automatically** using uploaded files and context
2. Agent displays the draft to the user for review
3. Agent provides an **"Open in App / Copy to Clipboard" button** that:
   - Opens the user's local application (email client, calendar, spreadsheet, or document editor)
   - Copies the draft content into a new message, event, or document
4. User reviews the draft and finalizes it manually by sending, posting, or saving

This pattern is applied **consistently across all actionable tasks**.

## Team Sharing & Collaboration

- Send up to 5 invite codes to share workspace access
- All uploaded files go into shared Business Knowledge Hub
- Team members can access all documents and agents
- Collaborate on outputs and business decisions
- **Pricing**: $25/month base plan + $10/month per team member invited

## Pricing

- **Base Plan**: $25/month for the workspace owner
- **Team Members**: $10/month per additional member invited (up to 5 members total)
- **Example**: Owner + 2 team members = $25 + $20 = $45/month
- **Example**: Owner + 4 team members = $25 + $40 = $65/month

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
