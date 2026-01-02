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
        max_storage BIGINT DEFAULT 53687091200, -- 50GB in bytes
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

    // Add organization_id column if it doesn't exist
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

    // Add foreign key constraint for users.organization_id if it doesn't exist
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

    // Workspaces (team folders) - create without created_by foreign key first
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

    // Add organization_id column if it doesn't exist
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

    // Add created_by column if it doesn't exist
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

    // Add foreign key constraints for workspaces if they don't exist
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

    // Workspace members
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

    // Add workspace_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspace_members' AND column_name = 'workspace_id'
        ) THEN
          ALTER TABLE workspace_members ADD COLUMN workspace_id INTEGER;
        END IF;
      END $$;
    `);

    // Add user_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
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

    // Clean up orphaned workspace_members records before adding foreign key
    console.log('Cleaning up orphaned workspace_members records...');
    const cleanupResult1 = await client.query(`
      DELETE FROM workspace_members wm
      WHERE wm.workspace_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = wm.workspace_id)
    `);
    if (cleanupResult1.rowCount && cleanupResult1.rowCount > 0) {
      console.log(`  Removed ${cleanupResult1.rowCount} workspace_members records with invalid workspace_id`);
    }
    
    const cleanupResult2 = await client.query(`
      DELETE FROM workspace_members wm
      WHERE wm.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = wm.user_id)
    `);
    if (cleanupResult2.rowCount && cleanupResult2.rowCount > 0) {
      console.log(`  Removed ${cleanupResult2.rowCount} workspace_members records with invalid user_id`);
    }

    // Add foreign key constraints for workspace_members if they don't exist
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

    // Files
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

    // Add user_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'files' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE files ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

    // Add organization_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'files' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE files ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    // Add workspace_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'files' AND column_name = 'workspace_id'
        ) THEN
          ALTER TABLE files ADD COLUMN workspace_id INTEGER;
        END IF;
      END $$;
    `);

    // Add foreign key constraints for files if they don't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'files_user_id_fkey'
        ) THEN
          ALTER TABLE files 
          ADD CONSTRAINT files_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'files_organization_id_fkey'
        ) THEN
          ALTER TABLE files 
          ADD CONSTRAINT files_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'files_workspace_id_fkey'
        ) THEN
          ALTER TABLE files 
          ADD CONSTRAINT files_workspace_id_fkey 
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // File permissions (granular access control)
    console.log('Creating file_permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_permissions (
        id SERIAL PRIMARY KEY,
        file_id INTEGER,
        user_id INTEGER,
        permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('owner', 'edit', 'view', 'none')),
        granted_by INTEGER,
        granted_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add file_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'file_permissions' AND column_name = 'file_id'
        ) THEN
          ALTER TABLE file_permissions ADD COLUMN file_id INTEGER;
        END IF;
      END $$;
    `);

    // Add user_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'file_permissions' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE file_permissions ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

    // Add granted_by column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'file_permissions' AND column_name = 'granted_by'
        ) THEN
          ALTER TABLE file_permissions ADD COLUMN granted_by INTEGER;
        END IF;
      END $$;
    `);

    // Add constraints for file_permissions if they don't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'file_permissions_file_id_user_id_key'
        ) THEN
          ALTER TABLE file_permissions 
          ADD CONSTRAINT file_permissions_file_id_user_id_key 
          UNIQUE(file_id, user_id);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'file_permissions_file_id_fkey'
        ) THEN
          ALTER TABLE file_permissions 
          ADD CONSTRAINT file_permissions_file_id_fkey 
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'file_permissions_user_id_fkey'
        ) THEN
          ALTER TABLE file_permissions 
          ADD CONSTRAINT file_permissions_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'file_permissions_granted_by_fkey'
        ) THEN
          ALTER TABLE file_permissions 
          ADD CONSTRAINT file_permissions_granted_by_fkey 
          FOREIGN KEY (granted_by) REFERENCES users(id);
        END IF;
      END $$;
    `);

    // File content
    console.log('Creating file_content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_content (
        id SERIAL PRIMARY KEY,
        file_id INTEGER,
        extracted_text TEXT,
        text_embedding vector(1536),
        image_analysis JSONB,
        ocr_confidence FLOAT,
        processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add file_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'file_content' AND column_name = 'file_id'
        ) THEN
          ALTER TABLE file_content ADD COLUMN file_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'file_content_file_id_fkey'
        ) THEN
          ALTER TABLE file_content 
          ADD CONSTRAINT file_content_file_id_fkey 
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // File metadata
    console.log('Creating file_metadata table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id SERIAL PRIMARY KEY,
        file_id INTEGER,
        category VARCHAR(100),
        tags TEXT[],
        detected_entities JSONB,
        ai_description TEXT,
        confidence_score FLOAT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add file_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'file_metadata' AND column_name = 'file_id'
        ) THEN
          ALTER TABLE file_metadata ADD COLUMN file_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'file_metadata_file_id_fkey'
        ) THEN
          ALTER TABLE file_metadata 
          ADD CONSTRAINT file_metadata_file_id_fkey 
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // === AUDIT & COMPLIANCE TABLES ===
    
    // Audit logs (immutable)
    console.log('Creating audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INTEGER,
        ip_address INET,
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add organization_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'audit_logs' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE audit_logs ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    // Add user_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'audit_logs' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE audit_logs ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'audit_logs_organization_id_fkey'
        ) THEN
          ALTER TABLE audit_logs 
          ADD CONSTRAINT audit_logs_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'audit_logs_user_id_fkey'
        ) THEN
          ALTER TABLE audit_logs 
          ADD CONSTRAINT audit_logs_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Data encryption keys (for encryption at rest)
    console.log('Creating encryption_keys table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER,
        key_id UUID DEFAULT uuid_generate_v4(),
        encrypted_key TEXT NOT NULL,
        algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        rotated_at TIMESTAMP
      )
    `);

    // Add organization_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'encryption_keys' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE encryption_keys ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'encryption_keys_organization_id_fkey'
        ) THEN
          ALTER TABLE encryption_keys 
          ADD CONSTRAINT encryption_keys_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // === JOB QUEUE TABLES (for batch processing) ===
    
    // Processing queue
    console.log('Creating processing_queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS processing_queue (
        id SERIAL PRIMARY KEY,
        job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('embed', 'ocr', 'analyze', 'reindex')),
        file_id INTEGER,
        priority INTEGER DEFAULT 5,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error_message TEXT,
        scheduled_at TIMESTAMP DEFAULT NOW(),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add file_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'processing_queue' AND column_name = 'file_id'
        ) THEN
          ALTER TABLE processing_queue ADD COLUMN file_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'processing_queue_file_id_fkey'
        ) THEN
          ALTER TABLE processing_queue 
          ADD CONSTRAINT processing_queue_file_id_fkey 
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Search cache
    console.log('Creating search_cache table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_cache (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER,
        query_hash VARCHAR(64) UNIQUE NOT NULL,
        query_text TEXT NOT NULL,
        result_ids INTEGER[],
        hit_count INTEGER DEFAULT 1,
        last_accessed TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add organization_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'search_cache' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE search_cache ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'search_cache_organization_id_fkey'
        ) THEN
          ALTER TABLE search_cache 
          ADD CONSTRAINT search_cache_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Search logs
    console.log('Creating search_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        organization_id INTEGER,
        query TEXT,
        results_count INTEGER,
        clicked_file_id INTEGER,
        search_duration_ms INTEGER,
        used_cache BOOLEAN DEFAULT false,
        searched_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add user_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'search_logs' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE search_logs ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

    // Add organization_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'search_logs' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE search_logs ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    // Add clicked_file_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'search_logs' AND column_name = 'clicked_file_id'
        ) THEN
          ALTER TABLE search_logs ADD COLUMN clicked_file_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'search_logs_user_id_fkey'
        ) THEN
          ALTER TABLE search_logs 
          ADD CONSTRAINT search_logs_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'search_logs_organization_id_fkey'
        ) THEN
          ALTER TABLE search_logs 
          ADD CONSTRAINT search_logs_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'search_logs_clicked_file_id_fkey'
        ) THEN
          ALTER TABLE search_logs 
          ADD CONSTRAINT search_logs_clicked_file_id_fkey 
          FOREIGN KEY (clicked_file_id) REFERENCES files(id);
        END IF;
      END $$;
    `);

    // === API & SSO TABLES ===
    
    // API keys
    console.log('Creating api_keys table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER,
        user_id INTEGER,
        name VARCHAR(255) NOT NULL,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        key_prefix VARCHAR(20) NOT NULL,
        permissions JSONB DEFAULT '{"read": true, "write": false, "delete": false}',
        last_used TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add organization_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'api_keys' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE api_keys ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    // Add user_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'api_keys' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE api_keys ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'api_keys_organization_id_fkey'
        ) THEN
          ALTER TABLE api_keys 
          ADD CONSTRAINT api_keys_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'api_keys_user_id_fkey'
        ) THEN
          ALTER TABLE api_keys 
          ADD CONSTRAINT api_keys_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // SSO configurations
    console.log('Creating sso_configurations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sso_configurations (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER,
        provider VARCHAR(50) NOT NULL CHECK (provider IN ('saml', 'oauth', 'oidc')),
        metadata JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add organization_id column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'sso_configurations' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE sso_configurations ADD COLUMN organization_id INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'sso_configurations_organization_id_fkey'
        ) THEN
          ALTER TABLE sso_configurations 
          ADD CONSTRAINT sso_configurations_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // === INDEXES ===
    
    console.log('Creating database indexes...');
    
    // Vector search index
    await client.query(`
      CREATE INDEX IF NOT EXISTS file_content_text_embedding_idx 
      ON file_content USING ivfflat (text_embedding vector_cosine_ops) 
      WITH (lists = 100)
    `);

    // File indexes
    await client.query('CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS files_organization_id_idx ON files(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS files_workspace_id_idx ON files(workspace_id)');
    await client.query('CREATE INDEX IF NOT EXISTS files_uploaded_at_idx ON files(uploaded_at)');
    await client.query('CREATE INDEX IF NOT EXISTS files_is_deleted_idx ON files(is_deleted) WHERE is_deleted = false');
    
    // Metadata indexes
    await client.query('CREATE INDEX IF NOT EXISTS file_metadata_tags_idx ON file_metadata USING GIN(tags)');
    await client.query('CREATE INDEX IF NOT EXISTS file_metadata_category_idx ON file_metadata(category)');
    
    // Audit logs indexes
    await client.query('CREATE INDEX IF NOT EXISTS audit_logs_org_id_idx ON audit_logs(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action)');
    
    // Queue indexes
    await client.query('CREATE INDEX IF NOT EXISTS processing_queue_status_idx ON processing_queue(status) WHERE status = \'pending\'');
    await client.query('CREATE INDEX IF NOT EXISTS processing_queue_priority_idx ON processing_queue(priority, scheduled_at)');
    
    // Cache indexes
    await client.query('CREATE INDEX IF NOT EXISTS search_cache_org_id_idx ON search_cache(organization_id)');
    await client.query('CREATE INDEX IF NOT EXISTS search_cache_expires_at_idx ON search_cache(expires_at)');

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
