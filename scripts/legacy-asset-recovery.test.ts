import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const server = await fs.readFile(path.join(process.cwd(), 'src/server.mts'), 'utf8');

  assert.doesNotMatch(server, /X-BBWV-Legacy-Asset-Recovery/, 'missing assets must not carry a recovery-success header');
  assert.doesNotMatch(server, /legacy_asset_retry/, 'missing assets must not add retry markers');
  assert.doesNotMatch(server, /legacy\.css/, 'missing CSS must not be replaced with a different build CSS file');
  assert.doesNotMatch(server, /location\.replace/, 'missing assets must not execute a page refresh script');

  console.log('legacy asset failure contract test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
