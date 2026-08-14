import assert from 'node:assert/strict';
import { formatGuardianCents, normalizeGuardianNumber } from '../src/lib/guardian/format';

assert.equal(normalizeGuardianNumber(26000), 26000);
assert.equal(normalizeGuardianNumber('16000'), 16000);
assert.equal(normalizeGuardianNumber(undefined), 0);
assert.equal(normalizeGuardianNumber('not-a-number'), 0);
assert.equal(formatGuardianCents(26000), '260.00');
assert.equal(formatGuardianCents(undefined), '0.00');
assert.equal(formatGuardianCents(Number.NaN), '0.00');

console.log('guardian money format contract passed');
