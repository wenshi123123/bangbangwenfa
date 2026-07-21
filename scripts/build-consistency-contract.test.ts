import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function source(file: string) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}

async function main() {
  const [server, layout, middleware] = await Promise.all([
    source('src/server.mts'),
    source('src/app/layout.tsx'),
    source('src/middleware.ts'),
  ]);

  assert.doesNotMatch(
    server,
    /X-BBWV-Legacy-Asset-Recovery|__bbwv_legacy_asset_retry|legacy\.css/,
    'expired JS/CSS must not be disguised as a successful recovery response',
  );
  assert.doesNotMatch(
    layout,
    /__bbStaleResourceGuardInstalled|__bbwv_resource_retry/,
    'resource failures must not trigger an automatic page refresh',
  );
  assert.doesNotMatch(
    middleware,
    /Clear-Site-Data|bb_build_version/,
    'deployment changes must not clear browser cache as a version-recovery mechanism',
  );
  assert.match(
    middleware,
    /X-BBWV-Deployment-Id/,
    'HTML and RSC responses must expose the deployment identifier they belong to',
  );

  console.log('build consistency contract test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
