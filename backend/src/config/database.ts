import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();

// Initialize database schema
export async function initializeDatabase() {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create users table
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
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
