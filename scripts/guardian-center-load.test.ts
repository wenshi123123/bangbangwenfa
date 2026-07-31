import assert from 'node:assert/strict';
import {
  GuardianCenterLoadTimeoutError,
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

  let wasAborted = false;
  await assert.rejects(
    () => loadGuardianCenterData(
      (_url, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          wasAborted = true;
          reject(init.signal?.reason);
        }, { once: true });
      }),
      5,
    ),
    GuardianCenterLoadTimeoutError,
  );
  assert.equal(wasAborted, true, 'timeout must abort pending guardian requests');

  console.log('guardian center concurrent loading contract passed');
})();
