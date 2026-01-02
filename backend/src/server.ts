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

// FIXED: Parse PORT as integer and use Railway's PORT variable first
const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BizMemory API is running' });
});

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
    
    // Start HTTP server - FIXED: Bind to 0.0.0.0 for Railway
    console.log('\n=== Starting HTTP Server ===');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ BizMemory API server running on port ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
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
