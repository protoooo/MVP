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

    // Users
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Workspaces (team folders)
    console.log('Creating workspaces table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Workspace members
    console.log('Creating workspace_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('owner', 'edit', 'view')),
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
        thumbnail_path TEXT,
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // File permissions (granular access control)
    console.log('Creating file_permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_permissions (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(50) DEFAULT 'view' CHECK (permission IN ('owner', 'edit', 'view', 'none')),
        granted_by INTEGER REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(file_id, user_id)
      )
    `);

    // File content
    console.log('Creating file_content table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_content (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        extracted_text TEXT,
        text_embedding vector(1536),
        image_analysis JSONB,
        ocr_confidence FLOAT,
        processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // File metadata
    console.log('Creating file_metadata table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        category VARCHAR(100),
        tags TEXT[],
        detected_entities JSONB,
        ai_description TEXT,
        confidence_score FLOAT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // === AUDIT & COMPLIANCE TABLES ===
    
    // Audit logs (immutable)
    console.log('Creating audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INTEGER,
        ip_address INET,
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Data encryption keys (for encryption at rest)
    console.log('Creating encryption_keys table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        key_id UUID DEFAULT uuid_generate_v4(),
        encrypted_key TEXT NOT NULL,
        algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        rotated_at TIMESTAMP
      )
    `);

    // === JOB QUEUE TABLES (for batch processing) ===
    
    // Processing queue
    console.log('Creating processing_queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS processing_queue (
        id SERIAL PRIMARY KEY,
        job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('embed', 'ocr', 'analyze', 'reindex')),
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
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

    // Search cache
    console.log('Creating search_cache table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_cache (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        query_hash VARCHAR(64) UNIQUE NOT NULL,
        query_text TEXT NOT NULL,
        result_ids INTEGER[],
        hit_count INTEGER DEFAULT 1,
        last_accessed TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Search logs
    console.log('Creating search_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        query TEXT,
        results_count INTEGER,
        clicked_file_id INTEGER REFERENCES files(id),
        search_duration_ms INTEGER,
        used_cache BOOLEAN DEFAULT false,
        searched_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // === API & SSO TABLES ===
    
    // API keys
    console.log('Creating api_keys table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

    // SSO configurations
    console.log('Creating sso_configurations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sso_configurations (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL CHECK (provider IN ('saml', 'oauth', 'oidc')),
        metadata JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
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
