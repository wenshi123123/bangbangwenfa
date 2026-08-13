import assert from 'node:assert/strict';
import {
  GuardianCenterAuthError,
  loadGuardianCenterData,
} from '../src/lib/guardian/load-center-data';

const successfulResponse = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    headers: { 'content-type': 'application/json' },
  });

async function resolvesAllData(signal?: AbortSignal): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const timeout = setTimeout(() => resolve(successfulResponse([])), 20);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(signal.reason);
    }, { once: true });
  });
}

void (async () => {
  const startedUrls: string[] = [];
  const startedAt = Date.now();
  const data = await loadGuardianCenterData(
    async (url, init) => {
      startedUrls.push(url);
      if (url === '/api/guardian/profile') {
        return new Promise<Response>((resolve, reject) => {
          const timeout = setTimeout(
            () => resolve(successfulResponse({ id: 1, invite_code: 'ABC' })),
            20,
          );
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(init.signal?.reason);
          }, { once: true });
        });
      }
      return resolvesAllData(init?.signal);
    },
    50,
  );

  assert.deepEqual([...startedUrls].sort(), [
    '/api/guardian/profile',
    '/api/guardian/commissions',
    '/api/guardian/invites',
    '/api/guardian/withdrawals',
    '/api/guardian/withdraw?action=config',
  ].sort());
  assert.ok(
    Date.now() - startedAt < 45,
    'independent guardian requests must complete concurrently, not sequentially',
  );
  assert.deepEqual(data.profile, { id: 1, invite_code: 'ABC' });

  const partial = await loadGuardianCenterData(
    async (url) => {
      if (url === '/api/guardian/profile') return successfulResponse({ id: 2, invite_code: 'DEF' });
      if (url === '/api/guardian/commissions') return new Response('failed', { status: 500 });
      return successfulResponse([]);
    },
    50,
  );
  assert.deepEqual(partial.commissions, []);
  assert.match(partial.errors[0], /佣金/);

  const optionalRequestStartedAt = Date.now();
  let commissionAborted = false;
  const optionalTimeout = await loadGuardianCenterData(
    async (url, init) => {
      if (url === '/api/guardian/profile') {
        return successfulResponse({ id: 3, invite_code: 'GHI' });
      }
      if (url === '/api/guardian/commissions') {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            commissionAborted = true;
            reject(init.signal?.reason);
          }, { once: true });
        });
      }
      return successfulResponse([]);
    },
    20,
  );
  assert.deepEqual(optionalTimeout.profile, { id: 3, invite_code: 'GHI' });
  assert.deepEqual(optionalTimeout.commissions, []);
  assert.match(optionalTimeout.errors[0], /佣金/);
  assert.ok(Date.now() - optionalRequestStartedAt >= 20);
  assert.equal(commissionAborted, true);

  await assert.rejects(
    () => loadGuardianCenterData(
      async (url) => url === '/api/guardian/profile'
        ? new Response(JSON.stringify({ success: false, error: '未登录' }), { status: 401 })
        : successfulResponse([]),
      50,
    ),
    GuardianCenterAuthError,
  );

  console.log('guardian center concurrent loading contract passed');
})();
