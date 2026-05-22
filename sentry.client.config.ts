import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 采样率：生产环境建议 0.1-0.3
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 关闭开发环境
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境
  environment: process.env.DEPLOY_ENV || process.env.NODE_ENV || 'development',

  // 忽略常见无意义错误
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'Failed to fetch',
  ],
});
