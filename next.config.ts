import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 不使用 standalone 输出，因为项目使用自定义 server (server.mts)
  // 隐藏 X-Powered-By 头，不暴露 Next.js 技术栈
  poweredByHeader: false,
  allowedDevOrigins: ['localhost:5000', 'localhost:3000', 'localhost', 'localhost:3007'],
  images: {
    unoptimized: true,
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
