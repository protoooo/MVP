# Required Environment Variables for Railway Deployment

## Essential Variables (Required)

### Database Configuration
```
DATABASE_URL=postgresql://user:password@host:port/database
```
- **Description**: PostgreSQL database connection string
- **Example**: `postgresql://postgres:mypassword@db.railway.internal:5432/bizmemory`
- **Note**: Railway provides this automatically if you add a PostgreSQL database service

### Authentication
```
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long
```
- **Description**: Secret key for JWT token generation and validation
- **Example**: `my-super-secret-jwt-key-min-32-chars-12345678`
- **Security**: Generate a strong random string (min 32 characters)

### AI/ML Configuration (Cohere)
```
COHERE_API_KEY=your_cohere_api_key_here
```
- **Description**: API key for Cohere AI services (embeddings, text generation, vision)
- **Get it from**: https://dashboard.cohere.com/api-keys

## Storage Configuration (Choose One)

### Option 1: Supabase Storage (Recommended)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
- **Description**: Supabase credentials for file storage
- **Get it from**: Your Supabase project settings
- **Note**: If not provided, app will use local filesystem storage

### Option 2: AWS S3 Storage (Alternative)
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1
```
- **Description**: AWS S3 credentials for file storage
- **Note**: If not provided, app will use local filesystem storage

## Optional Variables (With Defaults)

### Application Settings
```
NODE_ENV=production
PORT=8080
```
- **NODE_ENV**: Set to `production` for Railway
- **PORT**: Railway will set this automatically (usually 8080 or 3000)

### File Upload Settings
```
MAX_FILE_SIZE=52428800
UPLOAD_DIR=/tmp/uploads
```
- **MAX_FILE_SIZE**: Maximum file size in bytes (default: 50MB)
- **UPLOAD_DIR**: Temporary upload directory (default: `/tmp/uploads` for Railway)

### Database Connection Pool (Optional Tuning)
```
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

### Cohere Model Configuration (Has Defaults)
```
COHERE_EMBED_DIMS=1536
COHERE_EMBED_MODEL=embed-v4.0
COHERE_RERANK_MODEL=rerank-v4.0-pro
COHERE_TEXT_MODEL=command-r7b-12-2024
COHERE_VISION_MODEL=c4ai-aya-vision-32b
FEATURE_COHERE=true
FEATURE_RERANK=true
```

## Railway Setup Instructions

1. **Create a new Railway project**
   - Go to https://railway.app/
   - Click "New Project"

2. **Add PostgreSQL Database**
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL` environment variable

3. **Deploy your application**
   - Connect your GitHub repository
   - Railway will auto-detect the nixpacks.toml configuration

4. **Set Environment Variables**
   - Go to your service → "Variables" tab
   - Add the required variables listed above:
     - `JWT_SECRET` (generate a secure random string)
     - `COHERE_API_KEY` (from Cohere dashboard)
     - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (if using Supabase)
   - Optionally add any other configuration variables

5. **Deploy**
   - Railway will automatically build and deploy
   - The app will initialize the database schema on first startup

## Minimum Configuration for Testing

If you want to get started quickly with minimum configuration:

```bash
# Required
DATABASE_URL=postgresql://...  # Auto-provided by Railway
JWT_SECRET=test-secret-key-minimum-32-characters-long
COHERE_API_KEY=your_cohere_key

# Recommended
NODE_ENV=production
UPLOAD_DIR=/tmp/uploads
```

The app will work with just these variables using local filesystem storage.

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is set correctly
- Check that the PostgreSQL service is running
- Verify network connectivity between services

### File Upload Issues
- If using Supabase: Verify credentials and bucket exists
- If using S3: Verify AWS credentials and bucket permissions
- Fallback: App will use `/tmp/uploads` if storage credentials are missing

### Authentication Issues
- Ensure `JWT_SECRET` is at least 32 characters
- Use a cryptographically secure random string

## Security Best Practices

1. **Never commit secrets to Git**
2. **Use Railway's secret management** for sensitive values
3. **Rotate keys regularly** (JWT_SECRET, API keys)
4. **Use strong, random values** for all secrets
5. **Enable SSL** for database connections (Railway does this by default)
