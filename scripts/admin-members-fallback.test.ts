import assert from 'node:assert/strict';
import {
  buildExpiringMembersFallbackFromLawyers,
  isMissingMembershipRecordsError,
} from '../src/lib/admin/membership-records';

assert.equal(
  isMissingMembershipRecordsError({
    code: '42P01',
    message: 'relation "membership_records" does not exist',
  }),
  true,
  'should detect missing membership_records table by postgres code'
);

assert.equal(
  isMissingMembershipRecordsError({
    message: "Could not find the table 'public.membership_records' in the schema cache",
  }),
  true,
  'should detect missing membership_records table by schema cache message'
);

const fallback = buildExpiringMembersFallbackFromLawyers(
  [
    {
      id: 'lawyer-1',
      name: '王律师',
      package_type: 'civil_premium',
      membership_status: 'normal',
      member_expires_at: '2026-07-10T00:00:00.000Z',
    },
    {
      id: 'lawyer-2',
      name: '陈律师',
      package_type: 'criminal_premium',
      membership_status: 'trial',
      member_expires_at: '2026-07-20T00:00:00.000Z',
    },
    {
      id: 'lawyer-3',
      name: '赵律师',
      package_type: 'civil_premium',
      membership_status: 'normal',
      member_expires_at: '2026-08-20T00:00:00.000Z',
    },
  ],
  14,
  new Date('2026-07-07T00:00:00.000Z')
);

assert.deepEqual(
  fallback.map((item) => item.name),
  ['王律师', '陈律师'],
  'should only include lawyers expiring within the requested window'
);

assert.equal(fallback[0].package_type, 'civil', 'should normalize civil premium to civil');
assert.equal(fallback[0].daysLeft, 3, 'should calculate days left from the reference time');
assert.equal(fallback[1].package_type, 'criminal', 'should normalize criminal premium to criminal');
assert.equal(fallback[1].is_trial, true, 'should preserve trial status');

console.log('admin members fallback test passed');
