import { execSync } from 'child_process';

function getBuildCacheBustValue() {
  const explicitValue =
    process.env.BUILD_CACHE_BUST_VALUE || process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE;

  if (explicitValue) {
    return explicitValue;
  }

  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  }
}

const deploymentId =
  process.env.NEXT_PUBLIC_DEPLOYMENT_ID ||
  process.env.BUILD_CACHE_BUST_VALUE ||
  process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE ||
  getBuildCacheBustValue();
// This public value is embedded into client chunks. When static assets are
// published separately from the CloudBase container, it must be derived from
// the same immutable deployment id in every build environment.
const buildCacheBustValue =
  process.env.BUILD_CACHE_BUST_VALUE ||
  process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE ||
  deploymentId;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 不使用 standalone 输出，因为项目使用自定义 server (server.mts)
  poweredByHeader: false,
  env: {
    BUILD_CACHE_BUST_VALUE: buildCacheBustValue,
    NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE: buildCacheBustValue,
    NEXT_PUBLIC_DEPLOYMENT_ID: deploymentId,
  },
  allowedDevOrigins: ['localhost:5000', 'localhost:3000', 'localhost', 'localhost:3007'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.bangbangwenfa.com' },
      { protocol: 'https', hostname: 'bangbangwenfa.com' },
      { protocol: 'https', hostname: 'jfwzkj.com' },
      { protocol: 'https', hostname: 'www.jfwzkj.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'thirdwx.qlogo.cn' },
      { protocol: 'https', hostname: 'wx.qlogo.cn' },
      { protocol: 'https', hostname: 'mmbiz.qpic.cn' },
    ],
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)\\.(tar\\.gz|zip)$',
        headers: [
          { key: 'Content-Disposition', value: 'attachment' },
          { key: 'Content-Type', value: 'application/octet-stream' },
        ],
      },
    ];
  },
};

export default nextConfig;
