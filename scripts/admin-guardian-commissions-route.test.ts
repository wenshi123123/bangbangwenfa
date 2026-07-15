import assert from 'node:assert/strict';

import { isGuardianCommissionNotFoundError } from '../src/lib/admin/guardian-commissions';

assert.equal(
  isGuardianCommissionNotFoundError({
    code: 'PGRST116',
    message: 'JSON object requested, multiple (or no) rows returned',
  }),
  true,
  'should treat Supabase single() no-row error as not found'
);

assert.equal(
  isGuardianCommissionNotFoundError({
    message: 'JSON object requested, multiple (or no) rows returned',
  }),
  true,
  'should detect no-row error by message when code is unavailable'
);

assert.equal(
  isGuardianCommissionNotFoundError({
    code: '23505',
    message: 'duplicate key value violates unique constraint',
  }),
  false,
  'should not treat unrelated database errors as not found'
);

console.log('admin guardian commissions route test passed');
