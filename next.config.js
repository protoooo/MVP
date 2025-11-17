/** @type {import('next').NextConfig} */
const nextConfig = {
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
