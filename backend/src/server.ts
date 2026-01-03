// backend/src/server.ts - COMPLETE SECURE VERSION
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import collectionsRoutes from './routes/collections';
import analyticsRoutes from './routes/analytics';
import apiKeysRoutes from './routes/apiKeys';
import subscriptionRoutes from './routes/subscription';
import webhooksRoutes from './routes/webhooks';
import emailRoutes from './routes/email';
import invoiceRoutes from './routes/invoices';
import customerRoutes from './routes/customers';
import teamRoutes from './routes/team';

dotenv.config();

const app = express();
// Backend port: Use BACKEND_PORT if set, otherwise fallback to PORT (for dev) or 3001
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || '3001', 10);
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log('='.repeat(60));
console.log('🚀 Starting ProtocolLM Server');
console.log('='.repeat(60));
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

// ========================================
// SECURITY VALIDATION
// ========================================
function validateSecurityConfig() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Critical checks
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }
  
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  
  if (!process.env.COHERE_API_KEY) {
    errors.push('COHERE_API_KEY is required');
  }

  // Warnings for missing optional but recommended configs
  if (!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
    warnings.push('Cloudflare Turnstile not configured - authentication security reduced');
  }
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push('Supabase not configured - using local file storage');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    errors.forEach(e => console.error(`   - ${e}`));
    throw new Error('Server configuration is invalid. Please check your .env file.');
  }

  console.log('✅ Security configuration validated\n');
}

validateSecurityConfig();

// ========================================
// SECURITY MIDDLEWARE
// ========================================
// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind
      scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.cohere.ai", process.env.SUPABASE_URL].filter(Boolean) as string[],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://challenges.cloudflare.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Cloudflare Turnstile
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Trust proxy (important for rate limiting and IP detection behind reverse proxies)
app.set('trust proxy', 1);

// ========================================
// CORS CONFIGURATION
// ========================================
const allowedOrigins = isDevelopment
  ? ['http://localhost:3000', 'http://localhost:3001']
  : [
      process.env.FRONTEND_URL,
      process.env.RAILWAY_STATIC_URL,
      'https://protocollm.org',
      'https://www.protocollm.org',
    ].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (isDevelopment) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 600, // 10 minutes
}));

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================
// Skip JSON parsing for webhooks route (it needs raw body)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks')) {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// REQUEST LOGGING (Development)
// ========================================
if (isDevelopment) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(
        `${req.method} ${req.path} ${statusColor}${res.statusCode}\x1b[0m ${duration}ms`
      );
    });
    next();
  });
}

// ========================================
// UPLOAD DIRECTORY SETUP
// ========================================
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✓ Created upload directory: ${uploadDir}`);
}

// ========================================
// API ROUTES
// ========================================
// Webhooks must be before body parsing middleware (they need raw body)
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/team', teamRoutes);

// ========================================
// HEALTH CHECK
// ========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ProtocolLM API',
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    features: {
      turnstile: !!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
      supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      cohere: !!process.env.COHERE_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// 404 HANDLER
// ========================================
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      method: req.method,
    });
  } else {
    next();
  }
});

// ========================================
// ERROR HANDLER
// ========================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Don't leak error details in production
  const errorMessage = isDevelopment
    ? err.message || 'Internal server error'
    : 'Internal server error';

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: errorMessage,
    ...(isDevelopment && { stack: err.stack }),
  });
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
function setupGracefulShutdown(server: any) {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('✓ HTTP server closed');

        // Close database connections
        try {
          await closeDatabasePool();
          console.log('✓ Database connections closed');
        } catch (error) {
          console.error('Error closing database:', error);
        }

        console.log('✓ Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// ========================================
// SERVER STARTUP
// ========================================
let httpServer: any = null;

async function startServer() {
  try {
    // 1. Check database connection
    console.log('\n=== Database Check ===');
    await checkDatabaseConnection(5, 2000);

    // 2. Initialize database schema
    console.log('\n=== Database Initialization ===');
    await initializeDatabase();

    // 3. Initialize Supabase storage (if configured)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n=== Supabase Storage Initialization ===');
      try {
        await supabaseStorageService.ensureBucketExists('protocollm-files');
        console.log('✓ Supabase storage ready');
      } catch (error: any) {
        console.warn('⚠️  Supabase storage initialization failed:', error.message);
        console.warn('   Continuing with local file storage');
      }
    }

    // 4. Start HTTP server
    console.log('\n=== Starting HTTP Server ===');
    httpServer = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n' + '='.repeat(60));
      console.log('✅ ProtocolLM Server Ready!');
      console.log('='.repeat(60));
      console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log('\n📋 Features:');
      console.log(`   ✓ JWT Authentication`);
      console.log(`   ${process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ? '✓' : '✗'} Cloudflare Turnstile`);
      console.log(`   ${process.env.SUPABASE_URL ? '✓' : '✗'} Supabase Storage`);
      console.log(`   ✓ Cohere Processing`);
      console.log(`   ✓ Rate Limiting`);
      console.log(`   ✓ Security Headers`);
      console.log('='.repeat(60) + '\n');
    });

    setupGracefulShutdown(httpServer);
  } catch (error: any) {
    console.error('\n❌ Startup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ========================================
// START THE SERVER
// ========================================
startServer();
