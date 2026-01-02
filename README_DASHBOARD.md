# Business Automation Dashboard

A **Notion-like business hub** for small teams (1-10 staff) in restaurants, retail, and service businesses. Dead-simple, visual, mobile-first interface for non-tech-savvy users.

## Overview

The Business Automation Dashboard provides **exactly 3 core sections** to manage your small business operations:

1. **📅 Interactive Scheduling** - Visual shift planning with AI optimization
2. **💬 Group Communications** - Team messaging with voice notes and transcription
3. **✅ Task Checklists** - Shared to-do lists with photo verification

## Features

### 1. Interactive Scheduling

**Purpose**: Visual shift planning with AI optimization

**Key Features**:
- **Calendar View**: Week/month/day views with drag-drop shift management
- **AI Schedule Optimization**: Cohere AI generates fair schedules based on:
  - Staff availability preferences
  - Role requirements (e.g., "2 cooks, 1 server per shift")
  - Labor constraints (max 40hrs/week per employee)
- **Shift Swaps**: Staff can request shift swaps with approval workflow
- **Real-time Updates**: Schedule changes broadcast instantly via Supabase Realtime

**Components**:
- Calendar grid with react-big-calendar
- Staff availability management
- AI optimization button
- Swap request system

### 2. Group Communications

**Purpose**: Hybrid text + voice messaging (like Slack meets voice memos)

**Key Features**:
- **Text Chat**: Channel-based messaging (e.g., "Kitchen Crew", "Monday Openers")
- **Voice Messages**: Record audio with auto-transcription via Cohere API
- **Real-time Sync**: Instant message delivery with Supabase subscriptions
- **Channel Organization**: Organize by team, shift, or topic

**Components**:
- Message feed with infinite scroll
- Channel switcher
- Voice recorder with transcription
- Message composer

### 3. Task Checklists

**Purpose**: Shared to-do lists with photo verification (like Asana + checklists)

**Key Features**:
- **List Management**: Create lists for different purposes (opening tasks, maintenance, etc.)
- **Task Tracking**: Assign tasks, set due dates, track completion
- **Photo Verification**: Upload photos with AI analysis via Cohere Vision
- **Progress Tracking**: Visual progress bars per list
- **Auto-archive**: Completed lists archived after 7 days

**Components**:
- Task list cards with progress bars
- Task items with checkboxes
- Photo upload with AI analysis
- Completion tracking

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend/DB**: Supabase (Auth, PostgreSQL, Realtime subscriptions)
- **AI**: Cohere API (schedule optimization, photo analysis, text summarization)
- **Calendar**: react-big-calendar with moment.js
- **Payment**: Stripe (for $29/mo subscription)

## Database Schema

The dashboard uses the following Supabase tables:

- `businesses` - Business/organization records
- `staff` - Team members with roles and availability
- `schedules` - Shift schedules with dates and times
- `shift_swaps` - Swap requests with approval status
- `messages` - Chat messages with voice URLs and transcripts
- `task_lists` - Checklist containers
- `tasks` - Individual task items with photos and AI analysis

See `supabase/schema.sql` for the complete schema with RLS policies.

## API Routes

### Cohere AI Integration

1. **POST /api/cohere/optimize-schedule**
   - Generates optimized weekly schedules
   - Input: Staff availability, role requirements
   - Output: JSON array of scheduled shifts

2. **POST /api/cohere/analyze-photo**
   - Analyzes task completion photos
   - Input: Photo file, task context
   - Output: PASS/FAIL with reasoning

3. **POST /api/cohere/summarize**
   - Summarizes text content (messages, notes)
   - Input: Text content, length preference
   - Output: Summary text

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account and project
- Cohere API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
# Execute supabase/schema.sql in your Supabase SQL editor

# Start development server
npm run dev
```

Visit `http://localhost:3000/dashboard` to access the Business Dashboard.

### Environment Variables

Required variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
COHERE_API_KEY=your_cohere_key
```

## User Flow

1. **Sign Up**: Create business account
2. **Add Team**: Invite staff members
3. **Set Availability**: Staff set their work preferences
4. **Dashboard Access**: Three main tabs (Scheduling, Comms, Checklists)
5. **Daily Operations**:
   - Managers create and optimize schedules
   - Staff view shifts and request swaps
   - Team communicates via text and voice
   - Complete checklists with photo verification

## Mobile-First Design

- Large touch targets for easy mobile interaction
- Responsive layout adapts to all screen sizes
- Works on phones (iPhone SE 375px and up)
- Clean, minimal UI with clear visual hierarchy

## Real-time Features

All sections use Supabase Realtime for instant updates:
- Schedule changes appear immediately for all users
- New messages show up without refresh
- Task completions sync across devices

## AI Capabilities

### Schedule Optimization
- Analyzes staff availability and constraints
- Generates fair, balanced weekly schedules
- Respects max hours and role requirements

### Photo Analysis
- Verifies task completion through image analysis
- Provides PASS/FAIL assessment
- Helps ensure quality control

### Text Summarization
- Summarizes long message threads
- Creates concise notes from conversations
- Available in short/medium/long formats

## Target Users

- Michigan restaurants
- Retail shops (1-10 employees)
- Lawn care companies
- Small service businesses

**Monthly Cost**: $29/mo via Stripe

## Philosophy

**No complex menus, no chatbots—just clear buttons, cards, and visual sections.**

Think "the simplicity of Notion meets small business operations."
