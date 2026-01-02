import { Pool, PoolConfig } from 'pg';

// Validate required database environment variables
function validateDatabaseConfig(): void {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure DATABASE_URL is set.\n' +
      'Example: DATABASE_URL=postgresql://user:password@localhost:5432/bizmemory'
    );
  }
}

// Parse DATABASE_URL or construct from individual components
function getDatabaseConfig(): PoolConfig {
  // Support both DATABASE_URL and individual components for flexibility
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      // Connection pool settings
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
    };
  }
  
  // Fallback to individual components (useful for Docker Compose)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'bizmemory',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  };
}

// Validate configuration on module load
validateDatabaseConfig();

const pool = new Pool(getDatabaseConfig());

// Error handling for pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

pool.on('connect', () => {
  console.log('New database client connected to pool');
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();

/**
 * Check database connection health
 * @param retries Number of retry attempts
 * @param delayMs Initial delay between retries in milliseconds
 * @returns Promise that resolves when connection is successful
 */
export async function checkDatabaseConnection(
  retries: number = 5,
  delayMs: number = 2000
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Checking database connection (attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      
      // Test query
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('✓ Database connection successful');
      return;
    } catch (error: any) {
      lastError = error;
      
      if (error.code === 'ECONNREFUSED') {
        console.error(
          `✗ Database connection refused (attempt ${attempt}/${retries}):\n` +
          `  Unable to connect to PostgreSQL at ${error.address}:${error.port}\n` +
          `  Please ensure:\n` +
          `  1. PostgreSQL is running\n` +
          `  2. The connection details in your .env file are correct\n` +
          `  3. PostgreSQL is accepting connections on the specified host/port\n` +
          `\n` +
          `  For local development, you can use Docker Compose:\n` +
          `    docker-compose up -d postgres\n` +
          `\n` +
          `  Or install PostgreSQL locally:\n` +
          `    https://www.postgresql.org/download/`
        );
      } else if (error.code === 'ENOTFOUND') {
        console.error(
          `✗ Database host not found (attempt ${attempt}/${retries}):\n` +
          `  Cannot resolve database host: ${error.hostname}\n` +
          `  Check your DATABASE_URL or DB_HOST environment variable`
        );
      } else if (error.code === '28P01') {
        console.error(
          `✗ Database authentication failed (attempt ${attempt}/${retries}):\n` +
          `  Invalid username or password\n` +
          `  Check your database credentials in the .env file`
        );
      } else if (error.code === '3D000') {
        console.error(
          `✗ Database does not exist (attempt ${attempt}/${retries}):\n` +
          `  Database "${error.message}" does not exist\n` +
          `  Create it with: CREATE DATABASE bizmemory;`
        );
      } else {
        console.error(
          `✗ Database connection error (attempt ${attempt}/${retries}):`,
          error.message
        );
      }
      
      if (attempt < retries) {
        const waitTime = delayMs * Math.pow(1.5, attempt - 1); // Exponential backoff
        console.log(`  Retrying in ${Math.round(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  throw new Error(
    `Failed to connect to database after ${retries} attempts.\n` +
    `Last error: ${lastError?.message || 'Unknown error'}\n\n` +
    `Troubleshooting steps:\n` +
    `1. Check if PostgreSQL is running:\n` +
    `   - Using Docker: docker-compose ps\n` +
    `   - Local install: pg_isready or check system services\n` +
    `2. Verify your .env file has correct DATABASE_URL\n` +
    `3. For Docker setup, run: docker-compose up -d postgres\n` +
    `4. Check PostgreSQL logs for errors\n`
  );
}

/**
 * Initialize database schema with all required tables and extensions
 * @throws Error if initialization fails after retries
 */
export async function initializeDatabase(): Promise<void> {
  let client;
  
  try {
    console.log('Acquiring database client for initialization...');
    client = await getClient();
    
    console.log('Starting database schema initialization...');
    await client.query('BEGIN');

    // Enable pgvector extension
    console.log('Enabling pgvector extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    } catch (error: any) {
      if (error.code === '58P01') { // undefined_file
        throw new Error(
          'pgvector extension is not available. Please install it:\n' +
          '  - For PostgreSQL in Docker: Use postgres:16 image with pgvector\n' +
          '  - For local PostgreSQL: https://github.com/pgvector/pgvector#installation'
        );
      }
      throw error;
    }

    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        business_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create files table
    console.log('Creating files table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        original_filename VARCHAR(500),
        stored_filename VARCHAR(500),
        file_type VARCHAR(50),
        file_size BIGINT,
        storage_path TEXT,
        thumbnail_path TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP
      )
    `);

    // Create file_content table with vector embeddings (1536 dimensions for Cohere Embed v4)
    console.log('Creating file_content table with vector support...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_content (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        extracted_text TEXT,
        text_embedding vector(1536),
        image_analysis JSONB,
        ocr_confidence FLOAT
      )
    `);

    // Create file_metadata table
    console.log('Creating file_metadata table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        category VARCHAR(100),
        tags TEXT[],
        detected_entities JSONB,
        ai_description TEXT,
        confidence_score FLOAT
      )
    `);

    // Create search_logs table
    console.log('Creating search_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        query TEXT,
        results_count INTEGER,
        clicked_file_id INTEGER REFERENCES files(id),
        searched_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    console.log('Creating database indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS file_content_text_embedding_idx 
      ON file_content USING ivfflat (text_embedding vector_cosine_ops) 
      WITH (lists = 100)
    `);

    await client.query('CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS files_uploaded_at_idx ON files(uploaded_at)');
    await client.query('CREATE INDEX IF NOT EXISTS file_metadata_tags_idx ON file_metadata USING GIN(tags)');
    await client.query('CREATE INDEX IF NOT EXISTS file_metadata_category_idx ON file_metadata(category)');

    await client.query('COMMIT');
    console.log('✓ Database schema initialized successfully');
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {
        // Ignore rollback errors if connection is already closed
      });
    }
    
    console.error('✗ Database initialization failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('pgvector')) {
      throw error; // Already has helpful message
    } else if (error.code === '42P07') {
      // Duplicate table - this is actually OK, tables already exist
      console.log('Tables already exist, continuing...');
      return;
    }
    
    throw new Error(
      `Failed to initialize database schema: ${error.message}\n` +
      'Check the database logs for more details.'
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gracefully close all database connections
 */
export async function closeDatabasePool(): Promise<void> {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error: any) {
    console.error('Error closing database pool:', error.message);
  }
}

export default pool;
