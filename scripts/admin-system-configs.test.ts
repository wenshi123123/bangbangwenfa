import assert from 'node:assert/strict';
import {
  DEFAULT_SYSTEM_CONFIGS,
  SYSTEM_CONFIGS_BOOTSTRAP_SQL,
  isMissingSystemConfigsTableError,
} from '../src/lib/admin/system-configs';

assert.ok(
  SYSTEM_CONFIGS_BOOTSTRAP_SQL.includes('CREATE TABLE IF NOT EXISTS system_configs'),
  'bootstrap SQL should create system_configs table'
);

assert.ok(
  SYSTEM_CONFIGS_BOOTSTRAP_SQL.includes("'site_name'"),
  'bootstrap SQL should seed site_name'
);

assert.ok(
  SYSTEM_CONFIGS_BOOTSTRAP_SQL.includes("'site_slogan'"),
  'bootstrap SQL should seed site_slogan'
);

assert.ok(DEFAULT_SYSTEM_CONFIGS.length >= 5, 'should expose the default config seeds');

assert.equal(
  isMissingSystemConfigsTableError({ code: '42P01', message: 'relation "system_configs" does not exist' }),
  true,
  'should detect missing table by postgres code'
);

assert.equal(
  isMissingSystemConfigsTableError({ message: "Could not find the table 'public.system_configs' in the schema cache" }),
  true,
  'should detect missing table by schema cache message'
);

console.log('admin system configs test passed');
