/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@dreamforge/db',
    '@dreamforge/types',
    '@dreamforge/providers',
    '@dreamforge/tasks',
    '@dreamforge/queue',
    '@dreamforge/billing',
    '@dreamforge/assets',
    '@dreamforge/storage',
    '@dreamforge/model-runtime',
    '@dreamforge/image-runtime',
    '@dreamforge/video-runtime',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@dreamforge/db': '@dreamforge/db/src',
      '@dreamforge/types': '@dreamforge/types/src',
      '@dreamforge/providers': '@dreamforge/providers/src',
      '@dreamforge/tasks': '@dreamforge/tasks/src',
      '@dreamforge/queue': '@dreamforge/queue/src',
      '@dreamforge/billing': '@dreamforge/billing/src',
      '@dreamforge/assets': '@dreamforge/assets/src',
      '@dreamforge/storage': '@dreamforge/storage/src',
      '@dreamforge/model-runtime': '@dreamforge/model-runtime/src',
      '@dreamforge/image-runtime': '@dreamforge/image-runtime/src',
      '@dreamforge/video-runtime': '@dreamforge/video-runtime/src',
    };
    return config;
  },
};

export default nextConfig;
