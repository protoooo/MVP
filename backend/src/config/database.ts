import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

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
    database: process.env.DB_NAME || 'protocollm',
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
  for (let attempt = 1; attempt <= retries; attempt++) {
    let client = null;
    try {
      console.log(`Checking database connection (attempt ${attempt}/${retries})...`);
      client = await pool.connect();
      await client.query('SELECT NOW()');
      console.log('✓ Database connection successful');
      return;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error(
          `✗ Database connection refused (attempt ${attempt}/${retries}):\n` +
          `  Unable to connect to PostgreSQL`
        );
      } else {
        console.error(`✗ Database connection error (attempt ${attempt}/${retries}):`, error.message);
      }
      
      if (attempt < retries) {
        const waitTime = delayMs * Math.pow(1.5, attempt - 1);
        console.log(`  Retrying in ${Math.round(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw new Error(`Failed to connect to database after ${retries} attempts: ${error.message}`);
      }
    } finally {
      if (client) {
        try {
          client.release();
        } catch (e) {
          // Ignore release errors
        }
      }
    }
  }
}

export async function initializeDatabase(): Promise<void> {
  let client = null;
  
  try {
    console.log('Initializing database schema...');
    client = await pool.connect();
    
    // First check if schema exists (no transaction)
    const tableCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);

    if (parseInt(tableCheck.rows[0].count) > 0) {
      console.log('✓ Database schema already initialized');
      return;
    }

    console.log('Creating database schema...');
    
    // Now start transaction for creation
    await client.query('BEGIN');

    // Enable extensions
    console.log('  - Enabling extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Organizations
    console.log('  - Creating organizations table...');
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
    console.log('  - Creating users table...');
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
    console.log('  - Creating workspaces table...');
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
    console.log('  - Creating workspace_members table...');
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
    console.log('  - Creating files table...');
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

    // File content with pgvector
    console.log('  - Creating file_content table...');
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
    console.log('  - Creating file_metadata table...');
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
    console.log('  - Creating search_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        query TEXT,
        results_count INTEGER,
        searched_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    console.log('  - Creating indexes...');
    
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
    console.log('✓ Database schema created successfully');
    
    // Run additional migrations
    await runMigrations(client);
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (e) {
        // Ignore rollback errors
      }
    }
    console.error('✗ Database initialization failed:', error.message);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (e) {
        // Ignore release errors
      }
    }
  }
}

export async function runMigrations(client?: any): Promise<void> {
  const migrationClient = client || await pool.connect();
  const shouldRelease = !client;
  
  try {
    console.log('  - Running additional migrations...');
    
    // List of migrations to run in order
    const migrations = [
      'add_subscriptions_and_tos.sql',
      'fix_email_constraints.sql',
      'add_business_email_schema.sql',
      'add_invoicing_schema.sql',
      'add_customer_crm_schema.sql',
      'add_team_workspace_schema.sql'
    ];
    
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
      
      if (fs.existsSync(migrationPath)) {
        try {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          await migrationClient.query(migrationSQL);
          console.log(`  ✓ Migration completed: ${migrationFile}`);
        } catch (error: any) {
          console.error(`  ✗ Migration failed: ${migrationFile}`, error.message);
          // Continue with other migrations
        }
      }
    }
  } catch (error: any) {
    console.error('  ✗ Migration error:', error.message);
    // Don't throw - migrations are optional enhancements
  } finally {
    if (shouldRelease && migrationClient) {
      try {
        migrationClient.release();
      } catch (e) {
        // Ignore release errors
      }
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
