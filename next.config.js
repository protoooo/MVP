/** @type {import('next').NextConfig} */

// Backend port configuration
const BACKEND_PORT = 3001;

const nextConfig = {
  reactStrictMode: true,
  
  // Output standalone for easier deployment
  output: 'standalone',
  
  // Turbopack configuration
  turbopack: {},
  
  // Performance optimizations
  compress: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Rewrites for API proxying
  async rewrites() {
    // In production, always proxy to backend on port 3001
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? `http://localhost:${BACKEND_PORT}` 
      : process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || BACKEND_PORT}`;
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle canvas dependency (for pdf-parse)
    config.resolve.alias.canvas = false;
    
    // Optimize bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
