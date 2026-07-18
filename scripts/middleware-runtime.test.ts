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
  assert.equal(bareResponse.headers.get('clear-site-data'), null);

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
  console.log('middleware runtime test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
