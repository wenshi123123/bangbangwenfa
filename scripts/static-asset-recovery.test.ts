import assert from 'node:assert/strict';
import {
  STATIC_ASSET_RECOVERY_KEY,
  buildStaticAssetRecoveryUrl,
  claimStaticAssetRecovery,
  getStaticResourceUrl,
  isSameOriginNextStaticAsset,
} from '../src/lib/static-asset-recovery';

const storage = new Map<string, string>();
const session = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
};

assert.equal(
  isSameOriginNextStaticAsset('/_next/static/chunks/a.js', 'https://bangbangwenfa.com'),
  true,
);
assert.equal(
  isSameOriginNextStaticAsset(
    'https://bangbangwenfa.com/_next/static/media/a.woff2',
    'https://bangbangwenfa.com',
  ),
  true,
);
assert.equal(
  isSameOriginNextStaticAsset(
    'https://cdn.example.com/_next/static/a.js',
    'https://bangbangwenfa.com',
  ),
  false,
);
assert.equal(
  isSameOriginNextStaticAsset(
    'https://bangbangwenfa.com/uploads/a.png',
    'https://bangbangwenfa.com',
  ),
  false,
);

const target = new URL(
  buildStaticAssetRecoveryUrl('https://bangbangwenfa.com/civil?foo=1', '20260716'),
);
assert.equal(target.searchParams.get('__bbwv'), '20260716');
assert.equal(target.searchParams.get('__bbwv_recover'), '1');
assert.equal(target.searchParams.get('foo'), '1');

assert.equal(claimStaticAssetRecovery(session), true);
assert.equal(storage.get(STATIC_ASSET_RECOVERY_KEY), '1');
assert.equal(claimStaticAssetRecovery(session), false);

assert.equal(
  getStaticResourceUrl({ tagName: 'SCRIPT', src: '/_next/static/chunks/a.js' }),
  '/_next/static/chunks/a.js',
);
assert.equal(
  getStaticResourceUrl({
    tagName: 'LINK',
    rel: 'stylesheet',
    href: '/_next/static/css/a.css',
  }),
  '/_next/static/css/a.css',
);
assert.equal(
  getStaticResourceUrl({
    tagName: 'IMG',
    currentSrc: '/_next/static/media/a.png',
    src: '/fallback.png',
  }),
  '/_next/static/media/a.png',
);
assert.equal(
  getStaticResourceUrl({ tagName: 'IMG', src: '/uploads/a.png' }),
  '/uploads/a.png',
);
assert.equal(
  getStaticResourceUrl({
    tagName: 'LINK',
    rel: 'preconnect',
    href: '/_next/static/css/a.css',
  }),
  null,
);

console.log('static asset recovery test passed');
