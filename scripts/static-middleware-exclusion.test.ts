import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const middlewareSource = await readFile(
    path.join(process.cwd(), 'src/middleware.ts'),
    'utf8',
  );

  assert.ok(
    middlewareSource.includes("'/((?!_next/static/"),
    'middleware matcher must exclude immutable Next static assets',
  );

  console.log('static middleware exclusion test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
