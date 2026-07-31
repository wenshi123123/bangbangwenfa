import assert from 'node:assert/strict';
import { persistGuardianCache } from '../src/lib/guardian/load-center-data';

let storedValue = '';
const quotaBoundStorage = {
  setItem(_key: string, value: string) {
    if (value.length > 200) throw new Error('QuotaExceededError');
    storedValue = value;
  },
};

const profileWithLargeQrCode = {
  id: 42,
  nickname: '守护者测试',
  invite_code: 'INVITE42',
  wechat_qrcode: 'x'.repeat(1000),
};

assert.doesNotThrow(() => {
  persistGuardianCache(quotaBoundStorage, profileWithLargeQrCode);
});

assert.deepEqual(JSON.parse(storedValue), {
  id: 42,
  nickname: '守护者测试',
  invite_code: 'INVITE42',
});

console.log('guardian center compact cache contract passed');
