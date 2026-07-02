import assert from 'node:assert/strict';
import { getFallbackFromStorage } from '../src/lib/auth/lawyer-auth-storage.ts';

function createToken(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function createStorage(initial: Record<string, string>) {
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(initial, key) ? initial[key] : null;
    },
    setItem(key: string, value: string) {
      initial[key] = value;
    },
    removeItem(key: string) {
      delete initial[key];
    },
  };
}

const token = createToken({
  id: 1001,
  userType: 'user',
  lawyerId: 'lawyer-123',
});

Object.defineProperty(globalThis, 'window', {
  value: {},
  configurable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorage({ token }),
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: createStorage({}),
  configurable: true,
});

const result = getFallbackFromStorage();

assert.equal(
  result.isLawyer,
  true,
  'JWT payload with lawyerId should be treated as lawyer identity'
);
assert.equal(result.lawyerId, 'lawyer-123');
assert.equal(result.userId, 1001);

console.log('use-lawyer-auth fallback test passed');
