import assert from 'node:assert/strict';
import { resolveGuardianId } from '../src/lib/auth/guardian-identity';

function createSupabase(guardianId: number | null) {
  return {
    from(table: string) {
      assert.equal(table, 'guardian_users');
      return {
        select() {
          return {
            eq(column: string, value: string) {
              assert.equal(column, 'user_id');
              assert.equal(value, '42');
              return {
                maybeSingle: async () => ({
                  data: guardianId === null ? null : { id: guardianId },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };
}

const userAuth = { success: true as const, userId: 42, userType: 'user' as const };
const guardianAuth = { success: true as const, userId: 42, guardianId: 9, userType: 'guardian' as const };

(async () => {
  assert.equal(await resolveGuardianId(userAuth, createSupabase(7)), 7);
  assert.equal(await resolveGuardianId(guardianAuth, createSupabase(7)), 9);
  assert.equal(await resolveGuardianId(userAuth, createSupabase(null)), null);

  console.log('guardian identity resolution contract passed');
})();
