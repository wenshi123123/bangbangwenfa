import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function main() {
  const [createRoute, reapplicationRoute, migration, payPage] = await Promise.all([
    readFile('src/app/api/lawyer/create/route.ts', 'utf8'),
    readFile('src/app/api/lawyer/reapplication/route.ts', 'utf8'),
    readFile('scripts/lawyer-reapplication-migration.sql', 'utf8'),
    readFile('src/app/lawyer/pay/page.tsx', 'utf8'),
  ]);

assert.match(createRoute, /isBlockingApplication\(existing\)/);
assert.match(createRoute, /sourceApplicationId/);
assert.match(createRoute, /resubmitted_from_id/);
assert.match(createRoute, /revision_no/);
assert.match(reapplicationRoute, /eq\('user_id', String\(auth\.userId\)\)/);
assert.match(reapplicationRoute, /review_status !== 'rejected'/);
assert.match(reapplicationRoute, /formData/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS resubmitted_from_id/i);
assert.match(migration, /ADD COLUMN IF NOT EXISTS revision_no/i);
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS lawyer_applications_one_pending_per_user_idx/i);
assert.match(payPage, /sourceApplicationId/);

  console.log('lawyer reapplication contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
