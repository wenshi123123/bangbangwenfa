import assert from 'node:assert/strict';

process.env.DEPLOY_ENV = 'PROD';
process.env.NEXT_PUBLIC_DEPLOYMENT_ID = 'test-deployment';
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
  assert.match(
    bareResponse.headers.get('content-security-policy') ?? '',
    /connect-src[^;]*https:\/\/www\.bangbangwenfa\.com/,
    'the bare-domain redirect document must allow its canonical-host navigation request',
  );
  assert.equal(bareResponse.headers.get('clear-site-data'), null);
  assert.equal(bareResponse.headers.get('set-cookie'), null);
  assert.equal(bareResponse.headers.get('x-bbwv-deployment-id'), 'test-deployment');

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
  assert.equal(normalResponse.headers.get('clear-site-data'), null);
  assert.match(normalResponse.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(normalResponse.headers.get('set-cookie'), null);
  assert.equal(normalResponse.headers.get('x-bbwv-deployment-id'), 'test-deployment');

  const rscResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/guardian/center?_rsc=build', {
      headers: { accept: 'text/x-component', rsc: '1' },
    }),
  );
  assert.equal(rscResponse.status, 200);
  assert.match(rscResponse.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(rscResponse.headers.get('x-bbwv-deployment-id'), 'test-deployment');

  const currentCssResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/_next/static/css/current-build.css'),
  );
  assert.equal(currentCssResponse.status, 200);
  assert.equal(
    currentCssResponse.headers.get('x-middleware-rewrite'),
    null,
    'current hashed CSS must reach Next directly so its immutable cache policy remains effective',
  );

  const fontResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/_next/static/media/old-font.woff2'),
  );
  assert.equal(
    fontResponse.status,
    200,
    'font requests must reach Next so current hashed fonts return their real binary content',
  );
  assert.equal(
    fontResponse.headers.get('x-bbwv-legacy-font-recovery'),
    null,
    'missing legacy fonts must not be disguised as a successful empty response',
  );
  console.log('middleware runtime test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
