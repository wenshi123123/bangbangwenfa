import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const migrationPath = path.join(process.cwd(), 'scripts/lawyer-application-payment-orders.sql');

async function main() {
  const migration = await fs.readFile(migrationPath, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS lawyer_application_payment_orders/, 'must create the isolated application-payment order table');
  assert.match(migration, /application_id\s+INTEGER\s+NOT NULL\s+REFERENCES\s+lawyer_applications\(id\)/i, 'each order must reference an existing application');
  assert.match(migration, /user_id\s+VARCHAR\(50\)\s+NOT NULL/i, 'each order must retain its application owner');
  assert.match(migration, /CHECK\s*\(status\s+IN\s*\('creating',\s*'pending',\s*'paid',\s*'failed',\s*'expired'\)\)/i, 'must limit status to the payment lifecycle');
  assert.match(migration, /CREATE UNIQUE INDEX[\s\S]*application_id[\s\S]*creating[\s\S]*pending/i, 'must allow only one active order per application');
  assert.match(migration, /ALTER TABLE lawyer_application_payment_orders ENABLE ROW LEVEL SECURITY/i, 'must enable RLS');
  assert.match(migration, /REVOKE ALL ON TABLE lawyer_application_payment_orders FROM anon, authenticated/i, 'must deny browser roles direct table access');
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE lawyer_application_payment_orders TO service_role/i, 'must grant only the server service role table access');
  assert.doesNotMatch(migration, /ALTER TABLE\s+lawyer_applications\s+(?!ENABLE ROW LEVEL SECURITY)/i, 'must not alter the legacy applications table');
  assert.doesNotMatch(migration, /lawyer_renew_orders/i, 'must not alter renewal orders');
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+lawyer_applications/i, 'must not change existing application data');

  console.log('lawyer application payment-order migration contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
