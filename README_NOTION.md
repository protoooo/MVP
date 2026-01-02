# MVP - Notion-Style Workspace with AI Integration

A powerful, Notion-like workspace application with built-in AI capabilities, real-time collaboration, and comprehensive document management.

## 🌟 Features Implemented

### ✅ Core Workspace Features
- **Hierarchical Page System**: Unlimited nesting of pages with drag-and-drop reordering
- **Block-Based Editor**: Rich text editing with multiple block types
- **Templates**: Pre-built templates for common use cases (meetings, projects, wikis, etc.)
- **Search & Navigation**: Quick Find (Cmd/Ctrl+K) for instant page access
- **Favorites**: Star important pages for quick access

### ✅ Block Types
- **Text Blocks**: Paragraph, headings (H1, H2, H3)
- **Lists**: Bulleted, numbered, and toggle lists
- **Media**: Images, files, videos (YouTube/Vimeo/upload), audio, PDFs
- **Formatting**: Quotes, callouts, code blocks, dividers
- **AI Blocks**: AI Writer for content generation

### ✅ Database Views
- **Table View**: Spreadsheet-like data management
- **Board View**: Kanban boards for project management
- **Calendar View**: Date-based organization
- **List View**: Compact list format
- **Gallery View**: Visual card layout

### ✅ Collaboration Features
- **ShareModal**: Share pages with customizable permissions
- **LiveCursors**: Real-time cursor tracking
- **Comments**: Threaded discussions on pages and blocks
- **@Mentions**: Tag team members in comments
- **Page Permissions**: Granular access control (view, comment, edit, full access)

### ✅ Import/Export
- **Import**: Markdown, plain text
- **Export**: Markdown, HTML, PDF

### ✅ Settings & Customization
- **Workspace Settings**: Configure workspace name, icon
- **Account Settings**: Manage user profile
- **Appearance**: Theme selection (light/dark), font sizes
- **Notifications**: Control notification preferences

### ✅ Mobile Responsiveness
- **Responsive Sidebar**: Drawer navigation on mobile
- **Mobile Menu**: Touch-optimized navigation
- **Adaptive Layout**: Works on all screen sizes

## 🏗️ Architecture

### Database Schema (Supabase)

```sql
-- Core Tables
workspaces          # Top-level workspace container
pages               # Hierarchical page structure
blocks              # Content blocks within pages

-- Database Features
databases           # Database metadata
database_properties # Column definitions
database_views      # Different view types (table, board, etc.)
database_items      # Database rows/cards
database_property_values # Cell data

-- Collaboration
comments            # Page and block comments
shares              # Public/private sharing
page_permissions    # User access control
page_sessions       # Real-time presence

-- Utilities
templates           # Page templates
trash               # 30-day restore window
```

### Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Storage**: Supabase Storage
- **AI**: Cohere API
- **Payments**: Stripe
- **Icons**: Lucide React
- **Animations**: Framer Motion

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Cohere API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MVP
   npm install
   ```

2. **Set up environment variables**
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Cohere AI
   COHERE_API_KEY=your_cohere_key
   
   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Run database migrations**
   - Execute the SQL in `supabase/migrations/20260102_notion_clone_schema.sql`

4. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
app/
├── workspace/          # Main workspace interface
├── settings/           # Settings pages
├── api/
│   └── notion/
│       ├── export/     # Export API (PDF, Markdown, HTML)
│       ├── import/     # Import API (Markdown, Text)
│       └── ai-writer/  # AI content generation

components/notion/
├── WorkspaceLayout.tsx # Main layout wrapper
├── Sidebar.tsx         # Navigation sidebar
├── PageEditor.tsx      # Page editing canvas
├── Block.tsx           # Base block component
├── QuickFind.tsx       # Cmd+K search
├── ShareModal.tsx      # Sharing controls
├── LiveCursors.tsx     # Real-time cursors
├── MentionsInput.tsx   # @mentions support
├── Comments.tsx        # Comments system
├── DatabaseTable.tsx   # Database view switcher
├── TemplateGallery.tsx # Template picker
├── blocks/
│   ├── ImageBlock.tsx
│   ├── FileBlock.tsx
│   ├── VideoBlock.tsx
│   ├── AudioBlock.tsx
│   ├── PDFBlock.tsx
│   ├── ToggleBlock.tsx
│   └── AIWriterBlock.tsx
└── database-views/
    ├── BoardView.tsx   # Kanban board
    ├── CalendarView.tsx
    ├── ListView.tsx
    └── GalleryView.tsx

lib/notion/
├── types.ts            # TypeScript types
└── page-utils.ts       # Database utilities
```

## 🎯 Usage

### Creating Pages
- Click "New Page" in sidebar
- Use templates from the gallery
- Nest pages by dragging

### Adding Blocks
- Type `/` to open block menu
- Choose from text, media, AI, or database blocks
- Drag handle to reorder

### Database Views
- Add a database block to any page
- Switch between table, board, calendar, list, and gallery views
- Add properties and items
- Filter and sort data

### Collaboration
- Click "Share" to invite others
- Set permissions per user
- Leave comments on blocks
- @mention team members

### Keyboard Shortcuts
- `Cmd/Ctrl + K` - Quick Find
- `/` - Block menu
- `Enter` - New block
- `Backspace` on empty block - Delete

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- User authentication via Supabase Auth
- Permission-based access control
- Secure file storage with Supabase Storage

## 📱 Mobile Support

- Responsive sidebar with drawer navigation
- Touch-optimized block editing
- Mobile-friendly menus and modals
- Adaptive layouts for all screen sizes

## 🎨 Customization

### Themes
Configure appearance in Settings:
- Light/Dark/System theme
- Font size options
- Custom workspace icons

### Templates
Create custom templates with:
- Pre-defined page structure
- Default blocks and content
- Reusable across workspace

## 🚢 Deployment

### Railway

The app is optimized for Railway deployment:

1. Connect repository to Railway
2. Set environment variables
3. Deploy automatically

Railway will detect Next.js and run:
```bash
npm install
npm run build
npm start
```

## 📈 Performance

- React.memo for frequently rendered components
- Supabase indexes for fast queries
- Lazy loading for media blocks
- Optimized database views

## 🔄 Real-time Features

Using Supabase Realtime:
- Live cursor positions
- Real-time comments
- Presence indicators
- Collaborative editing

## 📄 License

MIT License

## 🤝 Contributing

Contributions welcome! Please submit pull requests.

---

**Built with ❤️ using Next.js, Supabase, and Cohere**
