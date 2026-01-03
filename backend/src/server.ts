import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, checkDatabaseConnection, closeDatabasePool } from './config/database';
import { supabaseStorageService } from './services/supabaseService';

// Import all routes
import authRoutes from './routes/auth';
import filesRoutes from './routes/files';
import searchRoutes from './routes/search';
import conversationRoutes from './routes/conversation';
import reportsRoutes from './routes/reports';
import collectionsRoutes from './routes/collections'; // NEW
import analyticsRoutes from './routes/analytics'; // NEW
import apiKeysRoutes from './routes/apiKeys'; // NEW

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log('='.repeat(60));
console.log('🚀 Starting ProtocolLM - Enhanced Version');
console.log('='.repeat(60));
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

// Create upload directory
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✓ Created upload directory: ${uploadDir}`);
}

// Middleware
app.use(cors({
  origin: isDevelopment 
    ? '*' 
    : (process.env.FRONTEND_URL || process.env.RAILWAY_STATIC_URL || 'https://protocollm.org'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ===== API Routes =====
// Auth routes
app.use('/api/auth', authRoutes);

// File management routes
app.use('/api/files', filesRoutes);

// Search routes
app.use('/api/search', searchRoutes);

// Conversational search routes
app.use('/api/conversation', conversationRoutes);

// Report generation routes
app.use('/api/reports', reportsRoutes);

// 🆕 Collections/Folders routes
app.use('/api/collections', collectionsRoutes);

// 🆕 Analytics routes
app.use('/api/analytics', analyticsRoutes);

// 🆕 API Keys management routes
app.use('/api/api-keys', apiKeysRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ProtocolLM API',
    version: '2.0.0', // Updated version
    features: [
      'Collections',
      'Analytics',
      'API Keys',
      'Conversational Search',
      'Advanced Search',
      'File Management',
      'Report Generation'
    ],
    timestamp: new Date().toISOString() 
  });
});

// Production: Integrate with Next.js  
if (!isDevelopment) {
  const next = require('next');
  
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname, '../..'),
    customServer: true,
  });
  
  const handle = nextApp.getRequestHandler();
  (global as any).nextApp = nextApp;
  (global as any).nextHandle = handle;
}

// Fallback routes
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
        <title>ProtocolLM - Unlimited Intelligent Document Storage</title>
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
            max-width: 700px;
            width: 100%;
            background: #161B22;
            border: 1px solid #30363D;
            border-radius: 12px;
            padding: 60px 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }
          h1 {
            color: #E6EDF3;
            font-size: 2.5rem;
            margin-bottom: 16px;
          }
          .brand { color: #3ECF8E; }
          .subtitle { color: #7D8590; margin-bottom: 32px; font-size: 1.1rem; }
          .features {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 32px 0;
          }
          .feature {
            background: #1C2128;
            border: 1px solid #30363D;
            padding: 12px;
            border-radius: 8px;
            font-size: 0.875rem;
            color: #7D8590;
          }
          .feature::before {
            content: '✓';
            color: #3ECF8E;
            margin-right: 8px;
            font-weight: bold;
          }
          .status {
            color: #3ECF8E;
            font-weight: 600;
            font-size: 1.2rem;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>protocol<span class="brand">LM</span></h1>
          <p class="subtitle">✨ Enhanced Version with Collections & Analytics</p>
          
          <div class="features">
            <div class="feature">Collections/Folders</div>
            <div class="feature">Usage Analytics</div>
            <div class="feature">API Access</div>
            <div class="feature">Conversational Search</div>
            <div class="feature">Advanced Filters</div>
            <div class="feature">Bulk Operations</div>
          </div>
          
          <p class="status">✅ Backend is running successfully!</p>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #30363D; color: #7D8590; font-size: 0.875rem;">
            <p>Powered by Cohere AI • Supabase • PostgreSQL with pgvector</p>
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

let httpServer: any = null;

function startHTTPServer() {
  httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ ProtocolLM Enhanced Server Ready!');
    console.log('='.repeat(60));
    console.log(`🌐 HTTP server running on port ${PORT}`);
    console.log(`📡 Listening on 0.0.0.0:${PORT}`);
    console.log(`🔗 API available at http://localhost:${PORT}/api`);
    console.log('\n🎉 New Features Available:');
    console.log('   - Collections/Folders for organization');
    console.log('   - Analytics Dashboard');
    console.log('   - API Key Management');
    console.log('   - Enhanced Conversational Search');
    console.log('='.repeat(60) + '\n');
  });
  
  setupGracefulShutdown(httpServer);
}

async function startServer() {
  try {
    console.log('\n=== Database Check ===');
    await checkDatabaseConnection(5, 2000);
    
    console.log('\n=== Database Init ===');
    await initializeDatabase();
    
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n=== Supabase Storage Init ===');
      try {
        await supabaseStorageService.ensureBucketExists('protocollm-files');
      } catch (error: any) {
        console.warn('⚠️  Could not initialize Supabase bucket:', error.message);
      }
    } else {
      console.log('\n⚠️  WARNING: Supabase credentials not found!');
    }
    
    console.log('\n=== Server Initialization ===');
    
    if (!isDevelopment) {
      const nextApp = (global as any).nextApp;
      const handle = (global as any).nextHandle;
      
      if (nextApp && handle) {
        try {
          await nextApp.prepare();
          console.log('✓ Next.js app ready');
          
          app.use('/_next', express.static(path.join(__dirname, '../../.next')));
          app.use('/static', express.static(path.join(__dirname, '../../public')));
          
          app.all('*', (req, res) => {
            return handle(req, res);
          });
        } catch (err: any) {
          console.error('Failed to initialize Next.js:', err);
          console.log('Falling back to basic routing');
          setupFallbackRoutes();
        }
      } else {
        setupFallbackRoutes();
      }
      startHTTPServer();
    } else {
      setupFallbackRoutes();
      startHTTPServer();
    }
    
  } catch (error: any) {
    console.error('\n✗ Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
