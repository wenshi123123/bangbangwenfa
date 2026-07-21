import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const layout = await fs.readFile(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');

  assert.doesNotMatch(layout, /__bbStaleResourceGuardInstalled/, 'layout must not install a resource-error refresh guard');
  assert.doesNotMatch(layout, /__bbwv_resource_retry/, 'layout must not add resource retry query parameters');
  assert.doesNotMatch(layout, /window\.location\.replace/, 'layout must not hard-navigate after a resource error');

  console.log('stale resource failure contract test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
