/** @type {import('next').NextConfig} */
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
  
  // Rewrites for API proxying in development
  async rewrites() {
    // Only proxy API requests in development when backend runs separately
    if (process.env.NODE_ENV === 'development') {
      const backendPort = process.env.BACKEND_PORT || '3001';
      return [
        {
          source: '/api/:path*',
          destination: `http://localhost:${backendPort}/api/:path*`,
        },
      ];
    }
    return [];
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
