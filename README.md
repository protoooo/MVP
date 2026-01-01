# Business Workspace

A practical, agent-based business workspace that automates and solves real business problems, so owners don't have to do tasks they dislike or that are tedious.

**Not a generic AI chat app.** This is a daily business assistant with agents that **actually do work** - draft emails, analyze finances, check resumes, manage inventory, and more.

## What Makes This Different

- **Real Actions, Not Just Suggestions**: Agents draft outputs you can review and use - emails, schedules, reports. No copy-paste required.
- **Knows Your Business**: Upload your files manually (PDFs, spreadsheets, docs, images) - agents learn your specific operations
- **Shared Business Knowledge Hub**: All uploads go into a shared hub accessible by your team
- **One Simple Price**: $50/month. Up to 5 team members. No usage limits.

## CORE CONSTRAINTS

- **No direct integrations of any kind**
- Users upload all files manually (PDFs, spreadsheets, docs, images)
- Agents only know what the user uploads or types
- Shared Business Knowledge Hub where all uploads accumulate
- All files are shared between team members
- Never implies access to external systems, emails, POS, banks, or databases

## 6 Specialized Business Agents

### 1. Today's Priorities
- Turn vague goals into concrete, actionable tasks
- Highlight tradeoffs and sequencing (what first, what can wait)
- Use only current context and uploaded files
- Example actions: draft daily task lists, highlight urgent items, suggest task delegation
- **Does NOT** give motivational advice or long-term planning

### 2. Customer Service
- Resolve customer questions, complaints, or disputes using uploaded materials
- Draft professional, calm, reusable email responses or messages
- Suggest escalation steps when needed
- Example actions: generate email drafts for refunds, complaints, or FAQs based on uploaded policies
- **Does NOT** invent policies or promises

### 3. HR
- Work with onboarding docs, training materials, schedules, and handbooks
- Answer "How do we handle X?" using uploaded HR content
- Rewrite, summarize, or organize internal processes
- Example actions: draft schedules, onboarding emails, screen resumes for inconsistencies or AI usage, prepare training checklists
- **Does NOT** give legal or compliance advice—only explains uploaded content

### 4. Inventory
- Work with uploaded stock lists, order sheets, vendor invoices, or counts
- Identify shortages, overstock, inconsistencies, or risks
- Help reason about what to order or review
- Example actions: suggest reorder quantities, flag discrepancies, analyze usage trends, provide conservative forecasts
- **Does NOT** forecast unless explicitly requested and labeled as an estimate

### 5. Finances
- Work with uploaded expenses, invoices, revenue reports, and spreadsheets
- Summarize financial activity clearly and concisely
- Identify patterns, anomalies, or areas to review
- Example actions: generate summaries for accountants or partners, flag unusual trends, prepare conservative forecasts, highlight actionable opportunities
- **Does NOT** assume missing data or fabricate numbers

### 6. Contracts, Agreements & Policies
- Work with uploaded contracts, agreements, policies, and formal documents
- Summarize key terms, dates, obligations, and responsibilities
- Compare documents when asked
- Explain documents in plain English
- Example actions: extract renewal dates, obligations, clauses for follow-up, compare contracts for discrepancies
- **Does NOT** give legal conclusions or advice

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
- One subscription includes up to 5 team members at no extra cost

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
