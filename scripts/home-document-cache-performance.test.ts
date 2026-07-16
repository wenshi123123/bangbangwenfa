import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const middlewareFile = path.join(process.cwd(), 'src/middleware.ts');

async function main() {
  const source = await fs.readFile(middlewareFile, 'utf8');

  assert.match(source, /const canCacheHomeDocument =/, 'middleware must define a homepage-only cache condition');
  assert.match(source, /pathname === '\/'/, 'only the homepage may receive document caching');
  assert.match(source, /isHtmlNavigation/, 'the cache condition must be limited to HTML navigation');
  assert.match(source, /request\.method === 'GET'/, 'the cache condition must be limited to GET');
  assert.match(
    source,
    /request\.nextUrl\.searchParams\.get\(CACHE_BUST_PARAM\) === BUILD_CACHE_BUST_VALUE/,
    'only the current build-version URL may be cached',
  );
  assert.match(
    source,
    /private, max-age=300, stale-while-revalidate=60/,
    'homepage cache lifetime must remain short and private',
  );

  console.log('home document cache performance test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
