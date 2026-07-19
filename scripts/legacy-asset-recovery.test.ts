import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const server = await fs.readFile(path.join(process.cwd(), 'src/server.mts'), 'utf8');

  assert.match(server, /_next\/static/, 'server must inspect Next static asset requests');
  assert.match(server, /stat\(/, 'server must distinguish existing assets from stale paths');
  assert.match(server, /legacy_asset_retry/, 'legacy responses must carry a one-time retry marker');
  assert.match(server, /application\/javascript/, 'missing legacy scripts must return executable recovery JavaScript');
  assert.match(server, /location\.replace/, 'legacy recovery must navigate to fresh HTML');

  console.log('legacy asset recovery test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
