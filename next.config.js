/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase API route body size limit to 50MB
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  // Increase Server Actions body size limit to 50MB (for app router)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Webpack configuration for pdf-parse
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse requires canvas for server-side
      config.resolve.alias.canvas = false;
    }
    return config;
  },
}

module.exports = nextConfig
