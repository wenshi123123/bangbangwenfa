import assert from 'node:assert/strict';
import { apiRequest } from '../src/lib/api/request';

const values = new Map<string, string>([
  ['token', 'test-token'],
  ['user_info', JSON.stringify({ id: 1 })],
]);

const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
};

Object.assign(globalThis, {
  window: { localStorage: storage, dispatchEvent: () => true },
  localStorage: storage,
  fetch: async () => new Response(
    JSON.stringify({ success: false, code: 'UNAUTHORIZED' }),
    { status: 401, headers: { 'content-type': 'application/json' } },
  ),
});

void (async () => {
  const response = await apiRequest('/api/guardian/commissions');
  assert.equal(response.status, 401);
  assert.equal(storage.getItem('token'), 'test-token');
  assert.ok(storage.getItem('user_info'));

  console.log('auth persistence contract passed');
})();
