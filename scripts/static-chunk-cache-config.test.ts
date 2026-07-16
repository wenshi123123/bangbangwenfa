import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

async function assertStaticAssetCacheRule(configFile: string) {
  const configUrl = pathToFileURL(path.join(ROOT, configFile)).href;
  const config = (await import(configUrl)).default;
  const rules = await config.headers();
  const staticAssetsRule = rules.find((rule: { source: string }) => rule.source === '/_next/static/:path*');

  assert.ok(staticAssetsRule, `${configFile} must configure cache headers for Next static assets`);
  assert.ok(
    staticAssetsRule.headers.some(
      (header: { key: string; value: string }) =>
        header.key.toLowerCase() === 'cache-control' && header.value === CACHE_CONTROL,
    ),
    `${configFile} must make hashed Next static assets immutable`,
  );
}

async function main() {
  await assertStaticAssetCacheRule('next.config.mjs');
  await assertStaticAssetCacheRule('next.config.ts');
  console.log('static chunk cache config test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
