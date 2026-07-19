import assert from 'node:assert/strict';

process.env.DEPLOY_ENV = 'PROD';
async function main() {
  const { NextRequest } = await import('next/server');
  const { middleware } = await import('../src/middleware');

  const bareResponse = await middleware(
    new NextRequest('https://bangbangwenfa.com/civil?foo=1', {
      headers: { accept: 'text/html' },
    }),
  );

  assert.equal(bareResponse.status, 307);
  assert.equal(
    bareResponse.headers.get('location'),
    'https://www.bangbangwenfa.com/civil?foo=1',
  );
  assert.match(bareResponse.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(bareResponse.headers.get('clear-site-data'), '"cache"');
  assert.match(bareResponse.headers.get('set-cookie') ?? '', /bb_build_version=/);

  const forwardedHostResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/civil?foo=1', {
      headers: {
        accept: 'text/html',
        'x-forwarded-host': 'bangbangwenfa.com',
      },
    }),
  );

  assert.equal(forwardedHostResponse.status, 307);
  assert.equal(
    forwardedHostResponse.headers.get('location'),
    'https://www.bangbangwenfa.com/civil?foo=1',
  );
  const normalResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/civil?foo=1', {
      headers: { accept: 'text/html' },
    }),
  );

  assert.equal(normalResponse.status, 200);
  assert.equal(normalResponse.headers.get('location'), null);
  assert.equal(normalResponse.headers.get('clear-site-data'), '"cache"');
  assert.match(normalResponse.headers.get('cache-control') ?? '', /no-store/);

  const buildCookie = normalResponse.headers.get('set-cookie')?.match(/bb_build_version=([^;]+)/)?.[1];
  assert.ok(buildCookie, 'first document response must set the deployment version cookie');
  const warmResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/civil?foo=1', {
      headers: {
        accept: 'text/html',
        cookie: `bb_build_version=${buildCookie}`,
      },
    }),
  );
  assert.equal(warmResponse.status, 200);
  assert.equal(warmResponse.headers.get('clear-site-data'), null);
  assert.equal(warmResponse.headers.get('set-cookie'), null);
  assert.match(warmResponse.headers.get('cache-control') ?? '', /no-store/);

  const wechatResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/civil?foo=wechat', {
      headers: {
        accept: 'text/html',
        'user-agent': 'Mozilla/5.0 MicroMessenger/8.0.50',
      },
    }),
  );
  assert.equal(wechatResponse.status, 200);
  assert.equal(wechatResponse.headers.get('clear-site-data'), null);
  assert.equal(wechatResponse.headers.get('set-cookie'), null);
  assert.match(wechatResponse.headers.get('cache-control') ?? '', /no-store/);

  const legacyCssResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/_next/static/css/old-build.css'),
  );
  assert.equal(legacyCssResponse.status, 200);
  assert.equal(legacyCssResponse.headers.get('x-middleware-rewrite'), 'https://www.bangbangwenfa.com/legacy.css');
  console.log('middleware runtime test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
