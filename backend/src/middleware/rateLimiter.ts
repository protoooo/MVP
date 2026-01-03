// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

// Auth endpoints rate limiter - CRITICAL FOR SECURITY
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Store in Redis in production
  skipSuccessfulRequests: true,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please slow down',
});

// Strict limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Rate limit exceeded for this operation',
});

// ========================================
// backend/src/routes/auth.ts - UPDATED
// ========================================
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// VALIDATE JWT SECRET AT STARTUP
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long!');
}

// Helper: Validate Cloudflare Turnstile token
async function validateTurnstile(token: string, ip: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile validation error:', error);
    return false;
  }
}

// Register - WITH TURNSTILE REQUIRED
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, businessName, turnstileToken } = req.body;

    // 1. VALIDATE TURNSTILE - NO BYPASS
    if (!turnstileToken) {
      return res.status(400).json({ error: 'Security verification required' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isValidTurnstile = await validateTurnstile(turnstileToken, ip.toString());
    
    if (!isValidTurnstile) {
      return res.status(400).json({ error: 'Security verification failed. Please try again.' });
    }

    // 2. VALIDATE INPUT
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // STRONGER PASSWORD POLICY
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    // 3. CHECK IF USER EXISTS
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 4. HASH PASSWORD (increased rounds for security)
    const passwordHash = await bcrypt.hash(password, 12);

    // 5. CREATE USER
    const result = await query(
      `INSERT INTO users (email, password_hash, business_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, business_name`,
      [email.toLowerCase(), passwordHash, businessName]
    );

    const user = result.rows[0];

    // 6. GENERATE JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 7. LOG REGISTRATION
    await query(
      `INSERT INTO search_logs (user_id, query, results_count, searched_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, '[REGISTRATION]', 0]
    );

    res.json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login - WITH TURNSTILE AND RATE LIMITING
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body;

    // 1. VALIDATE TURNSTILE
    if (!turnstileToken) {
      return res.status(400).json({ error: 'Security verification required' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isValidTurnstile = await validateTurnstile(turnstileToken, ip.toString());
    
    if (!isValidTurnstile) {
      return res.status(400).json({ error: 'Security verification failed' });
    }

    // 2. VALIDATE INPUT
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 3. FIND USER
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // 4. VERIFY PASSWORD
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 5. GENERATE JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 6. LOG LOGIN
    await query(
      `INSERT INTO search_logs (user_id, query, results_count, searched_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, '[LOGIN]', 0]
    );

    res.json({
      user: { id: user.id, email: user.email, business_name: user.business_name },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, email, business_name, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
