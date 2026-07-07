import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationSql = fs.readFileSync(
  path.join(process.cwd(), 'scripts/membership-records-migration.sql'),
  'utf8'
);

assert.ok(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS membership_records'),
  'membership_records migration should create the table'
);

assert.ok(
  migrationSql.includes('ALTER TABLE membership_records ENABLE ROW LEVEL SECURITY'),
  'membership_records migration should enable RLS'
);

assert.ok(
  migrationSql.includes('idx_membership_records_lawyer_id'),
  'membership_records migration should create the lawyer_id index'
);

console.log('admin members records schema test passed');
