import assert from 'node:assert/strict';

process.env.DEPLOY_ENV = 'PROD';
process.env.BUILD_CACHE_BUST_VALUE = 'test-build';
process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE = 'test-build';

async function main() {
  const { NextRequest } = await import('next/server');
  const { middleware } = await import('../src/middleware');

  const wwwResponse = await middleware(
    new NextRequest('https://www.bangbangwenfa.com/civil?foo=1', {
      headers: { accept: 'text/html' },
    }),
  );

  assert.equal(wwwResponse.status, 307);
  assert.equal(
    wwwResponse.headers.get('location'),
    'https://bangbangwenfa.com/civil?foo=1',
  );
  assert.match(wwwResponse.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(wwwResponse.headers.get('clear-site-data'), null);

  const recoveryResponse = await middleware(
    new NextRequest('https://bangbangwenfa.com/civil?__bbwv=old&__bbwv_recover=1', {
      headers: { accept: 'text/html' },
    }),
  );

  assert.equal(recoveryResponse.status, 307);
  assert.equal(
    recoveryResponse.headers.get('location'),
    'https://bangbangwenfa.com/civil?__bbwv=test-build',
  );
  assert.equal(recoveryResponse.headers.get('clear-site-data'), '"cache"');

  const normalResponse = await middleware(
    new NextRequest('https://bangbangwenfa.com/civil?__bbwv=test-build', {
      headers: { accept: 'text/html' },
    }),
  );

  assert.equal(normalResponse.headers.get('clear-site-data'), null);
  console.log('middleware runtime test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
