import assert from 'node:assert/strict';

async function main() {
  delete process.env.DEPLOY_ENV;

  const { isLocalRolePreviewEnabled } = await import('../src/lib/local-preview/environment');
  const { generateToken, verifyToken } = await import('../src/lib/auth/token');
  const { resetLocalPreviewFixtures } = await import('../src/lib/local-preview/fixtures');
  const { getSupabaseAdmin } = await import('../src/storage/database/supabase-client');

  assert.equal(isLocalRolePreviewEnabled(), true);

  const token = generateToken({
    id: 1001,
    phone: '13900000001',
    userType: 'guardian',
    guardianId: 2001,
  });
  assert.equal(verifyToken(token).valid, true);

  resetLocalPreviewFixtures();
  const database = getSupabaseAdmin();
  const guardian = await database.from('guardian_users').select('*').eq('id', 2001).single();
  assert.equal(guardian.data?.invite_code, 'LOCAL-CARE-2001');
  const withdrawal = await database.rpc('create_guardian_withdrawal', {
    p_guardian_id: 2001,
    p_amount: 10000,
  });
  assert.equal(withdrawal.data?.amount, 10000);
  resetLocalPreviewFixtures();
  const withdrawals = await database.from('guardian_withdrawals').select('*').eq('guardian_id', 2001);
  assert.equal(withdrawals.data?.length, 0);

  process.env.DEPLOY_ENV = 'PROD';
  assert.equal(isLocalRolePreviewEnabled(), false);

  console.log('local role preview environment test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
