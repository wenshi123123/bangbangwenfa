import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const MIDDLEWARE_FILE = path.join(process.cwd(), 'src/middleware.ts');

async function main() {
  const source = await fs.readFile(MIDDLEWARE_FILE, 'utf8');

  assert.match(
    source,
    /event\.waitUntil\(loadCurrentChunkNames\(request\)\);/,
    'the chunk manifest should warm in the background on a cold request',
  );
  assert.doesNotMatch(
    source,
    /const currentChunkNames = await loadCurrentChunkNames\(request\);/,
    'a cold manifest request must not block every initial static chunk',
  );
  assert.match(
    source,
    /if \(currentChunkNames && !currentChunkNames\.has\(requestedChunk\)\)/,
    'stale chunk recovery must remain enabled after the manifest is warm',
  );

  console.log('static chunk middleware performance test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
