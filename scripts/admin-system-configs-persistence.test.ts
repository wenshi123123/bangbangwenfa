import assert from 'node:assert/strict';
import {
  buildSystemConfigSaveRows,
  hasSavePayload,
} from '../src/lib/admin/system-configs-persistence';

const batchRows = buildSystemConfigSaveRows({
  configs: [
    { key: 'site_name', value: '帮帮问法' },
    { key: 'site_slogan', value: 'AI千问 不如律师一言' },
  ],
});

assert.equal(batchRows.length, 2);
assert.equal(batchRows[0].config_key, 'site_name');
assert.equal(batchRows[1].config_key, 'site_slogan');
assert.ok(batchRows[0].updated_at.length > 0);

const singleRows = buildSystemConfigSaveRows({ key: 'support_hours', value: '9:00-18:00' });
assert.equal(singleRows.length, 1);
assert.equal(singleRows[0].config_key, 'support_hours');
assert.equal(singleRows[0].config_value, '9:00-18:00');

assert.equal(hasSavePayload({ configs: batchRows.map((row) => ({ key: row.config_key, value: row.config_value })) }), true);
assert.equal(hasSavePayload({ key: 'site_name' }), true);
assert.equal(hasSavePayload({}), false);

console.log('admin system configs persistence test passed');
