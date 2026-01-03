import { Router } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

function generateApiKey() {
  const key = `plm_${crypto.randomBytes(32).toString('hex')}`;
  return {
    key,
    hash: crypto.createHash('sha256').update(key).digest('hex'),
    prefix: key.substring(0, 12),
  };
}

// List API keys
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const result = await query(
    `
    SELECT id, name, key_prefix, last_used_at, created_at,
           expires_at, is_active, rate_limit, scopes
    FROM api_keys
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [req.user!.id]
  );

  res.json({ apiKeys: result.rows });
});

// Create API key
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name, expiresInDays, rateLimit, scopes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const { key, hash, prefix } = generateApiKey();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000)
    : null;

  const result = await query(
    `
    INSERT INTO api_keys
      (user_id, name, key_hash, key_prefix, expires_at, rate_limit, scopes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, key_prefix, created_at, expires_at, rate_limit, scopes
    `,
    [
      req.user!.id,
      name,
      hash,
      prefix,
      expiresAt,
      rateLimit ?? 100,
      JSON.stringify(scopes ?? ['read', 'write']),
    ]
  );

  res.json({
    apiKey: result.rows[0],
    key,
    warning: 'Save this key now. You will not see it again.',
  });
});

// Revoke API key
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const result = await query(
    'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user!.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'API key not found' });
  }

  res.json({ message: 'API key revoked' });
});

// Usage stats
router.get('/:id/usage', authMiddleware, async (req: AuthRequest, res) => {
  const keyId = Number(req.params.id);

  const stats = await query(
    `
    SELECT
      COUNT(*) AS total_requests,
      COUNT(*) FILTER (WHERE status_code < 400) AS successful_requests,
      COUNT(*) FILTER (WHERE status_code >= 400) AS failed_requests,
      AVG(response_time_ms) AS avg_response_time,
      MAX(timestamp) AS last_used
    FROM api_key_usage
    WHERE api_key_id = $1
    `,
    [keyId]
  );

  res.json({ stats: stats.rows[0] });
});

export default router;
