import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const layout = await fs.readFile(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');

  assert.match(layout, /__bbStaleResourceGuardInstalled/, 'layout must install the stale-resource guard early');
  assert.match(layout, /__bbwv_resource_retry/, 'recovery must have a one-time URL marker');
  assert.match(layout, /addEventListener\('error'/, 'guard must observe resource loading errors');
  assert.match(layout, /window\.location\.replace/, 'guard must hard-navigate to fresh HTML');
  assert.match(layout, /hasRetried/, 'guard must stop after one recovery attempt');

  console.log('stale resource recovery test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
