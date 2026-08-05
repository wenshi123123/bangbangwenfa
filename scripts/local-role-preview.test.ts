import assert from 'node:assert/strict';

async function main() {
  delete process.env.DEPLOY_ENV;

  const { isLocalRolePreviewEnabled } = await import('../src/lib/local-preview/environment');
  const { generateToken, verifyToken } = await import('../src/lib/auth/token');

  assert.equal(isLocalRolePreviewEnabled(), true);

  const token = generateToken({
    id: 1001,
    phone: '13900000001',
    userType: 'guardian',
    guardianId: 2001,
  });
  assert.equal(verifyToken(token).valid, true);

  process.env.DEPLOY_ENV = 'PROD';
  assert.equal(isLocalRolePreviewEnabled(), false);

  console.log('local role preview environment test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
