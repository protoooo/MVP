import { Pool, PoolConfig } from 'pg';

function validateDatabaseConfig(): void {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure DATABASE_URL is set.'
    );
  }
}

function getDatabaseConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
    };
  }
  
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

validateDatabaseConfig();

const pool = new Pool(getDatabaseConfig());

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('New database client connected to pool');
  }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();

export async function checkDatabaseConnection(
  retries: number = 5,
  delayMs: number = 2000
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Checking database connection (attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✓ Database connection successful');
      return;
    } catch (error: any) {
      lastError = error;
      
      if (error.code === 'ECONNREFUSED') {
        console.error(
          `✗ Database connection refused (attempt ${attempt}/${retries}):\n` +
          `  Unable to connect to PostgreSQL at ${error.address}:${error.port}`
        );
      } else {
        console.error(`✗ Database connection error (attempt ${attempt}/${retries}):`, error.message);
      }
      
      if (attempt < retries) {
        const waitTime = delayMs * Math.pow(1.5, attempt - 1);
        console.log(`  Retrying in ${Math.round(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed to connect to database after ${retries} attempts.`);
}

export async function initializeDatabase(): Promise<void> {
  let client;
  
  try {
    console.log('Acquiring database client for initialization...');
    client = await getClient();
    
    console.log('Starting database schema initialization...');
    await client.query('BEGIN');

    // Enable extensions
    console.log('Enabling pgvector extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // === CRITICAL FIX: Drop problematic tables if they have UUID type issues ===
    console.log('Checking for UUID type conflicts in core tables...');
    
    // Check if we have UUID type issues and drop/recreate if needed
    const tableCheck = await client.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
        AND t.table_name IN ('organizations', 'users', 'workspaces', 'workspace_members', 'files')
        AND c.column_name IN ('id', 'user_id', 'organization_id', 'workspace_id', 'created_by')
        AND c.data_type = 'uuid'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('⚠️  Found UUID type conflicts. Resetting schema...');
      console.log('  Affected tables:', tableCheck.rows.map(r => `${r.table_name}.${r.column_name}`).join(', '));
      
      // Drop all tables in correct order (reverse of dependencies)
      await client.query('DROP TABLE IF EXISTS search_logs CASCADE');
      await client.query('DROP TABLE IF EXISTS file_metadata CASCADE');
      await client.query('DROP TABLE IF EXISTS file_content CASCADE');
      await client.query('DROP TABLE IF EXISTS files CASCADE');
      await client.query('DROP TABLE IF EXISTS workspace_members CASCADE');
      await client.query('DROP TABLE IF EXISTS workspaces CASCADE');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
      await client.query('DROP TABLE IF EXISTS organizations CASCADE');
      
      console.log('✓ Dropped conflicting tables');
    }

    // === CREATE CORE TABLES ===
    
    // Organizations
    console.log('Creating organizations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        plan VARCHAR(50) DEFAULT 'personal',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Users
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        business_name VARCHAR(255),
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Workspaces
    console.log('Creating workspaces table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Workspace members
    console.log('Creating workspace_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(50) DEFAULT 'view',
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(workspace_id, user_id)
      )
    `);

    // Files
    console.log('Creating files table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
        original_filename VARCHAR(500),
        stored_filename VARCHAR(500),
        file_type VARCHAR(50),
        file_size BIGINT,
        storage_path TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // File content
    console.log('Creating file_content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_content (
        id SERIAL PRIMARY KEY,
        file_id INTEGER UNIQUE REFERENCES files(id) ON DELETE CASCADE,
        extracted_text TEXT,
        text_embedding vector(1536),
        image_analysis JSONB,
        ocr_confidence FLOAT,
        processing_status VARCHAR(50) DEFAULT 'pending',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // File metadata
    console.log('Creating file_metadata table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id SERIAL PRIMARY KEY,
        file_id INTEGER UNIQUE REFERENCES files(id) ON DELETE CASCADE,
        category VARCHAR(100),
        tags TEXT[],
        detected_entities JSONB,
        ai_description TEXT,
        confidence_score FLOAT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Search logs
    console.log('Creating search_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        query TEXT,
        results_count INTEGER,
        searched_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // === CREATE INDEXES ===
    console.log('Creating indexes...');
    
    // Vector search index
    await client.query(`
      CREATE INDEX IF NOT EXISTS file_content_text_embedding_idx 
      ON file_content USING ivfflat (text_embedding vector_cosine_ops) 
      WITH (lists = 100)
    `);

    // Regular indexes
    await client.query('CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS files_organization_id_idx ON files(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS files_uploaded_at_idx ON files(uploaded_at)');
    await client.query('CREATE INDEX IF NOT EXISTS file_metadata_tags_idx ON file_metadata USING GIN(tags)');
    await client.query('CREATE INDEX IF NOT EXISTS file_metadata_category_idx ON file_metadata(category)');
    await client.query('CREATE INDEX IF NOT EXISTS search_logs_user_id_idx ON search_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS search_logs_searched_at_idx ON search_logs(searched_at)');

    await client.query('COMMIT');
    console.log('✓ Database schema initialized successfully');
  } catch (error: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('✗ Database initialization failed:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function closeDatabasePool(): Promise<void> {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error: any) {
    console.error('Error closing database pool:', error.message);
  }
}

export default pool;
