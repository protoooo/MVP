# Naiborhood - Business Automation for Small Businesses

Naiborhood is an innovative platform designed specifically for small businesses to streamline operations, enhance efficiency, and drive growth. Our platform integrates seamlessly with various business tools and systems, enabling small business owners to focus on what matters most – growing their business.

## Features

### Customer Support
- **Handle customer inquiries**: Our chatbots and virtual assistants can manage customer queries effectively, providing instant responses and personalized interactions.
- **Sentiment analysis**: Analyze customer feedback and sentiments in real-time to gauge satisfaction levels and identify areas for improvement.
- **Ticket routing**: Automatically route customer support tickets to the appropriate departments or agents, ensuring timely and accurate resolution.

### HR Assistant
- **Resume screening**: Screen resumes and identify top candidates based on predefined criteria, saving time and effort in the recruitment process.
- **Candidate matching**: Match candidates with job openings based on skills, experience, and other relevant factors, improving the quality of hires.
- **Interview scheduling**: Automate the scheduling of interviews, reducing administrative overhead and ensuring a smooth candidate experience.

### Inventory Manager
- **Stock predictions**: Forecast stock levels and demand, enabling proactive inventory management and reducing stockouts or overstocking.
- **Alerts**: Receive real-time alerts for low stock levels, high demand, or other critical inventory issues, allowing for immediate action.
- **Inventory optimization**: Optimize inventory levels and storage to maximize efficiency and minimize costs.

### Financial Analyst
- **Expense categorization**: Automatically categorize expenses and allocate them to the appropriate departments or projects, enhancing financial accuracy and transparency.
- **Budgeting**: Create and manage budgets, ensuring alignment with business goals and objectives.
- **Financial insights**: Gain valuable insights into financial performance through advanced analytics and reporting, enabling data-driven decision-making.

### Document Reviewer
- **Contract summarization**: Summarize contracts and legal documents, extracting key information and clauses for quick review and analysis.
- **Clause extraction**: Identify and extract specific clauses or terms from documents, facilitating targeted analysis and compliance checks.
- **Risk analysis**: Assess potential risks and liabilities within documents, providing a comprehensive overview of contractual obligations and potential issues.

### SEO/Marketing
- **Keyword research**: Identify high-value keywords and phrases for your business, improving search engine rankings and visibility.
- **Content optimization**: Optimize website content and marketing materials to enhance engagement and conversion rates.
- **Social media management**: Automate social media posting and engagement, ensuring consistent brand presence and interaction with customers.

## Integration
Naiborhood seamlessly integrates with a wide range of business tools and systems, including CRM, ERP, HRMS, and more. Our platform is designed to complement existing workflows and processes, ensuring a smooth transition to automated operations.

## Benefits
- **Increased efficiency**: Automate repetitive tasks and processes, freeing up valuable time and resources for more strategic activities.
- **Cost savings**: Reduce operational costs by minimizing manual labor and optimizing resource allocation.
- **Improved accuracy**: Enhance accuracy and consistency in various business functions, reducing errors and improving overall performance.
- **Enhanced customer experience**: Provide faster, more personalized interactions with customers, leading to increased satisfaction and loyalty.
- **Data-driven decision-making**: Gain valuable insights from advanced analytics, enabling informed and strategic business decisions.

## Tech Stack

- **Frontend**: Next.js 14+ with React 19, TypeScript
- **Styling**: TailwindCSS with custom design system
- **Backend Integration**: Cohere API (Generate, Chat, Embed, Rerank, Classify)
- **Icons**: Lucide React
- **Deployment**: Railway-ready

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
- Cohere API key

### Local Development

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd MVP
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file:
   ```
   COHERE_API_KEY=your_cohere_api_key_here
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

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
