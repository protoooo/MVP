# BizMemory - AI-Powered File Storage for Small Business

BizMemory is an intelligent file and photo storage application that allows small businesses to store documents and retrieve them using natural language queries. Built with Cohere AI APIs for advanced semantic search, auto-tagging, and image analysis.

## Features

- **Natural Language Search**: Find files using conversational queries like "show me tax documents from 2018" or "find before photos of the Johnson property"
- **AI-Powered Auto-Tagging**: Automatic categorization and metadata extraction using Cohere Command-R7b
- **Image Analysis**: Visual understanding of photos using Cohere Aya Vision
- **Vector Similarity Search**: Fast semantic search with PostgreSQL pgvector and Cohere Embed v4 (1536 dimensions)
- **Result Reranking**: Improved relevance with Cohere Rerank v4.0 Pro
- **OCR Support**: Automatic text extraction from images and PDFs using Tesseract.js
- **Dark Theme UI**: Modern Supabase-inspired dark interface
- **Secure Authentication**: JWT-based auth with bcrypt password hashing

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI**: React 19, TypeScript, Tailwind CSS
- **Components**: Radix UI primitives
- **Styling**: Dark Supabase-inspired theme

### Backend
- **Server**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with pgvector extension
- **File Storage**: AWS S3 or local filesystem (configurable)
- **Authentication**: JWT with bcrypt

### AI/ML
- **Cohere Command-R7b** (`command-r7b-12-2024`) - Natural language query parsing and metadata generation
- **Cohere Embed v4** (`embed-v4.0`) - Text embeddings (1536 dimensions)
- **Cohere Aya Vision** (`c4ai-aya-vision-32b`) - Image understanding
- **Cohere Rerank v4.0 Pro** (`rerank-v4.0-pro`) - Search result reranking
- **Tesseract.js** - OCR for text extraction

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with pgvector extension
- Cohere API key (from [cohere.com](https://cohere.com))
- (Optional) AWS account for S3 storage

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/protoooo/MVP.git
cd MVP
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up PostgreSQL with pgvector**
```bash
# Install pgvector extension in your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;
```

4. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Cohere AI
COHERE_API_KEY=your_cohere_api_key
COHERE_EMBED_MODEL=embed-v4.0
COHERE_RERANK_MODEL=rerank-v4.0-pro
COHERE_TEXT_MODEL=command-r7b-12-2024
COHERE_VISION_MODEL=c4ai-aya-vision-32b
FEATURE_COHERE=true
FEATURE_RERANK=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bizmemory

# JWT
JWT_SECRET=your_random_secret_key_min_32_characters

# App
PORT=3000
BACKEND_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

5. **Start the development servers**
```bash
# Start both backend and frontend
npm run dev

# Or start separately:
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 3000
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Database Setup

The database schema is automatically initialized on first run. Tables created:
- `users` - User accounts
- `files` - File metadata
- `file_content` - Extracted text and vector embeddings
- `file_metadata` - AI-generated tags and entities
- `search_logs` - Search analytics

## Usage

### Upload Files

1. Sign up or log in
2. Click "Upload Files" tab
3. Drag and drop files or click to browse
4. Files are automatically processed with:
   - OCR text extraction
   - AI metadata generation
   - Vector embeddings
   - Image analysis (for photos)

### Search Files

Use natural language queries in the search bar:

- `"Show me tax documents from 2018"`
- `"Find before photos of the Johnson property"`
- `"Get all invoices over $5000"`
- `"Find employee training documents"`
- `"Show me expense receipts from last quarter"`

The AI will:
1. Parse your query intent
2. Extract date ranges, entities, and keywords
3. Perform vector similarity search
4. Rerank results for relevance
5. Display matches with relevance scores

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Sign out

### Files
- `POST /api/files/upload` - Upload file with AI processing
- `GET /api/files` - List files (paginated)
- `GET /api/files/:id` - Get file details
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### Search
- `POST /api/search` - Natural language search
- `GET /api/search/suggestions` - Get search suggestions

## Deployment

### Railway (Recommended)

1. Create a new project on [Railway](https://railway.app)
2. Add PostgreSQL service with pgvector
3. Set environment variables in Railway dashboard
4. Deploy from GitHub

### Manual Deployment

1. **Build the application**
```bash
npm run build
```

2. **Set environment to production**
```env
NODE_ENV=production
```

3. **Start the server**
```bash
npm run start
```

## Architecture

### AI Processing Pipeline

When a file is uploaded:
1. **Text Extraction**: OCR for images/PDFs, direct read for text files
2. **Embedding Generation**: Convert text to 1536-dim vector using Cohere Embed v4
3. **Image Analysis**: (For images) Analyze with Cohere Aya Vision
4. **Metadata Generation**: Extract tags, categories, entities with Command-R7b
5. **Storage**: Save to S3/filesystem + PostgreSQL

### Search Flow

When a user searches:
1. **Query Parsing**: Extract intent, dates, entities with Command-R7b
2. **Query Embedding**: Convert search to vector with Cohere Embed v4
3. **Vector Search**: Find top 50 similar files using pgvector cosine similarity
4. **Filtering**: Apply date range and document type filters
5. **Reranking**: Reorder top results with Cohere Rerank v4.0 Pro
6. **Results**: Return top 20 with relevance scores

## License

ISC

## Support

For issues or questions, please open an issue on GitHub.
