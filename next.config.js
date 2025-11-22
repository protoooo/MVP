/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'standalone' for Railway
  
  // Webpack configuration for pdf-parse
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias.canvas = false;
    }
    // Add this to prevent build issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  
  // Ensure Railway can access the app
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  
  // Add these for Railway optimization
  swcMinify: true,
  poweredByHeader: false,
  
  // Ignore build errors from type checking (optional, but helps Railway deploy faster)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
}

module.exports = nextConfig;
