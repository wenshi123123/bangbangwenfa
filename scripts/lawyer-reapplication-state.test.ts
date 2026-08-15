import assert from 'node:assert/strict';
import { isBlockingApplication } from '../src/lib/lawyer/application-state';

assert.equal(
  isBlockingApplication({ review_status: 'rejected', payment_status: 'pending' }),
  false,
  'rejected applications must not block a new submission',
);
assert.equal(
  isBlockingApplication({ review_status: 'pending', payment_status: 'pending' }),
  true,
  'pending applications must block duplicate submissions',
);
assert.equal(
  isBlockingApplication({ review_status: 'approved', payment_status: 'paid' }),
  true,
  'approved paid applications must remain terminal',
);
assert.equal(
  isBlockingApplication({ review_status: 'approved', payment_status: 'pending' }),
  true,
  'approved applications awaiting payment must remain active',
);

console.log('lawyer reapplication state tests passed');
