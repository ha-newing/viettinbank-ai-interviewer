/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
  },
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
}

module.exports = nextConfig