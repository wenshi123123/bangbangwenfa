import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const middlewareFile = path.join(process.cwd(), 'src/middleware.ts');

async function main() {
  const source = await fs.readFile(middlewareFile, 'utf8');

  assert.doesNotMatch(source, /canCacheHomeDocument/, 'HTML must not use a stale homepage cache');
  assert.match(source, /no-store, no-cache, must-revalidate/, 'HTML must always revalidate');

  console.log('home document cache performance test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
