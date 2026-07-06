import assert from 'node:assert/strict';
import {
  buildSystemConfigFallbackRows,
  groupSystemConfigs,
} from '../src/lib/admin/system-configs';

const fallbackRows = buildSystemConfigFallbackRows();

assert.ok(fallbackRows.length >= 5, 'fallback rows should include seeded configs');
assert.ok(fallbackRows.every((row) => row.id < 0), 'fallback ids should be negative');
assert.equal(fallbackRows[0].config_key, 'site_name');

const grouped = groupSystemConfigs(fallbackRows);
assert.ok(Array.isArray(grouped.basic), 'basic group should exist');
assert.ok(Array.isArray(grouped.contact), 'contact group should exist');

console.log('admin system configs fallback test passed');
