import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost:5000', 'localhost:3000', 'localhost'],
  // ⚡ Windows 性能优化：排除 node_modules 文件监听，防止卡顿/闪退
  turbopack: {
    watchOptions: {
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**'],
        poll: false, // 关闭轮询，降低 CPU 占用
      };
    }
    return config;
  },
  images: {
    unoptimized: true, // 禁用图片优化，避免缓存目录问题
    remotePatterns: [
      // 只允许已知的图片来源域名
      {
        protocol: 'https',
        hostname: 'www.bangbangwenfa.com',
      },
      {
        protocol: 'https',
        hostname: 'jfwzkj.com',
      },
      {
        protocol: 'https',
        hostname: 'www.jfwzkj.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'thirdwx.qlogo.cn',
      },
      {
        protocol: 'https',
        hostname: 'wx.qlogo.cn',
      },
      {
        protocol: 'https',
        hostname: 'mmbiz.qpic.cn',
      },
    ],
  },
  async headers() {
    return [
      {
        // 设置 .tar.gz 和 .zip 文件的下载响应头
        source: '/(.*)\\.(tar\\.gz|zip)$',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'attachment',
          },
          {
            key: 'Content-Type',
            value: 'application/octet-stream',
          },
        ],
      },
    ];
  },
};

// Sentry 包装（仅在构建时处理，避免 top-level await）
export default nextConfig;
