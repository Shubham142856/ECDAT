/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    cpus: 1,
    workerThreads: false,
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

}

module.exports = nextConfig
