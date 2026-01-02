import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase, checkDatabaseConnection, closeDatabasePool } from './config/database';
import authRoutes from './routes/auth';
import filesRoutes from './routes/files';
import searchRoutes from './routes/search';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes - Must be BEFORE any catch-all routes
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BizMemory API is running', timestamp: new Date().toISOString() });
});

// Production: Integrate with Next.js
if (!isDevelopment) {
  const next = require('next');
  
  // Initialize Next.js
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname, '../..'),
    customServer: true,
  });
  
  const handle = nextApp.getRequestHandler();
  
  // Prepare Next.js app
  nextApp.prepare().then(() => {
    console.log('✓ Next.js app ready');
    
    // Serve Next.js static files
    app.use('/_next', express.static(path.join(__dirname, '../../.next')));
    app.use('/static', express.static(path.join(__dirname, '../../public')));
    
    // Let Next.js handle all other routes
    app.all('*', (req, res) => {
      return handle(req, res);
    });
    
    // Start server after Next.js is ready
    startHTTPServer();
  }).catch(err => {
    console.error('Failed to initialize Next.js:', err);
    // Fallback: serve without Next.js
    setupFallbackRoutes();
    startHTTPServer();
  });
  
} else {
  // Development mode
  setupFallbackRoutes();
  startHTTPServer();
}

// Fallback routes when Next.js isn't available
function setupFallbackRoutes() {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BizMemory - AI-Powered File Storage</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
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
            max-width: 600px;
            width: 100%;
            background: #161B22;
            border: 1px solid #30363D;
            border-radius: 12px;
            padding: 60px 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }
          h1 {
            color: #3ECF8E;
            font-size: 2.5rem;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }
          .subtitle { color: #7D8590; margin-bottom: 32px; font-size: 1.1rem; }
          .status-card {
            background: #1C2128;
            border: 1px solid #30363D;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
          }
          .status-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #30363D;
          }
          .status-item:last-child { border-bottom: none; }
          .label { color: #7D8590; }
          .value { color: #3ECF8E; font-weight: 600; }
          .value.running::before {
            content: '●';
            margin-right: 8px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .info {
            color: #7D8590;
            font-size: 0.875rem;
            line-height: 1.6;
            margin-top: 24px;
          }
          a {
            color: #58A6FF;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          ${isDevelopment ? `
          .dev-warning {
            background: #FFA50020;
            border: 1px solid #FFA50040;
            color: #FFA500;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
            font-size: 0.875rem;
          }
          code {
            background: #21262D;
            color: #3ECF8E;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
          ` : ''}
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 BizMemory</h1>
          <p class="subtitle">AI-Powered File Storage for Small Business</p>
          
          <div class="status-card">
            <div class="status-item">
              <span class="label">Backend API</span>
              <span class="value running">Running</span>
            </div>
            <div class="status-item">
              <span class="label">Database</span>
              <span class="value running">Connected</span>
            </div>
            <div class="status-item">
              <span class="label">Mode</span>
              <span class="value">${isDevelopment ? 'Development' : 'Production'}</span>
            </div>
          </div>
          
          ${isDevelopment ? `
          <div class="dev-warning">
            <strong>⚠️ Development Mode</strong><br>
            Run <code>npm run dev:frontend</code> in another terminal to start the Next.js frontend.
          </div>
          ` : `
          <div class="info">
            <p><strong>Backend is running successfully!</strong></p>
            <p>Frontend is being integrated. In the meantime, you can:</p>
            <p style="margin-top: 12px;">
              • Test the API at <a href="/health">/health</a><br>
              • View API documentation<br>
              • Run the frontend locally with the backend
            </p>
          </div>
          `}
          
          <div class="info" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #30363D;">
            <p>Powered by Cohere AI • PostgreSQL with pgvector</p>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Graceful shutdown
function setupGracefulShutdown(server: any) {
  ['SIGTERM', 'SIGINT'].forEach((signal: any) => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await closeDatabasePool();
        console.log('Shutdown complete');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Forced shutdown');
        process.exit(1);
      }, 10000);
    });
  });
}

// HTTP server startup
let httpServer: any = null;

function startHTTPServer() {
  httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ HTTP server running on port ${PORT}`);
    console.log(`✓ Listening on 0.0.0.0:${PORT}`);
    console.log('\n✅ Server ready!\n');
  });
  
  setupGracefulShutdown(httpServer);
}

// Initialize database and start
async function startServer() {
  try {
    console.log('\n🚀 Starting BizMemory...');
    console.log('=== Database Check ===');
    await checkDatabaseConnection(5, 2000);
    
    console.log('\n=== Database Init ===');
    await initializeDatabase();
    
    console.log('\n=== Server Initialization ===');
    
    // If production and Next.js integration is enabled, it will start the server
    // Otherwise, start immediately
    if (isDevelopment) {
      startHTTPServer();
    }
    
  } catch (error: any) {
    console.error('\n✗ Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
