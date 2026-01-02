import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, checkDatabaseConnection, closeDatabasePool } from './config/database';
import authRoutes from './routes/auth';
import filesRoutes from './routes/files';
import searchRoutes from './routes/search';

// Load environment variables
dotenv.config();

const app = express();

// Parse PORT as integer and use Railway's PORT variable first
console.log('DEBUG - process.env.PORT:', process.env.PORT);
console.log('DEBUG - process.env.BACKEND_PORT:', process.env.BACKEND_PORT);

const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '3001', 10);
console.log('DEBUG - Final PORT being used:', PORT);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route - Info page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BizMemory API</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0D1117 0%, #1C2128 100%);
          color: #E6EDF3;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          max-width: 900px;
          width: 100%;
          background: #161B22;
          border: 1px solid #30363D;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        h1 { 
          color: #3ECF8E;
          font-size: 2.5rem;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #3ECF8E20;
          color: #3ECF8E;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 24px;
        }
        .status::before {
          content: '';
          width: 8px;
          height: 8px;
          background: #3ECF8E;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        p { 
          color: #7D8590;
          line-height: 1.6;
          margin-bottom: 32px;
          font-size: 1.1rem;
        }
        h2 { 
          color: #E6EDF3;
          font-size: 1.5rem;
          margin: 32px 0 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #30363D;
        }
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        li {
          background: #1C2128;
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 8px;
          border: 1px solid #30363D;
          transition: all 0.2s;
        }
        li:hover {
          border-color: #3ECF8E;
          transform: translateX(4px);
        }
        code { 
          background: #21262D;
          color: #3ECF8E;
          padding: 4px 10px;
          border-radius: 6px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .method {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          margin-right: 8px;
          min-width: 50px;
          text-align: center;
        }
        .get { background: #3ECF8E; color: #0D1117; }
        .post { background: #58A6FF; color: #0D1117; }
        .delete { background: #F85149; color: #0D1117; }
        .note {
          background: #388BFD20;
          border: 1px solid #388BFD40;
          color: #58A6FF;
          padding: 16px 20px;
          border-radius: 8px;
          margin-top: 32px;
          line-height: 1.6;
        }
        .note strong {
          color: #58A6FF;
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid #30363D;
          color: #6E7681;
          font-size: 0.875rem;
          text-align: center;
        }
        a {
          color: #58A6FF;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 BizMemory API</h1>
        <div class="status">● OPERATIONAL</div>
        <p>AI-powered file and photo storage backend with natural language search powered by Cohere AI.</p>
        
        <h2>📡 API Endpoints</h2>
        
        <h3 style="color: #7D8590; font-size: 1rem; margin: 24px 0 12px;">Authentication</h3>
        <ul>
          <li><span class="method post">POST</span><code>/api/auth/register</code> - Create new account</li>
          <li><span class="method post">POST</span><code>/api/auth/login</code> - User login</li>
          <li><span class="method get">GET</span><code>/api/auth/me</code> - Get current user (requires auth)</li>
          <li><span class="method post">POST</span><code>/api/auth/logout</code> - User logout</li>
        </ul>

        <h3 style="color: #7D8590; font-size: 1rem; margin: 24px 0 12px;">File Management</h3>
        <ul>
          <li><span class="method post">POST</span><code>/api/files/upload</code> - Upload file with AI processing</li>
          <li><span class="method get">GET</span><code>/api/files</code> - List all files (paginated)</li>
          <li><span class="method get">GET</span><code>/api/files/:id</code> - Get file details</li>
          <li><span class="method get">GET</span><code>/api/files/:id/download</code> - Download file</li>
          <li><span class="method delete">DELETE</span><code>/api/files/:id</code> - Delete file</li>
        </ul>

        <h3 style="color: #7D8590; font-size: 1rem; margin: 24px 0 12px;">Search</h3>
        <ul>
          <li><span class="method post">POST</span><code>/api/search</code> - Natural language search</li>
          <li><span class="method get">GET</span><code>/api/search/suggestions</code> - Get search suggestions</li>
        </ul>

        <h3 style="color: #7D8590; font-size: 1rem; margin: 24px 0 12px;">Health Check</h3>
        <ul>
          <li><span class="method get">GET</span><code>/health</code> - Server health status</li>
        </ul>

        <div class="note">
          <strong>🎨 Frontend Application:</strong><br>
          This is the backend API server. Deploy your Next.js frontend separately and configure it to point to this API URL using the <code>NEXT_PUBLIC_API_URL</code> environment variable.
        </div>

        <div class="footer">
          <p>Powered by Cohere AI • PostgreSQL with pgvector • Express.js</p>
          <p>© 2024 BizMemory - AI-Powered File Storage</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BizMemory API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Graceful shutdown handler
function setupGracefulShutdown(server: any) {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Close database pool
        await closeDatabasePool();
        
        console.log('Graceful shutdown complete');
        process.exit(0);
      });
      
      // Force shutdown after timeout
      const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10);
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, shutdownTimeout);
    });
  });
}

// Initialize database and start server
async function startServer() {
  try {
    console.log('Starting BizMemory API server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check database connection with retry logic
    console.log('\n=== Database Connection Check ===');
    const maxRetries = parseInt(process.env.DB_MAX_RETRIES || '5', 10);
    const retryDelay = parseInt(process.env.DB_RETRY_DELAY || '2000', 10);
    
    await checkDatabaseConnection(maxRetries, retryDelay);
    
    // Initialize database schema
    console.log('\n=== Database Initialization ===');
    await initializeDatabase();
    
    // Start HTTP server - Bind to 0.0.0.0 for Railway
    console.log('\n=== Starting HTTP Server ===');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ BizMemory API server running on port ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
      console.log(`  API Info: http://localhost:${PORT}/`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Listening on: 0.0.0.0:${PORT}`);
      console.log('\nServer ready to accept requests!\n');
    });
    
    // Setup graceful shutdown
    setupGracefulShutdown(server);
    
  } catch (error: any) {
    console.error('\n=== Server Startup Failed ===');
    console.error('Failed to start server:', error.message);
    
    if (error.message.includes('database')) {
      console.error('\n📚 Database Setup Help:');
      console.error('  See docs/DATABASE_SETUP.md for detailed setup instructions');
    }
    
    // Exit with error code
    process.exit(1);
  }
}

startServer();
