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

    // === CORE TABLES ===
    
    // Organizations/Workspaces
    console.log('Creating organizations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        plan VARCHAR(50) DEFAULT 'personal' CHECK (plan IN ('personal', 'business', 'enterprise')),
        max_users INTEGER DEFAULT 1,
        max_storage BIGINT DEFAULT 53687091200,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Users - create without foreign keys first
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        organization_id INTEGER,
        role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE users ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'users_organization_id_fkey'
        ) THEN
          ALTER TABLE users 
          ADD CONSTRAINT users_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Workspaces
    console.log('Creating workspaces table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT false,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspaces' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE workspaces ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspaces' AND column_name = 'created_by'
        ) THEN
          ALTER TABLE workspaces ADD COLUMN created_by INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'workspaces_organization_id_fkey'
        ) THEN
          ALTER TABLE workspaces 
          ADD CONSTRAINT workspaces_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'workspaces_created_by_fkey'
        ) THEN
          ALTER TABLE workspaces 
          ADD CONSTRAINT workspaces_created_by_fkey 
          FOREIGN KEY (created_by) REFERENCES users(id);
        END IF;
      END $$;
    `);

    // Workspace members - FIX TYPE ISSUES BEFORE CLEANUP
    console.log('Creating workspace_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER,
        user_id INTEGER,
        permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('owner', 'edit', 'view')),
        added_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // FIX: Ensure workspace_id and user_id are INTEGER type
    console.log('Fixing workspace_members column types...');
    await client.query(`
      DO $$ 
      BEGIN
        -- Fix workspace_id type
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'workspace_members' 
            AND column_name = 'workspace_id'
            AND data_type != 'integer'
        ) THEN
          ALTER TABLE workspace_members DROP COLUMN workspace_id CASCADE;
          ALTER TABLE workspace_members ADD COLUMN workspace_id INTEGER;
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspace_members' AND column_name = 'workspace_id'
        ) THEN
          ALTER TABLE workspace_members ADD COLUMN workspace_id INTEGER;
        END IF;

        -- Fix user_id type
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'workspace_members' 
            AND column_name = 'user_id'
            AND data_type != 'integer'
        ) THEN
          ALTER TABLE workspace_members DROP COLUMN user_id CASCADE;
          ALTER TABLE workspace_members ADD COLUMN user_id INTEGER;
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspace_members' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE workspace_members ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

    // Add unique constraint if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'workspace_members_workspace_id_user_id_key'
        ) THEN
          ALTER TABLE workspace_members 
          ADD CONSTRAINT workspace_members_workspace_id_user_id_key 
          UNIQUE(workspace_id, user_id);
        END IF;
      END $$;
    `);

    // NOW safe to clean up orphaned records
    console.log('Cleaning up orphaned workspace_members records...');
    const cleanupResult1 = await client.query(`
      DELETE FROM workspace_members
      WHERE workspace_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id)
    `);
    if (cleanupResult1.rowCount !== null && cleanupResult1.rowCount > 0) {
      console.log(`  Removed ${cleanupResult1.rowCount} workspace_members records with invalid workspace_id`);
    }
    
    const cleanupResult2 = await client.query(`
      DELETE FROM workspace_members
      WHERE user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM users WHERE id = workspace_members.user_id)
    `);
    if (cleanupResult2.rowCount !== null && cleanupResult2.rowCount > 0) {
      console.log(`  Removed ${cleanupResult2.rowCount} workspace_members records with invalid user_id`);
    }

    // Add foreign key constraints
    console.log('Adding workspace_members foreign key constraints...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'workspace_members_workspace_id_fkey'
        ) THEN
          ALTER TABLE workspace_members 
          ADD CONSTRAINT workspace_members_workspace_id_fkey 
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'workspace_members_user_id_fkey'
        ) THEN
          ALTER TABLE workspace_members 
          ADD CONSTRAINT workspace_members_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Files table
    console.log('Creating files table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        organization_id INTEGER,
        workspace_id INTEGER,
        original_filename VARCHAR(500),
        stored_filename VARCHAR(500),
        file_type VARCHAR(50),
        file_size BIGINT,
        storage_path TEXT,
        thumbnail_path TEXT,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add missing columns to files table
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'files' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE files ADD COLUMN user_id INTEGER;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'files' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE files ADD COLUMN organization_id INTEGER;
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'files' AND column_name = 'workspace_id'
        ) THEN
          ALTER TABLE files ADD COLUMN workspace_id INTEGER;
        END IF;
      END $$;
    `);

    // Add foreign keys for files
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_user_id_fkey') THEN
          ALTER TABLE files ADD CONSTRAINT files_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_organization_id_fkey') THEN
          ALTER TABLE files ADD CONSTRAINT files_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_workspace_id_fkey') THEN
          ALTER TABLE files ADD CONSTRAINT files_workspace_id_fkey 
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // File content table
    console.log('Creating file_content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_content (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        extracted_text TEXT,
        text_embedding vector(1536),
        image_analysis JSONB,
        ocr_confidence FLOAT,
        processing_status VARCHAR(50) DEFAULT 'pending',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // File metadata table
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

    // Indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS file_content_text_embedding_idx 
      ON file_content USING ivfflat (text_embedding vector_cosine_ops) 
      WITH (lists = 100)
    `);

    await client.query('CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS file_metadata_tags_idx ON file_metadata USING GIN(tags)');
    await client.query('CREATE INDEX IF NOT EXISTS search_logs_user_id_idx ON search_logs(user_id)');

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
