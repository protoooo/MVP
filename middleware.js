import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting store (use Redis in production for multi-instance)
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMITS = {
  api: { requests: 60, window: 60000 }, // 60 requests per minute
  auth: { requests: 5, window: 300000 }, // 5 requests per 5 minutes
  webhook: { requests: 100, window: 60000 }, // 100 requests per minute
};

function getRateLimitKey(ip, pathname) {
  return `${ip}:${pathname}`;
}

function checkRateLimit(key, limit) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetTime: now + limit.window };
  
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + limit.window;
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  return {
    allowed: record.count <= limit.requests,
    remaining: Math.max(0, limit.requests - record.count),
    resetTime: record.resetTime,
  };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime + 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  
  // Security Headers
  const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  };

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL,
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  // Rate Limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  let rateLimit = RATE_LIMITS.api;
  if (pathname.startsWith('/api/auth/')) {
    rateLimit = RATE_LIMITS.auth;
  } else if (pathname === '/api/webhooks/stripe') {
    rateLimit = RATE_LIMITS.webhook;
  }

  const rateLimitKey = getRateLimitKey(ip, pathname);
  const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit);

  response.headers.set('X-RateLimit-Limit', rateLimit.requests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          ...Object.fromEntries(response.headers.entries())
        }
      }
    );
  }

  // Protected routes - require authentication
  const protectedPaths = ['/dashboard', '/settings', '/billing'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const token = request.cookies.get('sb-access-token')?.value || 
                  request.cookies.get('sb-refresh-token')?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Check email verification
      if (!user.email_confirmed_at) {
        return NextResponse.redirect(new URL('/verify-email', request.url));
      }

      // Add user info to headers for API routes
      response.headers.set('x-user-id', user.id);
      response.headers.set('x-user-email', user.email);

    } catch (error) {
      console.error('Auth check error:', error);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup', '/reset-password'];
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));
  
  if (isAuthPath) {
    const token = request.cookies.get('sb-access-token')?.value;
    
    if (token) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        // Token invalid, let them proceed to auth page
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
