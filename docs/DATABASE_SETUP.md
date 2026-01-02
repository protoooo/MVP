# Database Setup Guide

This guide helps you set up PostgreSQL with pgvector extension for BizMemory.

## Table of Contents
- [Quick Start with Docker (Recommended)](#quick-start-with-docker-recommended)
- [Local PostgreSQL Installation](#local-postgresql-installation)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

---

## Quick Start with Docker (Recommended)

The easiest way to run PostgreSQL locally is using Docker Compose.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

### Steps

1. **Start PostgreSQL with Docker Compose**
   ```bash
   docker-compose up -d postgres
   ```

2. **Verify PostgreSQL is running**
   ```bash
   docker-compose ps
   ```
   You should see `bizmemory-postgres` with status "Up"

3. **Check database logs (if needed)**
   ```bash
   docker-compose logs postgres
   ```

4. **Configure your environment**
   ```bash
   cp .env.example .env
   ```
   
   Update the `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bizmemory
   ```

5. **Start the application**
   ```bash
   npm install
   npm run dev
   ```
   
   The backend will automatically:
   - Check database connection
   - Retry on connection failures
   - Initialize the database schema
   - Create all required tables and indexes

### Optional: Database Management UI (pgAdmin)

To use pgAdmin for managing your database:

```bash
# Start with pgAdmin
docker-compose --profile tools up -d

# Access pgAdmin at http://localhost:5050
# Email: admin@bizmemory.local
# Password: admin
```

To add the server in pgAdmin:
- Host: postgres
- Port: 5432
- Username: postgres
- Password: postgres
- Database: bizmemory

### Managing Docker Containers

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Restart containers
docker-compose restart postgres

# View logs
docker-compose logs -f postgres
```

---

## Local PostgreSQL Installation

If you prefer to install PostgreSQL directly on your machine:

### macOS

1. **Install PostgreSQL**
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. **Install pgvector extension**
   ```bash
   brew install pgvector
   ```

3. **Create database**
   ```bash
   createdb bizmemory
   ```

4. **Enable pgvector**
   ```bash
   psql bizmemory -c "CREATE EXTENSION vector;"
   ```

### Ubuntu/Debian

1. **Install PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Install pgvector**
   ```bash
   # Install build dependencies
   sudo apt install -y postgresql-server-dev-16 build-essential git

   # Clone and build pgvector
   cd /tmp
   git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
   cd pgvector
   make
   sudo make install
   ```

3. **Create database and user**
   ```bash
   sudo -u postgres psql
   ```
   
   In PostgreSQL shell:
   ```sql
   CREATE DATABASE bizmemory;
   CREATE USER bizmemory_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE bizmemory TO bizmemory_user;
   \c bizmemory
   CREATE EXTENSION vector;
   \q
   ```

### Windows

1. **Install PostgreSQL**
   - Download from [PostgreSQL.org](https://www.postgresql.org/download/windows/)
   - Run the installer and follow the setup wizard
   - Remember your password for the `postgres` user

2. **Install pgvector**
   - Download precompiled binaries from [pgvector releases](https://github.com/pgvector/pgvector/releases)
   - Or use WSL2 and follow Linux instructions

3. **Create database**
   ```bash
   # Open Command Prompt or PowerShell
   "C:\Program Files\PostgreSQL\16\bin\createdb.exe" bizmemory
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -d bizmemory -c "CREATE EXTENSION vector;"
   ```

---

## Environment Configuration

BizMemory supports two ways to configure database connection:

### Option 1: Connection String (Recommended)

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

Examples:
```env
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bizmemory

# Docker Compose
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bizmemory

# Production (Railway, Heroku, etc.)
DATABASE_URL=postgresql://user:pass@host.railway.app:5432/railway
```

### Option 2: Individual Components

Useful when using Docker Compose with environment variable substitution:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bizmemory
```

### Advanced Configuration

```env
# Connection Pool Settings
DB_POOL_MAX=20              # Maximum connections in pool
DB_POOL_MIN=2               # Minimum connections in pool
DB_IDLE_TIMEOUT=30000       # Close idle connections after 30s
DB_CONNECTION_TIMEOUT=10000 # Connection timeout: 10s

# Retry Logic
DB_MAX_RETRIES=5            # Retry up to 5 times
DB_RETRY_DELAY=2000         # Start with 2s delay (exponential backoff)
```

---

## Troubleshooting

### Error: ECONNREFUSED ::1:5432 or 127.0.0.1:5432

**Problem:** Cannot connect to PostgreSQL

**Solutions:**
1. **Check if PostgreSQL is running**
   ```bash
   # Docker
   docker-compose ps postgres
   
   # Local (macOS/Linux)
   pg_isready
   
   # Local (Ubuntu/Debian)
   sudo systemctl status postgresql
   
   # Local (macOS)
   brew services list | grep postgresql
   ```

2. **Start PostgreSQL**
   ```bash
   # Docker
   docker-compose up -d postgres
   
   # Local (Ubuntu/Debian)
   sudo systemctl start postgresql
   
   # Local (macOS)
   brew services start postgresql@16
   ```

3. **Verify connection details**
   - Check `.env` file has correct `DATABASE_URL`
   - Ensure port 5432 is not in use by another process
   - Try connecting with `psql`:
     ```bash
     psql postgresql://postgres:postgres@localhost:5432/bizmemory
     ```

### Error: database "bizmemory" does not exist

**Solution:**
```bash
# Docker
docker-compose exec postgres createdb -U postgres bizmemory

# Local
createdb bizmemory
# OR
psql -U postgres -c "CREATE DATABASE bizmemory;"
```

### Error: extension "vector" is not available

**Problem:** pgvector extension not installed

**Solutions:**

1. **Using Docker:** Make sure you're using the correct image
   ```yaml
   # In docker-compose.yml
   image: ankane/pgvector:v0.5.1  # ✓ Has pgvector
   # NOT
   image: postgres:16  # ✗ No pgvector
   ```

2. **Local installation:** Install pgvector
   - See [Local PostgreSQL Installation](#local-postgresql-installation) section above

### Error: password authentication failed

**Problem:** Wrong username or password

**Solutions:**
1. Check credentials in `.env` file
2. For Docker, default is `postgres`/`postgres`
3. Reset password:
   ```bash
   # Docker
   docker-compose exec postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
   
   # Local
   sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'newpassword';"
   ```

### Port 5432 already in use

**Problem:** Another PostgreSQL instance or service using port 5432

**Solutions:**
1. **Find what's using the port:**
   ```bash
   # Linux/macOS
   sudo lsof -i :5432
   
   # Windows
   netstat -ano | findstr :5432
   ```

2. **Stop conflicting service:**
   ```bash
   # Stop local PostgreSQL if you want to use Docker
   brew services stop postgresql@16  # macOS
   sudo systemctl stop postgresql     # Linux
   ```

3. **Use different port for Docker:**
   ```yaml
   # In docker-compose.yml
   ports:
     - "5433:5432"  # Use port 5433 on host
   ```
   Then update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bizmemory
   ```

### Connection works but tables not created

**Problem:** Database initialization failed

**Solutions:**
1. Check the application logs for errors
2. Manually test pgvector:
   ```bash
   psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```
3. Run initialization again by restarting the server:
   ```bash
   npm run dev:backend
   ```

### Performance Issues

**Solutions:**
1. Increase connection pool size:
   ```env
   DB_POOL_MAX=50
   DB_POOL_MIN=5
   ```

2. Optimize PostgreSQL configuration (for local install):
   ```bash
   # Edit postgresql.conf
   max_connections = 100
   shared_buffers = 256MB
   effective_cache_size = 1GB
   ```

---

## Production Deployment

### Railway

Railway provides PostgreSQL with pgvector:

1. Create new project
2. Add PostgreSQL database (with pgvector)
3. Copy `DATABASE_URL` from Railway dashboard
4. Add to environment variables in Railway
5. Deploy your application

### Other Platforms (Heroku, Render, etc.)

1. Ensure pgvector extension is available
2. Add `DATABASE_URL` to environment variables
3. Set `NODE_ENV=production`
4. The app will auto-initialize the schema on first run

---

## Schema Information

The application automatically creates these tables:

- **users** - User accounts and authentication
- **files** - File metadata (name, size, type, storage path)
- **file_content** - Extracted text, embeddings (1536-dim vectors), OCR data
- **file_metadata** - AI-generated tags, categories, entities
- **search_logs** - Search analytics and history

Indexes created for performance:
- Vector similarity search (IVFFlat index on embeddings)
- User ID lookups
- File upload dates
- Tag searches (GIN index)
- Category filters

---

## Getting Help

If you're still having issues:

1. Check the application logs for detailed error messages
2. Verify PostgreSQL logs: `docker-compose logs postgres`
3. Test connection manually: `psql $DATABASE_URL`
4. Open an issue on GitHub with:
   - Error messages
   - Your OS and PostgreSQL version
   - Whether you're using Docker or local install
