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
}

module.exports = nextConfig
