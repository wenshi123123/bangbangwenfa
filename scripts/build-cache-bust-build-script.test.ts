import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const buildScript = await readFile(path.join(process.cwd(), 'scripts/build.sh'), 'utf8');
  const writeMetaIndex = buildScript.indexOf('scripts/write-build-meta.mjs');
  const nextBuildIndex = buildScript.indexOf('"${NEXT_BIN}" build --webpack');

  assert.ok(writeMetaIndex >= 0, 'the build must persist its cache-bust token into build-meta.ts');
  assert.ok(nextBuildIndex >= 0, 'the build should invoke Next.js');
  assert.ok(
    writeMetaIndex < nextBuildIndex,
    'build-meta.ts must be written before Next.js compiles the middleware and recovery guards',
  );

  console.log('build cache-bust build script test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
