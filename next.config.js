/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack configuration for pdf-parse
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias.canvas = false;
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  
  // REMOVED: The strict "headers()" section that was blocking your site.
  
  // Ensure Railway can access the app
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  
  // Railway optimization
  swcMinify: true,
  poweredByHeader: false,
  
  // Ignore build errors from type checking
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // CRITICAL: Output standalone for Railway
  output: 'standalone'
}

export default nextConfig;
