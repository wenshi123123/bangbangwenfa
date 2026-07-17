import assert from 'node:assert/strict';

async function main() {
  const { getCanonicalBrowserRedirectUrl } = await import('../src/lib/site');

  assert.equal(
    getCanonicalBrowserRedirectUrl('https://bangbangwenfa.com/civil?foo=1#bar'),
    'https://www.bangbangwenfa.com/civil?foo=1#bar',
  );

  assert.equal(
    getCanonicalBrowserRedirectUrl('https://www.bangbangwenfa.com/civil?foo=1#bar'),
    null,
  );

  assert.equal(
    getCanonicalBrowserRedirectUrl('https://localhost:3000/civil?foo=1'),
    null,
  );

  console.log('canonical host client test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
