import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PRICE_STEP_FILE = path.join(ROOT, 'src/components/consult/price-step.tsx');
const PRICE_ROUTE_FILE = path.join(ROOT, 'src/app/api/price/route.ts');

async function main() {
  const [priceStepSource, priceRouteSource] = await Promise.all([
    fs.readFile(PRICE_STEP_FILE, 'utf8'),
    fs.readFile(PRICE_ROUTE_FILE, 'utf8'),
  ]);

  const priceRequestCount = (
    priceStepSource.match(/apiRequest\('\/api\/price'/g) ?? []
  ).length;
  assert.equal(
    priceRequestCount,
    1,
    'the selected price must be reused when submitting instead of issuing a second serial price request',
  );

  assert.match(
    priceRouteSource,
    /Cache-Control['"]:\s*['"]public, max-age=60, s-maxage=60, stale-while-revalidate=300['"]/,
    'the public price endpoint must allow a short browser/proxy cache to avoid a database round-trip on every visit',
  );
  assert.doesNotMatch(
    priceRouteSource,
    /export const dynamic = 'force-dynamic';/,
    'force-dynamic overrides the price endpoint cache policy in production',
  );

  console.log('consult order performance test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
