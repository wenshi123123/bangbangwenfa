import assert from 'node:assert/strict';
import { getPackageDisplayName, normalizePackageIds } from '@/lib/lawyer/package-normalizer';

assert.deepEqual(normalizePackageIds(['civil_premium', 'civil', 'civil_premium']), ['civil']);
assert.deepEqual(normalizePackageIds(['civil_premium', 'criminal_premium']), ['civil', 'criminal']);
assert.deepEqual(normalizePackageIds(['civil_renew_quarter', 'criminal_renew_year']), []);
assert.deepEqual(normalizePackageIds(['civil-annual', 'civil-quarterly']), ['civil']);
assert.equal(getPackageDisplayName('civil'), '民事律师（臻选）');
assert.equal(getPackageDisplayName('criminal'), '刑事律师（臻选）');

console.log('lawyer package normalizer tests passed');
