import { createServer, IncomingMessage, ServerResponse, request as httpRequest } from 'http';
import { parse } from 'url';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import next from 'next';

const dev = process.env.DEPLOY_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || '0.0.0.0';
// 主应用端口（与 deploy 命令 --port 参数一致）
const appPort = parseInt(process.env.APP_PORT || process.env.PORT || '5000', 10);
// 健康检查端口（CloudBase 可能仍默认探测 3000）
const probePort = parseInt(process.env.PROBE_PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port: appPort });
const handle = app.getRequestHandler();

process.on('uncaughtException', (err) => {
  console.error('FATAL: uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('FATAL: unhandledRejection', reason);
  process.exit(1);
});

/**
 * 检查请求是否为健康检查
 */
function isHealthCheck(req: IncomingMessage): boolean {
  const url = req.url || '';
  return req.method === 'GET' && (url === '/health' || url.startsWith('/health'));
}

/**
 * 将 probe 端口收到的请求反向代理到主应用端口
 * 确保即使 CloudBase 误将流量路由到 probe 端口，也能正常处理业务请求
 */
function proxyToApp(req: IncomingMessage, res: ServerResponse): void {
  const options = {
    hostname: '127.0.0.1',
    port: appPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = httpRequest(options, (proxyRes) => {
    // 转发状态码和头部
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    // 转发响应体
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error (${req.url}):`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Service temporarily unavailable' }));
  });

  // 转发请求体（body 通过 stream 传输）
  req.pipe(proxyReq);
}

/**
 * 健康检查响应
 */
function handleHealthCheck(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'BangBangWenFa service is healthy',
  }));
}

/**
 * 旧标签页可能持有已经被新版本删除的 Next 静态 chunk。
 * 这类页面不会执行新 HTML 里的恢复脚本，因此对缺失的旧 JS chunk 返回一个
 * 一次性刷新脚本，让它重新请求最新 HTML，而不是把错误的 404 留在页面里。
 */
async function handleMissingLegacyStaticAsset(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  const pathname = parse(req.url || '').pathname || '';
  if (!pathname.startsWith('/_next/static/')) return false;

  const assetPath = path.join(process.cwd(), '.next', pathname.replace(/^\/_next\//, ''));
  try {
    await stat(assetPath);
    return false;
  } catch {
    // 只有缺失的脚本需要接管。CSS/字体/图片仍交给 Next 返回原始 404，
    // 避免误替换正常的静态资源。
    if (!/\.(?:js|mjs)$/.test(pathname)) return false;

    const recoveryScript = `;(function () {
  try {
    var key = '__bbwv_legacy_asset_retry';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch (error) {}
  var url = new URL(window.location.href);
  url.searchParams.set('__bbwv_legacy_asset_retry', '1');
  url.searchParams.set('__bbwv_recover', String(Date.now()));
  window.location.replace(url.toString());
})();`;

    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'X-BBWV-Legacy-Asset-Recovery': '1',
    });
    if (req.method === 'HEAD') res.end();
    else res.end(recoveryScript);
    return true;
  }
}

/**
 * Probe 服务器请求处理 — 智能分流
 * - 健康检查请求：直接返回 200
 * - 其他请求：反向代理到主应用，确保业务不中断
 */
function probeRequestHandler(req: IncomingMessage, res: ServerResponse) {
  if (isHealthCheck(req)) {
    handleHealthCheck(req, res);
  } else {
    proxyToApp(req, res);
  }
}

if (probePort !== appPort) {
  // 立即启动健康检查服务器，不等待 Next.js 初始化
  // 确保 CloudBase 健康检查能立即通过（否则 InitialDelaySeconds 太短会导致部署失败）
  const probeServer = createServer(probeRequestHandler);
  probeServer.listen(probePort, hostname, () => {
    console.log(
      `> Health probe + proxy listening at http://${hostname}:${probePort} (started before Next.js prepare)`,
    );
  });
  probeServer.once('error', err => {
    console.error('Probe server error', err);
  });
}

app.prepare().then(() => {
  /**
   * 主应用服务器 — 处理所有用户请求
   * 直接使用 Next.js 的请求处理器，包含 API 路由、页面渲染、认证中间件等
   */
  const appServer = createServer(async (req, res) => {
    try {
      if (probePort === appPort && isHealthCheck(req)) {
        handleHealthCheck(req, res);
        return;
      }

      if (await handleMissingLegacyStaticAsset(req, res)) {
        return;
      }

      const originalSetHeader = res.setHeader.bind(res);
      res.setHeader = ((name: string, value: string | number | readonly string[]) => {
        if (String(name).toLowerCase() === 'x-powered-by') {
          return res;
        }
        return originalSetHeader(name, value);
      }) as typeof res.setHeader;

      const originalWriteHead = res.writeHead.bind(res);
      res.writeHead = ((statusCode: number, reasonPhraseOrHeaders?: any, headers?: any) => {
        const headerBag =
          typeof reasonPhraseOrHeaders === 'string'
            ? headers || {}
            : reasonPhraseOrHeaders || {};
        if (headerBag && typeof headerBag === 'object') {
          delete headerBag['X-Powered-By'];
          delete headerBag['x-powered-by'];
        }

        if (typeof reasonPhraseOrHeaders === 'string') {
          return originalWriteHead(statusCode, reasonPhraseOrHeaders, headerBag);
        }

        return originalWriteHead(statusCode, headerBag);
      }) as typeof res.writeHead;

      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // 错误处理
  appServer.once('error', err => {
    console.error('App server error', err);
    process.exit(1);
  });

  // 启动主应用服务器
  appServer.listen(appPort, hostname, () => {
    console.log(
      `> Main app listening at http://${hostname}:${appPort} as ${
        dev ? 'development' : process.env.DEPLOY_ENV
      }`,
    );
  });

  if (probePort === appPort) {
    console.log(`> Health probe shares same port as main app (${appPort})`);
  }
}).catch((err) => {
  console.error('FATAL: failed to start server', err);
  process.exit(1);
});
