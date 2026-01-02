import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase, checkDatabaseConnection, closeDatabasePool } from './config/database';
import authRoutes from './routes/auth';
import filesRoutes from './routes/files';
import searchRoutes from './routes/search';

// Load environment variables
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

// API Routes (must be before static files)
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BizMemory API is running' });
});

// Serve Next.js frontend in production
if (!isDevelopment) {
  const nextBuildPath = path.join(__dirname, '../../.next');
  const nextPublicPath = path.join(__dirname, '../../public');
  
  console.log('Serving Next.js static files from:', nextBuildPath);
  
  // Serve Next.js static files
  app.use('/_next', express.static(path.join(nextBuildPath, 'static')));
  app.use('/public', express.static(nextPublicPath));
  
  // For all other routes, serve the Next.js app
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Serve index.html for all other routes
    res.sendFile(path.join(__dirname, '../../.next/server/pages/index.html'), (err) => {
      if (err) {
        console.error('Error serving frontend:', err);
        res.status(500).send('Error loading application');
      }
    });
  });
} else {
  // Development: Show API info page
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BizMemory API - Development Mode</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          .dev-mode {
            background: #FFA50020;
            border: 1px solid #FFA50040;
            color: #FFA500;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
          }
          p { color: #7D8590; line-height: 1.6; margin-bottom: 16px; }
          code { 
            background: #21262D;
            color: #3ECF8E;
            padding: 4px 10px;
            border-radius: 6px;
            font-family: 'Monaco', monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 BizMemory API</h1>
          <div class="status">● DEVELOPMENT MODE</div>
          
          <div class="dev-mode">
            <strong>⚠️ Development Mode Active</strong><br>
            Run <code>npm run dev:frontend</code> in a separate terminal to start the Next.js frontend on port 3000.
          </div>
          
          <p><strong>Backend API running on port ${PORT}</strong></p>
          <p>Health check: <code>/health</code></p>
          <p>API endpoints: <code>/api/*</code></p>
        </div>
      </body>
      </html>
    `);
  });
}

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
      
      server.close(async () => {
        console.log('HTTP server closed');
        await closeDatabasePool();
        console.log('Graceful shutdown complete');
        process.exit(0);
      });
      
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
    console.log('Starting BizMemory server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check database connection with retry logic
    console.log('\n=== Database Connection Check ===');
    const maxRetries = parseInt(process.env.DB_MAX_RETRIES || '5', 10);
    const retryDelay = parseInt(process.env.DB_RETRY_DELAY || '2000', 10);
    
    await checkDatabaseConnection(maxRetries, retryDelay);
    
    // Initialize database schema
    console.log('\n=== Database Initialization ===');
    await initializeDatabase();
    
    // Start HTTP server
    console.log('\n=== Starting HTTP Server ===');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ BizMemory server running on port ${PORT}`);
      console.log(`  Mode: ${isDevelopment ? 'Development' : 'Production'}`);
      console.log(`  Listening on: 0.0.0.0:${PORT}`);
      if (!isDevelopment) {
        console.log(`  Serving frontend + backend API`);
      }
      console.log('\nServer ready!\n');
    });
    
    setupGracefulShutdown(server);
    
  } catch (error: any) {
    console.error('\n=== Server Startup Failed ===');
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
