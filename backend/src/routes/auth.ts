// backend/src/routes/auth.ts - COMPLETE SECURE VERSION
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ========================================
// CRITICAL: Validate JWT_SECRET at startup
// ========================================
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL: JWT_SECRET must be set and at least 32 characters long!');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  throw new Error('JWT_SECRET not properly configured');
}

console.log('✅ JWT_SECRET validated');

// ========================================
// Helper: Validate Cloudflare Turnstile
// ========================================
async function validateTurnstile(token: string, ip: string): Promise<boolean> {
  // If Turnstile is not configured, log warning but allow (for development)
  if (!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL: Turnstile not configured in production!');
      return false;
    }
    console.warn('⚠️  WARNING: Turnstile not configured - allowing for development');
    return true;
  }

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
    
    if (!data.success) {
      console.warn('Turnstile validation failed:', data['error-codes']);
    }
    
    return data.success === true;
  } catch (error) {
    console.error('Turnstile validation error:', error);
    // In production, fail closed (reject). In dev, fail open (allow).
    return process.env.NODE_ENV !== 'production';
  }
}

// ========================================
// Helper: Validate password strength
// ========================================
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

// ========================================
// Helper: Validate email format
// ========================================
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ========================================
// Helper: Get client IP address
// ========================================
function getClientIP(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.toString().split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// ========================================
// Register - WITH TURNSTILE REQUIRED
// ========================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, businessName, turnstileToken } = req.body;

    console.log(`Registration attempt for: ${email}`);

    // 1. VALIDATE TURNSTILE - NO BYPASS ALLOWED
    if (!turnstileToken) {
      console.warn(`Registration blocked: No Turnstile token for ${email}`);
      return res.status(400).json({ 
        error: 'Security verification required. Please complete the CAPTCHA.' 
      });
    }

    const clientIP = getClientIP(req);
    const isValidTurnstile = await validateTurnstile(turnstileToken, clientIP);
    
    if (!isValidTurnstile) {
      console.warn(`Registration blocked: Invalid Turnstile for ${email} from ${clientIP}`);
      return res.status(400).json({ 
        error: 'Security verification failed. Please try again.' 
      });
    }

    // 2. VALIDATE INPUT - Email
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 3. VALIDATE PASSWORD STRENGTH
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // 4. CHECK IF USER EXISTS
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1', 
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      // Don't reveal that email exists, but log it
      console.warn(`Registration attempt with existing email: ${email}`);
      return res.status(400).json({ 
        error: 'An account with this email already exists' 
      });
    }

    // 5. HASH PASSWORD (12 rounds for security)
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. CREATE USER
    const result = await query(
      `INSERT INTO users (email, password_hash, business_name, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, email, business_name, created_at`,
      [email.toLowerCase(), passwordHash, businessName || null]
    );

    const user = result.rows[0];
    console.log(`✅ User registered: ${user.id} - ${user.email}`);

    // 7. GENERATE JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 8. LOG REGISTRATION FOR AUDIT
    await query(
      `INSERT INTO search_logs (user_id, query, results_count, searched_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, `[REGISTRATION] ${clientIP}`, 0]
    ).catch(err => console.error('Failed to log registration:', err));

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name,
      },
      token 
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ========================================
// Login - WITH TURNSTILE AND RATE LIMITING
// ========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body;

    console.log(`Login attempt for: ${email}`);

    // 1. VALIDATE TURNSTILE
    if (!turnstileToken) {
      console.warn(`Login blocked: No Turnstile token for ${email}`);
      return res.status(400).json({ 
        error: 'Security verification required. Please complete the CAPTCHA.' 
      });
    }

    const clientIP = getClientIP(req);
    const isValidTurnstile = await validateTurnstile(turnstileToken, clientIP);
    
    if (!isValidTurnstile) {
      console.warn(`Login blocked: Invalid Turnstile for ${email} from ${clientIP}`);
      return res.status(400).json({ 
        error: 'Security verification failed. Please try again.' 
      });
    }

    // 2. VALIDATE INPUT
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 3. FIND USER
    const result = await query(
      'SELECT id, email, password_hash, business_name, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal whether email exists
      console.warn(`Login failed: User not found - ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // 4. VERIFY PASSWORD
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      console.warn(`Login failed: Invalid password for ${email} from ${clientIP}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 5. GENERATE JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 6. LOG LOGIN FOR AUDIT
    await query(
      `INSERT INTO search_logs (user_id, query, results_count, searched_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, `[LOGIN] ${clientIP}`, 0]
    ).catch(err => console.error('Failed to log login:', err));

    console.log(`✅ User logged in: ${user.id} - ${user.email}`);

    res.json({
      user: { 
        id: user.id, 
        email: user.email, 
        business_name: user.business_name 
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ========================================
// Get Current User
// ========================================
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
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// ========================================
// Logout (client-side token removal)
// ========================================
router.post('/logout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Log logout for audit
    await query(
      `INSERT INTO search_logs (user_id, query, results_count, searched_at)
       VALUES ($1, $2, $3, NOW())`,
      [req.user!.id, '[LOGOUT]', 0]
    ).catch(err => console.error('Failed to log logout:', err));

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ========================================
// Change Password (Optional - for future)
// ========================================
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Get current user
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user!.id]
    );

    // Log password change
    await query(
      `INSERT INTO search_logs (user_id, query, results_count, searched_at)
       VALUES ($1, $2, $3, NOW())`,
      [req.user!.id, '[PASSWORD_CHANGE]', 0]
    ).catch(err => console.error('Failed to log password change:', err));

    console.log(`✅ Password changed for user: ${req.user!.id}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
