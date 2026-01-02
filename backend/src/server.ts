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

// API Routes FIRST - before any static file serving
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BizMemory API is running', timestamp: new Date().toISOString() });
});

// Production: Serve Next.js
if (!isDevelopment) {
  try {
    // Try to import the standalone Next.js server
    const standaloneDir = path.join(__dirname, '../../.next/standalone');
    const nextServerPath = path.join(standaloneDir, 'server.js');
    
    console.log('Looking for Next.js standalone at:', standaloneDir);
    
    // Serve static files
    app.use('/_next/static', express.static(path.join(__dirname, '../../.next/static')));
    app.use('/static', express.static(path.join(__dirname, '../../public')));
    
    // Simple fallback: serve a static HTML page for now
    app.get('*', (req, res) => {
      // Already handled by API routes above
      if (req.path.startsWith('/api/') || req.path === '/health') {
        return res.status(404).json({ error: 'Route not found' });
      }
      
      // Serve a simple loading page that uses the API
      res.send(`
        <!DOCTYPE html>
        <html lang="en" class="dark">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>BizMemory - Loading...</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #0D1117 0%, #1C2128 100%);
              color: #E6EDF3;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-center;
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
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid #3ECF8E20;
              border-top-color: #3ECF8E;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 32px auto;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            p { color: #7D8590; margin-bottom: 12px; line-height: 1.6; }
            .error { color: #F85149; margin-top: 24px; display: none; }
            .success { color: #3ECF8E; }
            a { color: #58A6FF; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 BizMemory</h1>
            <p>AI-Powered File Storage</p>
            <div class="spinner"></div>
            <p id="status">Initializing application...</p>
            <p class="error" id="error"></p>
            <p style="margin-top: 32px; font-size: 0.875rem;">
              Backend API: <span class="success">Running</span><br>
              <a href="/health">Health Check</a>
            </p>
          </div>
          <script>
            // Check API health
            fetch('/health')
              .then(r => r.json())
              .then(data => {
                document.getElementById('status').textContent = 'API Status: ' + data.status;
                document.getElementById('status').className = 'success';
                
                // Redirect to login after a moment
                setTimeout(() => {
                  window.location.href = '/login';
                }, 1500);
              })
              .catch(err => {
                document.getElementById('error').textContent = 'Error: ' + err.message;
                document.getElementById('error').style.display = 'block';
                document.querySelector('.spinner').style.display = 'none';
              });
          </script>
        </body>
        </html>
      `);
    });
    
  } catch (err) {
    console.error('Error setting up Next.js:', err);
  }
  
} else {
  // Development: Show API info
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BizMemory API - Development</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: system-ui, sans-serif;
            background: linear-gradient(135deg, #0D1117 0%, #1C2128 100%);
            color: #E6EDF3;
            padding: 40px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #161B22;
            padding: 40px;
            border-radius: 12px;
            border: 1px solid #30363D;
          }
          h1 { color: #3ECF8E; margin-bottom: 20px; }
          p { color: #7D8590; margin-bottom: 12px; line-height: 1.6; }
          code { background: #21262D; color: #3ECF8E; padding: 4px 8px; border-radius: 4px; }
          .warning { background: #FFA50020; border: 1px solid #FFA50040; color: #FFA500; padding: 16px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 BizMemory API</h1>
          <p><strong>Development Mode</strong></p>
          <div class="warning">
            ⚠️ Run <code>npm run dev:frontend</code> in another terminal for the frontend.
          </div>
          <p>Backend running on port ${PORT}</p>
          <p>API: <code>/api/*</code></p>
          <p>Health: <code>/health</code></p>
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
      console.log(`\n${signal} received, shutting down...`);
      server.close(async () => {
        await closeDatabasePool();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    });
  });
}

// Start server
async function startServer() {
  try {
    console.log('\nStarting BizMemory...');
    console.log('=== Database Check ===');
    await checkDatabaseConnection(5, 2000);
    
    console.log('\n=== Database Init ===');
    await initializeDatabase();
    
    console.log('\n=== Starting Server ===');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Mode: ${isDevelopment ? 'Development' : 'Production'}`);
      console.log('\nReady!\n');
    });
    
    setupGracefulShutdown(server);
  } catch (error: any) {
    console.error('\n✗ Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
