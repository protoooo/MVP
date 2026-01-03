import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../config/database';

export interface ApiAuthRequest extends Request {
  apiKey?: {
    id: number;
    userId: number;
    scopes: string[];
  };
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export const apiAuthMiddleware = async (
  req: ApiAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'API key required' });
    }

    const apiKey = authHeader.substring(7);
    const keyHash = hashApiKey(apiKey);

    const result = await query(
      `
      SELECT id, user_id, scopes, rate_limit, is_active, expires_at
      FROM api_keys
      WHERE key_hash = $1
      `,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const key = result.rows[0];

    if (!key.is_active) {
      return res.status(401).json({ error: 'API key is deactivated' });
    }

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return res.status(401).json({ error: 'API key has expired' });
    }

    // Rate limit (per hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const usage = await query(
      `
      SELECT COUNT(*)::int AS count
      FROM api_key_usage
      WHERE api_key_id = $1 AND timestamp > $2
      `,
      [key.id, hourAgo]
    );

    if (usage.rows[0].count >= key.rate_limit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: key.rate_limit,
        reset: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    }

    await query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    );

    const start = Date.now();
    res.on('finish', () => {
      query(
        `
        INSERT INTO api_key_usage
          (api_key_id, endpoint, method, status_code, response_time_ms)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [key.id, req.path, req.method, res.statusCode, Date.now() - start]
      ).catch(console.error);
    });

    req.apiKey = {
      id: key.id,
      userId: key.user_id,
      scopes: key.scopes,
    };

    next();
  } catch (err) {
    console.error('API auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
