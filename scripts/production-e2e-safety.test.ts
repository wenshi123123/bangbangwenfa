import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const config = await fs.readFile(path.join(process.cwd(), 'playwright.prod.config.ts'), 'utf8');

  assert.match(
    config,
    /'\*\*\/consult\/flow\.spec\.ts'/,
    'production read-only test configuration must exclude the order-creating consultation flow',
  );

  console.log('production E2E safety test passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
