/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  images: {
    domains: ['localhost'],
  },
  env: {
    SONIOX_API_KEY: process.env.SONIOX_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/darwin-x64',
        'node_modules/@esbuild/darwin-arm64',
        'node_modules/@esbuild/linux-x64',
        'node_modules/@esbuild/win32-x64',
      ],
    },
  },
}

module.exports = nextConfig